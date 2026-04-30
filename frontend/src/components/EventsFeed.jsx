/**
 * EventsFeed.jsx — Fix 5
 * Displays the rolling alert events list from the WebSocket strain payload.
 * Props: events — array from strainData.events
 */
import {
  ArrowUpFromLine, EyeOff, Sun, Droplets, AlertTriangle, Shield, Zap,
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
  const diffMs = Date.now() - new Date(isoTimestamp).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60)  return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60)  return `${diffMin}m ago`
  return `${Math.floor(diffMin / 60)}h ago`
}

export default function EventsFeed({ events = [] }) {
  // Show newest first, cap at 10 for display
  const displayed = [...events].reverse().slice(0, 10)

  return (
    <div className="bg-surface border border-border-subtle rounded-2xl flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle">
        <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
          System Events
        </p>
        <h3 className="font-syne font-bold text-lg text-text-primary">Live Alerts</h3>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 320 }}>
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-6">
            <Shield className="text-text-muted" size={28} />
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
