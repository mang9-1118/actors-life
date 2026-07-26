import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ChatComposer, ChatThread, PromptSetting, RecordList } from '@/components/common'
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
          <PromptSetting
            title="분석 AI 기준 설정"
            description="AI가 강의 영상을 분석할 때 참고할 기준이나 강조하고 싶은 내용을 입력하세요."
            placeholder="예: 발성 관련 내용이 나오면 더 자세히 풀어서 설명해줘."
            value={lectureAnalysisPrompt}
            onSave={setLectureAnalysisPrompt}
          />
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
            <ChatThread messages={activeEntry.messages} />
            <ChatComposer
              value={question}
              onChange={setQuestion}
              onSubmit={ask}
              placeholder="이해가 안 되는 부분을 질문해보세요 (Shift+Enter로 줄바꿈)"
              submitLabel="질문하기"
              busy={loadingChat}
            />
          </div>
        )}

        <RecordList
          rows={lectureAnalyses
            .slice()
            .reverse()
            .map((item) => ({ id: item.id, label: item.title ?? item.youtubeUrl }))}
          emptyText="분석한 강의가 없습니다."
          activeId={activeId}
          onSelect={setActiveId}
          onDelete={(id) => {
            removeLectureAnalysis(id)
            if (activeId === id) setActiveId(null)
          }}
        />
      </CardContent>
    </Card>
  )
}
