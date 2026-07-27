import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuditionStore } from '@/stores/useAuditionStore'
import {
  CastingError,
  fetchCastingNotice,
  parseImportedNotice,
  takePendingNotice,
  type CastingNotice,
} from '@/lib/casting'
import type { AuditionMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import {
  draftFromNotice,
  draftToItem,
  emptyAuditionDraft,
  type AuditionDraft,
} from './auditionDraft'

/** The audition detail fields, shared by the add form and the card's edit dialog. */
export function AuditionFields({
  draft,
  onChange,
}: {
  draft: AuditionDraft
  onChange: (draft: AuditionDraft) => void
}) {
  const set = <K extends keyof AuditionDraft>(key: K, value: AuditionDraft[K]) =>
    onChange({ ...draft, [key]: value })

  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        value={draft.title}
        onChange={(e) => set('title', e.target.value)}
        placeholder="오디션명"
        className="col-span-2"
      />
      <Input
        value={draft.organization}
        onChange={(e) => set('organization', e.target.value)}
        placeholder="지원처"
      />
      <Input
        value={draft.category}
        onChange={(e) => set('category', e.target.value)}
        placeholder="작품 종류"
      />
      <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
        마감일
        <Input type="date" value={draft.deadline} onChange={(e) => set('deadline', e.target.value)} />
      </Label>
      <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
        결과 발표일 (선택)
        <Input
          type="date"
          value={draft.announceDate}
          onChange={(e) => set('announceDate', e.target.value)}
        />
      </Label>
      <RadioGroup
        value={draft.mode}
        onValueChange={(value) => set('mode', value as AuditionMode)}
        className="col-span-2 grid-flow-col justify-start gap-6"
      >
        <Label className="flex items-center gap-2 text-sm font-normal">
          <RadioGroupItem value="offline" />
          오프라인
        </Label>
        <Label className="flex items-center gap-2 text-sm font-normal">
          <RadioGroupItem value="online" />
          온라인
        </Label>
      </RadioGroup>
      <Textarea
        value={draft.memo}
        onChange={(e) => set('memo', e.target.value)}
        placeholder="메모 (선택)"
        rows={2}
        className="col-span-2"
      />
    </div>
  )
}

/**
 * Fills the form below from a casting notice link, so the fields the notice
 * states are not retyped. Applications made through a notice link are online.
 */
function CastingUrlField({ onLoad }: { onLoad: (notice: CastingNotice) => void }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    const trimmed = url.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const found = await fetchCastingNotice(trimmed)
      onLoad(found)
      setUrl('')
      if (!found.deadline) setNotice('공고에 마감일이 없어 마감일은 그대로 두었습니다.')
    } catch (e) {
      setError(e instanceof CastingError ? e.message : '공고를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load()
          }}
          placeholder="공고 주소를 붙여넣으면 아래 양식이 채워집니다"
          className="flex-1"
        />
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? '불러오는 중...' : '불러오기'}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
    </div>
  )
}

export function AuditionForm() {
  const addItem = useAuditionStore((s) => s.addItem)
  const [draft, setDraft] = useState<AuditionDraft>(emptyAuditionDraft)
  const [importError, setImportError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()

  const fill = useCallback((notice: CastingNotice) => {
    setImportError('')
    setDraft((prev) => ({ ...prev, ...draftFromNotice(notice) }))
  }, [])

  /**
   * The bookmarklet leaves notices with the server rather than reaching into this tab,
   * which no page on a casting site is allowed to do. So the form asks whether one is
   * waiting: when this tab is looked at again, and on a slow tick while it is visible.
   */
  useEffect(() => {
    let active = true

    const check = async () => {
      if (document.hidden) return
      const waiting = await takePendingNotice()
      // Guarded after the await only: the cleanup below detaches every caller.
      if (waiting && active) fill(waiting)
    }

    check()
    // Slow, because looking at the tab is the real trigger; this only covers pressing
    // the bookmarklet in another window while this one is already in front. Each check
    // is a Blob listing, so a fast tick would spend requests for nothing.
    const timer = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      active = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [fill])

  // Kept for bookmarklets saved before the inbox existed, which navigate here with the
  // values in the hash instead of leaving them with the server.
  useEffect(() => {
    const raw = searchParams.get('import')
    if (!raw) return

    // Dropped whether or not it parses, so reloading the page cannot refill the form.
    const rest = new URLSearchParams(searchParams)
    rest.delete('import')
    setSearchParams(rest, { replace: true })

    const notice = parseImportedNotice(raw)
    if (!notice) {
      setImportError('공고 정보를 읽지 못했습니다. 공고 페이지에서 다시 눌러주세요.')
      return
    }
    fill(notice)
  }, [searchParams, setSearchParams, fill])

  const submit = () => {
    if (!draft.title.trim()) return
    addItem(draftToItem(draft))
    // The online/offline choice is kept, since it usually repeats between entries.
    setDraft({ ...emptyAuditionDraft(), mode: draft.mode })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <CastingUrlField onLoad={fill} />
        {importError && <p className="text-sm text-destructive">{importError}</p>}
        <AuditionFields draft={draft} onChange={setDraft} />
        <Button onClick={submit} className="self-start">
          저장
        </Button>
      </CardContent>
    </Card>
  )
}
