import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OTHER_TABS, TRAINING_TABS } from '@/types'
import type { OtherTabId, OtherTabMeta, TrainingTabId, TrainingTabMeta } from '@/types'

interface TabOrderState<Id extends string> {
  order: Id[]
  setOrder: (order: Id[]) => void
}

function createTabOrderStore<Id extends string>(name: string, defaultOrder: Id[]) {
  return create<TabOrderState<Id>>()(
    persist(
      (set) => ({
        order: defaultOrder,
        setOrder: (order) => set({ order }),
      }),
      { name },
    ),
  )
}

/** `tabs` reordered per the user's saved order, with any new/unknown tabs appended at the end. */
function useOrderedTabs<Id extends string, Meta extends { id: Id }>(
  tabs: Meta[],
  order: Id[],
): Meta[] {
  return useMemo(() => {
    const byId = new Map(tabs.map((tab) => [tab.id, tab]))
    const ordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!)
    const missing = tabs.filter((tab) => !order.includes(tab.id))
    return [...ordered, ...missing]
  }, [tabs, order])
}

export const useTabOrderStore = createTabOrderStore<TrainingTabId>(
  'tab-order-store',
  TRAINING_TABS.map((tab) => tab.id),
)

export const useOtherTabOrderStore = createTabOrderStore<OtherTabId>(
  'other-tab-order-store',
  OTHER_TABS.map((tab) => tab.id),
)

export function useOrderedTrainingTabs(): TrainingTabMeta[] {
  return useOrderedTabs(TRAINING_TABS, useTabOrderStore((s) => s.order))
}

export function useOrderedOtherTabs(): OtherTabMeta[] {
  return useOrderedTabs(OTHER_TABS, useOtherTabOrderStore((s) => s.order))
}
