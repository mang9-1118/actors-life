import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { computeAutoStatus } from '@/lib/auditionStatus'
import type { AuditionItem, AuditionStatus } from '@/types'

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
    { name: 'audition-store' },
  ),
)
