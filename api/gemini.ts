import type { VercelRequest, VercelResponse } from '@vercel/node'

const MODEL = 'gemini-2.5-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiPart {
  text?: string
  fileData?: { fileUri: string }
}

interface GeminiTurn {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

/**
 * Proxies Gemini requests so GEMINI_API_KEY only ever lives in Vercel's server
 * environment, never in client-shipped code. Optionally gated by APP_ACCESS_KEY
 * (a personal passphrase) so the deployed URL can't be used by strangers who find it.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const accessKey = process.env.APP_ACCESS_KEY
  if (accessKey && req.headers['x-app-key'] !== accessKey) {
    res.status(401).json({ error: '접근 권한이 없습니다.' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았습니다.' })
    return
  }

  const contents = (req.body as { contents?: GeminiTurn[] } | undefined)?.contents
  if (!Array.isArray(contents)) {
    res.status(400).json({ error: 'contents가 필요합니다.' })
    return
  }

  const geminiRes = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  })

  const data = (await geminiRes.json().catch(() => null)) as {
    error?: { message?: string }
  } | null
  if (!geminiRes.ok) {
    res.status(geminiRes.status).json({
      error: data?.error?.message ?? `Gemini API 요청이 실패했습니다 (${geminiRes.status}).`,
    })
    return
  }

  res.status(200).json(data)
}
