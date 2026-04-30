import { useState, useEffect, useCallback } from 'react'
import {
  TrendingDown, AlertTriangle, CheckCircle2,
  Zap, RefreshCw, Droplets, ScanEye,
} from 'lucide-react'
import { useGazeSocket } from '../hooks/useGazeSocket'
import {
  getSession,
  triggerPrescription, triggerBaseline, triggerTfsi, triggerAcuity,
} from '../services/api'
import GlassCard      from '../components/GlassCard'
import StrainGauge    from '../components/StrainGauge'
import SignalBar      from '../components/SignalBar'
import ConnectionStatus from '../components/ConnectionStatus'
import ZoneBadge      from '../components/ZoneBadge'
import CameraFeed     from '../components/CameraFeed'
import EventsFeed     from '../components/EventsFeed'

const SIGNAL_LABELS = {
  blink_rate:         'Blink Rate',
  blink_quality:      'Blink Quality',
  screen_distance:    'Screen Distance',
  squint:             'Squint',
  gaze_entropy:       'Gaze Entropy',
  blink_irregularity: 'Blink Irregularity',
  eye_rubbing:        'Eye Rubbing',
  posture_lean:       'Posture Lean',
  scleral_redness:    'Scleral Redness',
}

// Fix 6: Control buttons config
const CONTROLS = [
  { label: 'Force Prescription', icon: Zap,       fn: triggerPrescription, color: '#f59e0b' },
  { label: 'New Baseline',       icon: RefreshCw,  fn: triggerBaseline,     color: '#e8e8f8' },
  { label: 'TFSI Alert',         icon: Droplets,   fn: triggerTfsi,         color: '#ef4444' },
  { label: 'Acuity Test',        icon: ScanEye,    fn: triggerAcuity,       color: '#e8e8f8' },
]

function tfsiColor(tfsi) {
  if (tfsi > 0.6) return 'text-zone-green'
  if (tfsi >= 0.3) return 'text-zone-yellow'
  return 'text-zone-red'
}

function tfsiBarColor(tfsi) {
  if (tfsi > 0.6) return '#10b981'
  if (tfsi >= 0.3) return '#f59e0b'
  return '#ef4444'
}

// Fix 6: Control button with 2-second "Triggered" flash
function ControlButton({ label, icon: Icon, fn, color }) {
  const [state, setState] = useState('idle') // 'idle' | 'triggered' | 'error'

  const handleClick = useCallback(async () => {
    try {
      setState('triggered')
      await fn()
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }, [fn])

  const isTriggered = state === 'triggered'
  const isError     = state === 'error'

  return (
    <button
      onClick={handleClick}
      disabled={state !== 'idle'}
      className="bg-elevated border border-border-default hover:border-border-active rounded-xl px-4 py-3 font-dm text-sm text-text-primary transition-all duration-200 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      style={isTriggered ? { borderColor: color, color } : isError ? { borderColor: '#ef4444', color: '#ef4444' } : {}}
    >
      <Icon size={15} style={{ color: isTriggered ? color : isError ? '#ef4444' : undefined }} />
      {isTriggered ? 'Triggered' : isError ? 'Error' : label}
    </button>
  )
}

export default function Dashboard() {
  // Fix 1: path-based WebSocket (Vite proxy handles routing)
  const { data: strainData, connected } = useGazeSocket('strain')
  const { data: signalData }            = useGazeSocket('signals')
  const [session, setSession]           = useState(null)
  const [lastUpdateMs, setLastUpdateMs] = useState(null)

  useEffect(() => {
    getSession().then(setSession).catch(() => {})
  }, [])

  useEffect(() => {
    if (strainData) setLastUpdateMs(Date.now())
  }, [strainData])

  const score        = strainData?.strain_score ?? 0
  const zone         = strainData?.zone ?? 'GREEN'
  const prediction   = strainData?.crash_prediction ?? { will_crash: false, confidence: 0 }
  const tfsi         = strainData?.tfsi_stability ?? 1.0
  const prescription = strainData?.active_prescription ?? null
  const tick         = strainData?.tick ?? 0
  const events       = strainData?.events ?? []   // Fix 5

  const updatedAgo = lastUpdateMs
    ? `${Math.round((Date.now() - lastUpdateMs) / 100) * 100}ms ago`
    : '—'

  return (
    <div className="p-8 flex flex-col gap-6" style={{ animation: 'fade-in-up 300ms ease-out both' }}>

      {/* Page header */}
      <div className="mb-2">
        <p className="font-dm text-xs tracking-widest uppercase text-text-muted mb-2">Monitoring</p>
        <h1 className="font-syne font-bold text-3xl text-text-primary">Live Dashboard</h1>
        <p className="font-dm text-text-secondary mt-1">Real-time eye strain monitoring from your webcam.</p>
      </div>

      {/* ── Section 1: Status Bar ── */}
      <GlassCard className="px-6 py-4 !p-0">
        <div className="flex items-center divide-x divide-border-subtle px-6 py-4">
          <div className="flex flex-col pr-8">
            <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted">Active Session</p>
            <p className="font-mono text-text-primary mt-0.5">Session #{session?.session_id ?? '—'}</p>
            <p className="font-dm text-xs text-text-muted mt-0.5">
              Started {session?.session_start ? new Date(session.session_start).toLocaleTimeString() : '—'}
            </p>
          </div>

          <div className="flex flex-col items-center flex-1 px-8">
            {session?.baseline_complete ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zone-green" />
                <span className="font-dm text-sm text-zone-green">Baseline Ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-zone-yellow animate-[pulse-live_1.5s_infinite]" />
                <span className="font-dm text-sm text-zone-yellow">Calibrating Baseline...</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end pl-8 gap-1">
            <ConnectionStatus connected={connected} />
            <span className="font-mono text-xs text-text-muted">Tick #{tick}</span>
          </div>
        </div>
      </GlassCard>

      {/* ── Section 2: Main Grid ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Column 1 — Strain Gauge */}
        <GlassCard
          variant={zone === 'CRITICAL' || zone === 'RED' ? 'critical' : 'default'}
          className="flex flex-col items-center justify-center gap-4 min-h-80"
        >
          <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted self-start">
            Strain Index
          </p>
          <h3 className="font-syne font-bold text-lg text-text-primary self-start -mt-3 mb-2">
            Eye Strain Gauge
          </h3>
          <StrainGauge score={score} zone={zone} />
          <p className="font-dm text-xs text-text-muted mt-2">Updated {updatedAgo}</p>
        </GlassCard>

        {/* Column 2 — Stacked */}
        <div className="flex flex-col gap-6">

          {/* Crash Predictor */}
          <GlassCard variant={prediction.will_crash ? 'warning' : 'default'} className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
                  Cognitive Crash Predictor
                </p>
                <h3 className="font-syne font-bold text-lg text-text-primary">Trajectory</h3>
              </div>
            </div>

            {prediction.will_crash ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} className="text-zone-yellow" style={{ animation: 'pulse-live 1.5s infinite' }} />
                  <span className="font-syne font-bold text-zone-yellow">CRASH IMMINENT</span>
                </div>
                {prediction.seconds_until_crash != null && (
                  <p className="font-mono text-4xl text-zone-yellow">
                    ~{Math.round(prediction.seconds_until_crash)}s
                  </p>
                )}
                <p className="font-dm text-xs text-text-muted">
                  {Math.round((prediction.confidence ?? 0) * 100)}% confidence
                </p>
                <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-zone-yellow transition-all duration-500"
                    style={{ width: `${(prediction.confidence ?? 0) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <TrendingDown size={20} className="text-zone-green" />
                  <span className="font-syne text-zone-green">Trajectory Stable</span>
                </div>
                <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-zone-green transition-all duration-500"
                    style={{ width: `${(prediction.confidence ?? 0) * 100}%` }}
                  />
                </div>
                <p className="font-dm text-xs text-text-muted">
                  {Math.round((prediction.confidence ?? 0) * 100)}% confidence
                </p>
              </div>
            )}
          </GlassCard>

          {/* TFSI Stability */}
          <GlassCard className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
                  Tear Film Stability Index
                </p>
                <h3 className="font-syne font-bold text-lg text-text-primary">TFSI</h3>
              </div>
              {tfsi < 0.25 && (
                <span className="font-dm font-medium text-xs tracking-widest uppercase bg-zone-red/10 text-zone-red border border-zone-red/20 rounded-full px-2 py-0.5">
                  AUTO-ALERT
                </span>
              )}
            </div>
            <p className={`font-mono font-bold text-4xl mb-3 ${tfsiColor(tfsi)}`}>
              {Math.round(tfsi * 100)}%
            </p>
            <div className="h-2 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${tfsi * 100}%`, backgroundColor: tfsiBarColor(tfsi) }}
              />
            </div>
          </GlassCard>
        </div>

        {/* Column 3 — Active Prescription */}
        <GlassCard variant={prescription ? 'warning' : 'default'} className="flex flex-col">
          <div className="mb-6">
            <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
              AI Prescription Engine
            </p>
            <h3 className="font-syne font-bold text-lg text-text-primary">Active Prescription</h3>
          </div>

          {prescription ? (
            <div className="flex-1 flex flex-col gap-4 relative">
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-zone-yellow rounded-full"
                style={{ animation: 'pulse-live 2s infinite' }}
              />
              <p className="font-syne font-bold text-lg text-text-primary uppercase leading-relaxed pl-4">
                {prescription}
              </p>
              <p className="font-mono text-xs text-text-muted pl-4 mt-auto">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <CheckCircle2 size={32} className="text-zone-green" />
              <p className="font-syne font-bold text-text-secondary">No intervention required</p>
              <p className="font-dm text-sm text-text-muted">All signals nominal</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Section 3: Signal Monitor ── */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
              Live Signal Monitor
            </p>
            <h3 className="font-syne font-bold text-lg text-text-primary">Raw Signal Feed</h3>
          </div>
          <ZoneBadge zone={zone} />
        </div>

        <div className="grid grid-cols-3 gap-x-8 gap-y-4">
          {Object.entries(SIGNAL_LABELS).map(([key, label]) => (
            <SignalBar
              key={key}
              name={label}
              value={signalData?.[key] ?? 0}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-2 bg-elevated rounded-lg px-3 py-1.5">
            <span className="font-dm text-xs text-text-muted">Lighting Score</span>
            <span className="font-mono text-xs text-text-primary">
              {signalData?.lighting_score != null ? signalData.lighting_score.toFixed(1) : '—'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-elevated rounded-lg px-3 py-1.5">
            <span className="font-dm text-xs text-text-muted">Distance Drift</span>
            <span className="font-mono text-xs text-text-primary">
              {signalData?.distance_drift_cm != null ? `${signalData.distance_drift_cm.toFixed(1)} cm` : '—'}
            </span>
          </div>
          {signalData?.modifiers?.light != null && (
            <div className="flex items-center gap-2 bg-elevated rounded-lg px-3 py-1.5">
              <span className="font-dm text-xs text-text-muted">Light Modifier</span>
              <span className="font-mono text-xs text-text-primary">
                ×{signalData.modifiers.light.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ── Section 4: Camera Feed + Events Feed (Fix 4 & 5) ── */}
      <div className="grid grid-cols-2 gap-6">
        <CameraFeed />
        <EventsFeed events={events} />
      </div>

      {/* ── Section 5: Controls (Fix 6) ── */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
              Manual Controls
            </p>
            <h3 className="font-syne font-bold text-lg text-text-primary">Dashboard Controls</h3>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {CONTROLS.map(({ label, icon, fn, color }) => (
            <ControlButton key={label} label={label} icon={icon} fn={fn} color={color} />
          ))}
        </div>
        <p className="font-dm text-xs text-text-muted mt-3">
          Controls send commands to the backend — backend must be running to take effect.
        </p>
      </GlassCard>

    </div>
  )
}
