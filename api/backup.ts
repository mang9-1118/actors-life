import type { VercelRequest, VercelResponse } from '@vercel/node'
import { del, get, list, put } from '@vercel/blob'

const BACKUP_PREFIX = 'actors-life-backup/'
const BACKUP_SUFFIX = '.json'
const MAX_BACKUPS = 3

function pathnameFor(id: number): string {
  return `${BACKUP_PREFIX}${id}${BACKUP_SUFFIX}`
}

function idFromPathname(pathname: string): string {
  return pathname.slice(BACKUP_PREFIX.length, -BACKUP_SUFFIX.length)
}

/**
 * Stores/retrieves up to MAX_BACKUPS timestamped backup snapshots in Vercel
 * Blob, gated by the same APP_ACCESS_KEY passphrase used by /api/gemini.
 * Lets any device sync data without per-device OAuth setup (unlike the
 * previous Google Drive flow), and keeps a short history so a bad backup or
 * restore isn't unrecoverable.
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
      const id = Date.now()
      await put(pathnameFor(id), body.content, {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
      })

      const { blobs } = await list({ prefix: BACKUP_PREFIX })
      const stale = [...blobs].sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()).slice(MAX_BACKUPS)
      if (stale.length) await del(stale.map((b) => b.url))

      res.status(200).json({ id: String(id), updatedAt: id })
    } catch (e) {
      console.error('backup upload failed', e)
      res.status(500).json({ error: `백업 저장에 실패했습니다: ${e instanceof Error ? e.message : String(e)}` })
    }
    return
  }

  if (req.method === 'GET') {
    const id = req.query.id
    try {
      if (typeof id === 'string') {
        const result = await get(pathnameFor(Number(id)), { access: 'private' })
        if (!result || result.statusCode !== 200 || !result.stream) {
          res.status(404).json({ error: '해당 백업을 찾을 수 없습니다.' })
          return
        }
        const content = await new Response(result.stream).text()
        res.status(200).json({ content, updatedAt: new Date(result.blob.uploadedAt).getTime() })
        return
      }

      const { blobs } = await list({ prefix: BACKUP_PREFIX })
      const backups = [...blobs]
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .slice(0, MAX_BACKUPS)
        .map((b) => ({ id: idFromPathname(b.pathname), updatedAt: b.uploadedAt.getTime() }))
      res.status(200).json({ backups })
    } catch (e) {
      console.error('backup list/download failed', e)
      res.status(500).json({ error: `백업 조회에 실패했습니다: ${e instanceof Error ? e.message : String(e)}` })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}
