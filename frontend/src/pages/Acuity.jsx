import { useState, useEffect } from 'react'
import { Eye, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { api } from '../services/api.js'
import GlassCard from '../components/GlassCard.jsx'
import ZoneBadge from '../components/ZoneBadge.jsx'

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div className="w-8 h-8 rounded-full border-2 animate-spin-ring"
        style={{ borderColor: 'var(--border-active)', borderTopColor: 'transparent' }} />
      <span className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}>Loading...</span>
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '64px 24px',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-syne)',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        Backend Not Running
      </p>
      <p
        style={{
          fontFamily: 'var(--font-dm)',
          fontSize: '14px',
          color: 'var(--text-muted)',
          maxWidth: '360px',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Start the GazeAware application first, then refresh this page.
      </p>
      <button
        onClick={onRetry}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'var(--font-dm)',
          fontWeight: 500,
          cursor: 'pointer',
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          boxSizing: 'border-box',
          marginTop: '4px',
          transition: 'background 0.2s',
        }}
      >
        <RefreshCw size={14} />
        Try again
      </button>
    </div>
  )
}

const SNELLEN_MAP = {
  '20/200': 0.10, '20/100': 0.20, '20/70': 0.29,
  '20/50': 0.40, '20/40': 0.50, '20/30': 0.67,
  '20/25': 0.80, '20/20': 1.00,
}

function toZone(score) {
  if (score == null) return 'GREEN'
  if (score >= 0.80) return 'GREEN'
  if (score >= 0.50) return 'YELLOW'
  if (score >= 0.29) return 'RED'
  return 'CRITICAL'
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-xs"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)' }}>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Acuity() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])

  const fetchData = () => {
    setLoading(true); setError(null)
    Promise.all([
      api.getAcuityHistory(),
      api.getPrescriptions(),
    ]).then(([acuityData, rxData]) => {
      setData(acuityData)
      const acuityRx = (rxData || []).filter(rx =>
        rx.context && rx.context.startsWith('ACUITY_TEST')
      )
      setPrescriptions(acuityRx)
    })
      .catch(e => setError(e.message || 'Failed to load acuity data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div className="p-6"><Spinner /></div>
  if (error) return <div className="p-6"><ErrorCard message={error} onRetry={fetchData} /></div>

  const results = data ?? []
  const latest = results[0] ?? null
  const latestScore = SNELLEN_MAP[latest?.snellen_fraction] ?? null
  const latestZone = toZone(latestScore)

  const latestRx = prescriptions.find(rx =>
    rx.context?.includes(latest?.snellen_fraction)
  )

  const chartData = [...results].reverse().map((r, i) => ({
    i, time: r.timestamp ? new Date(r.timestamp).toLocaleDateString() : `#${i}`,
    score: SNELLEN_MAP[r.snellen_fraction] ?? 0,
  }))

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '28px 24px 32px',
        boxSizing: 'border-box',
        minHeight: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <Eye size={20} style={{ color: 'var(--accent-dim)', flexShrink: 0 }} />
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Visual Acuity
        </h1>
      </div>

      {latest ? (
        <GlassCard className="flex flex-col gap-4 animate-fade-in-up">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>LATEST RESULT</span>
          <div className="flex flex-wrap items-center gap-6">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '64px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {latest.snellen_fraction ?? '—'}
            </span>
            <div className="flex flex-col gap-3">
              <ZoneBadge zone={latestZone} />
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {latest.timestamp ? new Date(latest.timestamp).toLocaleString() : '—'}
              </span>
            </div>
            {[
              { label: 'DISTANCE', value: latest.distance_cm != null ? `${latest.distance_cm.toFixed(1)} cm` : '—' },
            ].map(f => (
              <div key={f.label} className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{f.label}</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{f.value}</span>
              </div>
            ))}
            <div className="flex gap-5">
              {[
                { label: 'CHEAT', val: latest.cheat_detected },
                { label: 'SQUINT', val: latest.squint_detected },
              ].map(({ label, val }) => (
                <div key={label} className="flex flex-col gap-1 items-center">
                  <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
                  {val
                    ? <XCircle size={16} style={{ color: 'var(--zone-red)' }} />
                    : <CheckCircle size={16} style={{ color: 'var(--zone-green)' }} />}
                </div>
              ))}
            </div>
          </div>
          {latestRx && (
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}>
                RECOMMENDATION
              </span>
              <p style={{
                fontFamily: 'var(--font-dm)',
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {latestRx.prescription_text}
              </p>
            </div>
          )}
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-8">
            <Eye size={28} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)', fontSize: '14px' }}>No acuity tests completed yet</p>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div style={{ marginBottom: '20px' }}>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'block', color: 'var(--text-muted)' }}
          >
            ACUITY TREND
          </span>
        </div>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No trend data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 20, bottom: 24, left: 0 }}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
              <YAxis domain={[0, 1.1]} tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
              <Tooltip content={<Tip />} />
              <ReferenceLine y={1.0} stroke="var(--zone-green)" strokeDasharray="6 3"
                label={{ value: '20/20', fill: 'var(--zone-green)', fontSize: 10 }} />
              <Line type="monotone" dataKey="score" name="Acuity Score" stroke="var(--accent-dim)"
                strokeWidth={2} dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg-surface)', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          borderRadius: '16px',
          padding: '16px 20px',
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          boxSizing: 'border-box',
        }}
      >
        <AlertCircle size={16} style={{ color: 'var(--zone-yellow)', marginTop: '2px', flexShrink: 0 }} />
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm)', lineHeight: 1.6, fontSize: '14px', margin: 0 }}>
          Press <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>A</strong> while
          the OpenCV window OR trigger it manually from the dashboard to start the test.
        </p>
      </div>

      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ALL RESULTS</span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{results.length} tests</span>
        </div>
        {results.length === 0 ? (
          <div className="py-8 text-center">
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No results recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Timestamp', 'Fraction', 'Distance', 'Cheat', 'Squint'].map(h => (
                    <th key={h} className="text-left pb-3 pr-6 text-xs tracking-widest uppercase"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={r.id ?? i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-3 pr-6 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-6 text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {r.snellen_fraction ?? '—'}
                    </td>
                    <td className="py-3 pr-6 text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {r.distance_cm != null ? `${r.distance_cm.toFixed(1)} cm` : '—'}
                    </td>
                    <td className="py-3 pr-6">
                      {r.cheat_detected ? <XCircle size={14} style={{ color: 'var(--zone-red)' }} /> : <CheckCircle size={14} style={{ color: 'var(--zone-green)' }} />}
                    </td>
                    <td className="py-3 pr-6">
                      {r.squint_detected ? <XCircle size={14} style={{ color: 'var(--zone-yellow)' }} /> : <CheckCircle size={14} style={{ color: 'var(--zone-green)' }} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* ── ACUITY PRESCRIPTIONS LOG ── */}
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>ACUITY PRESCRIPTIONS</span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{prescriptions.length} records</span>
        </div>
        {prescriptions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Eye size={28} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)', fontSize: '14px' }}>No acuity prescriptions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['DATE', 'RESULT', 'TIER', 'RECOMMENDATION'].map(h => (
                    <th key={h} className="text-left pb-3 pr-6 text-xs tracking-widest uppercase"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx, i) => {
                  const fraction = rx.context?.match(/\(([^)]+)\)/)?.[1] ?? '—'
                  const score = SNELLEN_MAP[fraction] ?? null
                  const zone = toZone(score)
                  // Map zone / fraction to pill style
                  const tierMap = {
                    '20/20':  { label: 'EXCELLENT', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  color: 'var(--zone-green)' },
                    '20/25':  { label: 'GOOD',      bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  color: 'var(--zone-green)' },
                    '20/30':  { label: 'MILD',      bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)',  color: 'var(--zone-yellow)' },
                    '20/40':  { label: 'MILD',      bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)',  color: 'var(--zone-yellow)' },
                    '20/50':  { label: 'MODERATE',  bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#f97316' },
                    '20/70':  { label: 'MODERATE',  bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', color: '#f97316' },
                    '20/100': { label: 'SEVERE',    bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: 'var(--zone-red)' },
                    '20/200': { label: 'SEVERE',    bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  color: 'var(--zone-red)' },
                    'NONE':   { label: 'CRITICAL',  bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.45)',  color: 'var(--zone-critical)' },
                  }
                  const tier = tierMap[fraction] ?? { label: zone, bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: 'var(--zone-red)' }
                  const rec = rx.prescription_text ?? '—'
                  const recTrunc = rec.length > 100 ? rec.slice(0, 100) + '…' : rec
                  return (
                    <tr key={rx.id ?? i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="py-3 pr-6 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {new Date(rx.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 pr-6 text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {fraction}
                      </td>
                      <td className="py-3 pr-6">
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '10px',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          background: tier.bg,
                          border: `1px solid ${tier.border}`,
                          color: tier.color,
                        }}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="py-3 pr-6" style={{ maxWidth: '320px' }}>
                        <span title={rec} style={{ fontFamily: 'var(--font-dm)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {recTrunc}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
