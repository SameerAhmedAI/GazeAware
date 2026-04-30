import { useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, Maximize2, Activity, Shuffle,
  Hand, ArrowUpFromLine, Droplets, ChevronDown, ExternalLink, ScanEye
} from 'lucide-react'

const SquintIcon = ScanEye ?? Eye

const signals = [
  { name: 'Blink Rate',         icon: Eye,              desc: 'Tracks blinks per minute. Below 10 indicates active strain.' },
  { name: 'Blink Quality',      icon: EyeOff,           desc: 'Detects lazy partial closures vs full healthy blinks.' },
  { name: 'Screen Distance',    icon: Maximize2,        desc: 'Monitors proximity. Under 30cm triggers warnings.' },
  { name: 'Squint Detection',   icon: SquintIcon,       desc: 'Identifies sustained partial eye closure patterns.' },
  { name: 'Gaze Entropy',       icon: Shuffle,          desc: 'Measures chaotic eye movement from multi-tab scanning.' },
  { name: 'Blink Irregularity', icon: Activity,         desc: 'Flags disrupted blink rhythm caused by focus tasks.' },
  { name: 'Eye Rubbing',        icon: Hand,             desc: 'Detects hand-to-eye proximity via MediaPipe Hands.' },
  { name: 'Posture Lean',       icon: ArrowUpFromLine,  desc: 'Tracks forward head creep over extended sessions.' },
  { name: 'Scleral Redness',    icon: Droplets,         desc: 'Estimates whiteness-to-redness ratio in the sclera.' },
]

const steps = [
  {
    num: '01',
    title: 'Webcam Capture',
    desc: 'Your webcam streams face landmarks via MediaPipe at 30 FPS. All processing is 100% local — nothing leaves your device.',
  },
  {
    num: '02',
    title: 'Signal Fusion',
    desc: '9 real-time signals are weighted and fused into a 0–100 strain score, calibrated against your personal baseline.',
  },
  {
    num: '03',
    title: 'AI Prescription',
    desc: 'When strain stays critical for 10+ seconds, Groq LLaMA generates a targeted recovery exercise for your specific pattern.',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-void text-text-primary font-dm">

      {/* ── Fixed Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-void/90 backdrop-blur-sm border-b border-border-subtle"
           style={{ height: 64 }}>
        <div className="flex items-center justify-between h-full px-8">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-accent" />
            <span className="font-syne font-bold text-text-primary text-lg">GazeAware</span>
          </div>
          <button
            id="launch-dashboard-nav"
            onClick={() => navigate('/dashboard')}
            className="bg-accent text-void rounded-xl px-5 py-2 font-dm font-medium text-sm hover:opacity-90 transition-opacity"
          >
            Launch Dashboard
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative flex items-center justify-center min-h-screen overflow-hidden" style={{ paddingTop: 64 }}>
        {/* Gradient orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(232,232,248,0.04) 0%, transparent 70%)',
            animation: 'float-orb1 20s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%)',
            animation: 'float-orb2 25s ease-in-out infinite alternate',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl px-8 gap-6">
          {/* Label pill */}
          <span
            className="border border-border-default font-dm text-xs text-text-muted px-4 py-1.5 rounded-full"
            style={{ animation: 'fade-in-up 600ms ease-out both', animationDelay: '0ms' }}
          >
            AI-Powered Eye Intelligence
          </span>

          {/* Headline */}
          <h1
            className="font-syne font-extrabold text-7xl text-text-primary leading-none tracking-tight"
            style={{ animation: 'fade-in-up 600ms ease-out both', animationDelay: '100ms' }}
          >
            Your Eyes<br />Work Hard.
          </h1>

          {/* Subheadline */}
          <p
            className="font-dm text-xl text-text-secondary max-w-xl leading-relaxed"
            style={{ animation: 'fade-in-up 600ms ease-out both', animationDelay: '200ms' }}
          >
            GazeAware monitors 9 real-time eye signals to detect digital strain before
            it becomes permanent damage — all from your webcam, 100% private.
          </p>

          {/* Buttons */}
          <div
            className="flex items-center gap-4"
            style={{ animation: 'fade-in-up 600ms ease-out both', animationDelay: '300ms' }}
          >
            <button
              id="launch-dashboard-hero"
              onClick={() => navigate('/dashboard')}
              className="bg-accent text-void rounded-xl px-7 py-3 font-dm font-medium hover:opacity-90 transition-opacity"
            >
              Launch Dashboard
            </button>
            <a
              href="https://github.com/SameerAhmedAI/GazeAware"
              target="_blank"
              rel="noopener noreferrer"
              id="view-github-hero"
              className="flex items-center gap-2 border border-border-default text-text-secondary rounded-xl px-7 py-3 font-dm font-medium hover:bg-elevated hover:text-text-primary transition-all duration-200"
            >
              <ExternalLink size={16} />
              View on GitHub
            </a>
          </div>

          {/* Scroll hint */}
          <div className="flex flex-col items-center gap-2 mt-4"
               style={{ animation: 'fade-in-up 600ms ease-out both', animationDelay: '400ms' }}>
            <span className="font-dm text-xs text-text-muted">scroll to explore</span>
            <ChevronDown
              size={16}
              className="text-text-muted"
              style={{ animation: 'bounce-arrow 2s ease-in-out infinite' }}
            />
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-surface border-y border-border-subtle" style={{ height: 72 }}>
        <div className="flex items-center justify-center h-full gap-16">
          <div className="flex flex-col items-center">
            <span className="font-mono font-bold text-2xl text-text-primary">9</span>
            <span className="font-dm text-xs text-text-muted uppercase tracking-widest">Live Signals</span>
          </div>
          <div className="w-px h-8 bg-border-subtle" />
          <div className="flex flex-col items-center">
            <span className="font-mono font-bold text-2xl text-text-primary">500ms</span>
            <span className="font-dm text-xs text-text-muted uppercase tracking-widest">Update Rate</span>
          </div>
          <div className="w-px h-8 bg-border-subtle" />
          <div className="flex flex-col items-center">
            <span className="font-mono font-bold text-2xl text-text-primary">100%</span>
            <span className="font-dm text-xs text-text-muted uppercase tracking-widest">Local &amp; Private</span>
          </div>
        </div>
      </section>

      {/* ── Signals Grid ── */}
      <section className="bg-base py-24 px-16">
        <div className="max-w-5xl mx-auto">
          <p className="font-dm text-xs text-text-muted tracking-widest uppercase mb-3">Monitoring</p>
          <h2 className="font-syne font-bold text-4xl text-text-primary mb-3">What We Monitor</h2>
          <p className="font-dm text-text-secondary mb-12 max-w-xl">
            Every signal is calibrated against your personal baseline. Your normal is not someone else's normal.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {signals.map(({ name, icon: Icon, desc }) => (
              <div
                key={name}
                className="bg-surface border border-border-subtle rounded-2xl p-6 hover:bg-elevated hover:border-border-default transition-all duration-200 cursor-default"
              >
                <Icon size={24} className="text-text-secondary mb-4" />
                <h3 className="font-syne font-bold text-text-primary">{name}</h3>
                <p className="font-dm text-sm text-text-secondary leading-relaxed mt-2">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="bg-void py-24 px-16">
        <div className="max-w-5xl mx-auto">
          <p className="font-dm text-xs text-text-muted tracking-widest uppercase mb-3">Process</p>
          <h2 className="font-syne font-bold text-4xl text-text-primary mb-16 text-center">How It Works</h2>
          <div className="flex items-start justify-center gap-0">
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-start">
                <div className="flex flex-col items-center max-w-xs text-center px-6">
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-border-active"
                  >
                    <span className="font-mono font-bold text-text-primary text-sm">{step.num}</span>
                  </div>
                  <h3 className="font-syne font-bold text-text-primary mt-4">{step.title}</h3>
                  <p className="font-dm text-sm text-text-secondary mt-2 leading-relaxed">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="flex-1 border-t-2 border-dashed border-border-subtle mt-6 min-w-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-void border-t border-border-subtle py-8 px-16">
        <div className="max-w-5xl mx-auto grid grid-cols-3 items-center">
          <div className="flex items-center gap-3">
            <Eye size={16} className="text-accent" />
            <span className="font-syne font-bold text-text-primary text-sm">GazeAware</span>
          </div>
          <p className="font-dm text-xs text-text-muted text-center">
            Built at SZABIST Karachi by Sameer Ahmed &amp; Muhammad Ahmed Rayyan
          </p>
          <div className="flex justify-end">
            <a
              href="https://github.com/SameerAhmedAI/GazeAware"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-dm text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              <ExternalLink size={14} />
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
