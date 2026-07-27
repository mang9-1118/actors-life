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

/**
 * Reads a casting notice through `/api/casting`, which fetches and parses it
 * server-side (the casting sites send no CORS headers).
 */
export async function fetchCastingNotice(url: string): Promise<CastingNotice> {
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
