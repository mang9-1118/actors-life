import { useEffect } from 'react'
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { useAuditionStore } from '@/stores/useAuditionStore'
import type { AuditionItem, AuditionStatus } from '@/types'
import { AuditionForm } from './AuditionForm'
import { AuditionCard } from './AuditionCard'

const COLUMNS: { status: AuditionStatus; label: string }[] = [
  { status: 'inProgress', label: '현재진행형' },
  { status: 'closed', label: '마감된 오디션' },
  { status: 'passed', label: '합격' },
  { status: 'failed', label: '불합격' },
]

function AuditionColumn({
  status,
  label,
  items,
}: {
  status: AuditionStatus
  label: string
  items: AuditionItem[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[200px] w-64 shrink-0 flex-col gap-2 rounded-2xl border p-3 ${
        isOver ? 'border-primary bg-accent' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center justify-between px-1 text-sm font-semibold text-foreground">
        {label}
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <AuditionCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function AuditionBoard() {
  const items = useAuditionStore((s) => s.items)
  const setStatus = useAuditionStore((s) => s.setStatus)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const nextStatus = over.id as AuditionStatus
    if (COLUMNS.some((c) => c.status === nextStatus)) {
      setStatus(active.id as string, nextStatus)
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <AuditionColumn
            key={col.status}
            status={col.status}
            label={col.label}
            items={items.filter((item) => item.status === col.status)}
          />
        ))}
      </div>
    </DndContext>
  )
}

export function Auditions() {
  const refreshAutoStatuses = useAuditionStore((s) => s.refreshAutoStatuses)

  useEffect(() => {
    refreshAutoStatuses()
    const id = setInterval(refreshAutoStatuses, 60_000)
    return () => clearInterval(id)
  }, [refreshAutoStatuses])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">오디션 현황 보드</h1>

      <AuditionForm />

      <AuditionBoard />
    </div>
  )
}
