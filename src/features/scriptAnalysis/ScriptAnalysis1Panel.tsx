import { useState } from 'react'
import { useAnalysisStore } from '@/stores/useAnalysisStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ScriptAnalysis1 } from '@/types'

export function ScriptAnalysis1Panel() {
  const { scripts1, addScript1, updateScript1, removeScript1 } = useAnalysisStore()
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [openItem, setOpenItem] = useState<ScriptAnalysis1 | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editScript, setEditScript] = useState('')

  const submit = () => {
    if (!title.trim() || !script.trim()) return
    addScript1({ title: title.trim(), script })
    setTitle('')
    setScript('')
  }

  const openForEdit = (item: ScriptAnalysis1) => {
    setOpenItem(item)
    setEditTitle(item.title)
    setEditScript(item.script)
  }

  const saveEdit = () => {
    if (!openItem || !editTitle.trim()) return
    updateScript1(openItem.id, { title: editTitle.trim(), script: editScript })
    setOpenItem(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">1차적 분석 (듣고/반문/어.../아!그러네~/보고/반응)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="대본 텍스트를 입력하세요"
          rows={6}
        />
        <Button onClick={submit} className="self-start">
          저장
        </Button>

        <ul className="flex flex-col gap-2">
          {scripts1
            .slice()
            .reverse()
            .map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-muted px-3 py-2"
              >
                <button
                  onClick={() => openForEdit(item)}
                  className="text-sm font-medium text-foreground hover:text-primary"
                >
                  {item.title}
                </button>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => openForEdit(item)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => removeScript1(item.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          {scripts1.length === 0 && (
            <li className="text-sm text-muted-foreground">저장된 대본이 없습니다.</li>
          )}
        </ul>
      </CardContent>

      <Dialog open={openItem != null} onOpenChange={(open) => !open && setOpenItem(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">기록 수정</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="제목" />
            <Textarea
              value={editScript}
              onChange={(e) => setEditScript(e.target.value)}
              rows={12}
              className="text-base leading-relaxed"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenItem(null)}>
              취소
            </Button>
            <Button onClick={saveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
