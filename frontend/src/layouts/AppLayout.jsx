import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, History, Eye, BarChart2, LogOut, ChevronDown } from 'lucide-react'
import { api } from '../services/api'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tag: '01' },
  { to: '/history', icon: History, label: 'History', tag: '02' },
  { to: '/acuity', icon: Eye, label: 'Acuity Test', tag: '03' },
  { to: '/report', icon: BarChart2, label: 'Weekly Report', tag: '04' },
]

/* ── User card ───────────────────────────────────────────────────────────── */
function UserCard({ user }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initial = (user.username || '?')[0].toUpperCase()

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  return (
    <div ref={ref} style={{ flexShrink: 0, padding: '8px 10px 12px', borderTop: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '10px',
          right: '10px',
          background: 'rgba(12,12,22,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
          zIndex: 100,
        }}>
          <button
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
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--zone-red)'; e.currentTarget.style.background = 'rgba(255,68,85,0.07)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent' }}
          >
            <LogOut size={13} style={{ flexShrink: 0 }} />
            Sign Out
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          width: '100%', padding: '9px 11px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px', cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'background 0.18s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
      >
        {/* Avatar */}
        <div style={{
          width: '26px', height: '26px', borderRadius: '6px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(0,229,160,0.2), rgba(0,229,160,0.07))',
          border: '1px solid rgba(0,229,160,0.25)',
          fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700,
          color: 'var(--zone-green)',
        }}>
          {initial}
        </div>
        <span style={{
          flex: 1, fontFamily: 'var(--font-dm)', fontSize: '12px',
          color: 'var(--text-secondary)', fontWeight: 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          textAlign: 'left',
        }}>
          {user.username || 'User'}
        </span>
        <ChevronDown size={12} style={{
          flexShrink: 0, color: 'var(--text-muted)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }} />
      </button>
    </div>
  )
}

/* ── AppLayout ───────────────────────────────────────────────────────────── */
export default function AppLayout() {
  const user = JSON.parse(localStorage.getItem('gazeaware_user') || '{}')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: '224px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-void)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}>

        {/* Brand */}
        <div style={{ padding: '20px 18px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Eye icon box */}
            <div style={{
              width: '32px', height: '32px',
              borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(0,229,160,0.15), rgba(0,229,160,0.04))',
              border: '1px solid rgba(0,229,160,0.22)',
              boxShadow: '0 0 20px rgba(0,229,160,0.1)',
              clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
            }}>
              <Eye size={14} style={{ color: 'var(--zone-green)' }} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-syne)',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}>
                GazeAware
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.1em',
                color: 'rgba(0,229,160,0.45)',
                marginTop: '1px',
              }}>
                EYE INTELLIGENCE
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', flexShrink: 0, marginBottom: '4px' }} />

        {/* Nav label */}
        <div style={{
          padding: '10px 18px 6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          Navigation
        </div>

        {/* Nav links */}
        <nav style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          padding: '0 8px 8px',
        }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label, tag }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 11px',
                borderRadius: '8px',
                fontSize: '13px',
                fontFamily: 'var(--font-dm)',
                fontWeight: isActive ? 500 : 400,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
                position: 'relative',
                background: isActive ? 'rgba(0,229,160,0.07)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                borderLeft: isActive ? '2px solid var(--zone-green)' : '2px solid transparent',
                boxSizing: 'border-box',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
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
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                flexShrink: 0,
              }}>
                {tag}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* System status footer */}
        <div style={{
          padding: '8px 16px',
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          marginBottom: '4px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'var(--zone-green)',
              boxShadow: '0 0 6px var(--zone-green)',
              animation: 'pulse-live 2s infinite',
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--text-muted)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}>
              System Online
            </span>
          </div>
        </div>

        {/* User card */}
        <UserCard user={user} />
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main style={{ flex: '1 1 0', overflowY: 'auto', background: 'var(--bg-base)', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}