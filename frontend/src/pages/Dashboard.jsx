import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Camera, AlertTriangle, TrendingDown, CheckCircle2,
  Activity, Clock, Zap, Eye, Wind, Radio,
} from 'lucide-react'
import { useGazeSocket } from '../hooks/useGazeSocket.js'
import { api } from '../services/api.js'
import GlassCard from '../components/GlassCard.jsx'
import StrainGauge from '../components/StrainGauge.jsx'
import ZoneBadge from '../components/ZoneBadge.jsx'
import SignalBar from '../components/SignalBar.jsx'
import ConnectionStatus from '../components/ConnectionStatus.jsx'

/* ── helpers ─────────────────────────────────────────────────────────────── */
function toBadgeZone(zone) {
  if (!zone) return 'GREEN'
  const z = zone.toUpperCase()
  if (z === 'CRITICAL') return 'CRITICAL'
  if (z === 'RED') return 'RED'
  if (z === 'YELLOW') return 'YELLOW'
  return 'GREEN'
}

/* ── Section header ──────────────────────────────────────────────────────── */
function SectionHeader({ label, right }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '2px', height: '12px', background: 'var(--zone-green)', borderRadius: '1px', opacity: 0.7 }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          {label}
        </span>
      </div>
      {right}
    </div>
  )
}

/* ── Camera feed ─────────────────────────────────────────────────────────── */
function CameraFeed() {
  const [err, setErr] = useState(false)
  return (
    <GlassCard accent="green" style={{ padding: '18px' }}>
      <SectionHeader
        label="Live Feed"
        right={
          !err
            ? <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: 'var(--zone-green)',
                boxShadow: '0 0 8px var(--zone-green)',
                animation: 'pulse-live 1.5s infinite',
              }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--zone-green)', letterSpacing: '0.12em' }}>REC</span>
            </span>
            : <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>OPENCV</span>
        }
      />
      {!err ? (
        <img
          src="http://127.0.0.1:8000/video_feed"
          alt="Live camera feed"
          onError={() => setErr(true)}
          style={{
            width: '100%', display: 'block',
            borderRadius: '8px',
            border: '1px solid rgba(0,229,160,0.12)',
          }}
        />
      ) : (
        <div
          className="animate-camera-dash-pulse"
          style={{
            minHeight: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: '8px',
          }}
        >
          <Camera size={24} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            FEED UNAVAILABLE
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '4px',
            padding: '2px 10px',
          }}>
            localhost:8000
          </span>
        </div>
      )}
    </GlassCard>
  )
}

/* ── Crash predictor ─────────────────────────────────────────────────────── */
function CrashCard({ crash }) {
  const will = crash?.will_crash === true
  const secs = crash?.seconds_until_crash ?? 0
  const conf = crash?.confidence ?? 0

  return (
    <GlassCard accent={will ? 'yellow' : null} style={{ padding: '18px' }}>
      <SectionHeader
        label="Crash Predictor"
        right={<Activity size={13} style={{ color: 'var(--text-muted)' }} />}
      />
      {!will ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingDown size={20} style={{ color: 'var(--zone-green)' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-dm)', fontSize: '13px', fontWeight: 500, color: 'var(--zone-green)' }}>
              Trajectory Stable
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.06em' }}>
              NO CRASH PREDICTED
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} className="animate-pulse-live" style={{ color: 'var(--zone-yellow)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--zone-yellow)' }}>
              CRASH IMMINENT
            </span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '40px', fontWeight: 700, color: 'var(--zone-red)', lineHeight: 1, letterSpacing: '-0.03em' }}>
            ~{Math.round(secs)}<span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '3px' }}>s</span>
          </div>
          {/* Confidence */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>CONFIDENCE</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--zone-yellow)' }}>{(conf * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: '2px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${conf * 100}%`,
                background: 'var(--zone-yellow)',
                boxShadow: '0 0 6px rgba(255,184,0,0.6)',
                transition: 'width 500ms ease',
              }} />
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

/* ── TFSI card ───────────────────────────────────────────────────────────── */
function TFSICard({ stability }) {
  const tfsi = stability ?? 0
  const pct = (tfsi * 100).toFixed(1)
  const pctNum = parseFloat(pct)
  const color = stability == null
    ? 'var(--text-muted)'
    : pctNum > 50 ? 'var(--zone-green)'
      : pctNum > 25 ? 'var(--zone-yellow)'
        : 'var(--zone-red)'
  const atRisk = stability != null && stability < 0.25

  return (
    <GlassCard accent={atRisk ? 'critical' : null} style={{ padding: '18px' }}>
      <SectionHeader
        label="TFSI Stability"
        right={
          atRisk && (
            <span className="animate-pulse-live" style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--zone-critical)',
              background: 'var(--zone-critical-bg)',
              border: '1px solid var(--zone-critical-border)',
              borderRadius: '4px',
              padding: '3px 8px',
            }}>
              ALERT RISK
            </span>
          )
        }
      />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: 700, color, lineHeight: 1 }}>
          {stability != null ? pct : '—'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
      </div>

      <div style={{ height: '2px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: color,
          boxShadow: pctNum > 0 ? `0 0 8px ${color}60` : 'none',
          transition: 'width 500ms ease, background 500ms ease',
        }} />
      </div>

      <div style={{ marginTop: '8px', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
        TEAR FILM STABILITY INDEX
      </div>
    </GlassCard>
  )
}

/* ── Signal monitor ──────────────────────────────────────────────────────── */
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

function SignalMonitor({ signalsData }) {
  const lightingScore = signalsData?.lighting_score ?? 0
  const distanceDrift = signalsData?.distance_drift_cm ?? 0

  return (
    <GlassCard style={{ padding: '22px' }}>
      <SectionHeader
        label="Signal Monitor — 9 Channels"
        right={
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            500ms · LIVE
          </span>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '8px' }}>
        {SIGNAL_KEYS.map(({ key, label }) => (
          <SignalBar key={key} label={label} value={signalsData?.[key] ?? 0} />
        ))}
      </div>

      {/* Supplementary row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 28px',
        marginTop: '14px',
        paddingTop: '14px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        {[
          { label: 'LIGHTING', value: typeof lightingScore === 'number' ? lightingScore.toFixed(1) : '—' },
          { label: 'DIST DRIFT', value: typeof distanceDrift === 'number' ? `${distanceDrift.toFixed(1)} cm` : '—' },
          ...(signalsData?.modifiers
            ? [{ label: 'MODIFIERS', value: JSON.stringify(signalsData.modifiers) }]
            : []),
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.12em', flexShrink: 0 }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

/* ── Action button ───────────────────────────────────────────────────────── */
function ActionBtn({ id, label, icon: Icon, color, bg, border, loading, onClick }) {
  const active = loading === id
  return (
    <button
      disabled={active}
      onClick={onClick}
      style={{
        flex: '1 1 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: '46px',
        padding: '0 16px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '8px',
        color,
        fontFamily: 'var(--font-dm)',
        fontSize: '13px',
        fontWeight: 500,
        cursor: active ? 'wait' : 'pointer',
        boxSizing: 'border-box',
        transition: 'background 0.18s, box-shadow 0.18s, border-color 0.18s',
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${bg.replace('0.07', '0.14').replace('0.06', '0.12')}`
        e.currentTarget.style.boxShadow = `0 4px 20px ${border}60`
        e.currentTarget.style.borderColor = border.replace('0.22', '0.42').replace('0.25', '0.45')
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = bg
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = border
      }}
    >
      {active
        ? <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: `2px solid ${color}`, borderTopColor: 'transparent', animation: 'spin-ring 1s linear infinite', display: 'inline-block' }} />
        : <Icon size={14} style={{ flexShrink: 0 }} />
      }
      {label}
    </button>
  )
}

/* ── Toast helpers ───────────────────────────────────────────────────────── */
let _tid = 0

/* ── Dashboard (main) ────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { strainData, signalsData, isConnected, lastStrainRef } = useGazeSocket()

  const [session, setSession] = useState(null)
  const [toasts, setToasts] = useState([])
  const [actionLoading, setActionLoading] = useState(null)
  const [rxText, setRxText] = useState(null)
  const [rxTimestamp, setRxTimestamp] = useState(null)
  const [elapsed, setElapsed] = useState(null)

  const addToast = useCallback((message, type = 'success') => {
    const id = ++_tid
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  useEffect(() => { api.getSession().then(setSession).catch(() => setSession(null)) }, [])

  useEffect(() => {
    const rx = strainData?.active_prescription
    if (rx && rx !== rxText) { setRxText(rx); setRxTimestamp(new Date()) }
    else if (!rx && rxText) { setRxText(null); setRxTimestamp(null) }
  }, [strainData?.active_prescription])

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(lastStrainRef.current === null ? null : Date.now() - lastStrainRef.current)
    }, 1000)
    return () => clearInterval(t)
  }, [lastStrainRef])

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const score = strainData?.strain_score ?? 0
  const zone = toBadgeZone(strainData?.zone)
  const tick = strainData?.tick ?? 0
  const stability = strainData?.tfsi_stability ?? null
  const crash = strainData?.crash_prediction ?? null
  const noData = strainData === null || typeof strainData.strain_score !== 'number'
  const baselineReady = strainData !== null && tick >= 120
  const baselineWaiting = strainData === null

  const updatedLabel = noData
    ? 'Waiting...'
    : elapsed === null ? 'Waiting...'
      : elapsed > 5000 ? 'STALE'
        : elapsed === 0 ? 'Updated just now'
          : `Updated ${Math.floor(elapsed / 1000)}s ago`

  const updatedColor = (noData || (elapsed !== null && elapsed > 5000))
    ? 'var(--zone-red)'
    : 'var(--text-muted)'

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxSizing: 'border-box',
      minHeight: '100%',
    }}>

      {/* ── Status bar ──────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '12px 18px',
        background: 'var(--bg-surface)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        boxSizing: 'border-box',
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {session && (
            <>
              <Stat label="SESSION" value={`#${session.session_id ?? '—'}`} />
              <Stat
                label="STARTED"
                value={session.session_start
                  ? new Date(session.session_start).toLocaleTimeString()
                  : '—'}
              />
              <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.08)' }} />
            </>
          )}

          {/* Baseline state */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {baselineWaiting ? (
              <>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: 'var(--text-muted)', opacity: 0.4,
                  animation: 'pulse-live 1.8s infinite', flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.06em',
                  background: 'linear-gradient(90deg,var(--text-muted) 0%,rgba(180,190,210,0.8) 50%,var(--text-muted) 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmer 2.8s linear infinite',
                }}>
                  Waiting for connection...
                </span>
              </>
            ) : baselineReady ? (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--zone-green)', boxShadow: '0 0 6px var(--zone-green)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--zone-green)', letterSpacing: '0.06em' }}>
                  Baseline Ready
                </span>
              </>
            ) : (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--zone-yellow)', animation: 'pulse-live 1.5s infinite', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--zone-yellow)', letterSpacing: '0.06em' }}>
                  Calibrating... ({tick}/120)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Stat label="TICK" value={tick} mono />
          <ConnectionStatus isConnected={isConnected} />
        </div>
      </div>

      {/* ── 3-col main grid ─────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)',
        gap: '14px',
        alignItems: 'start',
      }}>

        {/* Col 1 — Gauge */}
        <GlassCard
          accent={
            zone === 'CRITICAL' ? 'critical'
              : zone === 'RED' ? 'red'
                : zone === 'YELLOW' ? 'yellow'
                  : 'green'
          }
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            paddingTop: '24px',
            paddingBottom: '24px',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            alignSelf: 'flex-start',
          }}>
            Eye Strain Gauge
          </span>

          <StrainGauge score={score} />
          <ZoneBadge zone={zone} />

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: updatedColor,
              letterSpacing: '0.06em',
              opacity: updatedLabel === 'Waiting...' ? 0.6 : 1,
              animation: updatedLabel === 'Waiting...' ? 'pulse-live 1.8s infinite' : 'none',
            }}
          >
            {updatedLabel}
          </span>
        </GlassCard>

        {/* Col 2 — Crash + TFSI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          <CrashCard crash={crash} />
          <TFSICard stability={stability} />
        </div>

        {/* Col 3 — Prescription + Camera */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
          {/* Prescription */}
          <GlassCard
            accent={rxText ? 'yellow' : 'green'}
            style={{ padding: '18px' }}
          >
            <SectionHeader label="Active Prescription" />

            {rxText == null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--zone-green)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-dm)', fontSize: '13px', fontWeight: 500, color: 'var(--zone-green)' }}>
                    No intervention required
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.08em' }}>
                    EYES IN HEALTHY RANGE
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-slide-in-right" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <AlertTriangle size={16} style={{ color: 'var(--zone-yellow)' }} />
                <p style={{
                  fontFamily: 'var(--font-syne)',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--zone-yellow)',
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  {rxText}
                </p>
                {rxTimestamp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                      {rxTimestamp.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          <CameraFeed />
        </div>
      </div>

      {/* ── Signal monitor ──────────────────────────────────────────── */}
      <SignalMonitor signalsData={signalsData} />

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <GlassCard style={{ padding: '18px' }}>
        <SectionHeader label="Quick Actions" right={
          <Radio size={12} style={{ color: 'var(--text-muted)' }} />
        } />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <ActionBtn
            id="rx" label="Force Prescription" icon={Zap} loading={actionLoading}
            color="var(--zone-yellow)"
            bg="rgba(255,184,0,0.07)" border="rgba(255,184,0,0.22)"
            onClick={async () => {
              setActionLoading('rx')
              try { await api.forcePrescription(); addToast('Prescription triggered') }
              catch { addToast('Action not available — add POST /actions/force_prescription', 'muted') }
              finally { setActionLoading(null) }
            }}
          />
          <ActionBtn
            id="acuity" label="Trigger Acuity" icon={Eye} loading={actionLoading}
            color="var(--text-secondary)"
            bg="rgba(224,224,248,0.04)" border="rgba(224,224,248,0.12)"
            onClick={async () => {
              setActionLoading('acuity')
              try { await api.triggerAcuity(); addToast('Acuity test started') }
              catch { addToast('Action not available — add POST /actions/trigger_acuity', 'muted') }
              finally { setActionLoading(null) }
            }}
          />
          <ActionBtn
            id="tfsi" label="Run TFSI Check" icon={Activity} loading={actionLoading}
            color="var(--zone-green)"
            bg="rgba(0,229,160,0.06)" border="rgba(0,229,160,0.20)"
            onClick={async () => {
              setActionLoading('tfsi')
              try { await api.triggerTFSI(); addToast('TFSI check triggered') }
              catch { addToast('Action not available — add POST /actions/trigger_tfsi', 'muted') }
              finally { setActionLoading(null) }
            }}
          />
          <ActionBtn
            id="recovery" label="Force Recovery" icon={Wind} loading={actionLoading}
            color="#00e5ff"
            bg="rgba(0,229,255,0.05)" border="rgba(0,229,255,0.18)"
            onClick={async () => {
              setActionLoading('recovery')
              try { await api.triggerRecovery(); addToast('Recovery exercise launched') }
              catch { addToast('Recovery action failed', 'muted') }
              finally { setActionLoading(null) }
            }}
          />
        </div>
      </GlassCard>

      {/* ── Toast stack ─────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 50, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className="animate-fade-in"
            style={{
              pointerEvents: 'auto',
              fontFamily: 'var(--font-dm)',
              fontSize: '13px',
              padding: '11px 16px',
              borderRadius: '8px',
              minWidth: '200px',
              maxWidth: '360px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
              ...(t.type === 'success'
                ? { background: 'rgba(0,229,160,0.07)', border: '1px solid rgba(0,229,160,0.2)', color: 'var(--zone-green)' }
                : { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
              ),
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Stat pill (status bar helper) ──────────────────────────────────────── */
function Stat({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.14em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  )
}