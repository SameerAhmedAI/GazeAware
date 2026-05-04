// 270° arc starting at 135° (bottom-left), sweeping clockwise to bottom-right
const SIZE      = 280
const CX        = SIZE / 2
const CY        = SIZE / 2
const RADIUS    = 110
const STROKE_W  = 12
const START_DEG = 135
const SWEEP_DEG = 270

// Total arc length — constant, computed once at module level (not inside component)
const CIRCUMFERENCE = (SWEEP_DEG / 360) * 2 * Math.PI * RADIUS

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx, cy, r, startDeg, sweepDeg) {
  const start    = polarToXY(cx, cy, r, startDeg)
  const end      = polarToXY(cx, cy, r, startDeg + sweepDeg)
  const largeArc = sweepDeg > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

// Pre-compute the static track path
const TRACK_PATH = describeArc(CX, CY, RADIUS, START_DEG, SWEEP_DEG)

function getZoneColor(score) {
  if (score >= 90) return 'var(--zone-critical)'
  if (score >= 71) return 'var(--zone-red)'
  if (score >= 41) return 'var(--zone-yellow)'
  return 'var(--zone-green)'
}

export default function StrainGauge({ score = 0 }) {
  // All calculations inline — no caching that could prevent re-render updates
  const clampedScore = Math.min(100, Math.max(0, score))
  const fillPct      = clampedScore / 100
  const dashOffset   = CIRCUMFERENCE * (1 - fillPct)
  const color        = getZoneColor(clampedScore)

  console.log('[StrainGauge] score=', score, 'dashOffset=', dashOffset.toFixed(2))

  return (
    <div className="flex items-center justify-center" style={{ width: SIZE, height: SIZE, position: 'relative' }}>
      <svg width={SIZE} height={SIZE} style={{ overflow: 'visible' }}>
        {/* Track */}
        <path
          d={TRACK_PATH}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={STROKE_W}
          strokeLinecap="round"
        />
        {/* Fill arc — dashOffset drives the animation */}
        <path
          d={TRACK_PATH}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 500ms ease-in-out, stroke 500ms ease-in-out',
            filter: clampedScore > 50 ? `drop-shadow(0 0 8px ${color}80)` : 'none',
          }}
        />
      </svg>

      {/* Center content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: '4px' }}
      >
        <span
          className="font-bold leading-none"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '52px',
            color,
            textShadow: clampedScore > 70 ? `0 0 24px ${color}60` : 'none',
            transition: 'color 500ms ease-in-out, text-shadow 500ms ease-in-out',
          }}
        >
          {Math.round(clampedScore)}
        </span>
        <span
          className="text-xs tracking-widest uppercase"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          STRAIN
        </span>
      </div>
    </div>
  )
}
