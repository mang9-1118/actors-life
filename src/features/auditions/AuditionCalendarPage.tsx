import { useMemo } from 'react'
import { useAuditionStore } from '@/stores/useAuditionStore'
import { currentYearMonthKey, toDateKey, yearMonthKey } from '@/lib/time'
import { Card, CardContent } from '@/components/ui/card'
import { AuditionCalendar } from './AuditionCalendar'

export function AuditionCalendarPage() {
  const items = useAuditionStore((s) => s.items)
  const totalCount = items.length

  const monthlyCount = useMemo(() => {
    const thisMonth = currentYearMonthKey()
    return items.filter((item) => yearMonthKey(toDateKey(new Date(item.createdAt))) === thisMonth)
      .length
  }, [items])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">오디션 캘린더</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <div className="text-sm text-muted-foreground">지금까지 지원한 오디션</div>
            <div className="mt-2 text-3xl font-semibold text-foreground">{totalCount}건</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm text-muted-foreground">이번 달 지원한 오디션</div>
            <div className="mt-2 text-3xl font-semibold text-foreground">{monthlyCount}건</div>
          </CardContent>
        </Card>
      </div>

      <AuditionCalendar />
    </div>
  )
}
