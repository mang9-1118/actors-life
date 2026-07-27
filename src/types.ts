export type TrainingTabId =
  | 'vocal'
  | 'concept'
  | 'lecture'
  | 'auditionApply'
  | 'analysis1'
  | 'analysis2'

export interface TrainingTabMeta {
  id: TrainingTabId
  label: string
  path: string
}

export const TRAINING_TABS: TrainingTabMeta[] = [
  { id: 'vocal', label: '발성', path: 'vocal' },
  { id: 'concept', label: '개념 정리', path: 'concept' },
  { id: 'lecture', label: '강의 듣기', path: 'lecture' },
  { id: 'auditionApply', label: '오디션 지원', path: 'audition-apply' },
  { id: 'analysis1', label: '1차적 분석', path: 'analysis1' },
  { id: 'analysis2', label: '2차적 분석', path: 'analysis2' },
]

export const TRAINING_TAB_IDS: TrainingTabId[] = TRAINING_TABS.map((tab) => tab.id)

export type OtherTabId =
  | 'media-log'
  | 'reading-log'
  | 'calendar'
  | 'class-notes'
  | 'weekly'

export interface OtherTabMeta {
  id: OtherTabId
  label: string
  path: string
}

export const OTHER_TABS: OtherTabMeta[] = [
  { id: 'media-log', label: '드라마/영화 시청', path: '/media-log' },
  { id: 'reading-log', label: '독서', path: '/reading-log' },
  { id: 'calendar', label: '캘린더', path: '/calendar' },
  { id: 'class-notes', label: '수업내용 정리', path: '/class-notes' },
  { id: 'weekly', label: '주간 분석', path: '/weekly' },
]

export const DAILY_GOAL_SECONDS = 8 * 60 * 60

export type DateKey = string // 'YYYY-MM-DD'

export interface TodoItem {
  id: string
  text: string
  done: boolean
  createdAt: number
}

export type AuditionStatus = 'inProgress' | 'closed' | 'passed' | 'failed'
export type AuditionMode = 'online' | 'offline'

export interface AuditionItem {
  id: string
  title: string
  organization: string
  /** Link to the casting notice this was applied through. Empty for hand-entered auditions. */
  url: string
  /** 작품 종류, e.g. '단편영화'. Empty when the notice does not state one. */
  category: string
  mode: AuditionMode
  deadline: DateKey
  announceDate: DateKey | null
  auditionDate: DateKey | null
  auditionTime: string
  auditionLocation: string
  status: AuditionStatus
  memo: string
  createdAt: number
}

export interface ScriptAnalysis1 {
  id: string
  title: string
  script: string
  createdAt: number
}

export interface ScriptAnalysis2 {
  id: string
  title: string
  date: DateKey
  sceneGoals: [string, string, string]
  characterGoals: [string, string]
  createdAt: number
}

export interface ConceptSummary {
  id: string
  date: DateKey
  messages: { role: 'user' | 'model'; text: string }[]
  createdAt: number
}

export interface LectureAnalysisEntry {
  id: string
  youtubeUrl: string
  title?: string
  messages: { role: 'user' | 'model'; text: string }[]
  createdAt: number
}

export type ClassNoteTopic = 'life' | 'vocal' | 'analysis' | 'audition'

export const CLASS_NOTE_TOPICS: { id: ClassNoteTopic; label: string }[] = [
  { id: 'life', label: '삶' },
  { id: 'vocal', label: '발성' },
  { id: 'analysis', label: '분석' },
  { id: 'audition', label: '오디션' },
]

export interface ClassNoteEntry {
  id: string
  date: DateKey
  /** @deprecated legacy free-form content, kept for notes created before the topic template */
  content?: string
  life?: string
  vocal?: string
  analysis?: string
  audition?: string
  createdAt: number
}

export type MediaType = 'movie' | 'drama'

export interface MediaLogEntry {
  id: string
  mediaType: MediaType
  date: DateKey
  title: string
  episode: number | null
  director: string
  leadActor: string
  review: string
  createdAt: number
}

export interface ReadingLogEntry {
  id: string
  date: DateKey
  title: string
  author: string
  review: string
  createdAt: number
}
