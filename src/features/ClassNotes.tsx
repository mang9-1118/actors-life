import { useState } from 'react'
import { useClassNoteStore } from '@/stores/entryStores'
import { formatKoreanDate, sortByDateDesc, todayKey } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RecordCard } from '@/components/common'
import { CLASS_NOTE_TOPICS, type ClassNoteEntry, type ClassNoteTopic } from '@/types'

type TopicDraft = Record<ClassNoteTopic, string>

const EMPTY_DRAFT: TopicDraft = { life: '', vocal: '', analysis: '', audition: '' }

function TopicFields({
  draft,
  onChange,
}: {
  draft: TopicDraft
  onChange: (topic: ClassNoteTopic, value: string) => void
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

const toDraft = (note: ClassNoteEntry): TopicDraft => ({
  life: note.life ?? '',
  vocal: note.vocal ?? '',
  analysis: note.analysis ?? '',
  audition: note.audition ?? '',
})

const trimDraft = (draft: TopicDraft): TopicDraft => ({
  life: draft.life.trim(),
  vocal: draft.vocal.trim(),
  analysis: draft.analysis.trim(),
  audition: draft.audition.trim(),
})

const isEmptyDraft = (draft: TopicDraft) => Object.values(draft).every((v) => !v.trim())

export function ClassNotes() {
  const { entries, addEntry, updateEntry, removeEntry } = useClassNoteStore()
  const [date, setDate] = useState(todayKey())
  const [draft, setDraft] = useState<TopicDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDate, setEditDate] = useState(todayKey())
  const [editDraft, setEditDraft] = useState<TopicDraft>(EMPTY_DRAFT)

  const submit = () => {
    if (isEmptyDraft(draft)) return
    addEntry({ date, ...trimDraft(draft) })
    setDraft(EMPTY_DRAFT)
  }

  const startEdit = (note: ClassNoteEntry) => {
    setEditingId(note.id)
    setEditDate(note.date)
    setEditDraft(toDraft(note))
  }

  const saveEdit = () => {
    if (!editingId || isEmptyDraft(editDraft)) return
    updateEntry(editingId, { date: editDate, ...trimDraft(editDraft) })
    setEditingId(null)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">수업내용 정리</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">새 기록 추가</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-48"
          />
          <TopicFields
            draft={draft}
            onChange={(topic, value) => setDraft((prev) => ({ ...prev, [topic]: value }))}
          />
          <Button onClick={submit} className="self-start">
            저장
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {sortByDateDesc(entries).map((note) =>
          editingId === note.id ? (
            <Card key={note.id}>
              <CardContent className="flex flex-col gap-3">
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-48"
                />
                <TopicFields
                  draft={editDraft}
                  onChange={(topic, value) => setEditDraft((prev) => ({ ...prev, [topic]: value }))}
                />
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
            <RecordCard
              key={note.id}
              gapClassName="gap-3"
              head={
                <span className="text-sm font-medium text-foreground">
                  {formatKoreanDate(note.date)}
                </span>
              }
              body={note.content}
              onEdit={() => startEdit(note)}
              onDelete={() => removeEntry(note.id)}
            >
              {CLASS_NOTE_TOPICS.map(
                (topic) =>
                  note[topic.id] && (
                    <div key={topic.id} className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {topic.label}
                      </span>
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {note[topic.id]}
                      </p>
                    </div>
                  ),
              )}
            </RecordCard>
          ),
        )}
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">작성된 수업내용 정리가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
