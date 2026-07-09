import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { useTimerStore, useLiveSeconds } from '@/stores/useTimerStore'
import { formatDuration, todayKey } from '@/lib/time'

interface TimerProps {
  timerKey: string
  label?: string
}

export function Timer({ timerKey, label }: TimerProps) {
  const start = useTimerStore((s) => s.start)
  const stop = useTimerStore((s) => s.stop)
  const setCommittedSeconds = useTimerStore((s) => s.setCommittedSeconds)
  const running = useTimerStore((s) => s.running[timerKey] != null)
  const displaySeconds = useLiveSeconds(timerKey)

  const [editOpen, setEditOpen] = useState(false)
  const [draftHours, setDraftHours] = useState('0')
  const [draftMinutes, setDraftMinutes] = useState('0')

  const openEdit = () => {
    setDraftHours(String(Math.floor(displaySeconds / 3600)))
    setDraftMinutes(String(Math.floor((displaySeconds % 3600) / 60)))
    setEditOpen(true)
  }

  const saveEdit = () => {
    if (running) stop(timerKey)
    const hours = Math.max(0, Number(draftHours) || 0)
    const minutes = Math.max(0, Number(draftMinutes) || 0)
    setCommittedSeconds(timerKey, todayKey(), hours * 3600 + minutes * 60)
    setEditOpen(false)
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8">
        {label && <div className="text-sm text-muted-foreground">{label}</div>}
        <div className="flex items-center gap-2">
          <div
            className={`font-mono text-5xl tabular-nums ${
              running ? 'text-amber-600' : 'text-foreground'
            }`}
          >
            {formatDuration(displaySeconds)}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="오늘 기록 시간 수동 수정"
            onClick={openEdit}
          >
            <Pencil />
          </Button>
        </div>
        <Button
          onClick={() => (running ? stop(timerKey) : start(timerKey))}
          variant={running ? 'outline' : 'default'}
          className={`rounded-full px-8 ${
            running ? 'border-amber-600 text-amber-600 hover:bg-amber-50' : ''
          }`}
        >
          {running ? '일시정지' : '시작'}
        </Button>
      </CardContent>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>오늘 기록 시간 수정</DialogTitle>
            <DialogDescription>
              정지를 깜빡했을 때 등, 오늘 누적 기록 시간을 직접 입력해 바로잡을 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${timerKey}-edit-hours`}>시간</Label>
              <Input
                id={`${timerKey}-edit-hours`}
                type="number"
                min={0}
                value={draftHours}
                onChange={(e) => setDraftHours(e.target.value)}
                className="w-20"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${timerKey}-edit-minutes`}>분</Label>
              <Input
                id={`${timerKey}-edit-minutes`}
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
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              취소
            </Button>
            <Button onClick={saveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
