import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClassNoteEntry, MediaLogEntry, ReadingLogEntry } from '@/types'

interface Entry {
  id: string
  createdAt: number
}

interface EntryState<T extends Entry> {
  entries: T[]
  addEntry: (input: Omit<T, 'id' | 'createdAt'>) => void
  updateEntry: (id: string, patch: Omit<T, 'id' | 'createdAt'>) => void
  removeEntry: (id: string) => void
}

/**
 * A persisted list of records with add/update/remove — the shape every log tab needs.
 * `persistedKey` is the property name used inside localStorage; it has to keep matching
 * what already-saved data and existing cloud backups use.
 */
function createEntryStore<T extends Entry>(name: string, persistedKey = 'entries') {
  return create<EntryState<T>>()(
    persist(
      (set) => ({
        entries: [],
        addEntry: (input) =>
          set((state) => ({
            entries: [
              ...state.entries,
              { ...input, id: crypto.randomUUID(), createdAt: Date.now() } as T,
            ],
          })),
        updateEntry: (id, patch) =>
          set((state) => ({
            entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          })),
        removeEntry: (id) =>
          set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      }),
      {
        name,
        partialize: (state) => ({ [persistedKey]: state.entries }),
        merge: (persisted, current) => ({
          ...current,
          entries:
            ((persisted as Record<string, unknown> | undefined)?.[persistedKey] as T[]) ??
            current.entries,
        }),
      },
    ),
  )
}

export const useMediaLogStore = createEntryStore<MediaLogEntry>('media-log-store')
export const useReadingLogStore = createEntryStore<ReadingLogEntry>('reading-log-store')
export const useClassNoteStore = createEntryStore<ClassNoteEntry>('class-note-store', 'notes')
