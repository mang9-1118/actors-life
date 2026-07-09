// settings-store (API keys, Drive connection state) is device-specific and intentionally excluded.
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
