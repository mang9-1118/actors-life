import { useDroppable } from '@dnd-kit/core'
import type { AuditionItem, AuditionStatus } from '@/types'
import { AuditionCard } from './AuditionCard'

export function AuditionColumn({
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
