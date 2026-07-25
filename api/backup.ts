import type { VercelRequest, VercelResponse } from '@vercel/node'
import { list, put } from '@vercel/blob'

const BACKUP_PATHNAME = 'actors-life-backup.json'

/**
 * Stores/retrieves a single app backup blob in Vercel Blob, gated by the same
 * APP_ACCESS_KEY passphrase used by /api/gemini. Lets any device sync data
 * without per-device OAuth setup (unlike the previous Google Drive flow).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const accessKey = process.env.APP_ACCESS_KEY
  if (accessKey && req.headers['x-app-key'] !== accessKey) {
    res.status(401).json({ error: '접근 권한이 없습니다.' })
    return
  }

  if (req.method === 'POST') {
    const body = req.body as { content?: string } | undefined
    if (!body || typeof body.content !== 'string') {
      res.status(400).json({ error: '백업 데이터가 필요합니다.' })
      return
    }
    try {
      await put(BACKUP_PATHNAME, body.content, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      })
      res.status(200).json({ updatedAt: Date.now() })
    } catch (e) {
      console.error('backup upload failed', e)
      res.status(500).json({ error: `백업 저장에 실패했습니다: ${e instanceof Error ? e.message : String(e)}` })
    }
    return
  }

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: BACKUP_PATHNAME, limit: 1 })
      const blob = blobs.find((b) => b.pathname === BACKUP_PATHNAME)
      if (!blob) {
        res.status(404).json({ error: '저장된 백업이 아직 없습니다.' })
        return
      }
      const fileRes = await fetch(blob.url)
      if (!fileRes.ok) {
        res.status(502).json({ error: '백업 파일을 불러오지 못했습니다.' })
        return
      }
      const content = await fileRes.text()
      res.status(200).json({ content, updatedAt: new Date(blob.uploadedAt).getTime() })
    } catch (e) {
      console.error('backup download failed', e)
      res.status(500).json({ error: `백업 조회에 실패했습니다: ${e instanceof Error ? e.message : String(e)}` })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
