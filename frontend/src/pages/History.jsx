import { useState, useEffect, useCallback } from 'react'
import { Clock, AlertCircle, CheckCircle2, XCircle, Power } from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { getSignalHistory, getPrescriptionHistory } from '../services/api'
import GlassCard from '../components/GlassCard'

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#14141e',
    border: '1px solid #2a2a3d',
    borderRadius: '8px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 12,
    color: '#f0f0f8',
  },
  labelStyle: { color: '#8888aa' },
}

const AXIS_STYLE = {
  fill: '#44445a',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: 11,
}

export default function History() {
  const [signals, setSignals]             = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [offline, setOffline]             = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    setOffline(false)
    Promise.all([getSignalHistory(), getPrescriptionHistory()])
      .then(([s, p]) => { setSignals(s); setPrescriptions(p) })
      .catch(e => {
        if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
          setOffline(true)
        } else {
          setError(e.message)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const chartData = signals.slice().reverse().map(row => ({
    time:          new Date(row.timestamp).toLocaleTimeString(),
    strain:        row.strain_score ?? 0,
    blink_rate:    row.blink_rate ?? 0,
    blink_quality: row.blink_quality ?? 0,
    squint:        row.squint_ratio ?? 0,
  }))

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-border-default border-t-accent animate-spin" />
          <p className="font-dm text-sm text-text-muted">Loading history...</p>
        </div>
      </div>
    )
  }

  if (offline) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Power className="text-text-muted" size={32} />
          <p className="font-syne font-bold text-text-secondary">Backend Offline</p>
          <p className="font-dm text-sm text-text-muted text-center max-w-xs">
            Start GazeAware by running{' '}
            <code className="font-mono text-accent">python backend/main.py</code>{' '}
            to view this data.
          </p>
          <button
            onClick={load}
            className="mt-2 font-dm text-sm text-accent border border-border-default rounded-lg px-4 py-2 hover:border-border-active transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-zone-red/5 border border-zone-red/20 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="text-zone-red mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-syne font-bold text-text-primary">{error}</p>
            <button onClick={load} className="mt-3 font-dm text-sm text-accent underline">
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 flex flex-col gap-6" style={{ animation: 'fade-in-up 300ms ease-out both' }}>

      {/* Page header */}
      <div className="mb-2">
        <p className="font-dm text-xs tracking-widest uppercase text-text-muted mb-2">History</p>
        <h1 className="font-syne font-bold text-3xl text-text-primary">Session History</h1>
        <p className="font-dm text-text-secondary mt-1">Review past strain timelines and prescription logs.</p>
      </div>

      {/* ── Strain Timeline ── */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
              Strain Timeline
            </p>
            <h3 className="font-syne font-bold text-lg text-text-primary">Strain Score Over Time</h3>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <Clock className="text-text-muted" size={32} />
            <p className="font-syne font-bold text-text-secondary">No signal data yet</p>
            <p className="font-dm text-sm text-text-muted max-w-xs">
              Start the GazeAware backend and begin a monitoring session to see history here.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" />
              <Line
                type="monotone"
                dataKey="strain"
                stroke="#e8e8f8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#e8e8f8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* ── Signal Breakdown ── */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
              Signal Breakdown
            </p>
            <h3 className="font-syne font-bold text-lg text-text-primary">Individual Signals</h3>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="font-dm text-sm text-text-muted">No signal data available.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={AXIS_STYLE} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 1]} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="blink_rate"    stroke="#e8e8f8" fill="rgba(232,232,248,0.08)" strokeWidth={1.5} dot={false} name="Blink Rate" />
              <Area type="monotone" dataKey="blink_quality" stroke="#8888aa" fill="rgba(136,136,170,0.06)" strokeWidth={1.5} dot={false} name="Blink Quality" />
              <Area type="monotone" dataKey="squint"        stroke="#44445a" fill="rgba(68,68,90,0.05)"    strokeWidth={1.5} dot={false} name="Squint" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* ── Prescription Log ── */}
      <GlassCard>
        <div className="mb-6">
          <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
            Prescription Log
          </p>
          <h3 className="font-syne font-bold text-lg text-text-primary">Exercise History</h3>
        </div>

        {prescriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <CheckCircle2 className="text-text-muted" size={32} />
            <p className="font-syne font-bold text-text-secondary">No prescriptions yet</p>
            <p className="font-dm text-sm text-text-muted max-w-xs">
              Prescriptions are generated when strain stays in the RED zone for 10+ seconds.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl overflow-hidden border border-border-subtle">
            <table className="w-full">
              <thead>
                <tr className="bg-void">
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Time</th>
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Score</th>
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Prescription</th>
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Recovered</th>
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Recovery Time</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((row, i) => {
                  const recovered = row.recovery_confirmed === 1 || row.recovery_confirmed === true
                  return (
                    <tr
                      key={i}
                      className="bg-surface hover:bg-elevated transition-colors duration-150 border-b border-border-subtle"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">
                        {new Date(row.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-text-primary">
                        {row.strain_score?.toFixed(1) ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-dm text-sm text-text-primary max-w-xs truncate">
                        {row.prescription_text ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {recovered
                          ? <CheckCircle2 size={16} className="text-zone-green" />
                          : <XCircle size={16} className="text-zone-red" />
                        }
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">
                        {row.recovery_time_seconds != null ? `${row.recovery_time_seconds}s` : '—'}
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
