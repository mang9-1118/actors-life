import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  appAccessKey: string
  setAppAccessKey: (key: string) => void
  googleClientId: string
  setGoogleClientId: (id: string) => void
  driveFileId: string | null
  setDriveFileId: (id: string | null) => void
  lastSyncedAt: number | null
  setLastSyncedAt: (ts: number | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      appAccessKey: '',
      setAppAccessKey: (key) => set({ appAccessKey: key }),
      googleClientId: '',
      setGoogleClientId: (id) => set({ googleClientId: id }),
      driveFileId: null,
      setDriveFileId: (id) => set({ driveFileId: id }),
      lastSyncedAt: null,
      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
    }),
    { name: 'settings-store' },
  ),
)
