import type { DateKey } from '@/types'

export function todayKey(): DateKey {
  return toDateKey(new Date())
}

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Monday (00:00) of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day
  return addDays(d, diffToMonday)
}

export function weekDateKeys(monday: Date): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)))
}

/** e.g. '2026-07-08' -> '2026-07' */
export function yearMonthKey(dateKey: DateKey): string {
  return dateKey.slice(0, 7)
}

export function currentYearMonthKey(): string {
  return yearMonthKey(todayKey())
}

/** e.g. '2026-07-08' -> '7/8' */
export function formatKoreanDate(dateKey: DateKey): string {
  const [, m, d] = dateKey.split('-')
  return `${Number(m)}/${Number(d)}`
}

/** Newest first: by date descending, ties broken by creation time. */
export function sortByDateDesc<T extends { date: DateKey; createdAt: number }>(entries: T[]): T[] {
  return entries
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

/** e.g. 5400 -> "1시간 30분", 1800 -> "30분", 0 -> "0분" */
export function formatHoursMinutesKorean(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}분`
  if (m === 0) return `${h}시간`
  return `${h}시간 ${m}분`
}

/** e.g. 5400 -> "1시간 30분", 1800 -> "0시간 30분" (always shows both parts, zero-padded minutes) */
export function formatHoursMinutesFixed(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}시간 ${String(m).padStart(2, '0')}분`
}
