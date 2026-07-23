import { useRef, useState } from 'react'
import { Mic, Settings } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useAnalysisStore } from '@/stores/useAnalysisStore'
import { GeminiError, analyzeConceptTranscript, continueConceptChat } from '@/lib/gemini'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { formatKoreanDate, todayKey } from '@/lib/time'

export function ConceptSummaryPanel() {
  const { conceptSummaries, addConceptSummary, appendConceptMessage, removeConceptSummary } =
    useAnalysisStore()
  const conceptSummaryPrompt = useAnalysisStore((s) => s.conceptSummaryPrompt)
  const setConceptSummaryPrompt = useAnalysisStore((s) => s.setConceptSummaryPrompt)

  const [transcript, setTranscript] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [loadingAnalyze, setLoadingAnalyze] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)
  const [error, setError] = useState('')
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState('')

  const transcriptRef = useRef('')
  const activeEntry = conceptSummaries.find((e) => e.id === activeId) ?? null

  const startConceptAnalysis = async (finalTranscript: string) => {
    setLoadingAnalyze(true)
    setError('')
    try {
      const id = addConceptSummary({
        date: todayKey(),
        messages: [{ role: 'user', text: finalTranscript }],
      })
      setActiveId(id)
      const result = await analyzeConceptTranscript(finalTranscript, conceptSummaryPrompt)
      appendConceptMessage(id, { role: 'model', text: result })
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setLoadingAnalyze(false)
    }
  }

  const mainRecording = useSpeechRecognition({
    onFinalResult: (text) => {
      setTranscript((prev) => {
        const next = prev ? `${prev} ${text}` : text
        transcriptRef.current = next
        return next
      })
    },
    onError: setError,
    onEnd: () => {
      const finalTranscript = transcriptRef.current.trim()
      transcriptRef.current = ''
      setTranscript('')
      if (finalTranscript) void startConceptAnalysis(finalTranscript)
    },
  })

  const answerRecording = useSpeechRecognition({
    onFinalResult: (text) => setAnswer((prev) => (prev ? `${prev} ${text}` : text)),
    onError: setError,
  })

  const ask = async () => {
    if (!activeEntry || !answer.trim() || loadingChat) return
    if (answerRecording.isRecording) answerRecording.stop()
    const entry = activeEntry
    const a = answer.trim()
    const priorMessages = entry.messages
    setAnswer('')
    appendConceptMessage(entry.id, { role: 'user', text: a })
    setLoadingChat(true)
    setError('')
    try {
      const result = await continueConceptChat(priorMessages, a)
      appendConceptMessage(entry.id, { role: 'model', text: result })
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '답변 처리 중 오류가 발생했습니다.')
    } finally {
      setLoadingChat(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-lg">개념 정리 대화</CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="AI 튜터 기준 설정"
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
        {!mainRecording.supported && (
          <p className="text-sm text-muted-foreground">
            이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 최신 버전을 사용해주세요.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (mainRecording.isRecording) {
                mainRecording.stop()
                return
              }
              setError('')
              setTranscript('')
              transcriptRef.current = ''
              mainRecording.start()
            }}
            variant={mainRecording.isRecording ? 'outline' : 'default'}
            className={mainRecording.isRecording ? 'border-amber-600 text-amber-600' : ''}
            disabled={!mainRecording.supported || loadingAnalyze}
          >
            {mainRecording.isRecording
              ? '녹음 중지'
              : loadingAnalyze
                ? 'AI 분석 중...'
                : '음성으로 말하기'}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {mainRecording.isRecording && transcript && (
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <div className="mb-1 text-xs font-medium text-foreground">인식된 텍스트</div>
            {transcript}
          </div>
        )}

        {activeEntry && (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
              {activeEntry.messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'model'
                      ? 'self-start bg-muted text-foreground'
                      : 'self-end bg-primary text-primary-foreground'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
              {loadingAnalyze && activeEntry.id === activeId && (
                <div className="max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  AI가 분석하고 있어요...
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask()
                  }
                }}
                placeholder="답변을 입력하거나 마이크 버튼으로 말해보세요 (Shift+Enter로 줄바꿈)"
                rows={1}
                className="min-h-9 flex-1 resize-none"
              />
              <Button
                type="button"
                variant={answerRecording.isRecording ? 'outline' : 'ghost'}
                size="icon-sm"
                className={answerRecording.isRecording ? 'border-amber-600 text-amber-600' : ''}
                disabled={!answerRecording.supported}
                onClick={() =>
                  answerRecording.isRecording ? answerRecording.stop() : answerRecording.start()
                }
                aria-label="음성으로 답변 입력"
              >
                <Mic />
              </Button>
              <Button onClick={ask} disabled={loadingChat} variant="outline">
                {loadingChat ? '답변 중...' : '답변하기'}
              </Button>
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {conceptSummaries
            .slice()
            .reverse()
            .map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  item.id === activeId ? 'bg-accent' : 'bg-muted'
                }`}
              >
                <button
                  onClick={() => setActiveId(item.id)}
                  className="flex min-w-0 items-baseline gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  {formatKoreanDate(item.date)}
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {item.messages.find((m) => m.role === 'model')?.text ?? ''}
                  </span>
                </button>
                <button
                  onClick={() => {
                    removeConceptSummary(item.id)
                    if (activeId === item.id) setActiveId(null)
                  }}
                  className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  삭제
                </button>
              </li>
            ))}
          {conceptSummaries.length === 0 && (
            <li className="text-sm text-muted-foreground">저장된 대화가 없습니다.</li>
          )}
        </ul>
      </CardContent>

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI 튜터 기준 설정</DialogTitle>
            <DialogDescription>
              AI가 개념 정리 내용을 분석하고 질문할 때 참고할 기준이나 강조하고 싶은 내용을
              입력하세요.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            placeholder="예: 발성 관련 개념은 더 엄격하게 질문해줘."
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
