function getBarColor(value) {
  if (value < 0.4)  return 'var(--zone-green)'
  if (value < 0.70) return 'var(--zone-yellow)'
  return 'var(--zone-red)'
}

export default function SignalBar({ label, value = 0 }) {
  const color = getBarColor(value)
  const pct   = Math.min(100, Math.max(0, value * 100))

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
        <span
          className="text-xs font-medium"
          style={{ color, fontFamily: 'var(--font-mono)' }}
        >
          {value.toFixed(2)}
        </span>
      </div>
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-in-out"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: pct > 40 ? `0 0 8px ${color}60` : 'none',
          }}
        />
      </div>
    </div>
  )
}
