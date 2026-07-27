/**
 * The code a bookmarklet runs on a casting notice page, for both 필름메이커스 and 플필.
 *
 * Filmmakers refuses requests from Vercel's addresses, so `/api/casting` cannot read
 * its notices (measured on both runtimes and regions — see next.md). A member's own
 * browser opens them normally, so the reading happens there instead and the values
 * are handed to the app through the URL. plfil can be read either way; it is here too
 * so one button covers both sites.
 *
 * MUST stay self-contained: it is shipped by stringifying this function, so any
 * reference to module or import scope would be renamed by the bundler and throw on
 * the notice page. Everything it needs is declared inside, and it carries no `//`
 * comments so the serialized single line stays valid.
 */
function readCastingNotice(appUrl: string): void {
  var host = location.hostname.toLowerCase()
  var isPlfil = host.indexOf('plfil') !== -1
  var isFilmmakers = host.indexOf('filmmakers') !== -1
  if (!isPlfil && !isFilmmakers) {
    window.alert('필름메이커스나 플필의 모집 공고 페이지에서 눌러주세요.')
    return
  }

  var clean = function (text: string | null | undefined): string {
    return (text || '').replace(/\s+/g, ' ').trim()
  }

  /* Notice fields inside JSON stay HTML-escaped, and a detached textarea decodes
     them without running anything. Text taken from the DOM is already decoded. */
  var decode = function (value: unknown): string {
    if (typeof value !== 'string') return ''
    var area = document.createElement('textarea')
    area.innerHTML = value
    return clean(area.value)
  }

  var visible = function (element: Element | null | undefined): string {
    var text = clean(element && element.textContent)
    return text.indexOf('회원에게만') === -1 ? text : ''
  }

  /* Both sites state the last moment of a Korean calendar day, so shifting into
     KST yields the day each one displays. */
  var dateKey = function (iso: unknown): string {
    if (typeof iso !== 'string') return ''
    var closes = new Date(iso).getTime()
    if (isNaN(closes)) return ''
    return new Date(closes + 9 * 3600 * 1000).toISOString().slice(0, 10)
  }

  var title = ''
  var category = ''
  var deadline = ''

  if (isPlfil) {
    var nextData = document.getElementById('__NEXT_DATA__')
    var data: Record<string, unknown> | null = null
    if (nextData) {
      try {
        var parsedProps = JSON.parse(nextData.textContent || '') as {
          props?: { pageProps?: { data?: unknown } }
        }
        var payloadData = parsedProps.props?.pageProps?.data
        if (payloadData && typeof payloadData === 'object') {
          data = payloadData as Record<string, unknown>
        }
      } catch {
        data = null
      }
    }
    /* Only a notice detail page carries one notice, with its closing date, here. */
    if (!data || typeof data.castingEndDate !== 'string') {
      window.alert('플필 모집 공고 상세 페이지에서 눌러주세요.')
      return
    }
    title = decode(data.artWorkName) || decode(data.title)
    category = decode(data.artCategoryName)
    deadline = dateKey(data.castingEndDate)
  } else {
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

    var labels = document.querySelectorAll('span')
    for (var k = 0; k < labels.length; k++) {
      if (visible(labels[k]) === '작품 제목') {
        title = visible(labels[k].nextElementSibling)
        if (title) break
      }
    }
    if (!title) title = decode(posting.title)
    category = visible(document.querySelector('.text-sub.font-bold.opacity-80'))
    deadline = dateKey(posting.validThrough)
  }

  if (!title) {
    window.alert('공고에서 오디션명을 찾지 못했습니다.')
    return
  }

  var payload = {
    title: title,
    category: category,
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
  return `javascript:void((${readCastingNotice})(${JSON.stringify(appUrl)}))`
}

/** Where the bookmarklet sends its values, e.g. 'https://actors-life.vercel.app/'. */
export function currentAppUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}
