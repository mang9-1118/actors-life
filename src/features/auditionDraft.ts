import { todayKey } from '@/lib/time'
import type { AuditionItem, AuditionMode, DateKey } from '@/types'

/** What the audition form edits, before it is normalized into a stored item. */
export interface AuditionDraft {
  title: string
  organization: string
  mode: AuditionMode
  deadline: DateKey
  /** Empty string means "not decided yet"; stored as null. */
  announceDate: string
  memo: string
}

export const emptyAuditionDraft = (): AuditionDraft => ({
  title: '',
  organization: '',
  mode: 'offline',
  deadline: todayKey(),
  announceDate: '',
  memo: '',
})

export const draftFromItem = (item: AuditionItem): AuditionDraft => ({
  title: item.title,
  organization: item.organization,
  mode: item.mode,
  deadline: item.deadline,
  announceDate: item.announceDate ?? '',
  memo: item.memo,
})

export const draftToItem = (draft: AuditionDraft) => ({
  title: draft.title.trim(),
  organization: draft.organization.trim(),
  mode: draft.mode,
  deadline: draft.deadline,
  announceDate: draft.announceDate || null,
  memo: draft.memo,
})
