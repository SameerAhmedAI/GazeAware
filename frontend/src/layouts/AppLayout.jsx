import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, History, Eye, BarChart2, LogOut, ChevronDown } from 'lucide-react'
import { api } from '../services/api'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history',   icon: History,         label: 'History'   },
  { to: '/acuity',    icon: Eye,             label: 'Acuity Test' },
  { to: '/report',    icon: BarChart2,       label: 'Weekly Report' },
]

/* ── User card + dropdown ────────────────────────────────────────────────── */
function UserCard({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initial = (user.username || '?')[0].toUpperCase()

  /* Close when clicking outside */
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div
      ref={ref}
      style={{
        flexShrink: 0,
        padding: '10px 10px 14px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
      }}
    >
      {/* Dropdown — renders ABOVE the card */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '10px',
          right: '10px',
          background: 'rgba(18,20,24,0.98)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}>
          <button
            id="sidebar-signout"
            onClick={() => { setOpen(false); api.logout() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '11px 14px',
              background: 'transparent', border: 'none',
              fontFamily: 'var(--font-dm)', fontSize: '13px',
              color: 'var(--text-secondary)', cursor: 'pointer',
              textAlign: 'left', boxSizing: 'border-box',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--zone-red)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            Sign Out
          </button>
        </div>
      )}

      {/* Card trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          width: '100%', padding: '10px 12px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px', cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'background 0.18s, border-color 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
      >
        {/* Avatar circle */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.10))',
          border: '1px solid rgba(16,185,129,0.30)',
          fontFamily: 'var(--font-syne)', fontSize: '12px', fontWeight: 700,
          color: 'var(--zone-green)',
        }}>
          {initial}
        </div>

        {/* Username */}
        <span style={{
          flex: 1, fontFamily: 'var(--font-dm)', fontSize: '12px',
          color: 'var(--text-secondary)', fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textAlign: 'left',
        }}>
          {user.username || 'User'}
        </span>

        {/* Chevron */}
        <ChevronDown
          size={13}
          style={{
            flexShrink: 0, color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>
    </div>
  )
}


export default function AppLayout() {
  const user = JSON.parse(localStorage.getItem('gazeaware_user') || '{}')
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        style={{
          width: '240px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'var(--bg-void)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          boxSizing: 'border-box',
          overflowY: 'auto',
        }}
      >

        {/* ── Logo / brand ─────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 20px 14px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          {/* Icon + wordmark row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.1)',
              }}
            >
              <Eye size={15} style={{ color: 'var(--zone-green)' }} />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-syne)',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
              }}
            >
              GazeAware
            </span>
          </div>

          {/* "Eye Intelligence" subtitle — indented to align with wordmark */}
          <span
            style={{
              paddingLeft: '42px',   /* 32px icon + 10px gap */
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.06em',
              color: 'rgba(180,190,200,0.55)',
            }}
          >
            Eye Intelligence
          </span>
        </div>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '6px', flexShrink: 0 }} />

        {/* ── Nav ──────────────────────────────────────────────────── */}
        <nav
          style={{
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            padding: '6px 10px 10px',
          }}
        >
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: isActive ? '11px 12px 11px 10px' : '11px 12px',
                borderRadius: '10px',
                fontSize: '13px',
                fontFamily: 'var(--font-dm)',
                textDecoration: 'none',
                transition: 'background 0.18s, color 0.18s',
                background:   isActive ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
                color:        isActive ? 'var(--text-primary)'       : 'var(--text-muted)',
                borderLeft:   isActive ? '2px solid var(--zone-green)' : '2px solid transparent',
                boxShadow:    isActive ? 'inset 0 0 0 1px rgba(255,255,255,0.05)' : 'none',
                boxSizing:    'border-box',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
            >
              <Icon size={16} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* ── Bottom — User card with dropdown ─────────────────────── */}
        <UserCard user={user} />

      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main style={{ flex: '1 1 0', overflowY: 'auto', background: 'var(--bg-base)', minWidth: 0 }}>
        <Outlet />
      </main>

    </div>
  )
}
