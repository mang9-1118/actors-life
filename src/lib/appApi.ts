import { useSettingsStore } from '@/stores/useSettingsStore'

/**
 * Authenticates against this app's own `/api/*` functions, which are all gated by the
 * same APP_ACCESS_KEY passphrase. Empty when no key is set, since the functions only
 * check when the server has one configured.
 */
export function authHeaders(): Record<string, string> {
  const appAccessKey = useSettingsStore.getState().appAccessKey
  return appAccessKey ? { 'x-app-key': appAccessKey } : {}
}
