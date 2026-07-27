import { useEffect, useRef } from 'react'
import { Bookmark } from 'lucide-react'
import { castingBookmarkletHref, currentAppUrl } from '@/lib/castingBookmarklet'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { Button } from '@/components/ui/button'

const LABEL = '오디션 가져오기'

/**
 * Dragged onto the bookmarks bar once, then pressed on a 필름메이커스 or 플필 notice
 * page to bring its 오디션명 · 작품 종류 · 마감일 back to the form. Filmmakers refuses
 * the server, so its notices can only be read by the member's own browser.
 */
export function CastingBookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null)
  // Read here rather than inside the bookmarklet, which runs on the casting site and
  // cannot see this app's settings. Changing the key means dragging the button again.
  const appAccessKey = useSettingsStore((s) => s.appAccessKey)

  // Assigned outside React, which strips `javascript:` hrefs. Pressing it here
  // rather than on a notice page just says so, which is the hint it needs.
  useEffect(() => {
    ref.current?.setAttribute('href', castingBookmarkletHref(currentAppUrl(), appAccessKey))
  }, [appAccessKey])

  return (
    <Button variant="outline" size="sm" asChild>
      <a ref={ref} href="" draggable>
        <Bookmark />
        {LABEL}
      </a>
    </Button>
  )
}

/**
 * Lives here so the sentence naming the button cannot drift from the button, and stays
 * a separate export so it can sit below the row the button belongs to. A bookmarklet
 * has no affordance for "drag me to the bookmarks bar", so this one line earns its keep.
 */
export function CastingBookmarkletHint() {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium">{LABEL}</span>를 북마크바에 끌어다 놓으면, 두 사이트의 공고
      페이지에서 눌러 가져올 수 있습니다.
    </p>
  )
}
