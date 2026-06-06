/**
 * GlassCard — mission-control style
 *
 * Props:
 *   children   — content
 *   className  — extra tailwind classes
 *   onClick    — optional click handler
 *   style      — extra inline styles
 *   accent     — 'green' | 'yellow' | 'red' | 'critical' | null
 *                adds a 1px colored top border + subtle glow
 *   cut        — bool  — adds corner-cut clip-path + corner dot
 *   hover      — bool  — adds hover glow ring on mouse-enter
 */

const ACCENT_MAP = {
  green: { border: 'var(--zone-green)', glow: 'rgba(0,229,160,0.12)' },
  yellow: { border: 'var(--zone-yellow)', glow: 'rgba(255,184,0,0.12)' },
  red: { border: 'var(--zone-red)', glow: 'rgba(255,68,85,0.12)' },
  critical: { border: 'var(--zone-critical)', glow: 'rgba(255,26,46,0.16)' },
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  style,
  accent = null,
  cut = false,
  hover = false,
}) {
  const a = accent ? ACCENT_MAP[accent] : null

  const handleEnter = hover
    ? (e) => {
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
      e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.5)'
    }
    : undefined

  const handleLeave = hover
    ? (e) => {
      e.currentTarget.style.borderColor = a
        ? 'transparent'
        : 'rgba(255,255,255,0.07)'
      e.currentTarget.style.boxShadow = a
        ? `0 0 28px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`
        : 'inset 0 1px 0 rgba(255,255,255,0.04)'
    }
    : undefined

  const base = {
    background: 'var(--bg-surface)',
    border: a ? 'transparent' : '1px solid rgba(255,255,255,0.07)',
    padding: '22px',
    boxSizing: 'border-box',
    position: 'relative',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    ...(a && {
      borderTop: `1px solid ${a.border}`,
      borderRight: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      boxShadow: `0 0 28px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
    }),
    ...style,
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`rounded-2xl ${cut ? 'card-cut' : ''} ${className}`}
      style={base}
    >
      {/* subtle inner top highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  )
}