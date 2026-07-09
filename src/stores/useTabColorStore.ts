import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TRAINING_TAB_COLORS } from '@/lib/colors'
import { TRAINING_TABS, type TrainingTabId } from '@/types'

interface TabColorState {
  colors: Partial<Record<TrainingTabId, string>>
  setColor: (tabId: TrainingTabId, color: string) => void
  resetColors: () => void
}

export const useTabColorStore = create<TabColorState>()(
  persist(
    (set) => ({
      colors: {},
      setColor: (tabId, color) =>
        set((state) => ({ colors: { ...state.colors, [tabId]: color } })),
      resetColors: () => set({ colors: {} }),
    }),
    { name: 'tab-color-store' },
  ),
)

/** TRAINING_TAB_COLORS with any user-customized overrides applied. */
export function useTabColors(): Record<TrainingTabId, string> {
  const overrides = useTabColorStore((s) => s.colors)
  return useMemo(() => {
    const result = { ...TRAINING_TAB_COLORS }
    for (const tab of TRAINING_TABS) {
      const override = overrides[tab.id]
      if (override) result[tab.id] = override
    }
    return result
  }, [overrides])
}
