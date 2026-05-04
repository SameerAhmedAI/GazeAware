import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, History, Eye, BarChart2, GitBranch } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history',   icon: History,         label: 'History'   },
  { to: '/acuity',    icon: Eye,             label: 'Acuity Test' },
  { to: '/report',    icon: BarChart2,       label: 'Weekly Report' },
]

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col h-full shrink-0"
        style={{
          width: '240px',
          background: 'var(--bg-void)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Logo */}
        <div className="px-6 py-8 flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
            >
              <Eye size={14} style={{ color: 'var(--accent)' }} />
            </div>
            <span
              className="text-base font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}
            >
              GazeAware
            </span>
          </div>
          <span
            className="text-xs pl-9"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            Eye Intelligence
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '8px' }} />

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 flex-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive ? 'border-l-2' : 'border-l-2 border-transparent'
                }`
              }
              style={({ isActive }) => ({
                background:  isActive ? 'var(--bg-surface)' : 'transparent',
                color:       isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                borderLeftColor: isActive ? 'var(--accent)' : 'transparent',
                fontFamily:  'var(--font-dm)',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.classList.contains('active')) {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  const isActive = e.currentTarget.getAttribute('data-active') === 'true'
                  e.currentTarget.style.background = isActive ? 'var(--bg-surface)' : 'transparent'
                  e.currentTarget.style.color = isActive ? 'var(--text-primary)' : 'var(--text-muted)'
                }
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div
          className="px-6 py-5 flex flex-col gap-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span
            className="text-xs"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
          >
            v2.4 — Phase 2.4
          </span>
          <a
            href="https://github.com/SameerAhmedAI/GazeAware"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs transition-colors duration-200"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-dm)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <GitBranch size={12} />
            GitHub
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
        <Outlet />
      </main>
    </div>
  )
}
