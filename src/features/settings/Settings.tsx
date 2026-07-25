import { useState } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTabColorStore, useTabColors } from '@/stores/useTabColorStore'
import {
  BackupSyncError,
  downloadBackupFromCloud,
  exportBackupJson,
  importBackupJson,
  uploadBackupToCloud,
} from '@/lib/backup'
import { TRAINING_TABS } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function Settings() {
  const appAccessKey = useSettingsStore((s) => s.appAccessKey)
  const setAppAccessKey = useSettingsStore((s) => s.setAppAccessKey)
  const [draftKey, setDraftKey] = useState(appAccessKey)
  const [savedKey, setSavedKey] = useState(false)

  const saveKey = () => {
    setAppAccessKey(draftKey.trim())
    setSavedKey(true)
    setTimeout(() => setSavedKey(false), 1500)
  }

  const lastSyncedAt = useSettingsStore((s) => s.lastSyncedAt)
  const setLastSyncedAt = useSettingsStore((s) => s.setLastSyncedAt)

  const [syncBusy, setSyncBusy] = useState<'backup' | 'restore' | null>(null)
  const [syncError, setSyncError] = useState('')
  const [syncNotice, setSyncNotice] = useState('')

  const backupNow = async () => {
    setSyncBusy('backup')
    setSyncError('')
    setSyncNotice('')
    try {
      const content = exportBackupJson()
      const updatedAt = await uploadBackupToCloud(content)
      setLastSyncedAt(updatedAt)
      setSyncNotice('백업이 저장되었습니다.')
    } catch (e) {
      setSyncError(e instanceof BackupSyncError ? e.message : '백업 중 오류가 발생했습니다.')
    } finally {
      setSyncBusy(null)
    }
  }

  const restoreFromCloud = async () => {
    if (!window.confirm('저장된 백업으로 복원하면 현재 기기에 저장된 데이터를 덮어씁니다. 계속할까요?')) {
      return
    }
    setSyncBusy('restore')
    setSyncError('')
    setSyncNotice('')
    try {
      const result = await downloadBackupFromCloud()
      if (!result) {
        setSyncError('저장된 백업이 아직 없습니다.')
        return
      }
      importBackupJson(result.content)
      setLastSyncedAt(result.updatedAt)
      window.location.reload()
    } catch (e) {
      setSyncError(e instanceof BackupSyncError ? e.message : '복원 중 오류가 발생했습니다.')
    } finally {
      setSyncBusy(null)
    }
  }

  const tabColors = useTabColors()
  const setTabColor = useTabColorStore((s) => s.setColor)
  const resetTabColors = useTabColorStore((s) => s.resetColors)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">설정</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">탭 색상</CardTitle>
          <Button variant="outline" size="sm" onClick={resetTabColors}>
            기본값으로 초기화
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            홈 화면 게이지와 주간 분석 그래프에서 각 훈련 탭을 나타내는 색상을 바꿀 수 있습니다.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {TRAINING_TABS.map((tab) => (
              <label
                key={tab.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
              >
                {tab.label}
                <input
                  type="color"
                  value={tabColors[tab.id]}
                  onChange={(e) => setTabColor(tab.id, e.target.value)}
                  className="h-7 w-10 cursor-pointer rounded border border-input bg-transparent"
                />
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI 기능 (Gemini)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Gemini API 키는 더 이상 브라우저에 저장하지 않고, Vercel 프로젝트의 서버 환경변수(
            <code>GEMINI_API_KEY</code>)로만 보관되어 <code>/api/gemini</code> 함수를 통해서만
            사용됩니다. 배포된 주소를 아는 다른 사람이 이 함수를 쓰지 못하도록 막고 싶다면, Vercel
            환경변수에 <code>APP_ACCESS_KEY</code>를 설정하고 아래에 동일한 값을 입력하세요.
            설정하지 않으면 이 검증은 건너뜁니다.
          </p>
          <Input
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="APP_ACCESS_KEY와 동일한 값 (선택)"
          />
          <Button onClick={saveKey} className="self-start">
            {savedKey ? '저장됨' : '저장'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">데이터 백업</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            위의 접근키(APP_ACCESS_KEY)를 저장해두면, 다른 기기에서도 같은 값을 입력하는 것만으로
            데이터를 백업하고 불러올 수 있습니다. 별도의 Google 로그인이나 API 키 발급 과정이
            필요하지 않습니다.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={backupNow} disabled={syncBusy != null}>
              {syncBusy === 'backup' ? '백업 중...' : '지금 백업'}
            </Button>
            <Button variant="outline" onClick={restoreFromCloud} disabled={syncBusy != null}>
              {syncBusy === 'restore' ? '복원 중...' : '백업에서 복원'}
            </Button>
          </div>

          {syncError && <p className="text-sm text-destructive">{syncError}</p>}
          {syncNotice && !syncError && <p className="text-sm text-foreground">{syncNotice}</p>}
          {lastSyncedAt != null && (
            <p className="text-xs text-muted-foreground">
              마지막 동기화: {new Date(lastSyncedAt).toLocaleString('ko-KR')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
