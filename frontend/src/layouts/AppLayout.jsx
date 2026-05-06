import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, History, Eye, BarChart2, GitBranch, LogOut } from 'lucide-react'
import { api } from '../services/api'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history',   icon: History,         label: 'History'   },
  { to: '/acuity',    icon: Eye,             label: 'Acuity Test' },
  { to: '/report',    icon: BarChart2,       label: 'Weekly Report' },
]

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
              color: 'var(--text-muted)',
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

        {/* ── Bottom — User + Logout + GitHub ─────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            padding: '12px 10px 20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {/* Signed-in user */}
          {user.username && (
            <div style={{
              padding: '6px 12px',
              fontFamily: 'var(--font-dm)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              letterSpacing: '0.01em',
            }}>
              Signed in as <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{user.username}</span>
            </div>
          )}

          {/* Sign Out button */}
          <button
            id="sidebar-signout"
            onClick={() => api.logout()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontFamily: 'var(--font-dm)',
              textDecoration: 'none',
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'color 0.18s, background 0.18s',
              width: '100%',
              textAlign: 'left',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--zone-red)'
              e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            Sign Out
          </button>
          <a
            href="https://github.com/SameerAhmedAI/GazeAware"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '10px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.03em',
              textDecoration: 'none',
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              transition: 'color 0.18s, border-color 0.18s, background 0.18s',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            }}
          >
            <GitBranch size={12} style={{ flexShrink: 0 }} />
            GitHub
          </a>
        </div>

      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main style={{ flex: '1 1 0', overflowY: 'auto', background: 'var(--bg-base)', minWidth: 0 }}>
        <Outlet />
      </main>

    </div>
  )
}
