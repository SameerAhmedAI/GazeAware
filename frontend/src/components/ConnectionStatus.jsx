export default function ConnectionStatus({ isConnected }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '999px',
        background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.10)',
        border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.30)' : 'rgba(239, 68, 68, 0.35)'}`,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <span
        className={isConnected ? 'animate-pulse-live' : 'animate-pulse-dot-red'}
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isConnected ? 'var(--zone-green)' : 'var(--zone-red)',
          boxShadow: isConnected ? '0 0 8px var(--zone-green)' : '0 0 8px var(--zone-red)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isConnected ? 'var(--zone-green)' : 'var(--zone-red)',
          whiteSpace: 'nowrap',
        }}
      >
        {isConnected ? 'LIVE' : 'DISCONNECTED'}
      </span>
    </div>
  )
}
