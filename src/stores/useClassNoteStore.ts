import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ClassNoteEntry } from '@/types'

interface ClassNoteState {
  notes: ClassNoteEntry[]
  addNote: (input: Omit<ClassNoteEntry, 'id' | 'createdAt'>) => void
  updateNote: (id: string, patch: Omit<ClassNoteEntry, 'id' | 'createdAt'>) => void
  removeNote: (id: string) => void
}

export const useClassNoteStore = create<ClassNoteState>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (input) =>
        set((state) => ({
          notes: [
            ...state.notes,
            { ...input, id: crypto.randomUUID(), createdAt: Date.now() },
          ],
        })),
      updateNote: (id, patch) =>
        set((state) => ({
          notes: state.notes.map((note) => (note.id === id ? { ...note, ...patch } : note)),
        })),
      removeNote: (id) =>
        set((state) => ({ notes: state.notes.filter((note) => note.id !== id) })),
    }),
    { name: 'class-note-store' },
  ),
)
