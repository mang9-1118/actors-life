import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAnalysisStore } from '@/stores/useAnalysisStore'
import { GeminiError, summarizeTranscript } from '@/lib/gemini'
import { formatKoreanDate, todayKey } from '@/lib/time'
import type { ConceptSummary } from '@/types'

function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

export function ConceptSummaryPanel() {
  const { conceptSummaries, addConceptSummary, updateConceptSummary, removeConceptSummary } =
    useAnalysisStore()
  const conceptSummaryPrompt = useAnalysisStore((s) => s.conceptSummaryPrompt)
  const setConceptSummaryPrompt = useAnalysisStore((s) => s.setConceptSummaryPrompt)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openItem, setOpenItem] = useState<ConceptSummary | null>(null)
  const [editDate, setEditDate] = useState(todayKey())
  const [editSummary, setEditSummary] = useState('')
  const [editTranscript, setEditTranscript] = useState('')
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState('')
  const recognitionRef = useRef<any>(null)

  const openForEdit = (item: ConceptSummary) => {
    setOpenItem(item)
    setEditDate(item.date)
    setEditSummary(item.summary)
    setEditTranscript(item.transcript)
  }

  const saveEdit = () => {
    if (!openItem) return
    updateConceptSummary(openItem.id, {
      date: editDate,
      summary: editSummary,
      transcript: editTranscript,
    })
    setOpenItem(null)
  }

  const supported = getSpeechRecognitionCtor() != null

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const startRecording = () => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      setError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 최신 버전을 사용해주세요.')
      return
    }
    setError('')
    setSummary('')
    setTranscript('')

    const recognition = new Ctor()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: any) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript
        }
      }
      if (finalText) {
        setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText))
      }
    }
    recognition.onerror = (event: any) => {
      setError(`음성 인식 오류: ${event.error}`)
      setIsRecording(false)
    }
    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }

  const stopRecording = () => recognitionRef.current?.stop()

  const summarize = async () => {
    if (!transcript.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await summarizeTranscript(transcript, conceptSummaryPrompt)
      setSummary(result)
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : 'AI 요약 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const save = () => {
    if (!summary) return
    addConceptSummary({ date: todayKey(), transcript, summary })
    setTranscript('')
    setSummary('')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-lg">개념 정리 요약장</CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="AI 요약 기준 설정"
            onClick={() => {
              setDraftPrompt(conceptSummaryPrompt)
              setPromptDialogOpen(true)
            }}
          >
            <Settings />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!supported && (
          <p className="text-sm text-muted-foreground">
            이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 최신 버전을 사용해주세요.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? 'outline' : 'default'}
            className={isRecording ? 'border-amber-600 text-amber-600' : ''}
            disabled={!supported}
          >
            {isRecording ? '녹음 중지' : '음성으로 말하기'}
          </Button>
          {transcript && !isRecording && (
            <Button variant="outline" onClick={summarize} disabled={loading}>
              {loading ? '요약 중...' : 'AI 요약'}
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {transcript && (
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <div className="mb-1 text-xs font-medium text-foreground">인식된 텍스트</div>
            {transcript}
          </div>
        )}

        {summary && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="text-xs font-medium text-muted-foreground">AI 요약</div>
            <p className="whitespace-pre-wrap text-sm text-foreground">{summary}</p>
            <Button size="sm" onClick={save} className="self-start">
              저장
            </Button>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {conceptSummaries
            .slice()
            .reverse()
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
              >
                <button
                  onClick={() => openForEdit(item)}
                  className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  {formatKoreanDate(item.date)}
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {item.summary}
                  </span>
                </button>
                <button
                  onClick={() => removeConceptSummary(item.id)}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  삭제
                </button>
              </li>
            ))}
          {conceptSummaries.length === 0 && (
            <li className="text-sm text-muted-foreground">저장된 요약이 없습니다.</li>
          )}
        </ul>
      </CardContent>

      <Dialog open={openItem != null} onOpenChange={(open) => !open && setOpenItem(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">기록 수정</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concept-edit-date">날짜</Label>
              <Input
                id="concept-edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concept-edit-summary">AI 요약</Label>
              <Textarea
                id="concept-edit-summary"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={5}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concept-edit-transcript">원본 인식 텍스트</Label>
              <Textarea
                id="concept-edit-transcript"
                value={editTranscript}
                onChange={(e) => setEditTranscript(e.target.value)}
                rows={5}
              />
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

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 요약 기준 설정</DialogTitle>
            <DialogDescription>
              AI가 개념 정리 내용을 요약할 때 참고할 기준이나 강조하고 싶은 내용을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            placeholder="예: 발성 관련 용어가 나오면 쉬운 말로 풀어서 요약해줘."
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                setConceptSummaryPrompt(draftPrompt)
                setPromptDialogOpen(false)
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
