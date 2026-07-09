import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useAuditionStore } from '@/stores/useAuditionStore'
import { formatKoreanDate, todayKey } from '@/lib/time'
import type { AuditionItem, AuditionMode } from '@/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'

export function AuditionCard({ item }: { item: AuditionItem }) {
  const setStatus = useAuditionStore((s) => s.setStatus)
  const updateItem = useAuditionStore((s) => s.updateItem)
  const removeItem = useAuditionStore((s) => s.removeItem)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  })

  const [editOpen, setEditOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editOrganization, setEditOrganization] = useState('')
  const [editMode, setEditMode] = useState<AuditionMode>('offline')
  const [editDeadline, setEditDeadline] = useState(todayKey())
  const [editAnnounceDate, setEditAnnounceDate] = useState('')
  const [editMemo, setEditMemo] = useState('')

  const openEdit = () => {
    setEditTitle(item.title)
    setEditOrganization(item.organization)
    setEditMode(item.mode)
    setEditDeadline(item.deadline)
    setEditAnnounceDate(item.announceDate ?? '')
    setEditMemo(item.memo)
    setEditOpen(true)
  }

  const saveEdit = () => {
    if (!editTitle.trim()) return
    updateItem(item.id, {
      title: editTitle.trim(),
      organization: editOrganization.trim(),
      mode: editMode,
      deadline: editDeadline,
      announceDate: editAnnounceDate || null,
      memo: editMemo,
    })
    setEditOpen(false)
  }

  return (
    <>
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`gap-1 p-3 text-sm ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{item.title}</span>
        <div className="flex shrink-0 gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={openEdit}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            수정
          </button>
          <button
            onClick={() => removeItem(item.id)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            삭제
          </button>
        </div>
      </div>
      {item.organization && <div className="text-xs text-muted-foreground">{item.organization}</div>}
      <div className="text-xs text-muted-foreground">
        마감 {formatKoreanDate(item.deadline)} · {item.mode === 'online' ? '온라인' : '오프라인'}
      </div>
      {item.announceDate && (
        <div className="text-xs text-muted-foreground">발표 {formatKoreanDate(item.announceDate)}</div>
      )}

      {item.status === 'closed' && (
        <div className="mt-2 flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={() => setStatus(item.id, 'passed')}
            className="flex-1 bg-amber-500 text-white hover:bg-amber-600"
          >
            합격
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStatus(item.id, 'failed')}
            className="flex-1"
          >
            불합격
          </Button>
        </div>
      )}

      {item.status === 'passed' && (
        <Label
          className="mt-2 flex flex-col items-start gap-1 text-xs text-muted-foreground"
          onPointerDown={(e) => e.stopPropagation()}
        >
          오디션 날짜
          <Input
            type="date"
            value={item.auditionDate ?? ''}
            onChange={(e) => updateItem(item.id, { auditionDate: e.target.value || null })}
            className="h-7 text-xs"
          />
        </Label>
      )}
    </Card>

    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>오디션 정보 수정</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="오디션명"
          />
          <Input
            value={editOrganization}
            onChange={(e) => setEditOrganization(e.target.value)}
            placeholder="지원처"
          />
          <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
            마감일
            <Input
              type="date"
              value={editDeadline}
              onChange={(e) => setEditDeadline(e.target.value)}
            />
          </Label>
          <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
            결과 발표일 (선택)
            <Input
              type="date"
              value={editAnnounceDate}
              onChange={(e) => setEditAnnounceDate(e.target.value)}
            />
          </Label>
          <RadioGroup
            value={editMode}
            onValueChange={(value) => setEditMode(value as AuditionMode)}
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
            value={editMemo}
            onChange={(e) => setEditMemo(e.target.value)}
            placeholder="메모 (선택)"
            rows={2}
            className="col-span-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditOpen(false)}>
            취소
          </Button>
          <Button onClick={saveEdit}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
