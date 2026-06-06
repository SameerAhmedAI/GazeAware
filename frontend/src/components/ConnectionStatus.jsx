/**
 * ConnectionStatus — radar pulse on LIVE, red blink on DISCONNECTED
 */
export default function ConnectionStatus({ isConnected }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '5px 12px 5px 10px',
      borderRadius: '4px',
      background: isConnected ? 'rgba(0,229,160,0.07)' : 'rgba(255,68,85,0.08)',
      border: `1px solid ${isConnected ? 'rgba(0,229,160,0.25)' : 'rgba(255,68,85,0.30)'}`,
      boxSizing: 'border-box',
      flexShrink: 0,
      clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
    }}>
      {/* Dot with radar pulse */}
      <div style={{ position: 'relative', width: '8px', height: '8px', flexShrink: 0 }}>
        {isConnected && (
          <span style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: '1px solid rgba(0,229,160,0.5)',
            animation: 'radar-pulse 1.8s ease-out infinite',
          }} />
        )}
        <span
          className={isConnected ? 'animate-pulse-live' : 'animate-pulse-dot-red'}
          style={{
            display: 'block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isConnected ? 'var(--zone-green)' : 'var(--zone-red)',
            boxShadow: isConnected
              ? '0 0 10px var(--zone-green)'
              : '0 0 10px var(--zone-red)',
          }}
        />
      </div>

      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: isConnected ? 'var(--zone-green)' : 'var(--zone-red)',
        whiteSpace: 'nowrap',
      }}>
        {isConnected ? 'LIVE' : 'OFFLINE'}
      </span>
    </div>
  )
}