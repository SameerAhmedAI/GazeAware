/**
 * ZoneBadge — zone status pill
 * CRITICAL gets animated glowing border + pulsing dot
 */

const ZONE_MAP = {
  GREEN: {
    color: 'var(--zone-green)',
    bg: 'var(--zone-green-bg)',
    border: 'var(--zone-green-border)',
    shadow: 'rgba(0,229,160,0.2)',
    dot: 'var(--zone-green)',
  },
  YELLOW: {
    color: 'var(--zone-yellow)',
    bg: 'var(--zone-yellow-bg)',
    border: 'var(--zone-yellow-border)',
    shadow: 'rgba(255,184,0,0.2)',
    dot: 'var(--zone-yellow)',
  },
  RED: {
    color: 'var(--zone-red)',
    bg: 'var(--zone-red-bg)',
    border: 'var(--zone-red-border)',
    shadow: 'rgba(255,68,85,0.22)',
    dot: 'var(--zone-red)',
  },
  CRITICAL: {
    color: 'var(--zone-critical)',
    bg: 'var(--zone-critical-bg)',
    border: 'var(--zone-critical-border)',
    shadow: 'rgba(255,26,46,0.35)',
    dot: 'var(--zone-critical)',
  },
}

export default function ZoneBadge({ zone = 'GREEN', className = '' }) {
  const s = ZONE_MAP[zone] ?? ZONE_MAP.GREEN
  const crit = zone === 'CRITICAL'

  return (
    <span
      className={`${crit ? 'animate-pulse-critical' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '5px 14px 5px 10px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
        boxShadow: `0 0 14px ${s.shadow}`,
        boxSizing: 'border-box',
        fontFamily: 'var(--font-mono)',
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      }}
    >
      {/* Dot */}
      <span
        className={crit ? 'animate-pulse-live' : ''}
        style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: s.dot,
          boxShadow: `0 0 8px ${s.dot}`,
          flexShrink: 0,
        }}
      />
      {zone}
    </span>
  )
}