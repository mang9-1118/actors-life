import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  appAccessKey: string
  setAppAccessKey: (key: string) => void
  lastSyncedAt: number | null
  setLastSyncedAt: (ts: number | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appAccessKey: '',
      setAppAccessKey: (key) => set({ appAccessKey: key }),
      lastSyncedAt: null,
      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
    }),
    { name: 'settings-store' },
  ),
)
