import { useSettingsStore } from '@/stores/useSettingsStore'
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

/** Hosts a notice link may point at, so an imported link can never be a `javascript:` URL. */
const NOTICE_HOSTS = ['filmmakers.co.kr', 'www.filmmakers.co.kr', 'plfil.com', 'www.plfil.com']

/** Filmmakers blocks the server, so its notices arrive through the bookmarklet instead. */
const BOOKMARKLET_ONLY_HOSTS = ['filmmakers.co.kr', 'www.filmmakers.co.kr']

function noticeHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
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
  const host = noticeHost(url)
  const protocol = url.slice(0, url.indexOf(':') + 1).toLowerCase()
  const linkable =
    NOTICE_HOSTS.includes(host) && (protocol === 'https:' || protocol === 'http:') ? url : ''

  const deadline = text(fields.deadline)

  return {
    title,
    // Only ever the site the link actually points at, so an unrecognized one is
    // left for the person to fill in rather than labelled with a guess.
    organization: linkable ? (host.includes('plfil') ? '플필' : '필름메이커스') : '',
    category: text(fields.category),
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null,
    url: linkable,
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
  const appAccessKey = useSettingsStore.getState().appAccessKey

  try {
    const res = await fetch('/api/casting-inbox', {
      headers: appAccessKey ? { 'x-app-key': appAccessKey } : {},
    })
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
  if (BOOKMARKLET_ONLY_HOSTS.includes(noticeHost(url))) {
    throw new CastingError(
      '필름메이커스는 서버에서의 접근을 차단해 주소로 불러올 수 없습니다. 공고 페이지에서 [오디션 가져오기] 북마클릿을 눌러주세요.',
    )
  }

  const appAccessKey = useSettingsStore.getState().appAccessKey

  const res = await fetch('/api/casting', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(appAccessKey ? { 'x-app-key': appAccessKey } : {}),
    },
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
