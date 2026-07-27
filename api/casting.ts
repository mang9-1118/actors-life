import type { VercelRequest, VercelResponse } from '@vercel/node'

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
 * Both '2026-07-31T23:59:59+09:00' (filmmakers) and '2026-07-27T23:59:59.000Z'
 * (plfil, which serializes a KST end-of-day as if it were UTC) describe the last
 * moment of a Korean calendar day, so shifting into KST yields the day itself.
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

/** The `data` payload of plfil's Next.js page props, which holds the whole notice. */
function plfilNoticeData(html: string): Record<string, unknown> | null {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  )
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
  mode: 'online',
  parse: (html) => {
    // Only notice detail pages carry a single notice under pageProps.data.
    const data = plfilNoticeData(html)
    if (!data || typeof data.castingEndDate !== 'string') return null

    // Match filmmakers: prefer the work's own name over the recruiting sentence.
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

const SITES: CastingSite[] = [FILMMAKERS, PLFIL]

const SUPPORTED_HINT = `지원하는 사이트: ${SITES.map((s) => s.label).join(', ')}`

/**
 * Reads a casting notice and returns just the fields the audition board needs.
 * Runs on the server because the casting sites send no CORS headers, and because
 * the host allowlist below must not be bypassable from the client.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const accessKey = process.env.APP_ACCESS_KEY
  if (accessKey && req.headers['x-app-key'] !== accessKey) {
    res.status(401).json({ error: '접근 권한이 없습니다.' })
    return
  }

  const rawUrl = (req.body as { url?: unknown } | undefined)?.url
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    res.status(400).json({ error: '공고 주소가 필요합니다.' })
    return
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(rawUrl.trim())
  } catch {
    res.status(400).json({ error: '주소 형식이 올바르지 않습니다.' })
    return
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    res.status(400).json({ error: '주소 형식이 올바르지 않습니다.' })
    return
  }

  const site = SITES.find((s) => s.hosts.includes(parsedUrl.hostname.toLowerCase()))
  if (!site) {
    res.status(400).json({ error: `지원하지 않는 사이트입니다. ${SUPPORTED_HINT}` })
    return
  }

  // Notice pages need no query string, and dropping it keeps the saved link tidy.
  const noticeUrl = `${parsedUrl.origin}${parsedUrl.pathname}`

  let html: string
  try {
    const pageRes = await fetch(noticeUrl, {
      headers: {
        // The plain default agent gets bot-blocked by some casting sites.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!pageRes.ok) {
      res
        .status(502)
        .json({ error: `공고 페이지를 불러올 수 없습니다 (${pageRes.status}).` })
      return
    }
    html = await pageRes.text()
  } catch {
    res.status(504).json({ error: '공고 페이지를 불러오는 데 실패했습니다.' })
    return
  }

  const notice = site.parse(html)
  if (!notice) {
    res
      .status(422)
      .json({ error: '공고 정보를 찾을 수 없습니다. 모집 공고 상세 페이지 주소인지 확인해주세요.' })
    return
  }

  res.status(200).json({
    title: notice.title,
    organization: site.label,
    category: notice.category,
    deadline: notice.deadline,
    mode: site.mode,
    url: noticeUrl,
  })
}
