import { useState, useEffect } from 'react'
import {
  Activity, TrendingUp, Zap, FileText,
  AlertOctagon, ShieldCheck, RefreshCw, Eye, BarChart2,
} from 'lucide-react'
import { api } from '../services/api.js'
import StatCard from '../components/StatCard.jsx'
import GlassCard from '../components/GlassCard.jsx'

// ── Helpers ──────────────────────────────────────────────────────────────────

function strainColor(v) {
  if (v >= 70) return 'var(--zone-red)'
  if (v >= 40) return 'var(--zone-yellow)'
  return 'var(--zone-green)'
}

function acuityColor(fraction) {
  const map = {
    '20/20':  '#22c55e',
    '20/25':  '#4ade80',
    '20/30':  '#a3e635',
    '20/40':  '#facc15',
    '20/50':  '#fb923c',
    '20/70':  '#f97316',
    '20/100': '#ef4444',
    '20/200': '#dc2626',
    'NONE':   '#dc2626',
  }
  return map[fraction] ?? 'var(--text-muted)'
}

function acuityTier(lastRow) {
  if (lastRow === 0)              return { label: 'CRITICAL', bg: 'rgba(220,38,38,0.18)', color: '#ef4444' }
  if (lastRow <= 2)               return { label: 'SEVERE',   bg: 'rgba(220,38,38,0.14)', color: '#f87171' }
  if (lastRow <= 4)               return { label: 'MODERATE', bg: 'rgba(249,115,22,0.15)', color: '#fb923c' }
  if (lastRow <= 6)               return { label: 'MILD',     bg: 'rgba(234,179,8,0.15)',  color: '#facc15' }
  if (lastRow === 7)              return { label: 'GOOD',      bg: 'rgba(34,197,94,0.14)', color: '#4ade80' }
  return                                 { label: 'EXCELLENT', bg: 'rgba(34,197,94,0.18)', color: '#22c55e' }
}

function fmtDate(ts) {
  if (!ts || ts === 'None' || ts === 'null') return '—'
  try {
    const d = new Date(ts)
    if (isNaN(d)) return ts.slice(0, 16).replace('T', ' ')
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return ts.slice(0, 16) }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '64px 0' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        border: '2px solid var(--border-active)', borderTopColor: 'transparent',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}>Loading analytics…</span>
    </div>
  )
}

function ErrorCard({ onRetry }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '64px 24px', textAlign: 'center' }}>
      <p style={{ fontFamily: 'var(--font-syne)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
        Backend Not Running
      </p>
      <p style={{ fontFamily: 'var(--font-dm)', fontSize: '14px', color: 'var(--text-muted)', maxWidth: '360px', lineHeight: 1.6, margin: 0 }}>
        Start the GazeAware application first, then refresh this page.
      </p>
      <button onClick={onRetry} style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '10px 20px', borderRadius: '12px', fontSize: '14px',
        fontFamily: 'var(--font-dm)', fontWeight: 500, cursor: 'pointer',
        background: 'var(--bg-surface)', color: 'var(--text-primary)',
        border: '1px solid var(--border-default)', transition: 'background 0.2s',
      }}>
        <RefreshCw size={14} /> Try again
      </button>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <span style={{
      display: 'block',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      marginBottom: '16px',
    }}>
      {children}
    </span>
  )
}

function Pill({ count, label, bg, color }) {
  return (
    <div style={{
      flex: '1 1 0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      padding: '20px 12px',
      borderRadius: '16px',
      background: bg,
      border: `1px solid ${color}40`,
      minWidth: 0,
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '36px', fontWeight: 800, color, lineHeight: 1 }}>
        {count}
      </span>
      <span style={{ fontFamily: 'var(--font-dm)', fontSize: '11px', fontWeight: 600, color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

function TH({ children, align = 'left' }) {
  return (
    <th style={{
      textAlign: align, padding: '0 12px 12px 0',
      fontFamily: 'var(--font-mono)', fontSize: '10px',
      letterSpacing: '0.12em', textTransform: 'uppercase',
      color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {children}
    </th>
  )
}

function TD({ children, style = {} }) {
  return (
    <td style={{
      padding: '10px 12px 10px 0',
      borderBottom: '1px solid var(--border-subtle)',
      verticalAlign: 'middle',
      ...style,
    }}>
      {children}
    </td>
  )
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '40px 0' }}>
      <Icon size={22} style={{ color: 'var(--text-muted)' }} />
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}>{text}</p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Report() {
  const [summary,     setSummary]     = useState(null)
  const [degradation, setDegradation] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  const fetchData = () => {
    setLoading(true); setError(null)
    Promise.all([api.getSessionSummary(), api.getDegradation()])
      .then(([sum, deg]) => {
        if (sum?.error) throw new Error(sum.error)
        setSummary(sum)
        setDegradation(deg)
      })
      .catch(e => setError(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div style={{ padding: '24px' }}><Spinner /></div>
  if (error)   return <div style={{ padding: '24px' }}><ErrorCard onRetry={fetchData} /></div>

  const sessions    = summary?.sessions       ?? []
  const rxByType    = summary?.rx_by_type     ?? {}
  const acuity      = summary?.acuity_results ?? []
  const sigAvg      = summary?.signal_averages ?? {}
  const atRisk      = degradation?.at_risk === true

  const totalRx = (rxByType.auto ?? 0) + (rxByType.forced ?? 0) + (rxByType.acuity ?? 0)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '24px',
      padding: '28px 24px 40px', boxSizing: 'border-box', minHeight: '100%',
    }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Activity size={20} style={{ color: 'var(--accent-dim)', flexShrink: 0 }} />
          <div>
            <h1 style={{
              fontFamily: 'var(--font-syne)', fontSize: '22px', fontWeight: 700,
              color: 'var(--text-primary)', margin: 0, lineHeight: 1.2,
            }}>
              Session Analytics
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}>
              Lifetime performance across all sessions
            </p>
          </div>
        </div>
        <button onClick={fetchData} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '8px 16px', borderRadius: '10px', fontSize: '12px',
          fontFamily: 'var(--font-dm)', cursor: 'pointer',
          background: 'var(--bg-surface)', color: 'var(--text-muted)',
          border: '1px solid var(--border-default)',
        }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── 4 stat cards ── */}
      <div style={{
        display: 'grid', gap: '16px',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
      }}>
        <StatCard
          icon={Activity}
          label="Total Sessions"
          value={sessions.length}
          color="var(--accent-dim)"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Strain Score"
          value={sigAvg.avg_strain ?? '—'}
          color={strainColor(sigAvg.avg_strain ?? 0)}
        />
        <StatCard
          icon={Zap}
          label="Peak Strain Ever"
          value={sigAvg.peak_strain ?? '—'}
          color={strainColor(sigAvg.peak_strain ?? 0)}
        />
        <StatCard
          icon={FileText}
          label="Total Prescriptions"
          value={totalRx}
          color="var(--zone-green)"
        />
      </div>

      {/* ── Prescription breakdown ── */}
      <GlassCard>
        <SectionLabel>Prescription Sources</SectionLabel>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Pill
            count={rxByType.auto ?? 0}
            label="Auto"
            bg="rgba(34,197,94,0.10)"
            color="#22c55e"
          />
          <Pill
            count={rxByType.forced ?? 0}
            label="Forced"
            bg="rgba(234,179,8,0.10)"
            color="#facc15"
          />
          <Pill
            count={rxByType.acuity ?? 0}
            label="Acuity"
            bg="rgba(96,165,250,0.10)"
            color="#60a5fa"
          />
        </div>
      </GlassCard>

      {/* ── Acuity history table ── */}
      <GlassCard>
        <SectionLabel>Visual Acuity History</SectionLabel>
        {acuity.length === 0 ? (
          <EmptyState icon={Eye} text="No acuity tests recorded yet" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH>Date</TH>
                  <TH>Result</TH>
                  <TH align="center">Row Passed</TH>
                  <TH>Tier</TH>
                </tr>
              </thead>
              <tbody>
                {acuity.map((a, i) => {
                  const tier = acuityTier(a.last_row ?? 0)
                  return (
                    <tr key={i}>
                      <TD>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {fmtDate(a.timestamp)}
                        </span>
                      </TD>
                      <TD>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: acuityColor(a.fraction) }}>
                          {a.fraction ?? 'NONE'}
                        </span>
                      </TD>
                      <TD style={{ textAlign: 'center' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {a.last_row ?? 0} / 8
                        </span>
                      </TD>
                      <TD>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px', borderRadius: '8px',
                          fontSize: '10px', fontWeight: 700,
                          fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
                          background: tier.bg, color: tier.color,
                        }}>
                          {tier.label}
                        </span>
                      </TD>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Recent sessions table ── */}
      <GlassCard>
        <SectionLabel>Recent Sessions</SectionLabel>
        {sessions.length === 0 ? (
          <EmptyState icon={BarChart2} text="No sessions recorded yet" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH>Session</TH>
                  <TH>Started</TH>
                  <TH align="right">Avg Strain</TH>
                  <TH align="right">Peak Strain</TH>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <TD>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)' }}>
                        #{s.id}
                      </span>
                    </TD>
                    <TD>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {fmtDate(s.start_time)}
                      </span>
                    </TD>
                    <TD style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: strainColor(s.avg_strain) }}>
                        {s.avg_strain}
                      </span>
                    </TD>
                    <TD style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: strainColor(s.peak_strain) }}>
                        {s.peak_strain}
                      </span>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── Degradation banner ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '16px',
        borderRadius: '16px', padding: '20px 24px',
        background:  atRisk ? 'rgba(220,38,38,0.08)' : 'rgba(16,185,129,0.08)',
        border:      `1px solid ${atRisk ? 'rgba(220,38,38,0.3)' : 'rgba(16,185,129,0.25)'}`,
        boxSizing: 'border-box',
      }}>
        {atRisk
          ? <AlertOctagon size={22} style={{ color: 'var(--zone-critical)', flexShrink: 0, marginTop: 2 }} />
          : <ShieldCheck  size={22} style={{ color: 'var(--zone-green)',    flexShrink: 0, marginTop: 2 }} />}
        <div>
          <p style={{
            fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '15px', margin: '0 0 6px',
            color: atRisk ? 'var(--zone-critical)' : 'var(--zone-green)',
          }}>
            {atRisk ? 'Vision Degradation Risk Detected' : 'Vision Stable'}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'var(--font-dm)', lineHeight: 1.6 }}>
            {degradation?.summary_text ?? (atRisk
              ? 'Acuity has dropped more than 10% over the last 4 weeks with consistently elevated strain.'
              : 'No significant degradation detected. Keep maintaining healthy screen habits.')}
          </p>
          {degradation?.drop_pct != null && (
            <span style={{ display: 'block', marginTop: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Acuity drop: {degradation.drop_pct.toFixed(1)}% · Avg strain: {degradation.avg_strain?.toFixed(1) ?? '—'}
            </span>
          )}
        </div>
      </div>

    </div>
  )
}
