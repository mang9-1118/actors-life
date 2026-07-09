import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { OTHER_TABS, type OtherTabId, type OtherTabMeta } from '@/types'

interface OtherTabOrderState {
  order: OtherTabId[]
  setOrder: (order: OtherTabId[]) => void
}

export const useOtherTabOrderStore = create<OtherTabOrderState>()(
  persist(
    (set) => ({
      order: OTHER_TABS.map((tab) => tab.id),
      setOrder: (order) => set({ order }),
    }),
    { name: 'other-tab-order-store' },
  ),
)

/** OTHER_TABS reordered per the user's saved order, with any new/unknown tabs appended at the end. */
export function useOrderedOtherTabs(): OtherTabMeta[] {
  const order = useOtherTabOrderStore((s) => s.order)
  return useMemo(() => {
    const byId = new Map(OTHER_TABS.map((tab) => [tab.id, tab]))
    const ordered = order.filter((id) => byId.has(id)).map((id) => byId.get(id)!)
    const missing = OTHER_TABS.filter((tab) => !order.includes(tab.id))
    return [...ordered, ...missing]
  }, [order])
}
