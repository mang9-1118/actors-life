import { authHeaders } from '@/lib/appApi'
import type { DateKey } from '@/types'

export class CastingError extends Error {}

export interface CastingNotice {
  title: string
  /** The casting site's name, e.g. '필름메이커스'. */
  organization: string
  /** 작품 종류, e.g. '단편영화'. Empty when the notice does not state one. */
  category: string
  /** Null when the notice states no closing date. */
  deadline: DateKey | null
  /** The notice link, normalized by the server (no query string). */
  url: string
}

/** The sites a notice can come from. Filmmakers is bookmarklet-only — it blocks the server. */
const FILMMAKERS = { label: '필름메이커스', hosts: ['filmmakers.co.kr', 'www.filmmakers.co.kr'] }
const PLFIL = { label: '플필', hosts: ['plfil.com', 'www.plfil.com'] }

/**
 * The casting site a link belongs to, or null when it is not a notice link at all.
 * Anything else must never reach the board card's `href`, where a `javascript:` URL
 * would run.
 */
function noticeSite(url: string): { label: string } | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null

  const host = parsed.hostname.toLowerCase()
  return [FILMMAKERS, PLFIL].find((site) => site.hosts.includes(host)) ?? null
}

/**
 * Validates a notice the bookmarklet read. It arrives from outside the app — through
 * the URL or through `/api/casting-inbox` — so nothing is trusted: the link has to be
 * an http(s) address on a known casting host before it can become the board card's
 * `href`, and the deadline has to be a date key before it can reach the store.
 */
export function importedNotice(data: unknown): CastingNotice | null {
  if (!data || typeof data !== 'object') return null

  const fields = data as Record<string, unknown>
  const text = (value: unknown) => (typeof value === 'string' ? value.trim().slice(0, 200) : '')

  const title = text(fields.title)
  if (!title) return null

  const url = typeof fields.url === 'string' ? fields.url : ''
  const site = noticeSite(url)
  const deadline = text(fields.deadline)

  return {
    title,
    // Only ever the site the link actually points at, so an unrecognized one is
    // left for the person to fill in rather than labelled with a guess.
    organization: site?.label ?? '',
    category: text(fields.category),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
    url: site ? url : '',
  }
}

/** The same, for a notice handed over as JSON text in the URL. */
export function parseImportedNotice(raw: string): CastingNotice | null {
  try {
    return importedNotice(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * Takes whatever notice the bookmarklet left for this tab, emptying the inbox so it
 * is filled in once. Returns null when nothing is waiting, and stays quiet on
 * failure — this runs on a timer, and a warning per tick would be noise.
 */
export async function takePendingNotice(): Promise<CastingNotice | null> {
  try {
    const res = await fetch('/api/casting-inbox', { headers: authHeaders() })
    if (!res.ok) return null
    const data = (await res.json()) as { notice?: unknown }
    return data.notice ? importedNotice(data.notice) : null
  } catch {
    return null
  }
}

/**
 * Reads a casting notice through `/api/casting`, which fetches and parses it
 * server-side (the casting sites send no CORS headers).
 */
export async function fetchCastingNotice(url: string): Promise<CastingNotice> {
  if (noticeSite(url) === FILMMAKERS) {
    throw new CastingError(
      '필름메이커스는 서버에서의 접근을 차단해 주소로 불러올 수 없습니다. 공고 페이지에서 [오디션 가져오기] 북마클릿을 눌러주세요.',
    )
  }

  const res = await fetch('/api/casting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ url }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new CastingError(data?.error ?? `공고를 불러오지 못했습니다 (${res.status}).`)
  }
  if (!data?.title) {
    throw new CastingError('공고에서 오디션명을 찾을 수 없습니다.')
  }
  return data as CastingNotice
}
