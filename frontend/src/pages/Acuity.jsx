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
    <div className="rounded-2xl p-6 flex flex-col items-center gap-4"
      style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)' }}>
      <p className="text-sm" style={{ color: 'var(--zone-red)' }}>{message}</p>
      <button onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' }}>
        <RefreshCw size={13} /> Try again
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

  const fetchData = () => {
    setLoading(true); setError(null)
    api.getAcuityHistory()
      .then(setData)
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

  const chartData = [...results].reverse().map((r, i) => ({
    i, time: r.timestamp ? new Date(r.timestamp).toLocaleDateString() : `#${i}`,
    score: SNELLEN_MAP[r.snellen_fraction] ?? 0,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Eye size={20} style={{ color: 'var(--accent-dim)' }} />
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
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
        <span className="text-xs tracking-widest uppercase block mb-6" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          ACUITY TREND
        </span>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No trend data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
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

      <div className="flex items-start gap-3 rounded-2xl px-5 py-4"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <AlertCircle size={16} style={{ color: 'var(--zone-yellow)', marginTop: '2px', flexShrink: 0 }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm)', lineHeight: 1.6 }}>
          Press <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>A</strong> while
          the OpenCV window OR trigger it manually from the dashboard to start the test.
        </p>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>ALL RESULTS</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{results.length} tests</span>
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
    </div>
  )
}
