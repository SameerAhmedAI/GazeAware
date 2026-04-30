import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, AlertOctagon, Calendar, Zap, Activity, FileText, AlertCircle, Power } from 'lucide-react'
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getDegradationReport, getWeeklyReport } from '../services/api'
import GlassCard from '../components/GlassCard'
import StatCard from '../components/StatCard'

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

function barColor(strain) {
  if (strain < 50)  return '#10b981'
  if (strain <= 70) return '#f59e0b'
  return '#ef4444'
}

export default function Report() {
  const [degradation, setDegradation] = useState(null)
  const [weekly, setWeekly]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [offline, setOffline]         = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    setOffline(false)
    Promise.all([getDegradationReport(), getWeeklyReport()])
      .then(([d, w]) => { setDegradation(d); setWeekly(w) })
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-border-default border-t-accent animate-spin" />
          <p className="font-dm text-sm text-text-muted">Generating report...</p>
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

  const latest = weekly[0] ?? {}
  const hasRisk = degradation && (degradation.risk_detected || degradation.drop_pct > 0)

  const barData = weekly.map(row => ({
    week:   row.week_start ?? '—',
    strain: row.avg_daily_strain ?? 0,
  }))

  return (
    <div className="p-8 flex flex-col gap-6" style={{ animation: 'fade-in-up 300ms ease-out both' }}>

      {/* Page header */}
      <div className="mb-2">
        <p className="font-dm text-xs tracking-widest uppercase text-text-muted mb-2">Analytics</p>
        <h1 className="font-syne font-bold text-3xl text-text-primary">Weekly Report</h1>
        <p className="font-dm text-text-secondary mt-1">Vision health trend analysis and degradation risk assessment.</p>
      </div>

      {/* ── Degradation Risk Banner ── */}
      {hasRisk ? (
        <div className="bg-zone-red/5 border border-zone-red/20 rounded-2xl p-6 flex items-start gap-4">
          <AlertOctagon
            size={24}
            className="text-zone-red shrink-0 mt-0.5"
            style={{ animation: 'pulse-live 2s infinite' }}
          />
          <div>
            <p className="font-syne font-bold text-zone-red text-lg">Vision Degradation Risk Detected</p>
            {degradation?.summary_text && (
              <p className="font-dm text-sm text-text-secondary mt-1">{degradation.summary_text}</p>
            )}
            {degradation?.drop_pct != null && (
              <p className="font-dm text-xs text-text-muted mt-2">
                Acuity drop: <span className="font-mono text-zone-red">{degradation.drop_pct.toFixed(1)}%</span>
                {degradation?.avg_strain != null && (
                  <> · Avg strain: <span className="font-mono text-zone-yellow">{degradation.avg_strain.toFixed(1)}</span></>
                )}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-zone-green/5 border border-zone-green/20 rounded-2xl p-6 flex items-center gap-4">
          <ShieldCheck size={24} className="text-zone-green shrink-0" />
          <div>
            <p className="font-syne font-bold text-zone-green text-lg">No Degradation Risk Detected</p>
            <p className="font-dm text-sm text-text-secondary mt-0.5">Vision acuity trend is stable over the rolling 4-week window.</p>
          </div>
        </div>
      )}

      {/* ── 4 Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Worst Day"
          value={latest.worst_day ?? '—'}
          icon={Calendar}
          sub="Highest average strain"
        />
        <StatCard
          label="Peak Hour"
          value={latest.peak_strain_hour != null ? `${latest.peak_strain_hour}:00` : '—'}
          icon={Zap}
          sub="Most critical hour"
        />
        <StatCard
          label="Avg Daily Strain"
          value={latest.avg_daily_strain != null ? latest.avg_daily_strain.toFixed(1) : '—'}
          icon={Activity}
          sub="This week's average"
        />
        <StatCard
          label="Prescriptions"
          value={latest.total_prescriptions ?? '—'}
          icon={FileText}
          sub="Total exercises triggered"
        />
      </div>

      {/* ── Weekly Bar Chart ── */}
      <GlassCard>
        <div className="mb-6">
          <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">Trend</p>
          <h3 className="font-syne font-bold text-lg text-text-primary">Weekly Strain Average</h3>
        </div>

        {barData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <Activity className="text-text-muted" size={32} />
            <p className="font-syne font-bold text-text-secondary">No weekly data yet</p>
            <p className="font-dm text-sm text-text-muted max-w-xs">
              Weekly reports are generated automatically after sessions accumulate.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} barSize={32}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="week" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip {...CHART_TOOLTIP_STYLE} />
              <Bar dataKey="strain" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.strain)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* ── Habit Recommendation ── */}
      {latest.habit_recommendation && (
        <GlassCard variant="elevated">
          <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-2">AI Recommendation</p>
          <p className="font-syne font-bold text-lg text-text-primary">{latest.habit_recommendation}</p>
        </GlassCard>
      )}
    </div>
  )
}
