import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ConceptSummary,
  DateKey,
  LectureAnalysisEntry,
  ScriptAnalysis1,
  ScriptAnalysis2,
  TrainingTabId,
} from '@/types'

interface AnalysisState {
  scripts1: ScriptAnalysis1[]
  scripts2: ScriptAnalysis2[]
  conceptSummaries: ConceptSummary[]
  lectureAnalyses: LectureAnalysisEntry[]
  weeklyComments: Partial<Record<DateKey, string>>
  weeklyCommentPrompt: string
  weeklyGoalHours: Partial<Record<TrainingTabId, number>>
  lectureAnalysisPrompt: string
  conceptSummaryPrompt: string

  addScript1: (input: Omit<ScriptAnalysis1, 'id' | 'createdAt'>) => void
  updateScript1: (id: string, patch: Omit<ScriptAnalysis1, 'id' | 'createdAt'>) => void
  removeScript1: (id: string) => void

  addScript2: (input: Omit<ScriptAnalysis2, 'id' | 'createdAt'>) => void
  updateScript2: (id: string, patch: Omit<ScriptAnalysis2, 'id' | 'createdAt'>) => void
  removeScript2: (id: string) => void

  addConceptSummary: (input: Omit<ConceptSummary, 'id' | 'createdAt'>) => string
  appendConceptMessage: (id: string, message: ChatMessage) => void
  removeConceptSummary: (id: string) => void

  addLectureAnalysis: (input: Omit<LectureAnalysisEntry, 'id' | 'createdAt'>) => string
  appendLectureMessage: (id: string, message: ChatMessage) => void
  removeLectureAnalysis: (id: string) => void

  setWeeklyComment: (weekKey: DateKey, comment: string) => void
  setWeeklyCommentPrompt: (prompt: string) => void
  setWeeklyGoalHours: (goals: Partial<Record<TrainingTabId, number>>) => void
  setLectureAnalysisPrompt: (prompt: string) => void
  setConceptSummaryPrompt: (prompt: string) => void
}

type ChatMessage = { role: 'user' | 'model'; text: string }

const added = <T extends { id: string; createdAt: number }>(
  list: T[],
  input: Omit<T, 'id' | 'createdAt'>,
  id: string,
): T[] => [...list, { ...input, id, createdAt: Date.now() } as T]

const patched = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] =>
  list.map((item) => (item.id === id ? { ...item, ...patch } : item))

const removed = <T extends { id: string }>(list: T[], id: string): T[] =>
  list.filter((item) => item.id !== id)

const messageAppended = <T extends { id: string; messages: ChatMessage[] }>(
  list: T[],
  id: string,
  message: ChatMessage,
): T[] => list.map((e) => (e.id === id ? { ...e, messages: [...e.messages, message] } : e))

interface LegacyConceptSummary {
  id: string
  date: string
  transcript: string
  summary: string
  createdAt: number
}

function isLegacyConceptSummary(item: unknown): item is LegacyConceptSummary {
  return (
    typeof item === 'object' &&
    item !== null &&
    'transcript' in item &&
    'summary' in item &&
    !('messages' in item)
  )
}

function migrateConceptSummaries(persisted: unknown): unknown {
  const state = persisted as { conceptSummaries?: unknown } | undefined
  if (!Array.isArray(state?.conceptSummaries)) return persisted
  return {
    ...state,
    conceptSummaries: state.conceptSummaries.map((item: unknown) => {
      if (!isLegacyConceptSummary(item)) return item
      const { transcript, summary, ...rest } = item
      const messages: ChatMessage[] = []
      if (transcript) messages.push({ role: 'user', text: transcript })
      if (summary) messages.push({ role: 'model', text: summary })
      return { ...rest, messages }
    }),
  }
}

export const useAnalysisStore = create<AnalysisState>()(
  persist(
    (set) => ({
      scripts1: [],
      scripts2: [],
      conceptSummaries: [],
      lectureAnalyses: [],
      weeklyComments: {},
      weeklyCommentPrompt: '',
      weeklyGoalHours: {},
      lectureAnalysisPrompt: '',
      conceptSummaryPrompt: '',

      addScript1: (input) =>
        set((state) => ({ scripts1: added(state.scripts1, input, crypto.randomUUID()) })),
      updateScript1: (id, patch) =>
        set((state) => ({ scripts1: patched(state.scripts1, id, patch) })),
      removeScript1: (id) => set((state) => ({ scripts1: removed(state.scripts1, id) })),

      addScript2: (input) =>
        set((state) => ({ scripts2: added(state.scripts2, input, crypto.randomUUID()) })),
      updateScript2: (id, patch) =>
        set((state) => ({ scripts2: patched(state.scripts2, id, patch) })),
      removeScript2: (id) => set((state) => ({ scripts2: removed(state.scripts2, id) })),

      addConceptSummary: (input) => {
        const id = crypto.randomUUID()
        set((state) => ({ conceptSummaries: added(state.conceptSummaries, input, id) }))
        return id
      },
      appendConceptMessage: (id, message) =>
        set((state) => ({
          conceptSummaries: messageAppended(state.conceptSummaries, id, message),
        })),
      removeConceptSummary: (id) =>
        set((state) => ({ conceptSummaries: removed(state.conceptSummaries, id) })),

      addLectureAnalysis: (input) => {
        const id = crypto.randomUUID()
        set((state) => ({ lectureAnalyses: added(state.lectureAnalyses, input, id) }))
        return id
      },
      appendLectureMessage: (id, message) =>
        set((state) => ({ lectureAnalyses: messageAppended(state.lectureAnalyses, id, message) })),
      removeLectureAnalysis: (id) =>
        set((state) => ({ lectureAnalyses: removed(state.lectureAnalyses, id) })),

      setWeeklyComment: (weekKey, comment) =>
        set((state) => ({ weeklyComments: { ...state.weeklyComments, [weekKey]: comment } })),

      setWeeklyCommentPrompt: (prompt) => set({ weeklyCommentPrompt: prompt }),
      setWeeklyGoalHours: (goals) => set({ weeklyGoalHours: goals }),
      setLectureAnalysisPrompt: (prompt) => set({ lectureAnalysisPrompt: prompt }),
      setConceptSummaryPrompt: (prompt) => set({ conceptSummaryPrompt: prompt }),
    }),
    {
      name: 'analysis-store',
      version: 1,
      migrate: (persistedState, version) => {
        if (version < 1) {
          return migrateConceptSummaries(persistedState)
        }
        return persistedState
      },
    },
  ),
)
