interface StackedBarSegment {
  key: string
  label: string
  seconds: number
  color: string
}

interface StackedBarProps {
  segments: StackedBarSegment[]
  goalSeconds: number
}

export function StackedBar({ segments, goalSeconds }: StackedBarProps) {
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
