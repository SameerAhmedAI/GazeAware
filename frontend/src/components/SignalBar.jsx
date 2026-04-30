function getBarColor(value) {
  if (value < 0.4)  return '#10b981' // green
  if (value < 0.7)  return '#f59e0b' // yellow
  return '#ef4444'                    // red
}

export default function SignalBar({ name, value = 0 }) {
  const safeValue = Math.min(1, Math.max(0, value ?? 0))
  const color = getBarColor(safeValue)
  const displayValue = safeValue.toFixed(2)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted">
          {name}
        </span>
        <span className="font-mono text-sm text-text-primary">
          {displayValue}
        </span>
      </div>
      <div className="h-1.5 bg-elevated rounded-full w-full overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${safeValue * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
