function getBarColor(value) {
  if (value < 0.4)  return 'var(--zone-green)'
  if (value < 0.70) return 'var(--zone-yellow)'
  return 'var(--zone-red)'
}

export default function SignalBar({ label, value = 0 }) {
  const color = getBarColor(value)
  const pct   = Math.min(100, Math.max(0, value * 100))

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px 16px',
        borderRadius: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', minWidth: 0 }}>
        <span
          style={{
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.03em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flex: '1 1 0',
          }}
        >
          {label}
        </span>
        <span
          style={{
            color,
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.02em',
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value.toFixed(2)}
        </span>
      </div>

      {/* Progress bar track */}
      <div
        style={{
          width: '100%',
          height: '4px',
          borderRadius: '999px',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.05)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: '999px',
            background: color,
            boxShadow: pct > 10 ? `0 0 6px ${color}70` : 'none',
            transition: 'width 500ms ease-in-out, box-shadow 500ms ease-in-out',
          }}
        />
      </div>
    </div>
  )
}
