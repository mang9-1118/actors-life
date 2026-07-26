import { useState } from 'react'
import { useAnalysisStore } from '@/stores/useAnalysisStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RecordList } from '@/components/common'
import { formatKoreanDate, todayKey } from '@/lib/time'
import type { ScriptAnalysis1, ScriptAnalysis2 } from '@/types'

export function ScriptAnalysis1Panel() {
  const { scripts1, addScript1, updateScript1, removeScript1 } = useAnalysisStore()
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [openItem, setOpenItem] = useState<ScriptAnalysis1 | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editScript, setEditScript] = useState('')

  const submit = () => {
    if (!title.trim() || !script.trim()) return
    addScript1({ title: title.trim(), script })
    setTitle('')
    setScript('')
  }

  const openForEdit = (id: string) => {
    const item = scripts1.find((s) => s.id === id)
    if (!item) return
    setOpenItem(item)
    setEditTitle(item.title)
    setEditScript(item.script)
  }

  const saveEdit = () => {
    if (!openItem || !editTitle.trim()) return
    updateScript1(openItem.id, { title: editTitle.trim(), script: editScript })
    setOpenItem(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">1차적 분석 (듣고/반문/어.../아!그러네~/보고/반응)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="대본 텍스트를 입력하세요"
          rows={6}
        />
        <Button onClick={submit} className="self-start">
          저장
        </Button>

        <RecordList
          rows={scripts1
            .slice()
            .reverse()
            .map((item) => ({ id: item.id, label: item.title }))}
          emptyText="저장된 대본이 없습니다."
          onSelect={openForEdit}
          onEdit={openForEdit}
          onDelete={removeScript1}
        />
      </CardContent>

      <Dialog open={openItem != null} onOpenChange={(open) => !open && setOpenItem(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">기록 수정</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="제목"
            />
            <Textarea
              value={editScript}
              onChange={(e) => setEditScript(e.target.value)}
              rows={12}
              className="text-base leading-relaxed"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenItem(null)}>
              취소
            </Button>
            <Button onClick={saveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

const SCENE_QUESTIONS = [
  '이 대화는 긍정이야 부정이야?',
  '그래? 그럼 재미야 진지야?',
  '제 3자가 이걸 보고 무슨 생각을 해야돼?',
] as const

const CHARACTER_QUESTIONS = ['지금 대상이 누구야?', '그 대상한테 니가 원하는 게 뭔데?'] as const

const emptySceneGoals: [string, string, string] = ['', '', '']
const emptyCharacterGoals: [string, string] = ['', '']

/** The 장면의 목표 / 인물의 목표 question blocks, shared by the add form and the edit dialog. */
function GoalFields<T extends string[]>({
  heading,
  questions,
  values,
  onChange,
  placeholder,
}: {
  heading: string
  questions: readonly string[]
  values: T
  onChange: (values: T) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-bold text-foreground">{heading}</h3>
      {questions.map((question, i) => (
        <div key={i} className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">
            {i + 1}. {question}
          </Label>
          <Textarea
            value={values[i]}
            onChange={(e) => {
              const next = [...values] as T
              next[i] = e.target.value
              onChange(next)
            }}
            placeholder={placeholder}
            rows={2}
          />
        </div>
      ))}
    </div>
  )
}

export function ScriptAnalysis2Panel() {
  const { scripts2, addScript2, updateScript2, removeScript2 } = useAnalysisStore()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey())
  const [sceneGoals, setSceneGoals] = useState<[string, string, string]>(emptySceneGoals)
  const [characterGoals, setCharacterGoals] = useState<[string, string]>(emptyCharacterGoals)
  const [openItem, setOpenItem] = useState<ScriptAnalysis2 | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState(todayKey())
  const [editSceneGoals, setEditSceneGoals] = useState<[string, string, string]>(emptySceneGoals)
  const [editCharacterGoals, setEditCharacterGoals] = useState<[string, string]>(emptyCharacterGoals)

  const submit = () => {
    if (!title.trim()) return
    addScript2({ title: title.trim(), date, sceneGoals, characterGoals })
    setTitle('')
    setDate(todayKey())
    setSceneGoals(emptySceneGoals)
    setCharacterGoals(emptyCharacterGoals)
  }

  const openForEdit = (id: string) => {
    const item = scripts2.find((s) => s.id === id)
    if (!item) return
    setOpenItem(item)
    setEditTitle(item.title)
    setEditDate(item.date)
    setEditSceneGoals(item.sceneGoals)
    setEditCharacterGoals(item.characterGoals)
  }

  const saveEdit = () => {
    if (!openItem || !editTitle.trim()) return
    updateScript2(openItem.id, {
      title: editTitle.trim(),
      date: editDate,
      sceneGoals: editSceneGoals,
      characterGoals: editCharacterGoals,
    })
    setOpenItem(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">2차적 분석 — 장면/인물 목표</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목"
            className="flex-1"
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>

        <GoalFields
          heading="장면의 목표"
          questions={SCENE_QUESTIONS}
          values={sceneGoals}
          onChange={setSceneGoals}
          placeholder="답변을 입력하세요"
        />
        <GoalFields
          heading="인물의 목표"
          questions={CHARACTER_QUESTIONS}
          values={characterGoals}
          onChange={setCharacterGoals}
          placeholder="답변을 입력하세요"
        />

        <Button onClick={submit} className="self-start">
          저장
        </Button>

        <RecordList
          rows={scripts2
            .slice()
            .reverse()
            .map((item) => ({
              id: item.id,
              label: item.title,
              meta: formatKoreanDate(item.date),
            }))}
          emptyText="저장된 분석이 없습니다."
          onSelect={openForEdit}
          onEdit={openForEdit}
          onDelete={removeScript2}
        />
      </CardContent>

      <Dialog open={openItem != null} onOpenChange={(open) => !open && setOpenItem(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">기록 수정</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 text-base">
            <div className="flex gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="제목"
                className="flex-1"
              />
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-40"
              />
            </div>
            <GoalFields
              heading="장면의 목표"
              questions={SCENE_QUESTIONS}
              values={editSceneGoals}
              onChange={setEditSceneGoals}
            />
            <GoalFields
              heading="인물의 목표"
              questions={CHARACTER_QUESTIONS}
              values={editCharacterGoals}
              onChange={setEditCharacterGoals}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenItem(null)}>
              취소
            </Button>
            <Button onClick={saveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
