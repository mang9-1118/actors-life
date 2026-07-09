import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TRAINING_TABS, type TrainingTabId, type TrainingTabMeta } from '@/types'

interface TabOrderState {
  order: TrainingTabId[]
  setOrder: (order: TrainingTabId[]) => void
}

export const useTabOrderStore = create<TabOrderState>()(
  persist(
    (set) => ({
      order: TRAINING_TABS.map((tab) => tab.id),
      setOrder: (order) => set({ order }),
    }),
    { name: 'tab-order-store' },
  ),
)

/** TRAINING_TABS reordered per the user's saved order, with any new/unknown tabs appended at the end. */
export function useOrderedTrainingTabs(): TrainingTabMeta[] {
  const order = useTabOrderStore((s) => s.order)
  return useMemo(() => {
    const byId = new Map(TRAINING_TABS.map((tab) => [tab.id, tab]))
    const ordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!)
    const missing = TRAINING_TABS.filter((tab) => !order.includes(tab.id))
    return [...ordered, ...missing]
  }, [order])
}
