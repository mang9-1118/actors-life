import { useState, type ComponentProps, type ReactNode } from 'react'
import { Mic, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

/** A single headline number, e.g. "이번 달 읽은 책 / 3권". */
export function StatCard({
  label,
  value,
  valueClassName = 'text-foreground',
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <Card>
      <CardContent>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`mt-2 text-3xl font-semibold ${valueClassName}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

/** A form label stacked on top of its input. */
export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

/** A labelled text/date/number input. */
export function TextField({
  label,
  id,
  value,
  onChange,
  ...inputProps
}: {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
} & Omit<ComponentProps<typeof Input>, 'id' | 'value' | 'onChange'>) {
  return (
    <Field label={label} htmlFor={id}>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...inputProps} />
    </Field>
  )
}

/** The 수정 / 삭제 pair that sits at the right edge of a record row. */
export function RowActions({
  onEdit,
  onDelete,
  className = '',
}: {
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}) {
  return (
    <div className={`flex shrink-0 gap-2 ${className}`}>
      {onEdit && (
        <button onClick={onEdit} className="text-xs text-muted-foreground hover:text-foreground">
          수정
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} className="text-xs text-muted-foreground hover:text-foreground">
          삭제
        </button>
      )}
    </div>
  )
}

/** A saved log entry shown as its own card: heading row with 수정/삭제, then details. */
export function RecordCard({
  head,
  meta,
  body,
  gapClassName = 'gap-2',
  onEdit,
  onDelete,
  children,
}: {
  head: ReactNode
  meta?: ReactNode
  body?: string
  gapClassName?: string
  onEdit: () => void
  onDelete: () => void
  children?: ReactNode
}) {
  return (
    <Card>
      <CardContent className={`flex flex-col ${gapClassName}`}>
        <div className="flex items-center justify-between">
          {head}
          <RowActions onEdit={onEdit} onDelete={onDelete} />
        </div>
        {meta && <div className="text-xs text-muted-foreground">{meta}</div>}
        {body && <p className="whitespace-pre-wrap text-sm text-foreground">{body}</p>}
        {children}
      </CardContent>
    </Card>
  )
}

export interface RecordRow {
  id: string
  label: string
  /** Secondary text shown next to the label, e.g. a date or a preview. */
  meta?: string
}

/** The saved-records list used under each panel's input form. */
export function RecordList({
  rows,
  emptyText,
  activeId,
  onSelect,
  onEdit,
  onDelete,
}: {
  rows: RecordRow[]
  emptyText: string
  activeId?: string | null
  onSelect?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
            row.id === activeId ? 'bg-accent' : 'bg-muted'
          }`}
        >
          <button
            onClick={() => onSelect?.(row.id)}
            className="flex min-w-0 flex-1 items-baseline gap-2 text-left text-sm font-medium text-foreground hover:text-primary"
          >
            <span className="truncate">{row.label}</span>
            {row.meta && (
              <span className="truncate text-xs font-normal text-muted-foreground">{row.meta}</span>
            )}
          </button>
          <RowActions
            className="ml-2"
            onEdit={onEdit && (() => onEdit(row.id))}
            onDelete={onDelete && (() => onDelete(row.id))}
          />
        </li>
      ))}
      {rows.length === 0 && <li className="text-sm text-muted-foreground">{emptyText}</li>}
    </ul>
  )
}

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

/** Scrollable chat bubbles, with an optional greyed-out bubble for a pending reply. */
export function ChatThread({ messages, pending }: { messages: ChatMessage[]; pending?: string }) {
  return (
    <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
      {messages.map((msg, i) => (
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
      {pending && (
        <div className="max-w-[85%] self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          {pending}
        </div>
      )}
    </div>
  )
}

/** Chat input row: Enter sends, Shift+Enter breaks the line. */
export function ChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  busy,
  recording,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  submitLabel: string
  busy: boolean
  /** Optional dictation toggle shown between the textarea and the submit button. */
  recording?: { isRecording: boolean; supported: boolean; start: () => void; stop: () => void }
}) {
  return (
    <div className="flex gap-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSubmit()
          }
        }}
        placeholder={placeholder}
        rows={1}
        className="min-h-9 flex-1 resize-none"
      />
      {recording && (
        <Button
          type="button"
          variant={recording.isRecording ? 'outline' : 'ghost'}
          size="icon-sm"
          className={recording.isRecording ? 'border-amber-600 text-amber-600' : ''}
          disabled={!recording.supported}
          onClick={() => (recording.isRecording ? recording.stop() : recording.start())}
          aria-label="음성으로 답변 입력"
        >
          <Mic />
        </Button>
      )}
      <Button onClick={onSubmit} disabled={busy} variant="outline">
        {busy ? '답변 중...' : submitLabel}
      </Button>
    </div>
  )
}

/** Gear button next to a panel title that opens the panel's "AI 기준 설정" dialog. */
export function PromptSetting({
  title,
  description,
  placeholder,
  value,
  onSave,
  onOpen,
  children,
}: {
  title: string
  description: string
  placeholder: string
  value: string
  onSave: (prompt: string) => void
  /** Called right before the dialog opens, for callers with extra fields to seed. */
  onOpen?: () => void
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={title}
        onClick={() => {
          setDraft(value)
          onOpen?.()
          setOpen(true)
        }}
      >
        <Settings />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {children}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="min-h-32"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                onSave(draft)
                setOpen(false)
              }}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Hours + minutes editor for correcting an already-recorded duration. */
export function DurationDialog({
  open,
  onOpenChange,
  title,
  description,
  idPrefix,
  seconds,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: string
  idPrefix: string
  seconds: number
  onSave: (seconds: number) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the inputs start from the duration as it was then —
            later ticks of a running timer can't overwrite what the user is typing. */}
        <DurationFields
          seconds={seconds}
          idPrefix={idPrefix}
          onSave={(value) => {
            onSave(value)
            onOpenChange(false)
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function DurationFields({
  seconds,
  idPrefix,
  onSave,
  onCancel,
}: {
  seconds: number
  idPrefix: string
  onSave: (seconds: number) => void
  onCancel: () => void
}) {
  const [hours, setHours] = useState(String(Math.floor(seconds / 3600)))
  const [minutes, setMinutes] = useState(String(Math.floor((seconds % 3600) / 60)))

  return (
    <>
      <div className="flex items-end gap-2">
        <TextField
          label="시간"
          id={`${idPrefix}-hours`}
          type="number"
          min={0}
          value={hours}
          onChange={setHours}
          className="w-20"
        />
        <TextField
          label="분"
          id={`${idPrefix}-minutes`}
          type="number"
          min={0}
          max={59}
          value={minutes}
          onChange={setMinutes}
          className="w-20"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button
          onClick={() =>
            onSave(
              Math.max(0, Number(hours) || 0) * 3600 + Math.max(0, Number(minutes) || 0) * 60,
            )
          }
        >
          저장
        </Button>
      </DialogFooter>
    </>
  )
}

/** Horizontal progress bar split into one colored segment per category. */
export function StackedBar({
  segments,
  goalSeconds,
}: {
  segments: { key: string; label: string; seconds: number; color: string }[]
  goalSeconds: number
}) {
  return (
    <div className="flex h-5 w-full overflow-hidden rounded-full bg-muted">
      {segments.map((segment) => {
        const pct = goalSeconds > 0 ? (segment.seconds / goalSeconds) * 100 : 0
        if (pct <= 0) return null
        return (
          <div
            key={segment.key}
            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{ width: `${pct}%`, backgroundColor: segment.color }}
            title={`${segment.label} ${pct.toFixed(1)}%`}
          />
        )
      })}
    </div>
  )
}
