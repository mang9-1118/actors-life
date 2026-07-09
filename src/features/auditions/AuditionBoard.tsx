import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { useAuditionStore } from '@/stores/useAuditionStore'
import type { AuditionStatus } from '@/types'
import { AuditionColumn } from './AuditionColumn'

const COLUMNS: { status: AuditionStatus; label: string }[] = [
  { status: 'inProgress', label: '현재진행형' },
  { status: 'closed', label: '마감된 오디션' },
  { status: 'passed', label: '합격' },
  { status: 'failed', label: '불합격' },
]

export function AuditionBoard() {
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
