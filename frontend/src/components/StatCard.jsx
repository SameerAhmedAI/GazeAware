export default function StatCard({ icon: Icon, label, value, unit = '', color }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-3 relative overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Background glow */}
      {color && (
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, transform: 'translate(30%, -30%)' }}
        />
      )}
      {Icon && (
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {label}
          </span>
          <Icon size={16} style={{ color: color || 'var(--text-muted)' }} />
        </div>
      )}
      <div className="flex items-end gap-1">
        <span
          className="text-3xl font-bold"
          style={{ fontFamily: 'var(--font-mono)', color: color || 'var(--text-primary)' }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{unit}</span>
        )}
      </div>
    </div>
  )
}
