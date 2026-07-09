import { useState } from 'react'
import { useClassNoteStore } from '@/stores/useClassNoteStore'
import { formatKoreanDate, todayKey } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CLASS_NOTE_TOPICS, type ClassNoteEntry } from '@/types'

type TopicDraft = Record<'life' | 'vocal' | 'analysis' | 'audition', string>

const EMPTY_DRAFT: TopicDraft = { life: '', vocal: '', analysis: '', audition: '' }

function TopicFields({
  draft,
  onChange,
}: {
  draft: TopicDraft
  onChange: (topic: keyof TopicDraft, value: string) => void
}) {
  return (
    <div className="grid gap-3">
      {CLASS_NOTE_TOPICS.map((topic) => (
        <div key={topic.id} className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">{topic.label}</span>
          <Textarea
            value={draft[topic.id]}
            onChange={(e) => onChange(topic.id, e.target.value)}
            placeholder={`${topic.label}에 대해 배운 내용을 적어보세요`}
            rows={topic.id === 'audition' ? 7 : 4}
          />
        </div>
      ))}
    </div>
  )
}

export function ClassNotes() {
  const { notes, addNote, updateNote, removeNote } = useClassNoteStore()
  const [date, setDate] = useState(todayKey())
  const [draft, setDraft] = useState<TopicDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState(todayKey())
  const [editDraft, setEditDraft] = useState<TopicDraft>(EMPTY_DRAFT)

  const setDraftTopic = (topic: keyof TopicDraft, value: string) =>
    setDraft((prev) => ({ ...prev, [topic]: value }))
  const setEditDraftTopic = (topic: keyof TopicDraft, value: string) =>
    setEditDraft((prev) => ({ ...prev, [topic]: value }))

  const submit = () => {
    if (Object.values(draft).every((v) => !v.trim())) return
    addNote({
      date,
      life: draft.life.trim(),
      vocal: draft.vocal.trim(),
      analysis: draft.analysis.trim(),
      audition: draft.audition.trim(),
    })
    setDraft(EMPTY_DRAFT)
  }

  const startEdit = (note: ClassNoteEntry) => {
    setEditingId(note.id)
    setEditDate(note.date)
    setEditDraft({
      life: note.life ?? '',
      vocal: note.vocal ?? '',
      analysis: note.analysis ?? '',
      audition: note.audition ?? '',
    })
  }

  const saveEdit = () => {
    if (!editingId || Object.values(editDraft).every((v) => !v.trim())) return
    updateNote(editingId, {
      date: editDate,
      life: editDraft.life.trim(),
      vocal: editDraft.vocal.trim(),
      analysis: editDraft.analysis.trim(),
      audition: editDraft.audition.trim(),
    })
    setEditingId(null)
  }

  const sortedNotes = notes.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">수업내용 정리</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">새 기록 추가</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
          <TopicFields draft={draft} onChange={setDraftTopic} />
          <Button onClick={submit} className="self-start">
            저장
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {sortedNotes.map((note) =>
          editingId === note.id ? (
            <Card key={note.id}>
              <CardContent className="flex flex-col gap-3">
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-48" />
                <TopicFields draft={editDraft} onChange={setEditDraftTopic} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit}>
                    저장
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    취소
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card key={note.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{formatKoreanDate(note.date)}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEdit(note)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => removeNote(note.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {note.content && (
                  <p className="whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
                )}
                {CLASS_NOTE_TOPICS.map(
                  (topic) =>
                    note[topic.id] && (
                      <div key={topic.id} className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-muted-foreground">{topic.label}</span>
                        <p className="whitespace-pre-wrap text-sm text-foreground">{note[topic.id]}</p>
                      </div>
                    ),
                )}
              </CardContent>
            </Card>
          ),
        )}
        {sortedNotes.length === 0 && (
          <p className="text-sm text-muted-foreground">작성된 수업내용 정리가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
