import ZoneBadge from './ZoneBadge'

const ZONE_COLORS = {
  GREEN:    '#10b981',
  YELLOW:   '#f59e0b',
  RED:      '#ef4444',
  CRITICAL: '#dc2626',
}

// SVG arc constants
const R = 110
const CX = 140
const CY = 140
const CIRCUMFERENCE = 2 * Math.PI * R   // ≈ 691.15
const ARC_FRACTION  = 270 / 360         // 270° / full circle

export default function StrainGauge({ score = 0, zone = 'GREEN' }) {
  const safeScore = Math.min(100, Math.max(0, score ?? 0))
  const color     = ZONE_COLORS[zone] ?? ZONE_COLORS.GREEN
  const isCritical = zone === 'CRITICAL'

  // How much of the arc is filled (0 = none, CIRCUMFERENCE*ARC_FRACTION = full 270°)
  const dashOffset = CIRCUMFERENCE * (1 - (safeScore / 100) * ARC_FRACTION)

  // SVG arc: starts at 135° (bottom-left), sweeps 270° clockwise
  // rotate(-90) makes 0° = top; we then rotate 135° more = starts bottom-left
  const arcRotation = 135

  return (
    <div
      className={`relative flex flex-col items-center gap-4 ${
        isCritical ? 'animate-[pulse-critical_2s_infinite]' : ''
      }`}
    >
      <div className="relative" style={{ width: 280, height: 280 }}>
        <svg
          viewBox="0 0 280 280"
          width={280}
          height={280}
          className="absolute inset-0"
        >
          {/* Thin outer ring */}
          <circle
            cx={CX}
            cy={CY}
            r={R + 14}
            fill="none"
            stroke="#1e1e2e"
            strokeWidth={1}
          />

          {/* Background arc (full 270°) */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#1e1e2e"
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * ARC_FRACTION} ${CIRCUMFERENCE * (1 - ARC_FRACTION)}`}
            strokeDashoffset={0}
            transform={`rotate(${arcRotation} ${CX} ${CY})`}
          />

          {/* Active arc */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            transform={`rotate(${arcRotation} ${CX} ${CY})`}
            style={{
              transition: 'stroke-dashoffset 500ms ease-in-out, stroke 500ms ease-in-out',
              filter: `drop-shadow(0 0 8px ${color}60)`,
            }}
          />

          {/* Score number */}
          <text
            x={CX}
            y={CY + 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize={48}
            fontFamily="JetBrains Mono, monospace"
            fontWeight="bold"
            style={{
              transition: 'fill 500ms ease-in-out',
              animation: (zone === 'RED' || zone === 'CRITICAL') ? 'number-glow 2s infinite' : 'none',
            }}
          >
            {Math.round(safeScore)}
          </text>

          {/* Score label */}
          <text
            x={CX}
            y={CY + 34}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#44445a"
            fontSize={10}
            fontFamily="DM Sans, sans-serif"
            letterSpacing="2"
          >
            STRAIN SCORE
          </text>
        </svg>
      </div>

      <ZoneBadge zone={zone} />
    </div>
  )
}
