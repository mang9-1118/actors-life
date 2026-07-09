/** Extracts the video ID from common YouTube URL formats, or null if not a recognizable YouTube link. */
export function getYoutubeVideoId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0]
    return id || null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v')
    }
    const match = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/)
    if (match) return match[2]
  }

  return null
}

export function getYoutubeEmbedUrl(rawUrl: string): string | null {
  const id = getYoutubeVideoId(rawUrl)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

/** Fetches the video title via YouTube's public oEmbed endpoint (no API key required). */
export async function getYoutubeTitle(rawUrl: string): Promise<string | null> {
  const id = getYoutubeVideoId(rawUrl)
  if (!id) return null
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
    )
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.title === 'string' ? data.title : null
  } catch {
    return null
  }
}
