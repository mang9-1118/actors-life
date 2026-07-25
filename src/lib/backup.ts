import { useSettingsStore } from '@/stores/useSettingsStore'

// settings-store (API keys, sync state) is device-specific and intentionally excluded.
const BACKED_UP_STORE_KEYS = [
  'timer-store',
  'analysis-store',
  'audition-store',
  'class-note-store',
  'media-log-store',
  'reading-log-store',
  'todo-store',
  'tab-order-store',
  'other-tab-order-store',
] as const

export function exportBackupJson(): string {
  const data: Record<string, string> = {}
  for (const key of BACKED_UP_STORE_KEYS) {
    const value = localStorage.getItem(key)
    if (value != null) data[key] = value
  }
  return JSON.stringify({ version: 1, exportedAt: Date.now(), data })
}

export function importBackupJson(json: string): void {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('백업 파일 형식이 올바르지 않습니다.')
  }
  const data = (parsed as { data?: Record<string, unknown> } | null)?.data
  if (!data || typeof data !== 'object') {
    throw new Error('백업 파일 형식이 올바르지 않습니다.')
  }
  for (const key of BACKED_UP_STORE_KEYS) {
    const value = data[key]
    if (typeof value === 'string') localStorage.setItem(key, value)
  }
}

export class BackupSyncError extends Error {}

function authHeaders(): Record<string, string> {
  const appAccessKey = useSettingsStore.getState().appAccessKey
  return appAccessKey ? { 'x-app-key': appAccessKey } : {}
}

/** Uploads the current backup JSON to the server. Returns the sync timestamp. */
export async function uploadBackupToCloud(content: string): Promise<number> {
  const res = await fetch('/api/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new BackupSyncError(data?.error ?? `백업 저장에 실패했습니다 (${res.status}).`)
  }
  return data.updatedAt as number
}

/** Downloads the backup JSON from the server. Returns null if no backup exists yet. */
export async function downloadBackupFromCloud(): Promise<{ content: string; updatedAt: number } | null> {
  const res = await fetch('/api/backup', { headers: authHeaders() })
  if (res.status === 404) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new BackupSyncError(data?.error ?? `백업 조회에 실패했습니다 (${res.status}).`)
  }
  return { content: data.content as string, updatedAt: data.updatedAt as number }
}
