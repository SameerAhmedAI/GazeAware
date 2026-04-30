/**
 * CameraFeed.jsx — Fix 4
 * Streams the live MJPEG feed from the backend via the /video_feed endpoint.
 * Gracefully hides itself when the backend is offline (onError).
 */
export default function CameraFeed() {
  return (
    <div className="bg-surface border border-border-subtle rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle">
        <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
          Live Feed
        </p>
        <h3 className="font-syne font-bold text-lg text-text-primary">Camera Monitor</h3>
      </div>

      <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
        <img
          src="/video_feed"
          alt="Live camera feed"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none'
            const offline = e.target.parentElement.querySelector('#feed-offline')
            if (offline) offline.style.display = 'flex'
          }}
        />

        {/* Offline placeholder */}
        <div
          id="feed-offline"
          className="absolute inset-0 items-center justify-center"
          style={{ display: 'none' }}
        >
          <p className="font-dm text-sm text-text-muted">Camera offline</p>
        </div>

        {/* Live indicator overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full bg-zone-green"
            style={{ animation: 'pulse-live 1.5s infinite' }}
          />
          <span className="font-dm text-xs text-zone-green">LIVE</span>
        </div>
      </div>
    </div>
  )
}
