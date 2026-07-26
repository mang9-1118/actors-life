import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DurationDialog } from '@/components/common'
import { useTimerStore, useLiveSeconds } from '@/stores/useTimerStore'
import { formatDuration, todayKey } from '@/lib/time'

export function Timer({ timerKey }: { timerKey: string }) {
  const start = useTimerStore((s) => s.start)
  const stop = useTimerStore((s) => s.stop)
  const setCommittedSeconds = useTimerStore((s) => s.setCommittedSeconds)
  const running = useTimerStore((s) => s.running[timerKey] != null)
  const displaySeconds = useLiveSeconds(timerKey)

  const [editOpen, setEditOpen] = useState(false)

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8">
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
            onClick={() => setEditOpen(true)}
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

      <DurationDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="오늘 기록 시간 수정"
        description="정지를 깜빡했을 때 등, 오늘 누적 기록 시간을 직접 입력해 바로잡을 수 있습니다."
        idPrefix={`${timerKey}-edit`}
        seconds={displaySeconds}
        onSave={(seconds) => {
          if (running) stop(timerKey)
          setCommittedSeconds(timerKey, todayKey(), seconds)
        }}
      />
    </Card>
  )
}
