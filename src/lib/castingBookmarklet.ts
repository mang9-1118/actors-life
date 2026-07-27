/**
 * The code a bookmarklet runs on a 필름메이커스 notice page.
 *
 * Filmmakers refuses requests from Vercel's addresses, so `/api/casting` cannot
 * read its notices (measured on both runtimes and regions — see next.md). A
 * member's own browser opens them normally, so the reading happens there instead
 * and the values are handed to the app through the URL.
 *
 * MUST stay self-contained: it is shipped by stringifying this function, so any
 * reference to module or import scope would be renamed by the bundler and throw
 * on the notice page. Everything it needs is declared inside, and it carries no
 * `//` comments so the serialized single line stays valid.
 */
function readFilmmakersNotice(appUrl: string): void {
  var visible = function (element: Element | null | undefined): string {
    var text = ((element && element.textContent) || '').replace(/\s+/g, ' ').trim()
    return text.indexOf('회원에게만') === -1 ? text : ''
  }

  var posting: Record<string, unknown> | null = null
  var scripts = document.querySelectorAll('script[type="application/ld+json"]')
  for (var i = 0; i < scripts.length; i++) {
    var parsed: unknown
    try {
      parsed = JSON.parse(scripts[i].textContent || '')
    } catch {
      continue
    }
    var nodes: unknown[] = Array.isArray(parsed) ? parsed : [parsed]
    for (var j = 0; j < nodes.length; j++) {
      var node = nodes[j] as Record<string, unknown> | null
      if (!node || typeof node !== 'object') continue
      var graph = node['@graph']
      if (Array.isArray(graph)) nodes = nodes.concat(graph)
      if (node['@type'] === 'JobPosting') posting = node
    }
  }

  if (!posting) {
    window.alert('필름메이커스 모집 공고 상세 페이지에서 눌러주세요.')
    return
  }

  var title = ''
  var labels = document.querySelectorAll('span')
  for (var k = 0; k < labels.length; k++) {
    if (visible(labels[k]) === '작품 제목') {
      title = visible(labels[k].nextElementSibling)
      if (title) break
    }
  }
  if (!title && typeof posting.title === 'string') title = posting.title.replace(/\s+/g, ' ').trim()
  if (!title) {
    window.alert('공고에서 오디션명을 찾지 못했습니다.')
    return
  }

  var deadline = ''
  if (typeof posting.validThrough === 'string') {
    var closes = new Date(posting.validThrough).getTime()
    if (!isNaN(closes)) deadline = new Date(closes + 9 * 3600 * 1000).toISOString().slice(0, 10)
  }

  var payload = {
    title: title,
    category: visible(document.querySelector('.text-sub.font-bold.opacity-80')),
    deadline: deadline,
    url: location.origin + location.pathname,
  }

  var target =
    appUrl + '#/train/audition-apply?import=' + encodeURIComponent(JSON.stringify(payload))
  var opened = window.open(target, '_blank')
  if (!opened) location.href = target
}

/**
 * The `javascript:` URL to drag onto the bookmarks bar. `appUrl` is baked in at
 * render time, so a bookmarklet taken from the deployed app returns to it (and
 * one taken from a local build returns there).
 */
export function castingBookmarkletHref(appUrl: string): string {
  return `javascript:void((${readFilmmakersNotice})(${JSON.stringify(appUrl)}))`
}

/** Where the bookmarklet sends its values, e.g. 'https://actors-life.vercel.app/'. */
export function currentAppUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}
