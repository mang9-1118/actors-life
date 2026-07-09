import { useEffect } from 'react'
import { useAuditionStore } from '@/stores/useAuditionStore'
import { AuditionForm } from './AuditionForm'
import { AuditionBoard } from './AuditionBoard'

export function Auditions() {
  const refreshAutoStatuses = useAuditionStore((s) => s.refreshAutoStatuses)

  useEffect(() => {
    refreshAutoStatuses()
    const id = setInterval(refreshAutoStatuses, 60_000)
    return () => clearInterval(id)
  }, [refreshAutoStatuses])

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">오디션 현황 보드</h1>

      <AuditionForm />

      <AuditionBoard />
    </div>
  )
}
