import { useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { useAnalysisStore } from '@/stores/useAnalysisStore'
import {
  GeminiError,
  analyzeYoutubeLecture,
  continueLectureChat,
  splitLectureAnalysisIntoMessages,
} from '@/lib/gemini'
import { getYoutubeEmbedUrl, getYoutubeTitle } from '@/lib/youtube'

function YoutubePlayer({ url }: { url: string }) {
  const embedUrl = getYoutubeEmbedUrl(url)
  if (!embedUrl) return null
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={embedUrl}
        title="YouTube video player"
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

export function LectureAnalysisPanel() {
  const { lectureAnalyses, addLectureAnalysis, appendLectureMessage, removeLectureAnalysis } =
    useAnalysisStore()
  const lectureAnalysisPrompt = useAnalysisStore((s) => s.lectureAnalysisPrompt)
  const setLectureAnalysisPrompt = useAnalysisStore((s) => s.setLectureAnalysisPrompt)
  const [url, setUrl] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [loadingAnalyze, setLoadingAnalyze] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)
  const [error, setError] = useState('')
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [draftPrompt, setDraftPrompt] = useState('')

  const activeEntry = lectureAnalyses.find((e) => e.id === activeId) ?? null
  const draftEmbedUrl = useMemo(() => getYoutubeEmbedUrl(url), [url])

  const analyze = async () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return
    setLoadingAnalyze(true)
    setError('')
    try {
      const [result, title] = await Promise.all([
        analyzeYoutubeLecture(trimmedUrl, lectureAnalysisPrompt),
        getYoutubeTitle(trimmedUrl),
      ])
      const messages = splitLectureAnalysisIntoMessages(result).map((text) => ({
        role: 'model' as const,
        text,
      }))
      const id = addLectureAnalysis({
        youtubeUrl: trimmedUrl,
        title: title ?? undefined,
        messages,
      })
      setActiveId(id)
      setUrl('')
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setLoadingAnalyze(false)
    }
  }

  const ask = async () => {
    if (!activeEntry || !question.trim() || loadingChat) return
    const entry = activeEntry
    const q = question.trim()
    const priorMessages = entry.messages
    setQuestion('')
    appendLectureMessage(entry.id, { role: 'user', text: q })
    setLoadingChat(true)
    setError('')
    try {
      const result = await continueLectureChat(entry.youtubeUrl, priorMessages, q)
      appendLectureMessage(entry.id, { role: 'model', text: result })
    } catch (e) {
      setError(e instanceof GeminiError ? e.message : '문답 중 오류가 발생했습니다.')
    } finally {
      setLoadingChat(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-lg">강의 듣기 분석</CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="분석 AI 기준 설정"
            onClick={() => {
              setDraftPrompt(lectureAnalysisPrompt)
              setPromptDialogOpen(true)
            }}
          >
            <Settings />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="유튜브 링크를 입력하세요"
            className="flex-1"
          />
          <Button onClick={analyze} disabled={loadingAnalyze}>
            {loadingAnalyze ? '분석 중...' : '분석하기'}
          </Button>
        </div>

        {!activeEntry && draftEmbedUrl && <YoutubePlayer url={url} />}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {activeEntry && (
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <a
              href={activeEntry.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="truncate text-xs text-muted-foreground hover:text-primary"
            >
              {activeEntry.title ?? activeEntry.youtubeUrl}
            </a>
            <YoutubePlayer url={activeEntry.youtubeUrl} />
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
            </div>
            <div className="flex gap-2">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask()
                  }
                }}
                placeholder="이해가 안 되는 부분을 질문해보세요 (Shift+Enter로 줄바꿈)"
                rows={1}
                className="min-h-9 flex-1 resize-none"
              />
              <Button onClick={ask} disabled={loadingChat} variant="outline">
                {loadingChat ? '답변 중...' : '질문하기'}
              </Button>
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {lectureAnalyses
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
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground hover:text-primary"
                >
                  {item.title ?? item.youtubeUrl}
                </button>
                <button
                  onClick={() => {
                    removeLectureAnalysis(item.id)
                    if (activeId === item.id) setActiveId(null)
                  }}
                  className="ml-2 shrink-0 text-xs text-muted-foreground hover:text-foreground"
                >
                  삭제
                </button>
              </li>
            ))}
          {lectureAnalyses.length === 0 && (
            <li className="text-sm text-muted-foreground">분석한 강의가 없습니다.</li>
          )}
        </ul>
      </CardContent>

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>분석 AI 기준 설정</DialogTitle>
            <DialogDescription>
              AI가 강의 영상을 분석할 때 참고할 기준이나 강조하고 싶은 내용을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draftPrompt}
            onChange={(e) => setDraftPrompt(e.target.value)}
            placeholder="예: 발성 관련 내용이 나오면 더 자세히 풀어서 설명해줘."
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                setLectureAnalysisPrompt(draftPrompt)
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
