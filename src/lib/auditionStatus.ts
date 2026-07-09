import type { AuditionItem, AuditionStatus } from '@/types'

export function computeAutoStatus(item: AuditionItem): AuditionStatus {
  if (item.status === 'passed' || item.status === 'failed') return item.status
  const deadlinePassed = new Date(`${item.deadline}T23:59:59`).getTime() < Date.now()
  if (item.status === 'inProgress' && deadlinePassed) return 'closed'
  return item.status
}
