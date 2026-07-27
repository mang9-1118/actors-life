interface ParsedNotice {
  title: string
  /** 작품 종류, e.g. '단편영화'. Empty when the notice does not state one. */
  category: string
  /** 'YYYY-MM-DD' in KST, or null when the notice states no closing date. */
  deadline: string | null
}

interface CastingSite {
  label: string
  hosts: string[]
  parse: (html: string) => ParsedNotice | null
}

/**
 * plfil serializes a KST end-of-day as if it were UTC ('2026-07-26T23:59:59.000Z'
 * is the last moment of 7/27 in Korea), so shifting into KST yields the day the
 * site displays. Reading the string's own date part would be a day early.
 */
function kstDateKey(iso: string): string | null {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return null
  return new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * Casting sites store notice titles HTML-escaped, and that escaping survives
 * JSON.parse — '&lt;no father zone&gt;' has to become '<no father zone>'.
 */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith('#')) {
      const isHex = body[1]?.toLowerCase() === 'x'
      const codePoint = Number.parseInt(isHex ? body.slice(2) : body.slice(1), isHex ? 16 : 10)
      if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) return whole
      return String.fromCodePoint(codePoint)
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole
  })
}

/** The `data` payload of plfil's Next.js page props, which holds the whole notice. */
function plfilNoticeData(html: string): Record<string, unknown> | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1]) as { props?: { pageProps?: { data?: unknown } } }
    const data = parsed.props?.pageProps?.data
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function stringField(data: Record<string, unknown>, key: string): string {
  const value = data[key]
  return typeof value === 'string' ? decodeHtmlEntities(value).trim() : ''
}

const PLFIL: CastingSite = {
  label: '플필',
  hosts: ['plfil.com', 'www.plfil.com'],
  parse: (html) => {
    // Only notice detail pages carry a single notice under pageProps.data.
    const data = plfilNoticeData(html)
    if (!data || typeof data.castingEndDate !== 'string') return null

    // The notice title is a recruiting sentence, so prefer the work's own name.
    const title = stringField(data, 'artWorkName') || stringField(data, 'title')
    if (!title) return null

    const castingEndDate = stringField(data, 'castingEndDate')
    return {
      title,
      category: stringField(data, 'artCategoryName'),
      deadline: castingEndDate ? kstDateKey(castingEndDate) : null,
    }
  },
}

/**
 * Only plfil. 필름메이커스 refuses requests from Vercel's addresses — measured on
 * Node in two regions and on the edge runtime, with complete browser headers, while
 * the same code answers 200 from a home connection. Its notices are read by the
 * member's own browser instead, through the bookmarklet in `src/lib/castingBookmarklet.ts`.
 */
const SITES: CastingSite[] = [PLFIL]

const SUPPORTED_HINT = `주소로 불러올 수 있는 사이트: ${SITES.map((s) => s.label).join(', ')}`

/** Sent because a bare fetch looks nothing like a browser opening the page. */
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
}

export const config = { runtime: 'edge' }

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/**
 * Reads a casting notice and returns just the fields the audition form needs.
 * Runs on the server because the casting sites send no CORS headers, and because
 * the host allowlist below must not be bypassable from the client.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const accessKey = process.env.APP_ACCESS_KEY
  if (accessKey && req.headers.get('x-app-key') !== accessKey) {
    return json({ error: '접근 권한이 없습니다.' }, 401)
  }

  const body = (await req.json().catch(() => null)) as { url?: unknown } | null
  const rawUrl = body?.url
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return json({ error: '공고 주소가 필요합니다.' }, 400)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl.trim())
  } catch {
    return json({ error: '주소 형식이 올바르지 않습니다.' }, 400)
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return json({ error: '주소 형식이 올바르지 않습니다.' }, 400)
  }

  const site = SITES.find((s) => s.hosts.includes(parsedUrl.hostname.toLowerCase()))
  if (!site) {
    return json({ error: `지원하지 않는 사이트입니다. ${SUPPORTED_HINT}` }, 400)
  }

  // Notice pages need no query string, and dropping it keeps the saved link tidy.
  const noticeUrl = `${parsedUrl.origin}${parsedUrl.pathname}`

  let html: string
  try {
    const pageRes = await fetch(noticeUrl, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(20_000),
    })
    if (!pageRes.ok) {
      // 403/429 is the notice site's bot filter rather than a bad URL.
      const blocked = pageRes.status === 403 || pageRes.status === 429
      return json(
        {
          error: blocked
            ? `공고 사이트가 서버에서의 접근을 차단했습니다 (${pageRes.status}). 잠시 후 다시 시도하거나 수기로 입력해주세요.`
            : `공고 페이지를 불러올 수 없습니다 (${pageRes.status}).`,
        },
        502,
      )
    }
    html = await pageRes.text()
  } catch {
    return json({ error: '공고 페이지를 불러오는 데 실패했습니다.' }, 504)
  }

  const notice = site.parse(html)
  if (!notice) {
    return json(
      { error: '공고 정보를 찾을 수 없습니다. 모집 공고 상세 페이지 주소인지 확인해주세요.' },
      422,
    )
  }

  return json(
    {
      title: notice.title,
      organization: site.label,
      category: notice.category,
      deadline: notice.deadline,
      url: noticeUrl,
    },
    200,
  )
}
