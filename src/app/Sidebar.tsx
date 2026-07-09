import { NavLink } from 'react-router-dom'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useOrderedTrainingTabs, useTabOrderStore } from '@/stores/useTabOrderStore'
import { useOrderedOtherTabs, useOtherTabOrderStore } from '@/stores/useOtherTabOrderStore'
import { useSidebarStore } from '@/stores/useSidebarStore'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-4 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  }`

const sectionLabelClass = 'px-4 pt-5 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70'

interface SortableItem {
  id: string
  label: string
  to: string
}

function SortableNavItem({ item }: { item: SortableItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-0.5 px-1">
      <button
        {...attributes}
        {...listeners}
        aria-label={`${item.label} 탭 순서 변경`}
        className="touch-none rounded p-1 text-muted-foreground/40 hover:text-muted-foreground"
      >
        <GripVertical className="size-3.5" />
      </button>
      <NavLink to={item.to} className={linkClass} style={{ flex: 1 }}>
        {item.label}
      </NavLink>
    </div>
  )
}

function SortableNavList({
  items,
  onReorder,
}: {
  items: SortableItem[]
  onReorder: (ids: string[]) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = items.map((item) => item.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableNavItem key={item.id} item={item} />
        ))}
      </SortableContext>
    </DndContext>
  )
}

function TrainingTabList() {
  const orderedTabs = useOrderedTrainingTabs()
  const setOrder = useTabOrderStore((s) => s.setOrder)
  const items = orderedTabs.map((tab) => ({ id: tab.id, label: tab.label, to: `/train/${tab.path}` }))

  return (
    <SortableNavList
      items={items}
      onReorder={(ids) => setOrder(ids as typeof orderedTabs[number]['id'][])}
    />
  )
}

function OtherTabList() {
  const orderedTabs = useOrderedOtherTabs()
  const setOrder = useOtherTabOrderStore((s) => s.setOrder)
  const items = orderedTabs.map((tab) => ({ id: tab.id, label: tab.label, to: tab.path }))

  return (
    <SortableNavList
      items={items}
      onReorder={(ids) => setOrder(ids as typeof orderedTabs[number]['id'][])}
    />
  )
}

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed)
  const toggle = useSidebarStore((s) => s.toggle)

  if (collapsed) {
    return (
      <div className="flex h-full w-12 shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-4">
        <button
          onClick={toggle}
          aria-label="탭 목록 열기"
          className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PanelLeftOpen className="size-5" />
        </button>
        <NavLink
          to="/settings"
          aria-label="설정"
          className={({ isActive }) =>
            `mt-auto rounded-lg p-2 text-lg leading-none transition-colors ${
              isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
            }`
          }
        >
          ⚙️
        </NavLink>
      </div>
    )
  }

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-4 text-sidebar-foreground">
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="text-lg font-heading font-semibold">
          🎬 <span className="text-primary">배우</span>의 삶
        </div>
        <button
          onClick={toggle}
          aria-label="탭 목록 닫기"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavLink to="/" end className={linkClass}>
          홈
        </NavLink>

        <div className={sectionLabelClass}>집중 시간 트래커</div>
        <TrainingTabList />

        <div className={sectionLabelClass}>기타</div>
        <OtherTabList />
      </div>

      <div className="px-4 pt-3">
        <NavLink
          to="/settings"
          aria-label="설정"
          className={({ isActive }) =>
            `flex size-9 items-center justify-center rounded-lg text-lg leading-none transition-colors ${
              isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent'
            }`
          }
        >
          ⚙️
        </NavLink>
      </div>
    </nav>
  )
}
