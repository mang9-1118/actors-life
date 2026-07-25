import { useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { Timer } from '@/components/Timer'
import { TRAINING_TABS } from '@/types'
import { ScriptAnalysis1Panel } from '@/features/scriptAnalysis/ScriptAnalysis1Panel'
import { ScriptAnalysis2Panel } from '@/features/scriptAnalysis/ScriptAnalysis2Panel'
import { AuditionForm } from '@/features/auditions/AuditionForm'
import { ConceptSummaryPanel } from '@/features/conceptSummary/ConceptSummaryPanel'
import { LectureAnalysisPanel } from '@/features/lectureAnalysis/LectureAnalysisPanel'
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">{tab.label}</h1>
      <Timer timerKey={tab.id} />

      {tab.id === 'concept' && <ConceptSummaryPanel />}
      {tab.id === 'lecture' && <LectureAnalysisPanel />}
      {tab.id === 'auditionApply' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            여기서 오디션을 등록하면 오디션 현황 보드에 바로 반영됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {AUDITION_SITES.map((site) => (
              <Button key={site.name} variant="outline" size="sm" asChild>
                <a href={site.url} target="_blank" rel="noopener noreferrer">
                  {site.name}
                  <ExternalLink />
                </a>
              </Button>
            ))}
          </div>
          <AuditionForm />
        </div>
      )}
      {tab.id === 'analysis1' && <ScriptAnalysis1Panel />}
      {tab.id === 'analysis2' && <ScriptAnalysis2Panel />}
    </div>
  )
}
