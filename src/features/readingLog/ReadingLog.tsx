import { useMemo, useState } from 'react'
import { useReadingLogStore } from '@/stores/useReadingLogStore'
import { currentYearMonthKey, formatKoreanDate, todayKey, yearMonthKey } from '@/lib/time'
import type { ReadingLogEntry } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

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

  const sortedEntries = entries
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  const monthlyCount = useMemo(() => {
    const thisMonth = currentYearMonthKey()
    return entries.filter((e) => yearMonthKey(e.date) === thisMonth).length
  }, [entries])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">독서</h1>

      <Card>
        <CardContent>
          <div className="text-sm text-muted-foreground">이번 달 읽은 책</div>
          <div className="mt-2 text-3xl font-semibold text-foreground">{monthlyCount}권</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{editingId ? '기록 수정' : '새 기록 추가'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reading-date">날짜</Label>
              <Input id="reading-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reading-title">제목</Label>
              <Input
                id="reading-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="책 제목"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reading-author">작가</Label>
              <Input
                id="reading-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reading-review">감상평</Label>
            <Textarea
              id="reading-review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="이 책에 대한 감상평을 남겨보세요"
              rows={4}
            />
          </div>

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
          <Card key={entry.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{entry.title}</span>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => startEdit(entry)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatKoreanDate(entry.date)}
                {entry.author && ` · ${entry.author}`}
              </div>
              {entry.review && (
                <p className="whitespace-pre-wrap text-sm text-foreground">{entry.review}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {sortedEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">기록된 독서가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
