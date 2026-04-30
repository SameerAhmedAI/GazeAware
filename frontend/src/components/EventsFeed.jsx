/**
 * EventsFeed.jsx — Fix 5: Continuous status indicators + rolling event alerts.
 * Props:
 *   events — array from strainData.events
 *   status — live status dict from strainData.status
 */
import {
  ArrowUpFromLine, EyeOff, Sun, Droplets, AlertTriangle, Shield, Zap,
  Ruler, User,
} from 'lucide-react'

const EVENT_STYLES = {
  posture:         { color: 'text-zone-yellow', bg: 'bg-zone-yellow/10 border-zone-yellow/20', icon: ArrowUpFromLine, label: 'POSTURE' },
  blink_quality:   { color: 'text-zone-yellow', bg: 'bg-zone-yellow/10 border-zone-yellow/20', icon: EyeOff,          label: 'BLINK' },
  lighting:        { color: 'text-zone-yellow', bg: 'bg-zone-yellow/10 border-zone-yellow/20', icon: Sun,             label: 'LIGHTING' },
  tfsi:            { color: 'text-zone-red',    bg: 'bg-zone-red/10 border-zone-red/20',       icon: Droplets,        label: 'TFSI' },
  crash:           { color: 'text-zone-red',    bg: 'bg-zone-red/10 border-zone-red/20',       icon: AlertTriangle,   label: 'CRASH RISK' },
  forced_recovery: { color: 'text-zone-red',    bg: 'bg-zone-red/10 border-zone-red/20',       icon: Shield,          label: 'RECOVERY' },
  prescription:    { color: 'text-zone-yellow', bg: 'bg-zone-yellow/10 border-zone-yellow/20', icon: Zap,             label: 'PRESCRIPTION' },
}

const DEFAULT_STYLE = {
  color: 'text-text-secondary',
  bg:    'bg-elevated border-border-default',
  icon:  AlertTriangle,
  label: 'ALERT',
}

function relativeTime(isoTimestamp) {
  const diffMs  = Date.now() - new Date(isoTimestamp).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60)  return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60)  return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}

// ── Fix 5: Live status row ────────────────────────────────────────────────────
function StatusRow({ icon: Icon, label, value, good, warn }) {
  const color = good ? 'text-zone-green' : warn ? 'text-zone-red' : 'text-zone-yellow'
  return (
    <div className="flex items-center justify-between py-1.5 px-4 border-b border-border-subtle last:border-b-0">
      <div className="flex items-center gap-2">
        <Icon size={12} className={color} />
        <span className="font-dm text-xs text-text-muted">{label}</span>
      </div>
      <span className={`font-mono text-xs font-medium ${color}`}>{value}</span>
    </div>
  )
}

export default function EventsFeed({ events = [], status = {} }) {
  const displayed = [...events].reverse().slice(0, 10)

  // ── Parse status fields ───────────────────────────────────────────────────────
  const lightingScore  = status?.lighting?.score ?? null
  const lightingClass  = status?.lighting?.classification ?? null
  const driftCm        = status?.distance_drift?.drift_cm ?? null
  const driftWarn      = status?.distance_drift?.warning_active ?? false
  const blinkRatio     = status?.blink_quality?.partial_ratio ?? null
  const blinkWarn      = status?.blink_quality?.warning_active ?? false
  const tfsiStab       = status?.tfsi?.stability ?? null
  const leanSignal     = status?.posture?.lean_signal ?? null
  const leanWarn       = status?.posture?.warning_active ?? false

  const hasStatus = lightingScore !== null || driftCm !== null

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle">
        <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
          System Events
        </p>
        <h3 className="font-syne font-bold text-lg text-text-primary">Live Alerts</h3>
      </div>

      {/* Fix 5: Permanent live status panel — always visible */}
      {hasStatus && (
        <div className="border-b border-border-subtle">
          <p className="font-dm text-xs tracking-widest uppercase text-text-muted px-4 pt-3 pb-1">
            Live Status
          </p>
          {lightingScore !== null && (
            <StatusRow
              icon={Sun}
              label="Lighting"
              value={lightingClass
                ? `${lightingClass} (${Math.round(lightingScore)}/100)`
                : `${Math.round(lightingScore)}/100`}
              good={lightingScore >= 70}
              warn={lightingScore < 40}
            />
          )}
          {driftCm !== null && (
            <StatusRow
              icon={Ruler}
              label="Distance"
              value={driftWarn
                ? `Drifted ${driftCm >= 0 ? '+' : ''}${driftCm.toFixed(1)} cm`
                : 'Normal'}
              good={!driftWarn}
              warn={driftWarn}
            />
          )}
          {blinkRatio !== null && (
            <StatusRow
              icon={EyeOff}
              label="Blink Quality"
              value={`${Math.round(blinkRatio * 100)}% partial${blinkWarn ? ' ⚠' : ''}`}
              good={!blinkWarn}
              warn={blinkWarn}
            />
          )}
          {tfsiStab !== null && (
            <StatusRow
              icon={Droplets}
              label="TFSI"
              value={`${Math.round(tfsiStab * 100)}% stable`}
              good={tfsiStab >= 0.6}
              warn={tfsiStab < 0.4}
            />
          )}
          {leanSignal !== null && (
            <StatusRow
              icon={User}
              label="Posture"
              value={leanWarn
                ? `Leaning (${leanSignal.toFixed(2)})`
                : 'Upright'}
              good={!leanWarn}
              warn={leanWarn}
            />
          )}
        </div>
      )}

      {/* Rolling event list */}
      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 240 }}>
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 gap-3 text-center px-6">
            <Shield className="text-text-muted" size={24} />
            <p className="font-syne font-bold text-text-secondary text-sm">No alerts</p>
            <p className="font-dm text-xs text-text-muted">All signals nominal</p>
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {displayed.map((evt, i) => {
              const style = EVENT_STYLES[evt.type] ?? DEFAULT_STYLE
              const Icon  = style.icon
              return (
                <li key={i} className="flex items-start gap-3 px-6 py-3 hover:bg-elevated transition-colors duration-150">
                  <div className={`mt-0.5 shrink-0 flex items-center justify-center w-6 h-6 rounded-full border ${style.bg}`}>
                    <Icon size={12} className={style.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-dm font-medium text-xs tracking-widest uppercase ${style.color}`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="font-dm text-xs text-text-secondary leading-relaxed truncate">
                      {evt.message}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-text-muted shrink-0 mt-0.5">
                    {relativeTime(evt.timestamp)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
