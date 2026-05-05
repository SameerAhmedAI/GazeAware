// 270° arc — scaled down from 280 to 200 so it fits in a 1fr grid column
const SIZE      = 200
const CX        = SIZE / 2
const CY        = SIZE / 2
const RADIUS    = 78
const STROKE_W  = 10
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

function getZoneGlowRgb(score) {
  if (score >= 90) return '220, 38, 38'
  if (score >= 71) return '239, 68, 68'
  if (score >= 41) return '245, 158, 11'
  return '16, 185, 129'
}

export default function StrainGauge({ score = 0 }) {
  const clampedScore = Math.min(100, Math.max(0, score))
  const fillPct      = clampedScore / 100
  const dashOffset   = CIRCUMFERENCE * (1 - fillPct)
  const color        = getZoneColor(clampedScore)
  const glowRgb      = getZoneGlowRgb(clampedScore)

  console.log('[StrainGauge] score=', score, 'dashOffset=', dashOffset.toFixed(2))

  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={SIZE} height={SIZE} style={{ overflow: 'visible', display: 'block' }}>
        {/* Outer glow ring — subtle ambient bloom */}
        <circle
          cx={CX}
          cy={CY}
          r={RADIUS}
          fill="none"
          stroke={`rgba(${glowRgb}, 0.06)`}
          strokeWidth={STROKE_W + 14}
        />
        {/* Track */}
        <path
          d={TRACK_PATH}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
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
            filter: `drop-shadow(0 0 ${clampedScore > 0 ? '8px' : '3px'} rgba(${glowRgb}, ${clampedScore > 10 ? '0.7' : '0.25'}))`,
          }}
        />
      </svg>

      {/* Center content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '44px',
            fontWeight: 700,
            lineHeight: 1,
            color,
            textShadow: `0 0 24px rgba(${glowRgb}, ${clampedScore > 0 ? '0.45' : '0.15'})`,
            transition: 'color 500ms ease-in-out, text-shadow 500ms ease-in-out',
            letterSpacing: '-0.02em',
          }}
        >
          {Math.round(clampedScore)}
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
          }}
        >
          STRAIN
        </span>
      </div>
    </div>
  )
}
