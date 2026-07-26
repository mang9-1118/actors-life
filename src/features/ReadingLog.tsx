import { useMemo, useState } from 'react'
import { useReadingLogStore } from '@/stores/entryStores'
import { currentYearMonthKey, formatKoreanDate, sortByDateDesc, todayKey, yearMonthKey } from '@/lib/time'
import type { ReadingLogEntry } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Field, RecordCard, StatCard, TextField } from '@/components/common'

export function ReadingLog() {
  const { entries, addEntry, updateEntry, removeEntry } = useReadingLogStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [date, setDate] = useState(todayKey())
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [review, setReview] = useState('')

  const resetForm = () => {
    setEditingId(null)
    setDate(todayKey())
    setTitle('')
    setAuthor('')
    setReview('')
  }

  const startEdit = (entry: ReadingLogEntry) => {
    setEditingId(entry.id)
    setDate(entry.date)
    setTitle(entry.title)
    setAuthor(entry.author)
    setReview(entry.review)
  }

  const submit = () => {
    if (!title.trim()) return
    const patch = { date, title: title.trim(), author: author.trim(), review: review.trim() }
    if (editingId) {
      updateEntry(editingId, patch)
    } else {
      addEntry(patch)
    }
    resetForm()
  }

  const sortedEntries = sortByDateDesc(entries)

  const monthlyCount = useMemo(() => {
    const thisMonth = currentYearMonthKey()
    return entries.filter((e) => yearMonthKey(e.date) === thisMonth).length
  }, [entries])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">독서</h1>

      <StatCard label="이번 달 읽은 책" value={`${monthlyCount}권`} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{editingId ? '기록 수정' : '새 기록 추가'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="날짜" id="reading-date" type="date" value={date} onChange={setDate} />
            <TextField
              label="제목"
              id="reading-title"
              value={title}
              onChange={setTitle}
              placeholder="책 제목"
            />
            <TextField label="작가" id="reading-author" value={author} onChange={setAuthor} />
          </div>

          <Field label="감상평" htmlFor="reading-review">
            <Textarea
              id="reading-review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="이 책에 대한 감상평을 남겨보세요"
              rows={4}
            />
          </Field>

          <div className="flex gap-2">
            <Button onClick={submit} className="self-start">
              {editingId ? '수정 완료' : '저장'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm} className="self-start">
                취소
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {sortedEntries.map((entry) => (
          <RecordCard
            key={entry.id}
            head={<span className="text-sm font-medium text-foreground">{entry.title}</span>}
            meta={
              <>
                {formatKoreanDate(entry.date)}
                {entry.author && ` · ${entry.author}`}
              </>
            }
            body={entry.review}
            onEdit={() => startEdit(entry)}
            onDelete={() => removeEntry(entry.id)}
          />
        ))}
        {sortedEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">기록된 독서가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
