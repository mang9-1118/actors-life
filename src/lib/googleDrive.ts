export class DriveError extends Error {}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const BACKUP_FILE_NAME = 'actors-life-backup.json'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
            error_callback?: (error: { type?: string }) => void
          }): { requestAccessToken: () => void }
        }
      }
    }
  }
}

let gsiLoadPromise: Promise<void> | null = null

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gsiLoadPromise) return gsiLoadPromise
  gsiLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new DriveError('Google 인증 스크립트를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })
  return gsiLoadPromise
}

export async function requestDriveAccessToken(clientId: string): Promise<string> {
  if (!clientId.trim()) {
    throw new DriveError('Google OAuth 클라이언트 ID가 설정되지 않았습니다. 아래에 먼저 입력해주세요.')
  }
  await loadGsiScript()
  const oauth2 = window.google?.accounts.oauth2
  if (!oauth2) {
    throw new DriveError('Google 인증 스크립트를 불러오지 못했습니다.')
  }

  return new Promise<string>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new DriveError(`Google 인증에 실패했습니다: ${response.error ?? '알 수 없는 오류'}`))
          return
        }
        resolve(response.access_token)
      },
      error_callback: (error) => {
        reject(new DriveError(`Google 인증에 실패했습니다: ${error.type ?? '알 수 없는 오류'}`))
      },
    })
    tokenClient.requestAccessToken()
  })
}

async function findBackupFileId(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new DriveError(`Drive 파일 조회에 실패했습니다 (${res.status}).`)
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

function buildMultipartBody(metadata: object, content: string, boundary: string): string {
  return (
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    `${content}\r\n` +
    `--${boundary}--`
  )
}

async function uploadBackup(
  accessToken: string,
  fileId: string | null,
  content: string,
): Promise<string> {
  const boundary = 'actors_life_backup_boundary'
  const metadata = fileId ? {} : { name: BACKUP_FILE_NAME, mimeType: 'application/json' }
  const body = buildMultipartBody(metadata, content, boundary)
  const url = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

  const res = await fetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new DriveError(`Drive 업로드에 실패했습니다 (${res.status}). ${errorBody}`.trim())
  }
  const data = await res.json()
  return data.id as string
}

async function downloadBackup(accessToken: string, fileId: string): Promise<string> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new DriveError(`Drive 다운로드에 실패했습니다 (${res.status}).`)
  return res.text()
}

/** Uploads `content` as the app's backup file, creating it on first sync. Returns the file's Drive ID. */
export async function syncUpload(
  accessToken: string,
  knownFileId: string | null,
  content: string,
): Promise<string> {
  const targetId = knownFileId ?? (await findBackupFileId(accessToken))
  return uploadBackup(accessToken, targetId, content)
}

/** Downloads the app's backup file. Returns null if no backup exists yet on Drive. */
export async function syncDownload(
  accessToken: string,
  knownFileId: string | null,
): Promise<{ fileId: string; content: string } | null> {
  const targetId = knownFileId ?? (await findBackupFileId(accessToken))
  if (!targetId) return null
  const content = await downloadBackup(accessToken, targetId)
  return { fileId: targetId, content }
}
