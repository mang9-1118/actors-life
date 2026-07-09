import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  geminiApiKey: string
  setGeminiApiKey: (key: string) => void
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
      geminiApiKey: '',
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
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
