/**
 * SignalBar — signal channel display
 * - Scan animation on each value change
 * - Threshold-based color
 * - Corner-cut card style
 */

import { useRef, useEffect, useState } from 'react'

function barColor(v) {
  if (v < 0.40) return 'var(--zone-green)'
  if (v < 0.70) return 'var(--zone-yellow)'
  return 'var(--zone-red)'
}

function glowColor(v) {
  if (v < 0.40) return 'rgba(0,229,160,0.5)'
  if (v < 0.70) return 'rgba(255,184,0,0.5)'
  return 'rgba(255,68,85,0.5)'
}

export default function SignalBar({ label, value = 0 }) {
  const color = barColor(value)
  const glow = glowColor(value)
  const pct = Math.min(100, Math.max(0, value * 100))

  // Flash scan on value change
  const [scanning, setScanning] = useState(false)
  const prevRef = useRef(value)
  useEffect(() => {
    if (Math.abs(value - prevRef.current) > 0.005) {
      setScanning(true)
      const t = setTimeout(() => setScanning(false), 500)
      prevRef.current = value
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px 14px',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        minWidth: 0,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.3s',
        ...(value > 0.7 && {
          borderColor: 'rgba(255,68,85,0.15)',
        }),
      }}
    >
      {/* Scan flash */}
      {scanning && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          animation: 'scan-line 0.45s ease-out',
          pointerEvents: 'none',
        }} />
      )}

      {/* Label + value row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        minWidth: 0,
      }}>
        <span style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.04em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '1 1 0',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          color,
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.02em',
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
          textShadow: pct > 70 ? `0 0 8px ${glow}` : 'none',
          transition: 'color 0.4s, text-shadow 0.4s',
        }}>
          {value.toFixed(2)}
        </span>
      </div>

      {/* Bar track */}
      <div style={{
        width: '100%',
        height: '3px',
        borderRadius: '999px',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.04)',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: '999px',
          background: color,
          boxShadow: pct > 10 ? `0 0 6px ${glow}` : 'none',
          transition: 'width 500ms cubic-bezier(0.4,0,0.2,1), background 400ms ease, box-shadow 400ms ease',
        }} />
      </div>
    </div>
  )
}