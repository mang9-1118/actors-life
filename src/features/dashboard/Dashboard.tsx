import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { StackedBar } from '@/components/StackedBar'
import { useTodoStore } from '@/stores/useTodoStore'
import { useLiveSecondsMap } from '@/stores/useTimerStore'
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
  const [dayOffset, setDayOffset] = useState(0)
  const isToday = dayOffset === 0
  const selectedDateKey = useMemo(() => toDateKey(addDays(new Date(), -dayOffset)), [dayOffset])

  const secondsByTab = useLiveSecondsMap(TRAINING_TAB_IDS, selectedDateKey)
  const totalSeconds = useMemo(
    () => Object.values(secondsByTab).reduce((sum, s) => sum + s, 0),
    [secondsByTab],
  )
  const overallPct = Math.min(100, (totalSeconds / DAILY_GOAL_SECONDS) * 100)

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
                <span className="font-mono text-muted-foreground">
                  {formatDuration(seconds)} ({pct.toFixed(1)}%)
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
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
