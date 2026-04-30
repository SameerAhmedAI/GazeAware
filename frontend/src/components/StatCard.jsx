import GlassCard from './GlassCard'

export default function StatCard({ label, value, icon: Icon, sub }) {
  return (
    <GlassCard className="flex flex-col gap-3 relative">
      {Icon && (
        <div className="absolute top-6 right-6">
          <Icon size={20} className="text-text-muted" />
        </div>
      )}
      <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted">
        {label}
      </p>
      <p className="font-mono font-bold text-3xl text-text-primary">
        {value ?? '—'}
      </p>
      {sub && (
        <p className="font-dm text-xs text-text-muted">{sub}</p>
      )}
    </GlassCard>
  )
}
