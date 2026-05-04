import { useState, useEffect } from 'react'
import { History as HistoryIcon, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { api } from '../services/api.js'
import GlassCard from '../components/GlassCard.jsx'

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-20">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin-ring"
        style={{ borderColor: 'var(--border-active)', borderTopColor: 'transparent' }}
      />
      <span className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}>Loading...</span>
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col items-center gap-4"
      style={{ border: '1px solid var(--zone-red-border)', background: 'var(--zone-red-bg)' }}
    >
      <p className="text-sm" style={{ color: 'var(--zone-red)', fontFamily: 'var(--font-dm)' }}>{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200"
        style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-dm)' }}
      >
        <RefreshCw size={13} /> Try again
      </button>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl px-4 py-3 text-xs"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)' }}
    >
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function History() {
  const [signals, setSignals]           = useState(null)
  const [prescriptions, setPrescriptions] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

  const fetchData = () => {
    setLoading(true)
    setError(null)
    Promise.all([api.getSignalHistory(), api.getPrescriptions()])
      .then(([sig, rx]) => {
        // Reverse so oldest is left on chart
        setSignals([...sig].reverse())
        setPrescriptions(rx)
      })
      .catch(err => setError(err.message || 'Failed to load history'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div className="p-6"><Spinner /></div>
  if (error)   return <div className="p-6"><ErrorCard message={error} onRetry={fetchData} /></div>

  // Chart data
  const strainChartData = (signals ?? []).map((s, i) => ({
    index: i,
    time:  s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : `#${i}`,
    score: s.strain_score ?? 0,
  }))

  const signalChartData = (signals ?? []).map((s, i) => ({
    index: i,
    time:  s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : `#${i}`,
    blink_rate:    s.blink_rate    ?? 0,
    blink_quality: s.blink_quality ?? 0,
    squint:        s.squint        ?? 0,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <HistoryIcon size={20} style={{ color: 'var(--accent-dim)' }} />
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
          Signal History
        </h1>
      </div>

      {/* Strain timeline */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            STRAIN SCORE TIMELINE
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {strainChartData.length} readings
          </span>
        </div>

        {strainChartData.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <HistoryIcon size={24} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)', fontSize: '14px' }}>No signal history yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={strainChartData}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={50} stroke="var(--zone-yellow)" strokeDasharray="6 3" label={{ value: 'YELLOW', fill: 'var(--zone-yellow)', fontSize: 10 }} />
              <ReferenceLine y={70} stroke="var(--zone-red)" strokeDasharray="6 3" label={{ value: 'RED', fill: 'var(--zone-red)', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="score"
                name="Strain Score"
                stroke="var(--accent-dim)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--accent)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Signal breakdown */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            SIGNAL BREAKDOWN
          </span>
        </div>

        {signalChartData.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)', fontSize: '14px' }}>No data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={signalChartData}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 1]} tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '12px' }}
              />
              <Area type="monotone" dataKey="blink_rate"    name="Blink Rate"    stroke="var(--zone-green)"  fill="rgba(16,185,129,0.08)"  strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="blink_quality" name="Blink Quality" stroke="var(--zone-yellow)" fill="rgba(245,158,11,0.08)"  strokeWidth={1.5} dot={false} />
              <Area type="monotone" dataKey="squint"        name="Squint"        stroke="var(--zone-red)"    fill="rgba(239,68,68,0.08)"   strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Prescription log */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            PRESCRIPTION LOG
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {prescriptions?.length ?? 0} total
          </span>
        </div>

        {!prescriptions?.length ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <CheckCircle size={22} style={{ color: 'var(--zone-green)' }} />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)', fontSize: '14px' }}>No prescriptions issued yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Timestamp', 'Score', 'Prescription', 'Recovery'].map(h => (
                    <th key={h} className="text-left pb-3 pr-4 text-xs tracking-widest uppercase"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx, i) => (
                  <tr
                    key={rx.id ?? i}
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="py-3 pr-4 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {rx.timestamp ? new Date(rx.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 pr-4 text-xs font-medium" style={{ fontFamily: 'var(--font-mono)', color: (rx.strain_score ?? 0) >= 70 ? 'var(--zone-red)' : 'var(--zone-yellow)' }}>
                      {rx.strain_score?.toFixed(1) ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-xs max-w-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm)' }}>
                      {rx.prescription_text ?? '—'}
                    </td>
                    <td className="py-3 pr-4">
                      {rx.recovery_confirmed
                        ? <CheckCircle size={14} style={{ color: 'var(--zone-green)' }} />
                        : <XCircle    size={14} style={{ color: 'var(--zone-red)' }} />
                      }
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
