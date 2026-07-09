import { useState } from 'react'
import { useAuditionStore } from '@/stores/useAuditionStore'
import { todayKey } from '@/lib/time'
import type { AuditionMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

export function AuditionForm() {
  const addItem = useAuditionStore((s) => s.addItem)
  const [title, setTitle] = useState('')
  const [organization, setOrganization] = useState('')
  const [mode, setMode] = useState<AuditionMode>('offline')
  const [deadline, setDeadline] = useState(todayKey())
  const [announceDate, setAnnounceDate] = useState(todayKey())
  const [memo, setMemo] = useState('')

  const submit = () => {
    if (!title.trim()) return
    addItem({
      title: title.trim(),
      organization: organization.trim(),
      mode,
      deadline,
      announceDate: announceDate || null,
      memo,
    })
    setTitle('')
    setOrganization('')
    setDeadline(todayKey())
    setAnnounceDate(todayKey())
    setMemo('')
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="오디션명"
          />
          <Input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="지원처"
          />
          <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
            마감일
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Label>
          <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
            결과 발표일 (선택)
            <Input
              type="date"
              value={announceDate}
              onChange={(e) => setAnnounceDate(e.target.value)}
            />
          </Label>
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as AuditionMode)}
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
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="메모 (선택)"
            rows={2}
            className="col-span-2"
          />
        </div>
        <Button onClick={submit} className="self-start">
          저장
        </Button>
      </CardContent>
    </Card>
  )
}
