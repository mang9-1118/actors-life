import { useEffect, useRef } from 'react'
import { Bookmark } from 'lucide-react'
import { castingBookmarkletHref, currentAppUrl } from '@/lib/castingBookmarklet'
import { Button } from '@/components/ui/button'

/**
 * Dragged onto the bookmarks bar once, then pressed on a 필름메이커스 notice page to
 * bring its 오디션명 · 작품 종류 · 마감일 back to the form. Filmmakers refuses the
 * server, so its notices can only be read by the member's own browser.
 */
export function CastingBookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null)

  // Assigned outside React, which strips `javascript:` hrefs. Pressing it here
  // rather than on a notice page just says so, which is the hint it needs.
  useEffect(() => {
    ref.current?.setAttribute('href', castingBookmarkletHref(currentAppUrl()))
  }, [])

  return (
    <Button variant="outline" size="sm" asChild>
      <a ref={ref} href="" draggable>
        <Bookmark />
        오디션 가져오기
      </a>
    </Button>
  )
}
