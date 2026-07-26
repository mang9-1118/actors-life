import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { todayKey } from '@/lib/time'
import type { DateKey } from '@/types'

interface TimerState {
  running: Partial<Record<string, number>>
  totals: Partial<Record<string, Partial<Record<DateKey, number>>>>
  start: (key: string) => void
  stop: (key: string) => void
  getCommittedSeconds: (key: string, date?: DateKey) => number
  setCommittedSeconds: (key: string, date: DateKey, seconds: number) => void
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      running: {},
      totals: {},

      start: (key) => {
        if (get().running[key] != null) return
        set((state) => ({ running: { ...state.running, [key]: Date.now() } }))
      },

      stop: (key) => {
        const start = get().running[key]
        if (start == null) return
        const elapsedSeconds = Math.floor((Date.now() - start) / 1000)
        const date = todayKey()
        set((state) => {
          const nextRunning = { ...state.running }
          delete nextRunning[key]
          const keyTotals = { ...(state.totals[key] ?? {}) }
          keyTotals[date] = (keyTotals[date] ?? 0) + elapsedSeconds
          return {
            running: nextRunning,
            totals: { ...state.totals, [key]: keyTotals },
          }
        })
      },

      getCommittedSeconds: (key, date = todayKey()) =>
        get().totals[key]?.[date] ?? 0,

      setCommittedSeconds: (key, date, seconds) =>
        set((state) => {
          const keyTotals = { ...(state.totals[key] ?? {}) }
          keyTotals[date] = Math.max(0, Math.floor(seconds))
          return { totals: { ...state.totals, [key]: keyTotals } }
        }),
    }),
    { name: 'timer-store' },
  ),
)

/** Committed seconds for `date` plus any currently-running elapsed time, re-rendering every second while running. */
export function useLiveSeconds(key: string, date?: DateKey): number {
  const startTs = useTimerStore((s) => s.running[key])
  const committed = useTimerStore((s) => s.getCommittedSeconds(key, date))
  const running = startTs != null

  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const isToday = date == null || date === todayKey()
  const liveSeconds = running && isToday ? Math.floor((Date.now() - startTs) / 1000) : 0
  return committed + liveSeconds
}

/** Committed+live seconds for `date` (defaults to today) across a fixed set of keys, ticking once per second while any of them is running on that date. */
export function useLiveSecondsMap(keys: string[], date?: DateKey): Record<string, number> {
  const running = useTimerStore((s) => s.running)
  const totals = useTimerStore((s) => s.totals)
  const targetDate = date ?? todayKey()
  const isToday = targetDate === todayKey()
  const anyRunning = isToday && keys.some((k) => running[k] != null)

  const [, forceTick] = useState(0)
  useEffect(() => {
    if (!anyRunning) return
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [anyRunning])

  const result: Record<string, number> = {}
  for (const key of keys) {
    const committed = totals[key]?.[targetDate] ?? 0
    const startTs = isToday ? running[key] : null
    const live = startTs != null ? Math.floor((Date.now() - startTs) / 1000) : 0
    result[key] = committed + live
  }
  return result
}
