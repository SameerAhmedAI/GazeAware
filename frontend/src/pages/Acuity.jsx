import { useState, useEffect, useCallback, useRef } from 'react'
import { Eye, AlertCircle, Power, ScanEye, CheckCircle2 } from 'lucide-react'
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { getAcuityHistory, triggerAcuity } from '../services/api'
import GlassCard  from '../components/GlassCard'
import ZoneBadge  from '../components/ZoneBadge'

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

const SNELLEN_SCORES = {
  '20/200': 0.10,
  '20/100': 0.20,
  '20/70':  0.29,
  '20/50':  0.40,
  '20/40':  0.50,
  '20/30':  0.67,
  '20/25':  0.80,
  '20/20':  1.00,
}

function snellenColor(fraction) {
  if (!fraction) return 'text-text-muted'
  const denom = parseInt(fraction.split('/')[1], 10)
  if (denom <= 20) return 'text-zone-green'
  if (denom <= 40) return 'text-zone-yellow'
  return 'text-zone-red'
}

function snellenZone(fraction) {
  if (!fraction) return 'GREEN'
  const denom = parseInt(fraction.split('/')[1], 10)
  if (denom <= 20) return 'GREEN'
  if (denom <= 40) return 'YELLOW'
  return 'RED'
}

export default function Acuity() {
  const [records, setRecords]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [offline, setOffline]       = useState(false)
  // Fix 8: acuity trigger state
  const [triggered, setTriggered]   = useState(false)  // button triggered
  const [polling, setPolling]       = useState(false)   // currently polling for new result
  const [triggerMsg, setTriggerMsg] = useState('')
  const pollRef                     = useRef(null)
  const pollCountRef                = useRef(0)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    setOffline(false)
    getAcuityHistory()
      .then(data => setRecords(data))
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

  // Fix 8: Poll for new result after triggering
  const startPolling = useCallback((baselineCount) => {
    pollCountRef.current = 0
    setPolling(true)
    setTriggerMsg('Acuity test triggered — check the GazeAware camera window for the test prompt.')

    pollRef.current = setInterval(async () => {
      pollCountRef.current += 1
      try {
        const data = await getAcuityHistory()
        if (data.length > baselineCount) {
          // New result arrived
          setRecords(data)
          setPolling(false)
          setTriggered(false)
          setTriggerMsg('')
          clearInterval(pollRef.current)
        }
      } catch {
        // Ignore poll errors
      }
      if (pollCountRef.current >= 12) {  // 60s timeout (12 × 5s)
        setPolling(false)
        setTriggerMsg('')
        clearInterval(pollRef.current)
      }
    }, 5000)
  }, [])

  useEffect(() => () => clearInterval(pollRef.current), [])

  const handleTriggerAcuity = useCallback(async () => {
    try {
      setTriggered(true)
      await triggerAcuity()
      startPolling(records.length)
    } catch (e) {
      setTriggerMsg(`Error: ${e.message}`)
      setTriggered(false)
    }
  }, [records.length, startPolling])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-border-default border-t-accent animate-spin" />
          <p className="font-dm text-sm text-text-muted">Loading acuity data...</p>
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

  const latest   = records[0] ?? null
  const chartData = records.slice().reverse().map(row => ({
    time:  new Date(row.timestamp).toLocaleDateString(),
    score: SNELLEN_SCORES[row.snellen_fraction] ?? 0,
    label: row.snellen_fraction ?? '—',
  }))

  return (
    <div className="p-8 flex flex-col gap-6" style={{ animation: 'fade-in-up 300ms ease-out both' }}>

      {/* Page header */}
      <div className="mb-2">
        <p className="font-dm text-xs tracking-widest uppercase text-text-muted mb-2">Vision</p>
        <h1 className="font-syne font-bold text-3xl text-text-primary">Acuity Tests</h1>
        <p className="font-dm text-text-secondary mt-1">Visual acuity history measured via digital Snellen chart.</p>
      </div>

      {/* Fix 8: Start Acuity Test button */}
      <GlassCard className="flex flex-col gap-4">
        <div>
          <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
            Vision Test
          </p>
          <h3 className="font-syne font-bold text-lg text-text-primary">Run Acuity Test</h3>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleTriggerAcuity}
            disabled={triggered || polling}
            className="flex items-center gap-2 bg-elevated border border-border-default hover:border-border-active rounded-xl px-5 py-3 font-dm text-sm text-text-primary transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={polling ? { borderColor: '#e8e8f8', color: '#e8e8f8' } : {}}
          >
            {polling ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-border-default border-t-accent animate-spin" />
                Waiting for result...
              </>
            ) : (
              <>
                <ScanEye size={16} />
                {triggered ? 'Triggered' : 'Start Acuity Test'}
              </>
            )}
          </button>
        </div>

        {triggerMsg && (
          <p className="font-dm text-sm text-text-secondary flex items-start gap-2">
            <CheckCircle2 size={16} className="text-zone-green mt-0.5 shrink-0" />
            {triggerMsg}
          </p>
        )}

        {!triggerMsg && (
          <p className="font-dm text-xs text-text-muted">
            The test runs in the GazeAware camera window. Alternatively, press{' '}
            <kbd className="font-mono bg-elevated px-2 py-0.5 rounded text-text-primary">A</kbd>{' '}
            in the camera window directly.
          </p>
        )}
      </GlassCard>

      {/* ── Latest Result Hero ── */}
      {latest ? (
        <GlassCard className="flex flex-col items-center py-10 gap-4">
          <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted">Latest Result</p>
          <p className={`font-mono font-bold text-6xl ${snellenColor(latest.snellen_fraction)}`}>
            {latest.snellen_fraction ?? '—'}
          </p>
          <ZoneBadge zone={snellenZone(latest.snellen_fraction)} />
          <p className="font-dm text-xs text-text-muted">
            {new Date(latest.timestamp).toLocaleString()}
          </p>
          <div className="flex items-center gap-4 mt-2">
            {latest.cheat_detected ? (
              <span className="font-dm text-xs text-zone-yellow bg-zone-yellow/10 border border-zone-yellow/20 rounded-full px-3 py-1">
                Cheat Detected
              </span>
            ) : null}
            {latest.squint_detected ? (
              <span className="font-dm text-xs text-zone-yellow bg-zone-yellow/10 border border-zone-yellow/20 rounded-full px-3 py-1">
                Squint Detected
              </span>
            ) : null}
            {latest.distance_cm != null && (
              <span className="font-dm text-xs text-text-muted bg-elevated rounded-full px-3 py-1">
                {latest.distance_cm.toFixed(1)} cm
              </span>
            )}
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="flex flex-col items-center justify-center py-16 gap-4">
          <Eye size={32} className="text-text-muted" />
          <p className="font-syne font-bold text-text-secondary">No acuity tests yet</p>
          <p className="font-dm text-sm text-text-muted max-w-sm text-center">
            Click "Start Acuity Test" above or press{' '}
            <kbd className="font-mono bg-elevated px-2 py-0.5 rounded text-text-primary">A</kbd>{' '}
            in the GazeAware camera window.
          </p>
        </GlassCard>
      )}

      {/* ── Trend Chart ── */}
      {chartData.length > 0 && (
        <GlassCard>
          <div className="mb-6">
            <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">Trend</p>
            <h3 className="font-syne font-bold text-lg text-text-primary">Acuity Over Time</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1e1e2e" strokeDasharray="4 4" />
              <XAxis dataKey="time" tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 1.1]} tick={AXIS_STYLE} tickLine={false} axisLine={false} />
              <Tooltip
                {...CHART_TOOLTIP_STYLE}
                formatter={(val, _, props) => [props.payload.label, 'Snellen']}
              />
              <ReferenceLine y={1.0} stroke="#e8e8f8" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#e8e8f8"
                strokeWidth={2}
                dot={{ r: 4, fill: '#e8e8f8', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* ── Results Table ── */}
      {records.length > 0 && (
        <GlassCard>
          <div className="mb-6">
            <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">Records</p>
            <h3 className="font-syne font-bold text-lg text-text-primary">All Tests</h3>
          </div>
          <div className="overflow-x-auto rounded-xl overflow-hidden border border-border-subtle">
            <table className="w-full">
              <thead>
                <tr className="bg-void">
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Date</th>
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Snellen</th>
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Distance</th>
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Cheated</th>
                  <th className="px-4 py-3 text-left font-dm font-medium text-xs text-text-muted tracking-widest uppercase">Squint</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row, i) => (
                  <tr key={i} className="bg-surface hover:bg-elevated transition-colors duration-150 border-b border-border-subtle">
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 font-mono font-bold text-sm ${snellenColor(row.snellen_fraction)}`}>
                      {row.snellen_fraction ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-muted">
                      {row.distance_cm != null ? `${row.distance_cm.toFixed(1)} cm` : '—'}
                    </td>
                    <td className="px-4 py-3 font-dm text-xs text-text-muted">
                      {row.cheat_detected ? 'Yes' : 'No'}
                    </td>
                    <td className="px-4 py-3 font-dm text-xs text-text-muted">
                      {row.squint_detected ? 'Yes' : 'No'}
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
