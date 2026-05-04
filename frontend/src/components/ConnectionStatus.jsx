export default function ConnectionStatus({ isConnected }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2 h-2 rounded-full ${isConnected ? 'animate-pulse-live' : ''}`}
        style={{ background: isConnected ? 'var(--zone-green)' : 'var(--zone-red)', boxShadow: isConnected ? '0 0 8px var(--zone-green)' : 'none' }}
      />
      <span
        className="text-xs font-semibold tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-mono)', color: isConnected ? 'var(--zone-green)' : 'var(--zone-red)' }}
      >
        {isConnected ? 'LIVE' : 'DISCONNECTED'}
      </span>
    </div>
  )
}
