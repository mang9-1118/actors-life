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
import { formatKoreanDate, todayKey } from '@/lib/time'
import type { ScriptAnalysis2 } from '@/types'

const SCENE_QUESTIONS = [
  '이 대화는 긍정이야 부정이야?',
  '그래? 그럼 재미야 진지야?',
  '제 3자가 이걸 보고 무슨 생각을 해야돼?',
] as const

const CHARACTER_QUESTIONS = [
  '지금 대상이 누구야?',
  '그 대상한테 니가 원하는 게 뭔데?',
] as const

const emptySceneGoals: [string, string, string] = ['', '', '']
const emptyCharacterGoals: [string, string] = ['', '']

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

  const openForEdit = (item: ScriptAnalysis2) => {
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

        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-bold text-foreground">장면의 목표</h3>
          {SCENE_QUESTIONS.map((question, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground">
                {i + 1}. {question}
              </Label>
              <Textarea
                value={sceneGoals[i]}
                onChange={(e) => {
                  const next = [...sceneGoals] as [string, string, string]
                  next[i] = e.target.value
                  setSceneGoals(next)
                }}
                placeholder="답변을 입력하세요"
                rows={2}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-xl font-bold text-foreground">인물의 목표</h3>
          {CHARACTER_QUESTIONS.map((question, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground">
                {i + 1}. {question}
              </Label>
              <Textarea
                value={characterGoals[i]}
                onChange={(e) => {
                  const next = [...characterGoals] as [string, string]
                  next[i] = e.target.value
                  setCharacterGoals(next)
                }}
                placeholder="답변을 입력하세요"
                rows={2}
              />
            </div>
          ))}
        </div>

        <Button onClick={submit} className="self-start">
          저장
        </Button>

        <ul className="flex flex-col gap-2">
          {scripts2
            .slice()
            .reverse()
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
              >
                <button
                  onClick={() => openForEdit(item)}
                  className="flex items-baseline gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  {item.title}
                  <span className="text-xs font-normal text-muted-foreground">
                    {formatKoreanDate(item.date)}
                  </span>
                </button>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openForEdit(item)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => removeScript2(item.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          {scripts2.length === 0 && (
            <li className="text-sm text-muted-foreground">저장된 분석이 없습니다.</li>
          )}
        </ul>
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
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-bold text-foreground">장면의 목표</h3>
              {SCENE_QUESTIONS.map((question, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Label className="text-sm text-muted-foreground">
                    {i + 1}. {question}
                  </Label>
                  <Textarea
                    value={editSceneGoals[i]}
                    onChange={(e) => {
                      const next = [...editSceneGoals] as [string, string, string]
                      next[i] = e.target.value
                      setEditSceneGoals(next)
                    }}
                    rows={2}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="text-xl font-bold text-foreground">인물의 목표</h3>
              {CHARACTER_QUESTIONS.map((question, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Label className="text-sm text-muted-foreground">
                    {i + 1}. {question}
                  </Label>
                  <Textarea
                    value={editCharacterGoals[i]}
                    onChange={(e) => {
                      const next = [...editCharacterGoals] as [string, string]
                      next[i] = e.target.value
                      setEditCharacterGoals(next)
                    }}
                    rows={2}
                  />
                </div>
              ))}
            </div>
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
