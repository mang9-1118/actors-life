import type { VercelRequest, VercelResponse } from '@vercel/node'
import { del, get, list, put } from '@vercel/blob'

const INBOX_PREFIX = 'casting-inbox/'
const INBOX_SUFFIX = '.json'

/**
 * Origins the bookmarklet posts from. A browser will not let a casting site read
 * this endpoint's answer without them, and nothing else is allowed to.
 */
const ALLOWED_ORIGINS = [
  'https://www.filmmakers.co.kr',
  'https://filmmakers.co.kr',
  'https://plfil.com',
  'https://www.plfil.com',
]

/** A notice someone pressed the bookmarklet on stops being interesting quickly. */
const MAX_AGE_MS = 30 * 60 * 1000

/** Enough for a notice's few short fields; anything larger is not one. */
const MAX_BYTES = 4000

/**
 * Hands casting notices from the bookmarklet to whichever tab has the app open.
 *
 * A bookmarklet runs on the casting site's page, which the browser keeps walled off
 * from unrelated tabs — window names only resolve inside the opener's own group, and
 * a third-party iframe's storage is partitioned away from the real app. So the values
 * take the long way around: the bookmarklet POSTs them here, and the open app tab
 * picks them up on its next look (see `takePendingNotice`).
 *
 * Gated by the same APP_ACCESS_KEY as the other endpoints, which is why the key is
 * baked into the bookmarklet.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin
  if (typeof origin === 'string' && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-app-key')
    res.setHeader('Access-Control-Max-Age', '86400')
  }
  // Answers the preflight the bookmarklet's JSON body and key header provoke.
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const accessKey = process.env.APP_ACCESS_KEY
  if (accessKey && req.headers['x-app-key'] !== accessKey) {
    res.status(401).json({ error: '접근 권한이 없습니다.' })
    return
  }

  if (req.method === 'POST') {
    const notice = req.body as Record<string, unknown> | undefined
    if (!notice || typeof notice !== 'object' || typeof notice.title !== 'string') {
      res.status(400).json({ error: '공고 정보가 필요합니다.' })
      return
    }

    const content = JSON.stringify({
      title: notice.title,
      category: typeof notice.category === 'string' ? notice.category : '',
      deadline: typeof notice.deadline === 'string' ? notice.deadline : '',
      url: typeof notice.url === 'string' ? notice.url : '',
    })
    if (content.length > MAX_BYTES) {
      res.status(413).json({ error: '공고 정보가 너무 큽니다.' })
      return
    }

    try {
      await put(`${INBOX_PREFIX}${Date.now()}${INBOX_SUFFIX}`, content, {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
      })
      await dropStale()
      res.status(200).json({ ok: true })
    } catch (e) {
      console.error('casting inbox write failed', e)
      res.status(500).json({ error: '공고를 앱으로 보내지 못했습니다.' })
    }
    return
  }

  // The app asks for whatever is waiting. Reading empties the inbox, so the same
  // notice is never filled in twice; the newest wins when several are waiting.
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ prefix: INBOX_PREFIX })
      const fresh = blobs
        .filter((b) => Date.now() - b.uploadedAt.getTime() < MAX_AGE_MS)
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())

      let notice: unknown = null
      if (fresh.length) {
        const result = await get(fresh[0].pathname, { access: 'private' })
        if (result?.statusCode === 200 && result.stream) {
          notice = JSON.parse(await new Response(result.stream).text())
        }
      }
      if (blobs.length) await del(blobs.map((b) => b.url))

      res.status(200).json({ notice })
    } catch (e) {
      console.error('casting inbox read failed', e)
      res.status(500).json({ error: '대기 중인 공고를 확인하지 못했습니다.' })
    }
    return
  }

  res.status(405).json({ error: 'Method not allowed' })
}

/** Keeps a forgotten press from waiting around for the next time the app is opened. */
async function dropStale(): Promise<void> {
  const { blobs } = await list({ prefix: INBOX_PREFIX })
  const stale = blobs.filter((b) => Date.now() - b.uploadedAt.getTime() >= MAX_AGE_MS)
  if (stale.length) await del(stale.map((b) => b.url))
}
