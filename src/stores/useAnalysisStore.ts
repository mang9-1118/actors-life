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
  appendConceptMessage: (id: string, message: { role: 'user' | 'model'; text: string }) => void
  removeConceptSummary: (id: string) => void

  addLectureAnalysis: (input: Omit<LectureAnalysisEntry, 'id' | 'createdAt'>) => string
  appendLectureMessage: (id: string, message: { role: 'user' | 'model'; text: string }) => void
  removeLectureAnalysis: (id: string) => void

  setWeeklyComment: (weekKey: DateKey, comment: string) => void
  setWeeklyCommentPrompt: (prompt: string) => void
  setWeeklyGoalHours: (goals: Partial<Record<TrainingTabId, number>>) => void
  setLectureAnalysisPrompt: (prompt: string) => void
  setConceptSummaryPrompt: (prompt: string) => void
}

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
      const messages: { role: 'user' | 'model'; text: string }[] = []
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
        set((state) => ({
          scripts1: [
            ...state.scripts1,
            { ...input, id: crypto.randomUUID(), createdAt: Date.now() },
          ],
        })),
      updateScript1: (id, patch) =>
        set((state) => ({
          scripts1: state.scripts1.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeScript1: (id) =>
        set((state) => ({ scripts1: state.scripts1.filter((s) => s.id !== id) })),

      addScript2: (input) =>
        set((state) => ({
          scripts2: [
            ...state.scripts2,
            { ...input, id: crypto.randomUUID(), createdAt: Date.now() },
          ],
        })),
      updateScript2: (id, patch) =>
        set((state) => ({
          scripts2: state.scripts2.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),
      removeScript2: (id) =>
        set((state) => ({ scripts2: state.scripts2.filter((s) => s.id !== id) })),

      addConceptSummary: (input) => {
        const id = crypto.randomUUID()
        set((state) => ({
          conceptSummaries: [
            ...state.conceptSummaries,
            { ...input, id, createdAt: Date.now() },
          ],
        }))
        return id
      },
      appendConceptMessage: (id, message) =>
        set((state) => ({
          conceptSummaries: state.conceptSummaries.map((entry) =>
            entry.id === id ? { ...entry, messages: [...entry.messages, message] } : entry,
          ),
        })),
      removeConceptSummary: (id) =>
        set((state) => ({
          conceptSummaries: state.conceptSummaries.filter((s) => s.id !== id),
        })),

      addLectureAnalysis: (input) => {
        const id = crypto.randomUUID()
        set((state) => ({
          lectureAnalyses: [
            ...state.lectureAnalyses,
            { ...input, id, createdAt: Date.now() },
          ],
        }))
        return id
      },
      appendLectureMessage: (id, message) =>
        set((state) => ({
          lectureAnalyses: state.lectureAnalyses.map((entry) =>
            entry.id === id ? { ...entry, messages: [...entry.messages, message] } : entry,
          ),
        })),
      removeLectureAnalysis: (id) =>
        set((state) => ({
          lectureAnalyses: state.lectureAnalyses.filter((e) => e.id !== id),
        })),

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
