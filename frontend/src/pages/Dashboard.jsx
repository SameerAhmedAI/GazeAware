import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle2,
  Zap, RefreshCw, Droplets, ScanEye, X, Sun, Ruler, Eye, User,
  Loader2,
} from 'lucide-react'
import { useGazeSocket } from '../hooks/useGazeSocket'
import {
  getSession,
  triggerPrescription, triggerBaseline, triggerTfsi, triggerAcuity,
  clearPrescription,
} from '../services/api'
import GlassCard      from '../components/GlassCard'
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

const CONTROLS = [
  { label: 'Force Prescription', icon: Zap,      fn: triggerPrescription, color: '#f59e0b' },
  { label: 'New Baseline',       icon: RefreshCw, fn: triggerBaseline,     color: '#e8e8f8' },
  { label: 'TFSI Alert',         icon: Droplets,  fn: triggerTfsi,         color: '#ef4444' },
  { label: 'Acuity Test',        icon: ScanEye,   fn: triggerAcuity,       color: '#e8e8f8' },
]

// ── Zone color helpers ────────────────────────────────────────────────────────
function scoreColor(score) {
  if (score <= 40)  return 'text-zone-green'
  if (score <= 70)  return 'text-zone-yellow'
  return 'text-zone-red'
}

function tfsiColor(tfsi) {
  if (tfsi > 0.6)  return 'text-zone-green'
  if (tfsi >= 0.3) return 'text-zone-yellow'
  return 'text-zone-red'
}

function tfsiBarColor(tfsi) {
  if (tfsi > 0.6)  return '#10b981'
  if (tfsi >= 0.3) return '#f59e0b'
  return '#ef4444'
}

function tfsiLabel(tfsi) {
  if (tfsi > 0.80) return 'Tear Film Healthy'
  if (tfsi > 0.60) return 'Tear Film Good'
  if (tfsi > 0.40) return 'Tear Film Degrading'
  if (tfsi > 0.20) return 'Tear Film Unstable'
  return 'TEAR FILM CRITICAL'
}

// ── Force Prescription button with spinner + timeout feedback ─────────────────
function ForcePrescriptionButton({ fn, prescription, strainData }) {
  const [phase, setPhase]   = useState('idle')  // idle | spinning | timeout
  const timerRef            = useRef(null)
  const prevRxRef           = useRef(prescription)

  // Watch for prescription arriving after spin
  useEffect(() => {
    if (phase === 'spinning' && prescription && prescription !== prevRxRef.current) {
      clearTimeout(timerRef.current)
      setPhase('idle')
    }
    prevRxRef.current = prescription
  }, [prescription, phase])

  const handleClick = useCallback(async () => {
    if (phase !== 'idle') return
    try {
      setPhase('spinning')
      await fn()
      prevRxRef.current = prescription
      // After 3s with no new prescription, show warning
      timerRef.current = setTimeout(() => setPhase('timeout'), 3000)
    } catch {
      setPhase('idle')
    }
  }, [fn, phase, prescription])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // Auto-reset timeout message after 4s
  useEffect(() => {
    if (phase === 'timeout') {
      const t = setTimeout(() => setPhase('idle'), 4000)
      return () => clearTimeout(t)
    }
  }, [phase])

  const isSpinning = phase === 'spinning'
  const isTimeout  = phase === 'timeout'

  return (
    <button
      id="btn-force-prescription"
      onClick={handleClick}
      disabled={isSpinning}
      className="bg-elevated border border-border-default hover:border-border-active rounded-xl px-4 py-3 font-dm text-sm text-text-primary transition-all duration-200 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      style={isSpinning ? { borderColor: '#f59e0b', color: '#f59e0b' } : isTimeout ? { borderColor: '#ef4444', color: '#ef4444' } : {}}
    >
      {isSpinning ? (
        <><Loader2 size={15} className="animate-spin" /> Waiting...</>
      ) : isTimeout ? (
        <><AlertTriangle size={15} /> Check backend — may be in cooldown</>
      ) : (
        <><Zap size={15} style={{ color: '#f59e0b' }} /> Force Prescription</>
      )}
    </button>
  )
}

// ── Generic control button ────────────────────────────────────────────────────
function ControlButton({ label, icon: Icon, fn, color }) {
  const [state, setState] = useState('idle')  // 'idle' | 'triggered' | 'error'

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
  const { data: strainData, connected } = useGazeSocket('strain')
  const { data: signalData }            = useGazeSocket('signals')
  const [session, setSession]           = useState(null)
  const [displayAge, setDisplayAge]     = useState(0)
  // Fix 2: local dismiss state clears prescription immediately without waiting for WS
  const [localDismissed, setLocalDismissed] = useState(false)

  useEffect(() => {
    getSession().then(setSession).catch(() => {})
  }, [])

  // Recalculate age every second from computed_at
  useEffect(() => {
    if (!strainData?.computed_at) return
    const updateAge = () => {
      const age = Date.now() - new Date(strainData.computed_at).getTime()
      setDisplayAge(Math.round(age / 1000))
    }
    updateAge()
    const interval = setInterval(updateAge, 1000)
    return () => clearInterval(interval)
  }, [strainData?.computed_at])

  // When WS clears prescription (after next tick following dismiss), clear local dismiss
  useEffect(() => {
    if (!strainData?.active_prescription) setLocalDismissed(false)
  }, [strainData?.active_prescription])

  const score        = strainData?.strain_score ?? 0
  const zone         = strainData?.zone ?? 'GREEN'
  const prediction   = strainData?.crash_prediction ?? { will_crash: false, confidence: 0 }
  const tfsi         = strainData?.tfsi_stability ?? 1.0
  const tfsiSamples  = strainData?.tfsi_sample_count ?? 0
  const rawPrescription = strainData?.active_prescription ?? null
  const prescription = localDismissed ? null : rawPrescription
  const prescriptionTime = strainData?.prescription_timestamp ?? null
  const tick         = strainData?.tick ?? 0
  const events       = strainData?.events ?? []
  const blinkBpm     = strainData?.blink_rate_bpm ?? null
  const trendSlope   = strainData?.trend_slope ?? 0
  const status       = strainData?.status ?? {}

  const hasPrescription = prescription && prescription.trim().length > 0

  const updatedAgo = strainData?.computed_at
    ? (displayAge <= 1 ? 'Just updated' : `Updated ${displayAge}s ago`)
    : '—'

  // ── Crash predictor display state ────────────────────────────────────────────
  const confidence  = prediction?.confidence ?? 0
  const willCrash   = prediction?.will_crash ?? false

  let predictorState
  if (willCrash) {
    predictorState = 'warning'
  } else if (trendSlope > 0.1) {
    predictorState = 'rising'
  } else if (trendSlope < -0.1) {
    predictorState = 'recovering'
  } else {
    predictorState = 'stable'
  }

  const predictorConfig = {
    stable:     { Icon: Minus,        colorClass: 'text-text-secondary', label: 'Trajectory Stable',        barColor: '#888899' },
    rising:     { Icon: TrendingUp,   colorClass: 'text-zone-yellow',    label: 'Score Rising — Monitor Closely', barColor: '#f59e0b' },
    recovering: { Icon: TrendingDown, colorClass: 'text-zone-green',     label: 'Score Improving',            barColor: '#10b981' },
    warning:    { Icon: AlertTriangle, colorClass: 'text-zone-red',      label: willCrash && prediction.seconds_until_crash != null
                    ? `CRASH PREDICTED ~${Math.round(prediction.seconds_until_crash)}s`
                    : 'CRASH PREDICTED',
                  barColor: '#ef4444' },
  }
  const pc = predictorConfig[predictorState]

  return (
    <div className="p-8 flex flex-col gap-6" style={{ animation: 'fade-in-up 300ms ease-out both' }}>

      {/* Page header */}
      <div className="mb-2">
        <p className="font-dm text-xs tracking-widest uppercase text-text-muted mb-2">Monitoring</p>
        <h1 className="font-syne font-bold text-3xl text-text-primary">Live Dashboard</h1>
        <p className="font-dm text-text-secondary mt-1">Real-time eye strain monitoring from your webcam.</p>
      </div>

      {/* ── Section 1: Status Bar (Fix 1: compact score inline) ── */}
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

          {/* Fix 1: compact score display inline in status bar */}
          <div className="flex items-center gap-4 px-8">
            <div className="flex flex-col items-center">
              <p className="font-dm text-xs text-text-muted uppercase tracking-widest">Score</p>
              <p className={`font-mono font-bold text-2xl ${scoreColor(score)}`}>
                {Math.round(score)}<span className="text-text-muted text-sm font-normal">/100</span>
              </p>
            </div>
            <ZoneBadge zone={zone} />
          </div>

          <div className="flex flex-col items-end pl-8 gap-1">
            <ConnectionStatus connected={connected} />
            <span className="font-mono text-xs text-text-muted">Tick #{tick}</span>
            <span className="font-mono text-xs text-text-muted">{updatedAgo}</span>
          </div>
        </div>
      </GlassCard>

      {/* ── Section 2: Main Grid — 2 columns (Fix 1: removed StrainGauge col) ── */}
      <div className="grid grid-cols-2 gap-6">

        {/* Column 1 — Crash Predictor + TFSI stacked */}
        <div className="flex flex-col gap-6">

          {/* Crash Predictor (Fix 4: always shows state) */}
          <GlassCard variant={predictorState === 'warning' ? 'warning' : 'default'} className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
                  Cognitive Crash Predictor
                </p>
                <h3 className="font-syne font-bold text-lg text-text-primary">Trajectory</h3>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <pc.Icon
                  size={20}
                  className={`${pc.colorClass}${predictorState === 'warning' ? ' animate-[pulse-live_1.5s_infinite]' : ''}`}
                />
                <span className={`font-syne font-bold ${pc.colorClass}`}>{pc.label}</span>
              </div>

              {/* Confidence bar — always shown */}
              <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${confidence * 100}%`, backgroundColor: pc.barColor }}
                />
              </div>
              <p className="font-dm text-xs text-text-muted">
                {Math.round(confidence * 100)}% confidence · slope {trendSlope >= 0 ? '+' : ''}{trendSlope.toFixed(2)}/s
              </p>
            </div>
          </GlassCard>

          {/* TFSI Stability (Fix 4: always shows 5-tier state) */}
          <GlassCard className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
                  Tear Film Stability Index
                </p>
                <h3 className="font-syne font-bold text-lg text-text-primary">TFSI</h3>
              </div>
              {tfsi < 0.25 && (
                <span className="font-dm font-medium text-xs tracking-widest uppercase bg-zone-red/10 text-zone-red border border-zone-red/20 rounded-full px-2 py-0.5 animate-[pulse-live_1.5s_infinite]">
                  AUTO-ALERT
                </span>
              )}
            </div>
            <p className={`font-mono font-bold text-4xl mb-1 ${tfsiColor(tfsi)}`}>
              {Math.round(tfsi * 100)}%
            </p>
            <p className={`font-dm text-sm mb-3 ${tfsiColor(tfsi)}`}>
              {tfsiLabel(tfsi)}
            </p>
            <div className="h-2 bg-elevated rounded-full overflow-hidden mb-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${tfsi * 100}%`, backgroundColor: tfsiBarColor(tfsi) }}
              />
            </div>
            <p className="font-dm text-xs text-text-muted">
              Based on {tfsiSamples} blink samples
            </p>
          </GlassCard>
        </div>

        {/* Column 2 — Active Prescription (Fix 2: timestamp + local dismiss) */}
        <GlassCard variant={hasPrescription ? 'warning' : 'default'} className="flex flex-col">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
                AI Prescription Engine
              </p>
              <h3 className="font-syne font-bold text-lg text-text-primary">Active Prescription</h3>
            </div>
            {hasPrescription && (
              <button
                id="btn-dismiss-prescription"
                onClick={() => {
                  setLocalDismissed(true)
                  clearPrescription().catch(() => {})
                }}
                title="Dismiss prescription"
                className="ml-2 mt-0.5 text-text-muted hover:text-zone-red transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {hasPrescription ? (
            <div className="flex-1 flex flex-col gap-4 relative">
              <div
                className="absolute left-0 top-0 bottom-0 w-0.5 bg-zone-yellow rounded-full"
                style={{ animation: 'pulse-live 2s infinite' }}
              />
              <p className="font-syne font-bold text-lg text-text-primary uppercase leading-relaxed pl-4">
                {prescription}
              </p>
              {prescriptionTime && (
                <p className="font-mono text-xs text-text-muted pl-4">
                  Triggered at {new Date(prescriptionTime).toLocaleTimeString()}
                </p>
              )}
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
              // Fix 3: show BPM label for blink_rate instead of raw 0-1 float
              customLabel={
                key === 'blink_rate' && blinkBpm != null
                  ? `${blinkBpm.toFixed(1)} bpm`
                  : undefined
              }
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

      {/* ── Section 4: Camera Feed + Events Feed (with Fix 5 status panel) ── */}
      <div className="grid grid-cols-2 gap-6">
        <CameraFeed />
        <EventsFeed events={events} status={status} />
      </div>

      {/* ── Section 5: Controls ── */}
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
          {/* Fix 2: Force Prescription has special spinner + timeout logic */}
          <ForcePrescriptionButton
            fn={triggerPrescription}
            prescription={rawPrescription}
            strainData={strainData}
          />
          {/* Other controls */}
          {CONTROLS.filter(c => c.label !== 'Force Prescription').map(({ label, icon, fn, color }) => (
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
