export default function GlassCard({ children, className = '', variant = 'default' }) {
  const variants = {
    default:  'bg-surface border border-border-subtle',
    elevated: 'bg-elevated border border-border-default',
    critical: 'bg-[rgba(220,38,38,0.06)] border border-zone-red/30',
    warning:  'bg-[rgba(245,158,11,0.06)] border border-zone-yellow/30',
    success:  'bg-[rgba(16,185,129,0.06)] border border-zone-green/30',
  }
  return (
    <div className={`rounded-2xl p-6 ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}
