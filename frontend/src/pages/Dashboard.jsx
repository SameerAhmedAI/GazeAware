import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, AlertTriangle, TrendingDown, CheckCircle2, Activity, Wifi, WifiOff, Clock, Zap, Eye } from 'lucide-react'
import { useGazeSocket } from '../hooks/useGazeSocket.js'
import { api } from '../services/api.js'
import GlassCard from '../components/GlassCard.jsx'
import StrainGauge from '../components/StrainGauge.jsx'
import ZoneBadge from '../components/ZoneBadge.jsx'
import SignalBar from '../components/SignalBar.jsx'
import ConnectionStatus from '../components/ConnectionStatus.jsx'

// Map backend zone string to badge variant
function toBadgeZone(zone) {
  if (!zone) return 'GREEN'
  const z = zone.toUpperCase()
  if (z === 'CRITICAL') return 'CRITICAL'
  if (z === 'RED') return 'RED'
  if (z === 'YELLOW') return 'YELLOW'
  return 'GREEN'
}

// Format elapsed seconds
function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function CameraFeed() {
  const [feedError, setFeedError] = useState(false)

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={14} style={{ color: 'var(--text-muted)' }} />
          <span
            className="text-xs tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}
          >
            LIVE CAMERA FEED
          </span>
        </div>
        {!feedError ? (
          <span className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--zone-green)',
                animation: 'pulse-live 1.5s infinite' }}
            />
            <span className="text-xs"
              style={{ color: 'var(--zone-green)', fontFamily: 'var(--font-mono)' }}>
              LIVE
            </span>
          </span>
        ) : (
          <span className="text-xs"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}>
            OPENCV WINDOW
          </span>
        )}
      </div>

      {!feedError ? (
        <img
          src="http://127.0.0.1:8000/video_feed"
          alt="Live camera feed"
          onError={() => setFeedError(true)}
          style={{
            width: '100%',
            borderRadius: '12px',
            display: 'block',
            border: '1px solid var(--border-subtle)',
          }}
        />
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl"
          style={{
            height: '160px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Camera size={32} style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}>
            Feed available in OpenCV window
          </p>
          <p className="text-xs"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
              opacity: 0.5 }}>
            localhost:8000 — OpenCV
          </p>
        </div>
      )}
    </GlassCard>
  )
}

// Crash predictor card
function CrashCard({ crash }) {
  const will_crash = crash?.will_crash === true
  const seconds = crash?.seconds_until_crash ?? 0
  const confidence = crash?.confidence ?? 0

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          CRASH PREDICTOR
        </span>
        <Activity size={14} style={{ color: 'var(--text-muted)' }} />
      </div>

      {!will_crash ? (
        <div className="flex items-center gap-3">
          <TrendingDown size={22} style={{ color: 'var(--zone-green)' }} />
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--zone-green)', fontFamily: 'var(--font-dm)' }}>
              Trajectory Stable
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              No crash predicted
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="animate-pulse-live" style={{ color: 'var(--zone-yellow)' }} />
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--zone-yellow)', fontFamily: 'var(--font-syne)' }}>
              CRASH IMMINENT
            </span>
          </div>
          <div
            className="text-4xl font-bold"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--zone-red)', lineHeight: 1 }}
          >
            ~{Math.round(seconds)}
            <span className="text-base ml-1" style={{ color: 'var(--text-muted)' }}>s</span>
          </div>
          {/* Confidence bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Confidence</span>
              <span className="text-xs" style={{ color: 'var(--zone-yellow)', fontFamily: 'var(--font-mono)' }}>
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${confidence * 100}%`, background: 'var(--zone-yellow)' }}
              />
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// TFSI stability card — Bug 2 fix: explicit null guard before any multiplication
function TFSICard({ stability }) {
  // Always guard against null/undefined before multiplying
  const tfsi = stability ?? 0
  const tfsiPct = (tfsi * 100).toFixed(1)
  const pctNum = parseFloat(tfsiPct)
  const color = stability == null
    ? 'var(--text-muted)'
    : pctNum > 50 ? 'var(--zone-green)'
      : pctNum > 25 ? 'var(--zone-yellow)'
        : 'var(--zone-red)'
  const atRisk = stability != null && stability < 0.25

  return (
    <GlassCard className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          TFSI STABILITY
        </span>
        {atRisk && (
          <span
            className="text-xs px-2 py-0.5 rounded-full animate-pulse-live"
            style={{
              fontFamily: 'var(--font-mono)',
              color: 'var(--zone-critical)',
              background: 'var(--zone-critical-bg)',
              border: '1px solid var(--zone-critical-border)',
            }}
          >
            AUTO-ALERT RISK
          </span>
        )}
      </div>

      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)', color }}>
          {stability != null ? tfsiPct : '—'}
        </span>
        <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>%</span>
      </div>

      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${tfsiPct}%`,
            background: color,
            boxShadow: pctNum > 0 ? `0 0 8px ${color}60` : 'none',
          }}
        />
      </div>
      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        Tear Film Stability Index
      </span>
    </GlassCard>
  )
}

// Signal monitor panel
function SignalMonitor({ signalsData }) {
  const SIGNAL_KEYS = [
    { key: 'blink_rate', label: 'Blink Rate' },
    { key: 'blink_quality', label: 'Blink Quality' },
    { key: 'blink_irregularity', label: 'Blink Irregularity' },
    { key: 'screen_distance', label: 'Screen Distance' },
    { key: 'squint', label: 'Squint' },
    { key: 'gaze_entropy', label: 'Gaze Entropy' },
    { key: 'eye_rubbing', label: 'Eye Rubbing' },
    { key: 'posture_lean', label: 'Posture Lean' },
    { key: 'scleral_redness', label: 'Scleral Redness' },
  ]

  const lightingScore = signalsData?.lighting_score ?? 0
  const distanceDrift = signalsData?.distance_drift_cm ?? 0

  return (
    <GlassCard className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          SIGNAL MONITOR
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          9 CHANNELS · 500ms
        </span>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {SIGNAL_KEYS.map(({ key, label }) => (
          <SignalBar
            key={key}
            label={label}
            value={signalsData?.[key] ?? 0}
          />
        ))}
      </div>

      {/* Supplementary */}
      <div
        className="flex flex-wrap gap-6 pt-4"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Lighting Score</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {typeof lightingScore === 'number' ? lightingScore.toFixed(1) : '—'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Distance Drift</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {typeof distanceDrift === 'number' ? `${distanceDrift.toFixed(1)} cm` : '—'}
          </span>
        </div>
        {signalsData?.modifiers && (
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Modifiers</span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {JSON.stringify(signalsData.modifiers)}
            </span>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ── Toast helpers ─────────────────────────────────────────────────────────────
let _toastId = 0

export default function Dashboard() {
  const { strainData, signalsData, isConnected, lastStrainRef } = useGazeSocket()
  useEffect(() => { console.log('STRAIN:', strainData) }, [strainData])
  const [session, setSession] = useState(null)
  const [toasts, setToasts] = useState([])   // [{ id, message, type }]
  const [actionLoading, setActionLoading] = useState(null) // button id being loaded

  // Prescription state
  const [rxText, setRxText] = useState(null)
  const [rxTimestamp, setRxTimestamp] = useState(null)

  // Last-updated timer — use lastStrainRef from hook instead of local ref
  const [elapsed, setElapsed] = useState(null)

  // Toast helper — auto-dismisses after 3 s
  const addToast = useCallback((message, type = 'success') => {
    const id = ++_toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  // Fetch session once
  useEffect(() => {
    api.getSession()
      .then(setSession)
      .catch(() => setSession(null))
  }, [])

  // Track prescription changes
  useEffect(() => {
    const rx = strainData?.active_prescription
    if (rx && rx !== rxText) {
      setRxText(rx)
      setRxTimestamp(new Date())
    } else if (!rx && rxText) {
      setRxText(null)
      setRxTimestamp(null)
    }
  }, [strainData?.active_prescription])

  // lastStrainRef is updated inside useGazeSocket on every message —
  // no local effect needed; the 1-second timer below reads it directly.

  // 1-second interval — reads lastStrainRef from the hook
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastStrainRef.current === null) {
        setElapsed(null)
        return
      }
      setElapsed(Date.now() - lastStrainRef.current)
    }, 1000)
    return () => clearInterval(timer)
  }, [lastStrainRef])

  const score = strainData?.strain_score ?? 0
  const zone = toBadgeZone(strainData?.zone)
  // Bug 4: tick from live WS only, threshold hardcoded at 120 (120 × 500ms = 60s)
  const tick = strainData?.tick ?? 0
  const stability = strainData?.tfsi_stability ?? null
  const crash = strainData?.crash_prediction ?? null
  const baselineWaiting = strainData === null
  const baselineReady = strainData !== null && tick >= 120

  // Bug 1: gauge disconnect driven by actual data, not isConnected boolean
  // isConnected only drives the top-right LIVE/DISCONNECTED indicator
  const gaugeDisconnected = strainData === null || typeof strainData.strain_score !== 'number'

  // Format elapsed label — uses gaugeDisconnected, not isConnected
  const updatedLabel = (() => {
    if (gaugeDisconnected) return 'Waiting...'
    if (elapsed === null) return 'Waiting...'
    if (elapsed > 5000) return 'DISCONNECTED'
    const s = Math.max(0, Math.floor(elapsed / 1000))
    return s === 0 ? 'Updated just now' : `Updated ${s}s ago`
  })()

  const updatedColor = (gaugeDisconnected || (elapsed !== null && elapsed > 5000))
    ? 'var(--zone-red)'
    : 'var(--text-muted)'

  return (
    <div className="flex flex-col min-h-full" style={{ padding: '24px', gap: '20px' }}>

      {/* Status bar */}
      <div
        className="flex flex-wrap items-center gap-4 justify-between rounded-2xl px-6 py-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        {/* Left: session info */}
        <div className="flex items-center gap-6">
          {session && (
            <>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SESSION</span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  #{session.session_id ?? '—'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>STARTED</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {session.session_start
                    ? new Date(session.session_start).toLocaleTimeString()
                    : '—'}
                </span>
              </div>
            </>
          )}

          {/* Baseline — Bug 3: three states from live WS tick */}
          <div className="flex items-center gap-2">
            {baselineWaiting ? (
              <>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Waiting for connection...
                </span>
              </>
            ) : baselineReady ? (
              <>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--zone-green)', boxShadow: '0 0 6px var(--zone-green)' }} />
                <span className="text-xs" style={{ color: 'var(--zone-green)', fontFamily: 'var(--font-mono)' }}>
                  Baseline Ready
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full animate-pulse-live" style={{ background: 'var(--zone-yellow)' }} />
                <span className="text-xs" style={{ color: 'var(--zone-yellow)', fontFamily: 'var(--font-mono)' }}>
                  Calibrating Baseline... ({tick}/120)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: connection + tick */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-0.5 items-end">
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TICK</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {tick}
            </span>
          </div>
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </div>

      {/* 3-column main grid */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'start' }}>

        {/* Col 1 — Strain gauge */}
        <GlassCard className="flex flex-col items-center gap-4">
          <span className="text-xs tracking-widest uppercase self-start" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            EYE STRAIN GAUGE
          </span>
          <StrainGauge score={score} />
          <ZoneBadge zone={zone} />
          <span
            className="text-xs"
            style={{ fontFamily: 'var(--font-mono)', color: updatedColor }}
          >
            {updatedLabel}
          </span>
        </GlassCard>

        {/* Col 2 — Crash + TFSI */}
        <div className="flex flex-col gap-4">
          <CrashCard crash={crash} />
          <TFSICard stability={stability} />
        </div>

        {/* Col 3 — Active Prescription */}
        <div className="flex flex-col gap-4">
          <GlassCard
            className="flex flex-col gap-4"
            style={{
              borderLeft: rxText ? '2px solid var(--zone-yellow)' : undefined,
              animation: rxText ? 'pulse-critical 3s infinite' : undefined,
            }}
          >
            <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              ACTIVE PRESCRIPTION
            </span>

            {rxText == null ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} style={{ color: 'var(--zone-green)' }} />
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--zone-green)', fontFamily: 'var(--font-dm)' }}>
                    No intervention required
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Eyes in healthy range
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-slide-in-right">
                <AlertTriangle size={18} style={{ color: 'var(--zone-yellow)' }} />
                <p
                  className="text-lg font-bold leading-snug uppercase"
                  style={{ fontFamily: 'var(--font-syne)', color: 'var(--zone-yellow)' }}
                >
                  {rxText}
                </p>
                {rxTimestamp && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {rxTimestamp.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Camera feed */}
          <CameraFeed />
        </div>
      </div>

      {/* Signal monitor — full width */}
      <SignalMonitor signalsData={signalsData} />

      {/* Quick Actions */}
      <GlassCard className="flex flex-col gap-5">
        <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          QUICK ACTIONS
        </span>
        <div className="flex gap-4">

          {/* Button 1 — Force Prescription */}
          <button
            disabled={actionLoading === 'rx'}
            onClick={async () => {
              setActionLoading('rx')
              try {
                await api.forcePrescription()
                addToast('Prescription triggered', 'success')
              } catch (_) {
                addToast('Action not available — add POST /actions/force_prescription to backend', 'muted')
              } finally { setActionLoading(null) }
            }}
            className="flex items-center gap-3 flex-1 rounded-xl px-6 py-4 text-sm font-medium transition-all duration-200"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-dm)',
              cursor: actionLoading === 'rx' ? 'wait' : 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay, #1a1a2e)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          >
            {actionLoading === 'rx'
              ? <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--zone-yellow)', borderTopColor: 'transparent' }} />
              : <Zap size={16} style={{ color: 'var(--zone-yellow)', flexShrink: 0 }} />
            }
            Force Prescription
          </button>

          {/* Button 2 — Trigger Acuity */}
          <button
            disabled={actionLoading === 'acuity'}
            onClick={async () => {
              setActionLoading('acuity')
              try {
                await api.triggerAcuity()
                addToast('Acuity test started in OpenCV window', 'success')
              } catch (_) {
                addToast('Action not available — add POST /actions/trigger_acuity to backend', 'muted')
              } finally { setActionLoading(null) }
            }}
            className="flex items-center gap-3 flex-1 rounded-xl px-6 py-4 text-sm font-medium transition-all duration-200"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-dm)',
              cursor: actionLoading === 'acuity' ? 'wait' : 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay, #1a1a2e)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          >
            {actionLoading === 'acuity'
              ? <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
              : <Eye size={16} style={{ color: 'var(--accent, #7c9cff)', flexShrink: 0 }} />
            }
            Trigger Acuity Test
          </button>

          {/* Button 3 — TFSI Check */}
          <button
            disabled={actionLoading === 'tfsi'}
            onClick={async () => {
              setActionLoading('tfsi')
              try {
                await api.triggerTFSI()
                addToast('TFSI check triggered', 'success')
              } catch (_) {
                addToast('Action not available — add POST /actions/trigger_tfsi to backend', 'muted')
              } finally { setActionLoading(null) }
            }}
            className="flex items-center gap-3 flex-1 rounded-xl px-6 py-4 text-sm font-medium transition-all duration-200"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-dm)',
              cursor: actionLoading === 'tfsi' ? 'wait' : 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay, #1a1a2e)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
          >
            {actionLoading === 'tfsi'
              ? <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--zone-green)', borderTopColor: 'transparent' }} />
              : <Activity size={16} style={{ color: 'var(--zone-green)', flexShrink: 0 }} />
            }
            Run TFSI Check
          </button>

        </div>
      </GlassCard>

      {/* Toast stack — fixed bottom-right */}
      <div
        className="fixed bottom-6 right-6 flex flex-col gap-3 z-50"
        style={{ pointerEvents: 'none' }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className="rounded-xl px-4 py-3 text-sm animate-fade-in"
            style={{
              pointerEvents: 'auto',
              fontFamily: 'var(--font-dm)',
              maxWidth: '360px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              ...(t.type === 'success' ? {
                background: 'rgba(0, 210, 120, 0.08)',
                border: '1px solid rgba(0, 210, 120, 0.2)',
                color: 'var(--zone-green)',
              } : {
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }),
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

    </div>
  )
}