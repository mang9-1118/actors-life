import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatComposer, ChatThread, PromptSetting, RecordList } from '@/components/common'
import { useAnalysisStore } from '@/stores/useAnalysisStore'
import { GeminiError, analyzeConceptTranscript, continueConceptChat } from '@/lib/gemini'
import { formatKoreanDate, todayKey } from '@/lib/time'

function getSpeechRecognitionCtor(): any {
  if (typeof window === 'undefined') return null
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
}

/** Continuous Korean dictation via the browser's Web Speech API. */
function useSpeechRecognition({
  onFinalResult,
  onError,
  onEnd,
}: {
  onFinalResult: (text: string) => void
  onError?: (message: string) => void
  onEnd?: () => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const supported = getSpeechRecognitionCtor() != null

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) {
      onError?.('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome 최신 버전을 사용해주세요.')
      return
    }
    const recognition = new Ctor()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: any) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript
      }
      if (finalText) onFinalResult(finalText)
    }
    recognition.onerror = (event: any) => {
      onError?.(`음성 인식 오류: ${event.error}`)
      setIsRecording(false)
    }
    recognition.onend = () => {
      setIsRecording(false)
      onEnd?.()
    }
    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [onFinalResult, onError, onEnd])

  const stop = useCallback(() => recognitionRef.current?.stop(), [])

  return { isRecording, supported, start, stop }
}

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
          <PromptSetting
            title="AI 튜터 기준 설정"
            description="AI가 개념 정리 내용을 분석하고 질문할 때 참고할 기준이나 강조하고 싶은 내용을 입력하세요."
            placeholder="예: 발성 관련 개념은 더 엄격하게 질문해줘."
            value={conceptSummaryPrompt}
            onSave={setConceptSummaryPrompt}
          />
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
            <ChatThread
              messages={activeEntry.messages}
              pending={loadingAnalyze ? 'AI가 분석하고 있어요...' : undefined}
            />
            <ChatComposer
              value={answer}
              onChange={setAnswer}
              onSubmit={ask}
              placeholder="답변을 입력하거나 마이크 버튼으로 말해보세요 (Shift+Enter로 줄바꿈)"
              submitLabel="답변하기"
              busy={loadingChat}
              recording={answerRecording}
            />
          </div>
        )}

        <RecordList
          rows={conceptSummaries
            .slice()
            .reverse()
            .map((item) => ({
              id: item.id,
              label: formatKoreanDate(item.date),
              meta: item.messages.find((m) => m.role === 'model')?.text ?? '',
            }))}
          emptyText="저장된 대화가 없습니다."
          activeId={activeId}
          onSelect={setActiveId}
          onDelete={(id) => {
            removeConceptSummary(id)
            if (activeId === id) setActiveId(null)
          }}
        />
      </CardContent>
    </Card>
  )
}
