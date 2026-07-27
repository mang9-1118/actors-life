import { useState } from 'react'
import { useAuditionStore } from '@/stores/useAuditionStore'
import type { AuditionMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { draftToItem, emptyAuditionDraft, type AuditionDraft } from './auditionDraft'

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

export function AuditionForm() {
  const addItem = useAuditionStore((s) => s.addItem)
  const [draft, setDraft] = useState<AuditionDraft>(emptyAuditionDraft)

  const submit = () => {
    if (!draft.title.trim()) return
    addItem(draftToItem(draft))
    // The online/offline choice is kept, since it usually repeats between entries.
    setDraft({ ...emptyAuditionDraft(), mode: draft.mode })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <AuditionFields draft={draft} onChange={setDraft} />
        <Button onClick={submit} className="self-start">
          저장
        </Button>
      </CardContent>
    </Card>
  )
}
