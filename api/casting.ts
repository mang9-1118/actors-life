interface ParsedNotice {
  title: string
  /** 작품 종류, e.g. '단편영화'. Empty when the notice does not state one. */
  category: string
  /** 'YYYY-MM-DD' in KST, or null when the notice states no closing date. */
  deadline: string | null
}

interface CastingSite {
  /** Stored as the audition's 지원처 — the site the application went through. */
  label: string
  hosts: string[]
  /** Applications on this site are always made this way. */
  mode: 'online' | 'offline'
  parse: (html: string) => ParsedNotice | null
}

/**
 * Filmmakers states its closing time as '2026-07-31T23:59:59+09:00' — the last
 * moment of a Korean calendar day — so shifting into KST yields the day itself.
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

/** Every JSON-LD block on the page, flattened so `@graph` and array payloads are included. */
function jsonLdBlocks(html: string): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  for (const match of html.matchAll(pattern)) {
    let parsed: unknown
    try {
      parsed = JSON.parse(match[1])
    } catch {
      continue
    }
    const candidates = Array.isArray(parsed) ? parsed : [parsed]
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue
      const record = candidate as Record<string, unknown>
      blocks.push(record)
      if (Array.isArray(record['@graph'])) {
        for (const node of record['@graph']) {
          if (node && typeof node === 'object') blocks.push(node as Record<string, unknown>)
        }
      }
    }
  }
  return blocks
}

/** Fields filmmakers hides behind a login say so in place of a value. */
const MEMBERS_ONLY = '회원에게만'

/** Inner HTML of a matched element, reduced to the plain text it displays. */
function visibleText(inner: string): string {
  const text = decodeHtmlEntities(inner.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
  return text.includes(MEMBERS_ONLY) ? '' : text
}

/**
 * Filmmakers renders its notice details as label/value rows, where the value
 * carries this class. Labels are plain Korean words, so they need no escaping.
 */
function labeledFieldText(html: string, label: string): string {
  const valueClass = 'text-base text-neutral-900 dark:text-neutral-100'
  const pattern = new RegExp(
    `<span[^>]*>\\s*${label}\\s*</span>\\s*` +
      `<(?:div|span)[^>]*class="[^"]*${valueClass}[^"]*"[^>]*>([\\s\\S]{0,300}?)</(?:div|span)>`,
  )
  const match = html.match(pattern)
  return match ? visibleText(match[1]) : ''
}

/** First element carrying `className`, for values that have no label beside them. */
function classedText(html: string, className: string): string {
  const pattern = new RegExp(
    `<([a-z0-9]+)[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]{0,200}?)</\\1>`,
    'i',
  )
  const match = html.match(pattern)
  return match ? visibleText(match[2]) : ''
}

const FILMMAKERS: CastingSite = {
  label: '필름메이커스',
  hosts: ['filmmakers.co.kr', 'www.filmmakers.co.kr'],
  mode: 'online',
  parse: (html) => {
    // Casting notices carry a schema.org JobPosting; other board pages do not.
    const posting = jsonLdBlocks(html).find((block) => block['@type'] === 'JobPosting')
    if (!posting) return null

    // The notice title is a long recruiting sentence, so prefer the work's own
    // name; fall back to the notice title when a notice omits '작품 제목'.
    const noticeTitle =
      typeof posting.title === 'string' ? decodeHtmlEntities(posting.title).trim() : ''
    const title = labeledFieldText(html, '작품 제목') || noticeTitle
    if (!title) return null

    const category = classedText(html, 'text-sub font-bold opacity-80 decoration-indigo-200 text-base')

    const validThrough = typeof posting.validThrough === 'string' ? posting.validThrough : ''
    return { title, category, deadline: validThrough ? kstDateKey(validThrough) : null }
  },
}

const SITES: CastingSite[] = [FILMMAKERS]

const SUPPORTED_HINT = `지원하는 사이트: ${SITES.map((s) => s.label).join(', ')}`

/**
 * Filmmakers' bot filter answers 403 to requests that don't look like a browser
 * opening the page — a User-Agent alone is not enough, so send what Chrome sends
 * on a top-level navigation.
 */
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
  'Sec-Ch-Ua': '"Chromium";v="126", "Not:A-Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
}

/**
 * Runs on Vercel's edge network rather than as a Node function: filmmakers'
 * filter refuses requests from the serverless region's addresses (both us-east
 * and Seoul, with complete browser headers), and the edge network egresses from
 * a different range.
 */
export const config = { runtime: 'edge' }

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

/**
 * Reads a casting notice and returns just the fields the audition board needs.
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
    // Filmmakers routinely takes 5-7s to answer, so leave real headroom; the
    // edge runtime allows far longer than a Node function's 10s ceiling.
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
      mode: site.mode,
      url: noticeUrl,
    },
    200,
  )
}
