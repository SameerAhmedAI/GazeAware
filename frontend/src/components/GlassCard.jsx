export default function GlassCard({ children, className = '', onClick, style }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl ${className}`}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '24px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
