const ZONE_STYLES = {
  GREEN:    { color: 'var(--zone-green)',    bg: 'var(--zone-green-bg)',    border: 'var(--zone-green-border)'    },
  YELLOW:   { color: 'var(--zone-yellow)',   bg: 'var(--zone-yellow-bg)',   border: 'var(--zone-yellow-border)'   },
  RED:      { color: 'var(--zone-red)',      bg: 'var(--zone-red-bg)',      border: 'var(--zone-red-border)'      },
  CRITICAL: { color: 'var(--zone-critical)', bg: 'var(--zone-critical-bg)', border: 'var(--zone-critical-border)' },
}

export default function ZoneBadge({ zone = 'GREEN', className = '' }) {
  const s = ZONE_STYLES[zone] ?? ZONE_STYLES.GREEN
  const pulse = zone === 'CRITICAL' ? 'animate-pulse-critical' : ''

  return (
    <span
      className={`${pulse} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: s.color,
          boxShadow: `0 0 6px ${s.color}`,
          flexShrink: 0,
        }}
      />
      {zone}
    </span>
  )
}
