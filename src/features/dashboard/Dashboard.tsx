import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StackedBar } from '@/components/StackedBar'
import { useTodoStore } from '@/stores/useTodoStore'
import { useLiveSecondsMap, useTimerStore } from '@/stores/useTimerStore'
import { useOrderedTrainingTabs } from '@/stores/useTabOrderStore'
import { useTabColors } from '@/stores/useTabColorStore'
import { DAILY_GOAL_SECONDS, TRAINING_TABS } from '@/types'
import { addDays, formatDuration, formatKoreanDate, toDateKey } from '@/lib/time'

const TRAINING_TAB_IDS = TRAINING_TABS.map((tab) => tab.id)

function TodoChecklist() {
  const { items, addItem, toggleItem, removeItem } = useTodoStore()
  const [text, setText] = useState('')

  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    addItem(trimmed)
    setText('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">오늘 할 일</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="할 일을 입력하세요"
            className="h-9"
          />
          <Button onClick={submit}>추가</Button>
        </div>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
              <Checkbox
                checked={item.done}
                onCheckedChange={() => toggleItem(item.id)}
              />
              <span className={`flex-1 text-sm ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {item.text}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                삭제
              </button>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-sm text-muted-foreground">할 일이 없습니다.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}

function DailyGoalGauge() {
  const orderedTabs = useOrderedTrainingTabs()
  const tabColors = useTabColors()
  const setCommittedSeconds = useTimerStore((s) => s.setCommittedSeconds)
  const [dayOffset, setDayOffset] = useState(0)
  const isToday = dayOffset === 0
  const selectedDateKey = useMemo(() => toDateKey(addDays(new Date(), -dayOffset)), [dayOffset])

  const secondsByTab = useLiveSecondsMap(TRAINING_TAB_IDS, selectedDateKey)
  const totalSeconds = useMemo(
    () => Object.values(secondsByTab).reduce((sum, s) => sum + s, 0),
    [secondsByTab],
  )
  const overallPct = Math.min(100, (totalSeconds / DAILY_GOAL_SECONDS) * 100)

  const [editingTab, setEditingTab] = useState<{ id: string; label: string } | null>(null)
  const [draftHours, setDraftHours] = useState('0')
  const [draftMinutes, setDraftMinutes] = useState('0')

  const openEdit = (id: string, label: string) => {
    const seconds = secondsByTab[id] ?? 0
    setDraftHours(String(Math.floor(seconds / 3600)))
    setDraftMinutes(String(Math.floor((seconds % 3600) / 60)))
    setEditingTab({ id, label })
  }

  const saveEdit = () => {
    if (!editingTab) return
    const hours = Math.max(0, Number(draftHours) || 0)
    const minutes = Math.max(0, Number(draftMinutes) || 0)
    setCommittedSeconds(editingTab.id, selectedDateKey, hours * 3600 + minutes * 60)
    setEditingTab(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">
          {isToday ? '오늘의' : `${formatKoreanDate(selectedDateKey)}의`} 8시간 목표
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setDayOffset((o) => o + 1)}
            aria-label="이전 날"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={isToday}
            onClick={() => setDayOffset((o) => Math.max(0, o - 1))}
            aria-label="다음 날"
          >
            <ChevronRight />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">전체 달성률</span>
            <span className="font-mono text-lg font-semibold text-foreground">
              {formatDuration(totalSeconds)} / {formatDuration(DAILY_GOAL_SECONDS)} ({overallPct.toFixed(1)}%)
            </span>
          </div>
          <StackedBar
            goalSeconds={DAILY_GOAL_SECONDS}
            segments={orderedTabs.map((tab) => ({
              key: tab.id,
              label: tab.label,
              seconds: secondsByTab[tab.id] ?? 0,
              color: tabColors[tab.id],
            }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {orderedTabs.map((tab) => {
            const seconds = secondsByTab[tab.id] ?? 0
            const pct = (seconds / DAILY_GOAL_SECONDS) * 100
            return (
              <div key={tab.id} className="flex items-center gap-3 text-sm">
                <span className="flex w-24 shrink-0 items-center gap-2 text-foreground">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tabColors[tab.id] }}
                  />
                  {tab.label}
                </span>
                {isToday ? (
                  <span className="font-mono text-muted-foreground">
                    {formatDuration(seconds)} ({pct.toFixed(1)}%)
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`${tab.label} 기록 시간 수정`}
                    onClick={() => openEdit(tab.id, tab.label)}
                    className="cursor-pointer rounded-sm font-mono text-muted-foreground underline-offset-4 transition-colors hover:font-semibold hover:text-foreground hover:underline focus-visible:font-semibold focus-visible:text-foreground focus-visible:underline focus-visible:outline-none"
                  >
                    {formatDuration(seconds)} ({pct.toFixed(1)}%)
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>

      <Dialog open={editingTab != null} onOpenChange={(open) => !open && setEditingTab(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formatKoreanDate(selectedDateKey)} · {editingTab?.label} 기록 시간 수정
            </DialogTitle>
            <DialogDescription>
              기록을 깜빡했거나 잘못 기록한 날의 누적 시간을 직접 입력해 바로잡을 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dashboard-edit-hours">시간</Label>
              <Input
                id="dashboard-edit-hours"
                type="number"
                min={0}
                value={draftHours}
                onChange={(e) => setDraftHours(e.target.value)}
                className="w-20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dashboard-edit-minutes">분</Label>
              <Input
                id="dashboard-edit-minutes"
                type="number"
                min={0}
                max={59}
                value={draftMinutes}
                onChange={(e) => setDraftMinutes(e.target.value)}
                className="w-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTab(null)}>
              취소
            </Button>
            <Button onClick={saveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function Dashboard() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">홈</h1>
      <DailyGoalGauge />
      <TodoChecklist />
    </div>
  )
}
