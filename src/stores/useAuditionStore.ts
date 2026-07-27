import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuditionItem, AuditionStatus } from '@/types'

/** An in-progress audition whose deadline has passed counts as closed; decided ones never change. */
function computeAutoStatus(item: AuditionItem): AuditionStatus {
  if (item.status === 'passed' || item.status === 'failed') return item.status
  const deadlinePassed = new Date(`${item.deadline}T23:59:59`).getTime() < Date.now()
  if (item.status === 'inProgress' && deadlinePassed) return 'closed'
  return item.status
}

/** Backfills fields added by the casting-notice import; existing values always win. */
function migrateImportedFields(persisted: unknown): unknown {
  const state = persisted as { items?: unknown } | undefined
  if (!Array.isArray(state?.items)) return persisted
  return {
    ...state,
    items: state.items.map((item: unknown) => ({ url: '', category: '', ...(item as object) })),
  }
}

type NewAuditionInput = Omit<
  AuditionItem,
  'id' | 'status' | 'createdAt' | 'auditionDate' | 'auditionTime' | 'auditionLocation'
>

interface AuditionState {
  items: AuditionItem[]
  addItem: (input: NewAuditionInput) => void
  updateItem: (id: string, patch: Partial<AuditionItem>) => void
  removeItem: (id: string) => void
  setStatus: (id: string, status: AuditionStatus) => void
  refreshAutoStatuses: () => void
}

export const useAuditionStore = create<AuditionState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (input) =>
        set((state) => ({
          items: [
            ...state.items,
            {
              ...input,
              id: crypto.randomUUID(),
              status: 'inProgress',
              auditionDate: null,
              auditionTime: '',
              auditionLocation: '',
              createdAt: Date.now(),
            },
          ],
        })),

      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...patch } : item,
          ),
        })),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      setStatus: (id, status) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, status } : item)),
        })),

      refreshAutoStatuses: () =>
        set((state) => ({
          items: state.items.map((item) => {
            const nextStatus = computeAutoStatus(item)
            return nextStatus === item.status ? item : { ...item, status: nextStatus }
          }),
        })),
    }),
    {
      name: 'audition-store',
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          return migrateImportedFields(persistedState)
        }
        return persistedState
      },
    },
  ),
)
