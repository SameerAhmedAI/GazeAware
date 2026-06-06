/**
 * StrainGauge — mission control HUD style
 * - Outer ring of 36 tick marks (every 10° of the 270° arc)
 * - Animated fill arc with zone color
 * - Center readout with label
 * - Subtle glow bloom behind the number
 */

const SIZE = 210
const CX = SIZE / 2
const CY = SIZE / 2
const R_FILL = 78       // fill arc radius
const R_TICK_O = 96       // outer tick radius
const R_TICK_I = 90       // inner tick radius
const STROKE_W = 9
const START_DEG = 135
const SWEEP_DEG = 270
const TICK_COUNT = 36

const CIRC = (SWEEP_DEG / 360) * 2 * Math.PI * R_FILL

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startDeg, sweepDeg) {
  const s = polar(cx, cy, r, startDeg)
  const e = polar(cx, cy, r, startDeg + sweepDeg)
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${e.x} ${e.y}`
}

const TRACK = arcPath(CX, CY, R_FILL, START_DEG, SWEEP_DEG)

// Pre-compute tick marks
const TICKS = Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
  const deg = START_DEG + (SWEEP_DEG / TICK_COUNT) * i
  const outer = polar(CX, CY, R_TICK_O, deg)
  const inner = polar(CX, CY, i % 3 === 0 ? R_TICK_I - 3 : R_TICK_I, deg)
  return { outer, inner, major: i % 3 === 0 }
})

function zoneColor(s) {
  if (s >= 90) return 'var(--zone-critical)'
  if (s >= 71) return 'var(--zone-red)'
  if (s >= 41) return 'var(--zone-yellow)'
  return 'var(--zone-green)'
}

function glowRgb(s) {
  if (s >= 90) return '255,26,46'
  if (s >= 71) return '255,68,85'
  if (s >= 41) return '255,184,0'
  return '0,229,160'
}

function zoneLabel(s) {
  if (s >= 90) return 'CRITICAL'
  if (s >= 71) return 'HIGH'
  if (s >= 41) return 'MODERATE'
  return 'NOMINAL'
}

export default function StrainGauge({ score = 0 }) {
  const sc = Math.min(100, Math.max(0, score))
  const fill = sc / 100
  const color = zoneColor(sc)
  const rgb = glowRgb(sc)
  const label = zoneLabel(sc)

  return (
    <div
      style={{
        width: SIZE, height: SIZE,
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={SIZE} height={SIZE}
        style={{ overflow: 'visible', display: 'block', position: 'absolute', inset: 0 }}
      >
        {/* Ambient glow bloom */}
        <circle
          cx={CX} cy={CY} r={R_FILL}
          fill="none"
          stroke={`rgba(${rgb},0.05)`}
          strokeWidth={STROKE_W + 20}
        />

        {/* Tick ring */}
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.outer.x} y1={t.outer.y}
            x2={t.inner.x} y2={t.inner.y}
            stroke={t.major ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}
            strokeWidth={t.major ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Track arc */}
        <path
          d={TRACK}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={STROKE_W}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        <path
          d={TRACK}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - fill)}
          style={{
            transition: 'stroke-dashoffset 600ms cubic-bezier(0.4,0,0.2,1), stroke 600ms ease',
            filter: `drop-shadow(0 0 ${sc > 5 ? '10px' : '3px'} rgba(${rgb},${sc > 10 ? '0.75' : '0.2'}))`,
          }}
        />

        {/* Inner ring — thin decorative */}
        <circle
          cx={CX} cy={CY} r={58}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={1}
          strokeDasharray="3 6"
        />
      </svg>

      {/* Center content */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '2px', zIndex: 1,
      }}>
        {/* Score */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '48px',
          fontWeight: 700,
          lineHeight: 1,
          color,
          letterSpacing: '-0.03em',
          textShadow: `0 0 30px rgba(${rgb},${sc > 0 ? '0.5' : '0.15'})`,
          transition: 'color 600ms ease, text-shadow 600ms ease',
        }}>
          {Math.round(sc)}
        </span>

        {/* STRAIN label */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
          marginTop: '2px',
        }}>
          STRAIN
        </span>

        {/* Zone label */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color,
          opacity: 0.7,
          transition: 'color 600ms ease',
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}