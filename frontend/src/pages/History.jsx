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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <HistoryIcon size={20} style={{ color: 'var(--accent-dim)', flexShrink: 0 }} />
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Signal History
        </h1>
      </div>

      {/* Strain timeline */}
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}
          >
            STRAIN SCORE TIMELINE
          </span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {strainChartData.length} readings
          </span>
        </div>

        {strainChartData.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 0' }}>
            <HistoryIcon size={24} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)', fontSize: '14px' }}>No signal history yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={strainChartData} margin={{ top: 4, right: 20, bottom: 24, left: 0 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}
          >
            SIGNAL BREAKDOWN
          </span>
        </div>

        {signalChartData.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 0' }}>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)', fontSize: '14px' }}>No data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={signalChartData} margin={{ top: 4, right: 20, bottom: 24, left: 0 }}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis domain={[0, 1]} tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  paddingTop: '20px',
                  paddingBottom: '4px',
                }}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}
          >
            PRESCRIPTION LOG
          </span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {prescriptions?.length ?? 0} total
          </span>
        </div>

        {!prescriptions?.length ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              padding: '40px 0 32px',
            }}
          >
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
