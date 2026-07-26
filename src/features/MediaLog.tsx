import { useMemo, useState } from 'react'
import { useMediaLogStore } from '@/stores/entryStores'
import { currentYearMonthKey, formatKoreanDate, sortByDateDesc, todayKey, yearMonthKey } from '@/lib/time'
import type { MediaLogEntry, MediaType } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Field, RecordCard, StatCard, TextField } from '@/components/common'

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  movie: '영화',
  drama: '드라마',
}

export function MediaLog() {
  const { entries, addEntry, updateEntry, removeEntry } = useMediaLogStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>('movie')
  const [date, setDate] = useState(todayKey())
  const [title, setTitle] = useState('')
  const [episode, setEpisode] = useState('')
  const [director, setDirector] = useState('')
  const [leadActor, setLeadActor] = useState('')
  const [review, setReview] = useState('')

  const resetForm = () => {
    setEditingId(null)
    setMediaType('movie')
    setDate(todayKey())
    setTitle('')
    setEpisode('')
    setDirector('')
    setLeadActor('')
    setReview('')
  }

  const startEdit = (entry: MediaLogEntry) => {
    setEditingId(entry.id)
    setMediaType(entry.mediaType)
    setDate(entry.date)
    setTitle(entry.title)
    setEpisode(entry.episode != null ? String(entry.episode) : '')
    setDirector(entry.director)
    setLeadActor(entry.leadActor)
    setReview(entry.review)
  }

  const submit = () => {
    if (!title.trim()) return
    const patch = {
      mediaType,
      date,
      title: title.trim(),
      episode: mediaType === 'drama' && episode.trim() ? Number(episode) : null,
      director: director.trim(),
      leadActor: leadActor.trim(),
      review: review.trim(),
    }
    if (editingId) {
      updateEntry(editingId, patch)
    } else {
      addEntry(patch)
    }
    resetForm()
  }

  const sortedEntries = sortByDateDesc(entries)

  const monthlyCounts = useMemo(() => {
    const thisMonth = currentYearMonthKey()
    let movies = 0
    let dramas = 0
    for (const entry of entries) {
      if (yearMonthKey(entry.date) !== thisMonth) continue
      if (entry.mediaType === 'movie') movies += 1
      else dramas += 1
    }
    return { movies, dramas }
  }, [entries])

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">드라마/영화 시청</h1>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="이번 달 시청한 영화" value={`${monthlyCounts.movies}편`} />
        <StatCard label="이번 달 시청한 드라마" value={`${monthlyCounts.dramas}편`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{editingId ? '기록 수정' : '새 기록 추가'}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="구분">
            <RadioGroup
              value={mediaType}
              onValueChange={(v) => setMediaType(v as MediaType)}
              className="grid-flow-col justify-start gap-6"
            >
              <label className="flex items-center gap-2 text-sm text-foreground">
                <RadioGroupItem value="movie" /> 영화
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <RadioGroupItem value="drama" /> 드라마
              </label>
            </RadioGroup>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="날짜" id="media-date" type="date" value={date} onChange={setDate} />
            <TextField
              label="제목"
              id="media-title"
              value={title}
              onChange={setTitle}
              placeholder="작품 제목"
            />
            {mediaType === 'drama' && (
              <TextField
                label="몇 화"
                id="media-episode"
                type="number"
                min={1}
                value={episode}
                onChange={setEpisode}
                placeholder="예: 12"
              />
            )}
            <TextField
              label="감독(작가)"
              id="media-director"
              value={director}
              onChange={setDirector}
            />
            <TextField label="주연배우" id="media-lead" value={leadActor} onChange={setLeadActor} />
          </div>

          <Field label="감상평" htmlFor="media-review">
            <Textarea
              id="media-review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="이 작품에 대한 감상평을 남겨보세요"
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
            head={
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{MEDIA_TYPE_LABEL[entry.mediaType]}</Badge>
                <span className="text-sm font-medium text-foreground">
                  {entry.title}
                  {entry.mediaType === 'drama' && entry.episode != null && ` (${entry.episode}화)`}
                </span>
              </div>
            }
            meta={
              <>
                {formatKoreanDate(entry.date)}
                {entry.director && ` · 감독(작가) ${entry.director}`}
                {entry.leadActor && ` · 주연 ${entry.leadActor}`}
              </>
            }
            body={entry.review}
            onEdit={() => startEdit(entry)}
            onDelete={() => removeEntry(entry.id)}
          />
        ))}
        {sortedEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">기록된 드라마/영화가 없습니다.</p>
        )}
      </div>
    </div>
  )
}
