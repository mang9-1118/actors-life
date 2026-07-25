import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTimerStore } from '@/stores/useTimerStore'
import { useAuditionStore } from '@/stores/useAuditionStore'
import { useAnalysisStore } from '@/stores/useAnalysisStore'
import { GeminiError, generateWeeklyComment } from '@/lib/gemini'
import {
  addDays,
  formatHoursMinutesFixed,
  formatHoursMinutesKorean,
  formatKoreanDate,
  startOfWeek,
  toDateKey,
  weekDateKeys,
} from '@/lib/time'
import { useOrderedTrainingTabs } from '@/stores/useTabOrderStore'
import { useTabColors } from '@/stores/useTabColorStore'
import { DAILY_GOAL_SECONDS } from '@/types'
import type { TrainingTabId } from '@/types'

function CategoryBarShape(
  props: any & { tabColors: Record<TrainingTabId, string> },
) {
  const { x, y, width, height, payload, tabColors } = props
  const color = tabColors[payload.tabId as TrainingTabId]
  const text = formatHoursMinutesKorean(payload.seconds)
  const insideFits = height > 20
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={6} ry={6} />
      <text
        x={x + width / 2}
        y={insideFits ? y + 18 : y - 8}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={insideFits ? '#ffffff' : '#3f3f46'}
      >
        {text}
      </text>
    </g>
  )
}

export function WeeklyAnalysis() {
  const orderedTabs = useOrderedTrainingTabs()
  const tabColors = useTabColors()
  const totals = useTimerStore((s) => s.totals)
  const auditionItems = useAuditionStore((s) => s.items)
  const weeklyComments = useAnalysisStore((s) => s.weeklyComments)
  const setWeeklyComment = useAnalysisStore((s) => s.setWeeklyComment)
  const weeklyCommentPrompt = useAnalysisStore((s) => s.weeklyCommentPrompt)
  const setWeeklyCommentPrompt = useAnalysisStore((s) => s.setWeeklyCommentPrompt)
  const weeklyGoalHours = useAnalysisStore((s) => s.weeklyGoalHours)
  const setWeeklyGoalHours = useAnalysisStore((s) => s.setWeeklyGoalHours)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [loadingComment, setLoadingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState('')
  const [draftGoalHours, setDraftGoalHours] = useState<Partial<Record<TrainingTabId, number>>>({})

  const weekKey = toDateKey(weekStart)
  const dateKeys = useMemo(() => weekDateKeys(weekStart), [weekStart])

  const { data, totalSeconds } = useMemo(() => {
    const rows = orderedTabs.map((tab) => {
      const seconds = dateKeys.reduce((sum, date) => sum + (totals[tab.id]?.[date] ?? 0), 0)
      return {
        category: tab.label,
        tabId: tab.id,
        hours: Math.round((seconds / 3600) * 100) / 100,
        seconds,
      }
    })
    const sum = rows.reduce((acc, r) => acc + r.seconds, 0)
    return { data: rows, totalSeconds: sum }
  }, [dateKeys, totals, orderedTabs])

  /** Days elapsed in the viewed week up to today: 7 for fully past weeks, 0 for fully future weeks. */
  const daysElapsedInWeek = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((today.getTime() - weekStart.getTime()) / 86400000)
    return Math.min(7, Math.max(0, diffDays + 1))
  }, [weekStart])

  const avgSeconds = daysElapsedInWeek > 0 ? totalSeconds / daysElapsedInWeek : 0

  const previousWeekDateKeys = useMemo(
    () => weekDateKeys(addDays(weekStart, -7)),
    [weekStart],
  )
  const previousHoursByTab = useMemo(() => {
    const map: Partial<Record<TrainingTabId, number>> = {}
    for (const tab of orderedTabs) {
      const seconds = previousWeekDateKeys.reduce(
        (sum, date) => sum + (totals[tab.id]?.[date] ?? 0),
        0,
      )
      map[tab.id] = Math.round((seconds / 3600) * 100) / 100
    }
    return map
  }, [previousWeekDateKeys, totals, orderedTabs])

  const goalAchievedDays = useMemo(
    () =>
      dateKeys.filter((date) => {
        const daySeconds = orderedTabs.reduce((sum, tab) => sum + (totals[tab.id]?.[date] ?? 0), 0)
        return daySeconds >= DAILY_GOAL_SECONDS
      }).length,
    [dateKeys, totals, orderedTabs],
  )

  const upcomingAuditions = useMemo(() => {
    const todayDateKey = toDateKey(new Date())
    return auditionItems
      .filter((item) => item.status === 'inProgress' && item.deadline >= todayDateKey)
      .sort((a, b) => a.deadline.localeCompare(b.deadline))
      .slice(0, 3)
      .map((item) => ({ title: item.title, deadline: formatKoreanDate(item.deadline) }))
  }, [auditionItems])

  const yAxisMax = useMemo(() => {
    const maxHours = Math.max(...data.map((row) => row.hours), 0)
    return Math.max(1, Math.ceil(maxHours))
  }, [data])
  const yAxisTicks = useMemo(
    () => Array.from({ length: yAxisMax + 1 }, (_, i) => i),
    [yAxisMax],
  )

  const auditionCount = useMemo(() => {
    const dateKeySet = new Set(dateKeys)
    return auditionItems.filter((item) => dateKeySet.has(toDateKey(new Date(item.createdAt)))).length
  }, [auditionItems, dateKeys])

  const weekLabel = `${formatKoreanDate(dateKeys[0])}(월) ~ ${formatKoreanDate(dateKeys[6])}(일)`

  const generateComment = async () => {
    setLoadingComment(true)
    setCommentError('')
    try {
      const comment = await generateWeeklyComment({
        weekLabel,
        totalHours: totalSeconds / 3600,
        byCategory: data.map((row) => ({
          label: row.category,
          hours: row.hours,
          previousHours: previousHoursByTab[row.tabId] ?? 0,
          goalHours: weeklyGoalHours[row.tabId] ?? 0,
        })),
        goalAchievedDays,
        totalDays: dateKeys.length,
        upcomingAuditions,
        customInstruction: weeklyCommentPrompt,
      })
      setWeeklyComment(weekKey, comment)
    } catch (e) {
      setCommentError(e instanceof GeminiError ? e.message : 'AI 코멘트 생성 중 오류가 발생했습니다.')
    } finally {
      setLoadingComment(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">주간 분석</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <div className="text-sm text-muted-foreground">선택한 주 총 훈련 시간</div>
            <div className="mt-2 text-3xl font-semibold text-amber-600">
              {formatHoursMinutesFixed(totalSeconds)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-sm text-muted-foreground">일 평균 훈련 시간</div>
            <div className="mt-2 text-3xl font-semibold text-sky-600">
              {formatHoursMinutesFixed(avgSeconds)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">카테고리별 훈련 시간 비교 (시간 단위)</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              이전 주
            </Button>
            <span className="text-sm text-muted-foreground">{weekLabel}</span>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              다음 주
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="category" stroke="#71717a" fontSize={12} />
              <YAxis
                stroke="#71717a"
                fontSize={12}
                domain={[0, yAxisMax]}
                ticks={yAxisTicks}
                allowDataOverflow
              />
              <Bar
                dataKey="hours"
                shape={(props: any) => <CategoryBarShape {...props} tabColors={tabColors} />}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-4 text-sm text-muted-foreground">
            이번 주 지원한 오디션: <span className="font-medium text-foreground">{auditionCount}건</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-lg">AI 개인화 코멘트</CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="AI 코멘트 기준 설정"
              onClick={() => {
                setDraftPrompt(weeklyCommentPrompt)
                setDraftGoalHours(weeklyGoalHours)
                setPromptDialogOpen(true)
              }}
            >
              <Settings />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={generateComment} disabled={loadingComment}>
            {loadingComment ? '생성 중...' : weeklyComments[weekKey] ? '다시 생성' : '코멘트 생성'}
          </Button>
        </CardHeader>
        <CardContent>
          {commentError && <p className="text-sm text-destructive">{commentError}</p>}
          {!commentError && (
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {weeklyComments[weekKey] ?? '이 주의 훈련 기록을 바탕으로 AI 코멘트를 생성해보세요.'}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 코멘트 기준 설정</DialogTitle>
            <DialogDescription>
              AI가 주간 코멘트를 작성할 때 참고할 기준이나 강조하고 싶은 내용을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label>카테고리별 주간 목표 시간 (시간)</Label>
            <div className="grid grid-cols-2 gap-2">
              {orderedTabs.map((tab) => (
                <div key={tab.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">{tab.label}</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={draftGoalHours[tab.id] ?? ''}
                    onChange={(e) =>
                      setDraftGoalHours((prev) => ({
                        ...prev,
                        [tab.id]: e.target.value === '' ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="미설정"
                    className="w-20"
                  />
                </div>
              ))}
            </div>
          </div>
          <Textarea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            placeholder="예: 발성 연습량이 부족하면 반드시 지적해줘. 항상 다정한 말투로 작성해줘."
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                setWeeklyCommentPrompt(draftPrompt)
                setWeeklyGoalHours(draftGoalHours)
                setPromptDialogOpen(false)
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
