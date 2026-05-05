export default function StatCard({ icon: Icon, label, value, unit = '', color }) {
  return (
    <div
      style={{
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxSizing: 'border-box',
        minWidth: 0,
      }}
    >
      {/* Background glow */}
      {color && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '128px',
            height: '128px',
            borderRadius: '50%',
            pointerEvents: 'none',
            background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
            transform: 'translate(30%, -30%)',
          }}
        />
      )}
      {Icon && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: '1 1 0',
              minWidth: 0,
            }}
          >
            {label}
          </span>
          <Icon size={16} style={{ color: color || 'var(--text-muted)', flexShrink: 0, marginLeft: '8px' }} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '28px',
            fontWeight: 700,
            color: color || 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: '14px', marginBottom: '2px', color: 'var(--text-muted)' }}>{unit}</span>
        )}
      </div>
    </div>
  )
}
