export default function ConnectionStatus({ connected }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          connected
            ? 'bg-zone-green animate-[pulse-live_1.5s_infinite]'
            : 'bg-zone-red'
        }`}
      />
      <span
        className={`font-dm text-xs font-medium tracking-widest uppercase ${
          connected ? 'text-zone-green' : 'text-zone-red'
        }`}
      >
        {connected ? 'LIVE' : 'DISCONNECTED'}
      </span>
    </div>
  )
}
