import { useState, useEffect } from 'react'
import { BarChart2, Shield, AlertOctagon, RefreshCw, TrendingUp, Clock, Zap, FileText } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { api } from '../services/api.js'
import GlassCard from '../components/GlassCard.jsx'
import StatCard from '../components/StatCard.jsx'

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

function barColor(score) {
  if (score >= 70) return 'var(--zone-red)'
  if (score >= 40) return 'var(--zone-yellow)'
  return 'var(--zone-green)'
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl px-4 py-3 text-xs"
      style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', fontFamily: 'var(--font-mono)' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color ?? 'var(--text-primary)' }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  )
}

export default function Report() {
  const [degradation, setDegradation] = useState(null)
  const [weekly, setWeekly]           = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const fetchData = () => {
    setLoading(true); setError(null)
    Promise.all([api.getDegradation(), api.getWeeklyReport()])
      .then(([deg, wk]) => { setDegradation(deg); setWeekly(wk) })
      .catch(e => setError(e.message || 'Failed to load report'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div className="p-6"><Spinner /></div>
  if (error)   return <div className="p-6"><ErrorCard message={error} onRetry={fetchData} /></div>

  const atRisk   = degradation?.at_risk === true
  const weekRows = Array.isArray(weekly) ? weekly : []

  // Build bar chart data from weekly rows
  const chartData = weekRows.map(r => ({
    week:  r.week_start ?? 'Week',
    score: r.avg_daily_strain ?? 0,
  }))

  // Summary stats from most recent week
  const latest = weekRows[0] ?? {}

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
        <BarChart2 size={20} style={{ color: 'var(--accent-dim)', flexShrink: 0 }} />
        <h1
          style={{
            fontFamily: 'var(--font-syne)',
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Weekly Report
        </h1>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          borderRadius: '16px',
          padding: '20px 24px',
          background:  atRisk ? 'rgba(220,38,38,0.08)' : 'rgba(16,185,129,0.08)',
          border:      `1px solid ${atRisk ? 'rgba(220,38,38,0.3)' : 'rgba(16,185,129,0.25)'}`,
          boxSizing: 'border-box',
        }}
      >
        {atRisk
          ? <AlertOctagon size={22} style={{ color: 'var(--zone-critical)', flexShrink: 0, marginTop: 2 }} />
          : <Shield size={22} style={{ color: 'var(--zone-green)', flexShrink: 0, marginTop: 2 }} />}
        <div>
          <p className="font-semibold mb-1"
            style={{ fontFamily: 'var(--font-syne)', color: atRisk ? 'var(--zone-critical)' : 'var(--zone-green)', fontSize: '15px' }}>
            {atRisk ? 'Vision Degradation Risk Detected' : 'Vision Stable'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm)', lineHeight: 1.6 }}>
            {degradation?.summary_text ?? (atRisk
              ? 'Acuity has dropped more than 10% over the last 4 weeks with consistently elevated strain.'
              : 'No significant degradation detected. Keep maintaining healthy screen habits.')}
          </p>
          {degradation?.drop_pct != null && (
            <span className="text-xs mt-2 block" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Acuity drop: {degradation.drop_pct.toFixed(1)}% · Avg strain: {degradation.avg_strain?.toFixed(1) ?? '—'}
            </span>
          )}
        </div>
      </div>

      {/* 4 stat cards */}
      <div
        style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          boxSizing: 'border-box',
        }}
      >
        <StatCard
          icon={TrendingUp}
          label="Worst Day"
          value={latest.worst_day ?? '—'}
          color="var(--zone-red)"
        />
        <StatCard
          icon={Clock}
          label="Peak Strain Hour"
          value={latest.peak_strain_hour != null ? `${latest.peak_strain_hour}:00` : '—'}
          color="var(--zone-yellow)"
        />
        <StatCard
          icon={Zap}
          label="Avg Daily Strain"
          value={latest.avg_daily_strain != null ? latest.avg_daily_strain.toFixed(1) : '—'}
          color="var(--accent-dim)"
        />
        <StatCard
          icon={FileText}
          label="Total Prescriptions"
          value={latest.total_prescriptions ?? '—'}
          color="var(--zone-green)"
        />
      </div>

      {/* Weekly bar chart */}
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <span
            style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}
          >
            WEEKLY STRAIN OVERVIEW
          </span>
          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            Last {weekRows.length} week{weekRows.length !== 1 ? 's' : ''}
          </span>
        </div>

        {chartData.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '48px 0' }}>
            <BarChart2 size={24} style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No weekly data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="score" name="Avg Strain" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </GlassCard>

      {/* Weekly detail table */}
      {weekRows.length > 0 && (
        <GlassCard>
          <span className="text-xs tracking-widest uppercase block mb-6"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            WEEKLY BREAKDOWN
          </span>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Week Start', 'Worst Day', 'Peak Hour', 'Avg Strain', 'Prescriptions', 'Recommendation'].map(h => (
                    <th key={h} className="text-left pb-3 pr-5 text-xs tracking-widest uppercase"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekRows.map((r, i) => (
                  <tr key={r.id ?? i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="py-3 pr-5 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      {r.week_start ?? '—'}
                    </td>
                    <td className="py-3 pr-5 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {r.worst_day ?? '—'}
                    </td>
                    <td className="py-3 pr-5 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {r.peak_strain_hour != null ? `${r.peak_strain_hour}:00` : '—'}
                    </td>
                    <td className="py-3 pr-5 text-sm font-bold" style={{
                      fontFamily: 'var(--font-mono)',
                      color: barColor(r.avg_daily_strain ?? 0)
                    }}>
                      {r.avg_daily_strain?.toFixed(1) ?? '—'}
                    </td>
                    <td className="py-3 pr-5 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {r.total_prescriptions ?? '—'}
                    </td>
                    <td className="py-3 pr-5 text-xs max-w-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-dm)', lineHeight: 1.5 }}>
                      {r.habit_recommendation ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
