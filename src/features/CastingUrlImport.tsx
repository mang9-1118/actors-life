import { useState } from 'react'
import { useAuditionStore } from '@/stores/useAuditionStore'
import { CastingError, fetchCastingNotice } from '@/lib/casting'
import { formatKoreanDate, todayKey } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

/**
 * Pastes a casting notice link and adds it straight to the audition board,
 * pulling the title and deadline off the notice page.
 */
export function CastingUrlImport() {
  const addItem = useAuditionStore((s) => s.addItem)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  const importNotice = async () => {
    const trimmed = url.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const notice = await fetchCastingNotice(trimmed)
      addItem({
        title: notice.title,
        organization: notice.organization,
        url: notice.url,
        category: notice.category,
        mode: notice.mode,
        deadline: notice.deadline ?? todayKey(),
        announceDate: null,
        memo: '',
      })
      setUrl('')
      setResult(
        notice.deadline
          ? `오디션 현황 보드에 성공적으로 추가되었습니다 · ${notice.title} (마감 ${formatKoreanDate(notice.deadline)})`
          : `오디션 현황 보드에 성공적으로 추가되었습니다 · ${notice.title} — 공고에 마감일이 없어 오늘로 넣었으니 카드에서 수정해주세요.`,
      )
    } catch (e) {
      setError(e instanceof CastingError ? e.message : '공고를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') importNotice()
            }}
            placeholder="지원한 공고 주소를 붙여넣으세요"
            className="flex-1"
          />
          <Button onClick={importNotice} disabled={loading}>
            {loading ? '불러오는 중...' : '불러오기'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-muted-foreground">{result}</p>}
      </CardContent>
    </Card>
  )
}
