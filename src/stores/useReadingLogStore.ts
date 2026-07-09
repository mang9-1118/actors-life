import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ReadingLogEntry } from '@/types'

interface ReadingLogState {
  entries: ReadingLogEntry[]
  addEntry: (input: Omit<ReadingLogEntry, 'id' | 'createdAt'>) => void
  updateEntry: (id: string, patch: Omit<ReadingLogEntry, 'id' | 'createdAt'>) => void
  removeEntry: (id: string) => void
}

export const useReadingLogStore = create<ReadingLogState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (input) =>
        set((state) => ({
          entries: [
            ...state.entries,
            { ...input, id: crypto.randomUUID(), createdAt: Date.now() },
          ],
        })),
      updateEntry: (id, patch) =>
        set((state) => ({
          entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeEntry: (id) =>
        set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'reading-log-store' },
  ),
)
