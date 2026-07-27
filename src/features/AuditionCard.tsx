import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useAuditionStore } from '@/stores/useAuditionStore'
import { formatKoreanDate } from '@/lib/time'
import type { AuditionItem } from '@/types'
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
import { RowActions } from '@/components/common'
import { AuditionFields } from './AuditionForm'
import { draftFromItem, draftToItem, type AuditionDraft } from './auditionDraft'

export function AuditionCard({ item }: { item: AuditionItem }) {
  const setStatus = useAuditionStore((s) => s.setStatus)
  const updateItem = useAuditionStore((s) => s.updateItem)
  const removeItem = useAuditionStore((s) => s.removeItem)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  })

  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<AuditionDraft>(() => draftFromItem(item))

  const openEdit = () => {
    setDraft(draftFromItem(item))
    setEditOpen(true)
  }

  const saveEdit = () => {
    if (!draft.title.trim()) return
    updateItem(item.id, draftToItem(draft))
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
          <div className="shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <RowActions onEdit={openEdit} onDelete={() => removeItem(item.id)} />
          </div>
        </div>
        {(item.organization || item.category) && (
          <div className="text-xs text-muted-foreground">
            {[item.organization, item.category].filter(Boolean).join(' · ')}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          마감 {formatKoreanDate(item.deadline)} · {item.mode === 'online' ? '온라인' : '오프라인'}
        </div>
        {item.announceDate && (
          <div className="text-xs text-muted-foreground">
            발표 {formatKoreanDate(item.announceDate)}
          </div>
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
          <AuditionFields draft={draft} onChange={setDraft} />
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
