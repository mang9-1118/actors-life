import { useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Timer } from '@/components/Timer'
import { TRAINING_TABS } from '@/types'
import { ScriptAnalysis1Panel, ScriptAnalysis2Panel } from '@/features/ScriptAnalysisPanels'
import { AuditionBoard } from '@/features/AuditionBoard'
import { AuditionForm } from '@/features/AuditionForm'
import { CastingBookmarkletLink } from '@/features/CastingBookmarklet'
import { ConceptSummaryPanel } from '@/features/ConceptSummaryPanel'
import { LectureAnalysisPanel } from '@/features/LectureAnalysisPanel'
import { Button } from '@/components/ui/button'

const AUDITION_SITES = [
  { name: '필름메이커스', url: 'https://www.filmmakers.co.kr/actorCasting' },
  { name: '플필', url: 'https://plfil.com/casting' },
]

export function TrainingTabPage() {
  const { tabPath } = useParams<{ tabPath: string }>()
  const tab = TRAINING_TABS.find((t) => t.path === tabPath)

  if (!tab) {
    return <div className="text-muted-foreground">알 수 없는 탭입니다.</div>
  }

  // The audition tab also hosts the status board, which needs room for four columns;
  // its timer and forms stay as narrow as every other tab's.
  const hasBoard = tab.id === 'auditionApply'

  return (
    <div
      className={`mx-auto flex w-full flex-col gap-6 ${hasBoard ? 'max-w-6xl' : 'max-w-3xl'}`}
    >
      <div className={hasBoard ? 'mx-auto flex w-full max-w-3xl flex-col gap-6' : 'contents'}>
        <h1 className="text-2xl font-heading font-semibold text-foreground">{tab.label}</h1>
        <Timer timerKey={tab.id} />

        {tab.id === 'concept' && <ConceptSummaryPanel />}
        {tab.id === 'lecture' && <LectureAnalysisPanel />}
        {tab.id === 'auditionApply' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {AUDITION_SITES.map((site) => (
                <Button key={site.name} variant="outline" size="sm" asChild>
                  <a href={site.url} target="_blank" rel="noopener noreferrer">
                    {site.name}
                    <ExternalLink />
                  </a>
                </Button>
              ))}
              <CastingBookmarkletLink />
            </div>
            {/* A bookmarklet has no affordance for "drag me to the bookmarks bar", so
                this one line stays. */}
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">오디션 가져오기</span>를 북마크바에 끌어다 놓으면, 두
              사이트의 공고 페이지에서 눌러 가져올 수 있습니다.
            </p>
            <AuditionForm />
          </div>
        )}
        {tab.id === 'analysis1' && <ScriptAnalysis1Panel />}
        {tab.id === 'analysis2' && <ScriptAnalysis2Panel />}
      </div>

      {hasBoard && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-heading font-semibold text-foreground">오디션 현황 보드</h2>
          <AuditionBoard />
        </section>
      )}
    </div>
  )
}
