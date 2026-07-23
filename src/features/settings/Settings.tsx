import { useState } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTabColorStore, useTabColors } from '@/stores/useTabColorStore'
import { DriveError, requestDriveAccessToken, syncDownload, syncUpload } from '@/lib/googleDrive'
import { exportBackupJson, importBackupJson } from '@/lib/backup'
import { TRAINING_TABS } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

  const googleClientId = useSettingsStore((s) => s.googleClientId)
  const setGoogleClientId = useSettingsStore((s) => s.setGoogleClientId)
  const driveFileId = useSettingsStore((s) => s.driveFileId)
  const setDriveFileId = useSettingsStore((s) => s.setDriveFileId)
  const lastSyncedAt = useSettingsStore((s) => s.lastSyncedAt)
  const setLastSyncedAt = useSettingsStore((s) => s.setLastSyncedAt)

  const [draftClientId, setDraftClientId] = useState(googleClientId)
  const [savedClientId, setSavedClientId] = useState(false)
  const [driveBusy, setDriveBusy] = useState<'backup' | 'restore' | null>(null)
  const [driveError, setDriveError] = useState('')
  const [driveNotice, setDriveNotice] = useState('')

  const saveClientId = () => {
    setGoogleClientId(draftClientId.trim())
    setSavedClientId(true)
    setTimeout(() => setSavedClientId(false), 1500)
  }

  const backupNow = async () => {
    setDriveBusy('backup')
    setDriveError('')
    setDriveNotice('')
    try {
      const accessToken = await requestDriveAccessToken(googleClientId)
      const content = exportBackupJson()
      const fileId = await syncUpload(accessToken, driveFileId, content)
      setDriveFileId(fileId)
      setLastSyncedAt(Date.now())
      setDriveNotice('Drive에 백업이 저장되었습니다.')
    } catch (e) {
      setDriveError(e instanceof DriveError ? e.message : 'Drive 백업 중 오류가 발생했습니다.')
    } finally {
      setDriveBusy(null)
    }
  }

  const restoreFromDrive = async () => {
    if (!window.confirm('Drive의 백업으로 복원하면 현재 기기에 저장된 데이터를 덮어씁니다. 계속할까요?')) {
      return
    }
    setDriveBusy('restore')
    setDriveError('')
    setDriveNotice('')
    try {
      const accessToken = await requestDriveAccessToken(googleClientId)
      const result = await syncDownload(accessToken, driveFileId)
      if (!result) {
        setDriveError('Drive에 저장된 백업이 아직 없습니다.')
        return
      }
      importBackupJson(result.content)
      setDriveFileId(result.fileId)
      setLastSyncedAt(Date.now())
      window.location.reload()
    } catch (e) {
      setDriveError(e instanceof DriveError ? e.message : 'Drive 복원 중 오류가 발생했습니다.')
    } finally {
      setDriveBusy(null)
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
          <CardTitle className="text-lg">Google Drive 동기화</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Google Cloud 콘솔에서 Drive API를 사용 설정하고, OAuth 2.0 클라이언트 ID(웹 애플리케이션)를
            만든 뒤 승인된 자바스크립트 원본에 이 앱 주소(예: http://localhost:5173)를 추가하세요.
            발급받은 클라이언트 ID를 아래에 입력하면, 앱 데이터를 본인 Drive에 백업/복원할 수 있습니다.
            데이터는 <span className="font-medium text-foreground">이 앱이 만든 파일에만</span> 접근하는
            권한(drive.file)만 사용합니다.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="google-client-id">Google OAuth 클라이언트 ID</Label>
            <div className="flex gap-2">
              <Input
                id="google-client-id"
                value={draftClientId}
                onChange={(e) => setDraftClientId(e.target.value)}
                placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                className="flex-1"
              />
              <Button variant="outline" onClick={saveClientId}>
                {savedClientId ? '저장됨' : '저장'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={backupNow} disabled={!googleClientId || driveBusy != null}>
              {driveBusy === 'backup' ? '백업 중...' : '지금 백업'}
            </Button>
            <Button
              variant="outline"
              onClick={restoreFromDrive}
              disabled={!googleClientId || driveBusy != null}
            >
              {driveBusy === 'restore' ? '복원 중...' : 'Drive에서 복원'}
            </Button>
          </div>

          {driveError && <p className="text-sm text-destructive">{driveError}</p>}
          {driveNotice && !driveError && <p className="text-sm text-foreground">{driveNotice}</p>}
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
