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
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase ${pulse} ${className}`}
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
      />
      {zone}
    </span>
  )
}
