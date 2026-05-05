import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, AlertTriangle, TrendingDown, CheckCircle2, Activity, Wifi, WifiOff, Clock, Zap, Eye, Wind } from 'lucide-react'
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
          className="flex flex-col items-center justify-center animate-camera-dash-pulse"
          style={{
            minHeight: '160px',
            padding: '24px 16px',
            gap: '12px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed rgba(255,255,255,0.18)',
            borderRadius: '12px',
            boxSizing: 'border-box',
          }}
        >
          <Camera size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
          <p className="text-sm"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}>
            Feed available in OpenCV window
          </p>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px',
              padding: '2px 10px',
              letterSpacing: '0.04em',
            }}
          >
            localhost:8000 → OpenCV
          </span>
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
            className="animate-pulse-live"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 12px',
              borderRadius: '999px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              color: 'var(--zone-critical)',
              background: 'var(--zone-critical-bg)',
              border: '1px solid var(--zone-critical-border)',
              boxSizing: 'border-box',
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

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
      >
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
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 32px',
          paddingTop: '20px',
          paddingLeft: '4px',
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>Lighting Score</span>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500 }}>
            {typeof lightingScore === 'number' ? lightingScore.toFixed(1) : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>Distance Drift</span>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500 }}>
            {typeof distanceDrift === 'number' ? `${distanceDrift.toFixed(1)} cm` : '—'}
          </span>
        </div>
        {signalsData?.modifiers && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 auto' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px', flexShrink: 0 }}>Modifiers</span>
            <span
              style={{
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
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
    <div
      className="flex flex-col min-h-full"
      style={{ padding: '24px', gap: '20px', boxSizing: 'border-box', overflowX: 'hidden', width: '100%' }}
    >

      {/* Status bar */}
      <div
        className="flex items-center gap-4 justify-between rounded-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', flexWrap: 'wrap', minWidth: 0, padding: '14px 20px' }}
      >
        {/* Left: session info */}
        <div className="flex items-center gap-4 min-w-0">
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
                <span className="w-2 h-2 rounded-full animate-pulse-live" style={{ background: 'var(--text-muted)', opacity: 0.5 }} />
                <span
                  className="text-xs"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'linear-gradient(90deg, var(--text-muted) 0%, rgba(136,136,170,0.9) 40%, rgba(200,200,220,0.6) 50%, rgba(136,136,170,0.9) 60%, var(--text-muted) 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'shimmer 2.8s linear infinite',
                  }}
                >
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
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.09)',
            }}
          >
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>TICK</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {tick}
            </span>
          </div>
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </div>

      {/* 3-column main grid */}
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', alignItems: 'start' }}
      >

        {/* Col 1 — Strain gauge */}
        <GlassCard
          className="flex flex-col items-center"
          style={{
            gap: '16px',
            paddingTop: '28px',
            paddingBottom: '28px',
            boxShadow: zone === 'GREEN'
              ? '0 0 40px rgba(16, 185, 129, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)'
              : zone === 'YELLOW'
              ? '0 0 40px rgba(245, 158, 11, 0.08), inset 0 1px 0 rgba(255,255,255,0.06)'
              : zone === 'RED'
              ? '0 0 40px rgba(239, 68, 68, 0.09), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 0 40px rgba(220, 38, 38, 0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
            transition: 'box-shadow 600ms ease-in-out',
          }}
        >
          <span className="text-xs tracking-widest uppercase self-start" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
            EYE STRAIN GAUGE
          </span>
          <StrainGauge score={score} />
          <ZoneBadge zone={zone} />
          <span
            className={`text-xs ${updatedLabel === 'Waiting...' ? 'animate-pulse-live' : ''}`}
            style={{ fontFamily: 'var(--font-mono)', color: updatedColor, opacity: updatedLabel === 'Waiting...' ? 0.65 : 1 }}
          >
            {updatedLabel}
          </span>
        </GlassCard>

        {/* Col 2 — Crash + TFSI */}
        <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
          <CrashCard crash={crash} />
          <TFSICard stability={stability} />
        </div>

        {/* Col 3 — Active Prescription */}
        <div className="flex flex-col gap-4" style={{ minWidth: 0 }}>
          <GlassCard
            className="flex flex-col gap-4"
            style={{
              borderLeft: rxText
                ? '2px solid var(--zone-yellow)'
                : '2px solid rgba(16, 185, 129, 0.4)',
              animation: rxText ? 'pulse-critical 3s infinite' : undefined,
              boxShadow: rxText
                ? undefined
                : 'inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              ACTIVE PRESCRIPTION
            </span>

            {rxText == null ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 size={20} style={{ color: 'var(--zone-green)' }} />
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--zone-green)', fontFamily: 'var(--font-dm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    No intervention required
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Eyes in healthy range
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 animate-slide-in-right">
                <AlertTriangle size={18} style={{ color: 'var(--zone-yellow)' }} />
                <p
                  className="text-lg font-bold leading-snug uppercase"
                  style={{ fontFamily: 'var(--font-syne)', color: 'var(--zone-yellow)', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
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
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
            QUICK ACTIONS
          </span>
        </div>
        <div className="flex gap-3">

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
            className="flex flex-1 items-center justify-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              padding: '0 20px',
              background: 'rgba(245, 158, 11, 0.07)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: 'var(--zone-yellow)',
              fontFamily: 'var(--font-dm)',
              cursor: actionLoading === 'rx' ? 'wait' : 'pointer',
              boxShadow: '0 2px 12px rgba(245,158,11,0.05)',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.13)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(245,158,11,0.15)'
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.45)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.07)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(245,158,11,0.05)'
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.25)'
            }}
          >
            {actionLoading === 'rx'
              ? <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--zone-yellow)', borderTopColor: 'transparent' }} />
              : <Zap size={15} style={{ flexShrink: 0 }} />
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
            className="flex flex-1 items-center justify-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              padding: '0 20px',
              background: 'rgba(232, 232, 248, 0.05)',
              border: '1px solid rgba(232, 232, 248, 0.15)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-dm)',
              cursor: actionLoading === 'acuity' ? 'wait' : 'pointer',
              boxShadow: '0 2px 12px rgba(232,232,248,0.03)',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(232, 232, 248, 0.10)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(232,232,248,0.08)'
              e.currentTarget.style.borderColor = 'rgba(232, 232, 248, 0.3)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(232, 232, 248, 0.05)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(232,232,248,0.03)'
              e.currentTarget.style.borderColor = 'rgba(232, 232, 248, 0.15)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            {actionLoading === 'acuity'
              ? <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }} />
              : <Eye size={15} style={{ flexShrink: 0 }} />
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
            className="flex flex-1 items-center justify-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              padding: '0 20px',
              background: 'rgba(16, 185, 129, 0.07)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: 'var(--zone-green)',
              fontFamily: 'var(--font-dm)',
              cursor: actionLoading === 'tfsi' ? 'wait' : 'pointer',
              boxShadow: '0 2px 12px rgba(16,185,129,0.05)',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.13)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.15)'
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.45)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.07)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(16,185,129,0.05)'
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)'
            }}
          >
            {actionLoading === 'tfsi'
              ? <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--zone-green)', borderTopColor: 'transparent' }} />
              : <Activity size={15} style={{ flexShrink: 0 }} />
            }
            Run TFSI Check
          </button>

          {/* Button 4 — Force Recovery (ball tracking) */}
          <button
            disabled={actionLoading === 'recovery'}
            onClick={async () => {
              setActionLoading('recovery')
              try {
                await api.triggerRecovery()
                addToast('Recovery exercise launched in OpenCV window', 'success')
              } catch (_) {
                addToast('Recovery action failed — ensure backend is running', 'muted')
              } finally { setActionLoading(null) }
            }}
            className="flex flex-1 items-center justify-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '52px',
              padding: '0 20px',
              background: 'rgba(0, 229, 255, 0.06)',
              border: '1px solid rgba(0, 229, 255, 0.22)',
              color: '#00e5ff',
              fontFamily: 'var(--font-dm)',
              cursor: actionLoading === 'recovery' ? 'wait' : 'pointer',
              boxShadow: '0 2px 12px rgba(0,229,255,0.05)',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(0, 229, 255, 0.12)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,229,255,0.18)'
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.42)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(0, 229, 255, 0.06)'
              e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,229,255,0.05)'
              e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.22)'
            }}
          >
            {actionLoading === 'recovery'
              ? <span className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: '#00e5ff', borderTopColor: 'transparent' }} />
              : <Wind size={15} style={{ flexShrink: 0 }} />
            }
            Force Recovery
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
            className="animate-fade-in"
            style={{
              pointerEvents: 'auto',
              fontFamily: 'var(--font-dm)',
              fontSize: '14px',
              lineHeight: '1.5',
              padding: '14px 18px',
              borderRadius: '14px',
              minWidth: '220px',
              maxWidth: '380px',
              boxSizing: 'border-box',
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