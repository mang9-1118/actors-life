import { useMemo, useState } from 'react'
import Calendar from 'react-calendar'
import { Star } from 'lucide-react'
import 'react-calendar/dist/Calendar.css'
import './calendar-theme.css'
import { useAuditionStore } from '@/stores/useAuditionStore'
import { useTimerStore } from '@/stores/useTimerStore'
import { useOrderedTrainingTabs } from '@/stores/tabOrder'
import { useTabColors } from '@/stores/useTabColorStore'
import {
  currentYearMonthKey,
  formatHoursMinutesKorean,
  formatKoreanDate,
  toDateKey,
  yearMonthKey,
} from '@/lib/time'
import { DAILY_GOAL_SECONDS, TRAINING_TAB_IDS } from '@/types'
import type { AuditionItem, DateKey, TrainingTabId } from '@/types'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatCard } from '@/components/common'

interface DayBreakdownRow {
  tabId: TrainingTabId
  label: string
  seconds: number
}

type DateTag = 'deadline' | 'announce' | 'audition'

const TAG_META: Record<DateTag, { label: string; color: string }> = {
  deadline: { label: '마감', color: '#f43f5e' },
  announce: { label: '발표', color: '#0ea5e9' },
  audition: { label: '오디션', color: '#10b981' },
}

function tagsForItemOnDate(item: AuditionItem, dateKey: DateKey): DateTag[] {
  const tags: DateTag[] = []
  if (item.deadline === dateKey) tags.push('deadline')
  if (item.announceDate === dateKey) tags.push('announce')
  if (item.auditionDate === dateKey) tags.push('audition')
  return tags
}

export function AuditionCalendarPage() {
  const items = useAuditionStore((s) => s.items)

  const monthlyCount = useMemo(() => {
    const thisMonth = currentYearMonthKey()
    return items.filter((item) => yearMonthKey(toDateKey(new Date(item.createdAt))) === thisMonth)
      .length
  }, [items])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">오디션 캘린더</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="지금까지 지원한 오디션" value={`${items.length}건`} />
        <StatCard label="이번 달 지원한 오디션" value={`${monthlyCount}건`} />
      </div>

      <AuditionCalendar />
    </div>
  )
}

function AuditionCalendar() {
  const items = useAuditionStore((s) => s.items)
  const updateItem = useAuditionStore((s) => s.updateItem)
  const totals = useTimerStore((s) => s.totals)
  const orderedTabs = useOrderedTrainingTabs()
  const tabColors = useTabColors()
  const [selected, setSelected] = useState<string>(toDateKey(new Date()))

  const dailyBreakdown = useMemo(() => {
    const map = new Map<DateKey, DayBreakdownRow[]>()
    for (const tab of orderedTabs) {
      const tabTotals = totals[tab.id]
      if (!tabTotals) continue
      for (const [dateKey, seconds] of Object.entries(tabTotals)) {
        if (!seconds) continue
        const list = map.get(dateKey) ?? []
        list.push({ tabId: tab.id, label: tab.label, seconds })
        map.set(dateKey, list)
      }
    }
    return map
  }, [orderedTabs, totals])

  const goalAchievedDates = useMemo(() => {
    const dates = new Set<DateKey>()
    for (const tabId of TRAINING_TAB_IDS) {
      for (const dateKey of Object.keys(totals[tabId] ?? {})) {
        if (dates.has(dateKey)) continue
        const totalSeconds = TRAINING_TAB_IDS.reduce(
          (sum, id) => sum + (totals[id]?.[dateKey] ?? 0),
          0,
        )
        if (totalSeconds >= DAILY_GOAL_SECONDS) dates.add(dateKey)
      }
    }
    return dates
  }, [totals])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, AuditionItem[]>()
    for (const item of items) {
      const dateKeys = new Set<DateKey>([item.deadline])
      if (item.announceDate) dateKeys.add(item.announceDate)
      if (item.auditionDate) dateKeys.add(item.auditionDate)
      for (const dateKey of dateKeys) {
        const list = map.get(dateKey) ?? []
        list.push(item)
        map.set(dateKey, list)
      }
    }
    return map
  }, [items])

  const selectedItems = itemsByDate.get(selected) ?? []

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Card className="app-calendar flex-[2] p-6">
        <Calendar
          onClickDay={(date) => setSelected(toDateKey(date))}
          tileContent={({ date, view }) => {
            if (view !== 'month') return null
            const dateKey = toDateKey(date)
            const achievedGoal = goalAchievedDates.has(dateKey)
            const dayItems = itemsByDate.get(dateKey)
            const dayBreakdown = dailyBreakdown.get(dateKey) ?? []
            const tagsPresent = new Set<DateTag>()
            if (dayItems) {
              for (const item of dayItems) {
                for (const tag of tagsForItemOnDate(item, dateKey)) tagsPresent.add(tag)
              }
            }
            if (!achievedGoal && tagsPresent.size === 0 && dayBreakdown.length === 0) return null
            return (
              <>
                {dayBreakdown.length > 0 && (
                  <div className="app-calendar-tooltip">
                    {dayBreakdown.map((row) => (
                      <div key={row.tabId} className="flex items-center gap-1.5">
                        <span
                          className="inline-block size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: tabColors[row.tabId] }}
                        />
                        <span>
                          {row.label} {formatHoursMinutesKorean(row.seconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {achievedGoal && (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-[0.55em]"
                    aria-label="8시간 목표 달성"
                  >
                    <Star className="size-10 -translate-y-[15.7143%] fill-amber-300 text-amber-300 opacity-60" />
                  </div>
                )}
                {tagsPresent.size > 0 && (
                  <div className="flex justify-center gap-0.5">
                    {(['deadline', 'announce', 'audition'] as const)
                      .filter((tag) => tagsPresent.has(tag))
                      .map((tag) => (
                        <div
                          key={tag}
                          className="app-calendar-dot"
                          style={{ backgroundColor: TAG_META[tag].color }}
                        />
                      ))}
                  </div>
                )}
              </>
            )
          }}
        />
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {(Object.keys(TAG_META) as DateTag[]).map((tag) => (
            <span key={tag} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: TAG_META[tag].color }}
              />
              {TAG_META[tag].label}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            8시간 목표 달성
          </span>
        </div>
      </Card>
      <Card className="p-4 lg:w-64 lg:shrink-0">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{formatKoreanDate(selected)}</h3>
        <ul className="flex flex-col gap-2">
          {selectedItems.map((item) => {
            const tags = tagsForItemOnDate(item, selected)
            return (
              <li key={item.id} className="rounded-lg bg-muted px-3 py-2 text-sm">
                <div className="font-medium text-foreground">{item.title}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: TAG_META[tag].color }}
                    >
                      {TAG_META[tag].label}
                    </span>
                  ))}
                </div>
                {tags.includes('audition') && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
                      시간
                      <Input
                        type="time"
                        value={item.auditionTime}
                        onChange={(e) => updateItem(item.id, { auditionTime: e.target.value })}
                        className="h-7 text-xs"
                      />
                    </Label>
                    <Label className="flex flex-col items-start gap-1 text-xs text-muted-foreground">
                      오디션 장소
                      <Input
                        value={item.auditionLocation}
                        onChange={(e) => updateItem(item.id, { auditionLocation: e.target.value })}
                        placeholder="장소를 입력하세요"
                        className="h-7 text-xs"
                      />
                    </Label>
                  </div>
                )}
              </li>
            )
          })}
          {selectedItems.length === 0 && (
            <li className="text-sm text-muted-foreground">해당 날짜에 등록된 오디션이 없습니다.</li>
          )}
        </ul>
      </Card>
    </div>
  )
}
