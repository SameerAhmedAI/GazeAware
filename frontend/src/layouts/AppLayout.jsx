import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Activity, LineChart, Eye, BarChart2, ExternalLink } from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Live Dashboard', icon: Activity },
  { path: '/history',   label: 'Session History', icon: LineChart },
  { path: '/acuity',    label: 'Acuity Tests',    icon: Eye },
  { path: '/report',    label: 'Weekly Report',   icon: BarChart2 },
]

export default function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-base overflow-hidden">
      {/* Sidebar */}
      <aside
        className="flex flex-col bg-void border-r border-border-subtle shrink-0 relative"
        style={{ width: 240 }}
      >
        {/* Logo */}
        <div className="flex flex-col px-6 py-6 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-accent" />
            <span className="font-syne font-bold text-text-primary text-lg">GazeAware</span>
          </div>
          <span className="font-dm text-xs text-text-muted mt-1 ml-8">Eye Intelligence</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path
            return (
              <NavLink
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                  isActive
                    ? 'bg-surface text-text-primary border-l-2 border-accent pl-2.5'
                    : 'text-text-muted hover:bg-elevated hover:text-text-secondary'
                }`}
              >
                <Icon size={16} />
                <span className="font-dm text-sm font-medium">{label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-6 left-0 right-0 px-4">
          <p className="font-dm text-xs text-text-muted text-center">GazeAware v2.4</p>
          <a
            href="https://github.com/SameerAhmedAI/GazeAware"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 mt-2 font-dm text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            <ExternalLink size={12} />
            View on GitHub
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-base overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
