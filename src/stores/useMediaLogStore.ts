import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MediaLogEntry } from '@/types'

interface MediaLogState {
  entries: MediaLogEntry[]
  addEntry: (input: Omit<MediaLogEntry, 'id' | 'createdAt'>) => void
  updateEntry: (id: string, patch: Omit<MediaLogEntry, 'id' | 'createdAt'>) => void
  removeEntry: (id: string) => void
}

export const useMediaLogStore = create<MediaLogState>()(
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
    { name: 'media-log-store' },
  ),
)
