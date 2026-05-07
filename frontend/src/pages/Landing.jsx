import { Link } from 'react-router-dom'
import { Eye, Activity, Shield, Zap, TrendingDown, MonitorSmartphone, Move, Clock, Brain, Sun, Ruler, ArrowRight, CheckCircle } from 'lucide-react'

/* ─── accent token ─────────────────────────────────────────────────────────── */
const ACCENT = '#ADD8E6'
const ACCENT_DIM = 'rgba(0,255,136,0.18)'
const ACCENT_BORDER = 'rgba(0,255,136,0.28)'
const ACCENT_GLOW = 'rgba(0,255,136,0.10)'

/* ─── signal colours (cycles through a small palette) ──────────────────────── */
const CARD_ACCENTS = [
  '#00ff88', '#00d4ff', '#a78bfa', '#f59e0b',
  '#f472b6', '#34d399', '#60a5fa', '#fb7185', '#fbbf24',
]

const SIGNALS = [
  { icon: Eye, label: 'Blink Rate', desc: 'Monitors blink frequency to detect dry-eye onset and fatigue accumulation.' },
  { icon: Activity, label: 'Blink Quality', desc: 'Classifies partial vs. full blinks using EAR trough depth analysis.' },
  { icon: TrendingDown, label: 'Blink Irregularity', desc: 'Measures inter-blink interval variance — high variance signals deep fatigue.' },
  { icon: Ruler, label: 'Screen Distance', desc: 'Estimates face-to-screen distance via MediaPipe depth geometry.' },
  { icon: Move, label: 'Squint Detector', desc: 'Detects sustained squinting using eye aperture ratio over rolling windows.' },
  { icon: Brain, label: 'Gaze Entropy', desc: 'Quantifies gaze randomness — low entropy means fixation lock and strain.' },
  { icon: Shield, label: 'Eye Rubbing', desc: 'Detects hand proximity to eyes via MediaPipe Hands landmark tracking.' },
  { icon: MonitorSmartphone, label: 'Posture Lean', desc: 'Tracks forward head lean from facial vertical displacement patterns.' },
  { icon: Sun, label: 'Scleral Redness', desc: 'Analyses HSV color around iris region to detect vascular irritation.' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Webcam Capture', desc: '30 FPS webcam input processed by MediaPipe Face Mesh — 468 facial landmarks tracked in real time. No video is ever stored or uploaded. All processing runs entirely on your local CPU with zero cloud dependency.' },
  { step: '02', title: 'Signal Fusion', desc: '11 simultaneous eye, behavioral, and environmental signals — including blink rate, blink quality, squint detection, posture drift, ambient lighting, gaze entropy, and tear-film stability — fused with calibrated weights into a live 0–100 strain score updated every 500ms.' },
  { step: '03', title: 'Smart Response', desc: 'AI prescriptions powered by Local LLM TinyLlama 1.1B fire automatically when strain is elevated. On-demand Digital Visual Acuity tests track long-term vision health. Weekly strain reports deliver personalized ergonomic recommendations. Everything stays 100% local.' },
]

/* ─── inline style helpers ─────────────────────────────────────────────────── */
const NAV_STYLE = {
  background: 'rgba(5,5,7,0.85)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

const HERO_SECTION = {
  minHeight: '100vh',
  paddingTop: '106px',
  paddingBottom: '80px',
  position: 'relative',
  overflow: 'hidden',
}

/* Radial glow blobs injected as pseudo-elements via inline style on divs */
const GLOW_BLOB_L = {
  position: 'absolute',
  top: '15%',
  left: '-10%',
  width: '560px',
  height: '560px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(0,255,136,0.07) 0%, transparent 70%)',
  pointerEvents: 'none',
}
const GLOW_BLOB_R = {
  position: 'absolute',
  top: '25%',
  right: '-12%',
  width: '500px',
  height: '500px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
  pointerEvents: 'none',
}
const GLOW_CENTER = {
  position: 'absolute',
  top: '55%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '800px',
  height: '300px',
  borderRadius: '50%',
  background: 'radial-gradient(ellipse, rgba(0,255,136,0.04) 0%, transparent 65%)',
  pointerEvents: 'none',
}

/* ─── Eye-scan SVG ring decoration ─────────────────────────────────────────── */
function EyeScanRing() {
  return (
    <svg
      width="340" height="340" viewBox="0 0 340 340"
      style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-52%)', opacity: 0.045, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <circle cx="170" cy="170" r="160" fill="none" stroke={ACCENT} strokeWidth="1" strokeDasharray="6 10" />
      <circle cx="170" cy="170" r="130" fill="none" stroke={ACCENT} strokeWidth="0.6" strokeDasharray="2 14" />
      <circle cx="170" cy="170" r="96" fill="none" stroke={ACCENT} strokeWidth="0.5" />
      {/* crosshair lines */}
      <line x1="10" y1="170" x2="80" y2="170" stroke={ACCENT} strokeWidth="0.7" />
      <line x1="260" y1="170" x2="330" y2="170" stroke={ACCENT} strokeWidth="0.7" />
      <line x1="170" y1="10" x2="170" y2="80" stroke={ACCENT} strokeWidth="0.7" />
      <line x1="170" y1="260" x2="170" y2="330" stroke={ACCENT} strokeWidth="0.7" />
      {/* corner brackets */}
      <path d="M 50 30 L 30 30 L 30 50" fill="none" stroke={ACCENT} strokeWidth="1.2" />
      <path d="M 290 30 L 310 30 L 310 50" fill="none" stroke={ACCENT} strokeWidth="1.2" />
      <path d="M 50 310 L 30 310 L 30 290" fill="none" stroke={ACCENT} strokeWidth="1.2" />
      <path d="M 290 310 L 310 310 L 310 290" fill="none" stroke={ACCENT} strokeWidth="1.2" />
    </svg>
  )
}

/* ─── Signal card ───────────────────────────────────────────────────────────── */
function SignalCard({ icon: Icon, label, desc, accent }) {
  const handleEnter = e => {
    e.currentTarget.style.transform = 'translateY(-6px)'
    e.currentTarget.style.borderColor = accent
    e.currentTarget.style.boxShadow = `0 8px 32px ${accent}22, 0 0 0 1px ${accent}18`
    e.currentTarget.style.background = 'rgba(255,255,255,0.045)'
  }
  const handleLeave = e => {
    e.currentTarget.style.transform = ''
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
    e.currentTarget.style.boxShadow = 'none'
    e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
  }
  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        borderRadius: '18px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        /* colored top-border accent line via box-shadow inset */
        boxShadow: 'none',
      }}
    >
      {/* Colored top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '2px',
        background: `linear-gradient(90deg, ${accent}, transparent)`,
        borderRadius: '18px 18px 0 0',
      }} />

      {/* Icon */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
      }}>
        <Icon size={18} style={{ color: accent }} />
      </div>

      <div>
        <div style={{
          fontSize: '13px', fontWeight: 600, marginBottom: '6px',
          fontFamily: 'var(--font-syne)', color: 'var(--text-primary)',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '12px', lineHeight: '1.65',
          color: 'var(--text-muted)', fontFamily: 'var(--font-dm)',
        }}>
          {desc}
        </div>
      </div>
    </div>
  )
}

/* ─── How-It-Works step ─────────────────────────────────────────────────────── */
function HowStep({ step, title, desc, delay, isLast }) {
  return (
    <div style={{
      flex: 1, minWidth: '220px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '20px', textAlign: 'center',
      animation: 'fade-in-up 0.5s ease-out both',
      animationDelay: delay,
    }}>
      {/* Number badge row */}
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(circle, ${ACCENT_DIM}, rgba(0,255,136,0.04))`,
          border: `1.5px solid ${ACCENT_BORDER}`,
          flexShrink: 0,
          boxShadow: `0 0 16px ${ACCENT_GLOW}`,
          margin: '0 auto',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700,
            color: ACCENT, letterSpacing: '-0.5px',
          }}>
            {step}
          </span>
        </div>
        {/* Connector line to next step */}
        {!isLast && (
          <div style={{
            flex: 1, height: '1.5px',
            background: `linear-gradient(90deg, ${ACCENT_BORDER} 0%, rgba(0,255,136,0.04) 100%)`,
          }} />
        )}
      </div>

      <h3 style={{
        fontSize: '18px', fontWeight: 700, margin: '4px 0 0',
        fontFamily: 'var(--font-syne)', color: 'var(--text-primary)',
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '15px', lineHeight: '1.8', margin: 0,
        color: 'var(--text-secondary)', fontFamily: 'var(--font-dm)',
      }}>
        {desc}
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════ */
export default function Landing() {
  return (
    <div style={{ background: 'var(--bg-void)', minHeight: '100vh', color: 'var(--text-primary)' }}>

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          ...NAV_STYLE,
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '68px',
          paddingLeft: '24px',
          paddingRight: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${ACCENT}18`,
            border: `1px solid ${ACCENT_BORDER}`,
            flexShrink: 0,
          }}>
            <Eye size={15} style={{ color: ACCENT }} />
          </div>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
            GazeAware
          </span>
        </div>

        <Link
          to="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'var(--font-dm)', fontSize: '14px', fontWeight: 500,
            padding: '9px 20px',
            borderRadius: '12px',
            background: `${ACCENT}12`,
            color: ACCENT,
            border: `1px solid ${ACCENT_BORDER}`,
            textDecoration: 'none',
            transition: 'background 0.2s, box-shadow 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${ACCENT}22`; e.currentTarget.style.boxShadow = `0 0 16px ${ACCENT}28` }}
          onMouseLeave={e => { e.currentTarget.style.background = `${ACCENT}12`; e.currentTarget.style.boxShadow = 'none' }}
        >
          Launch Dashboard <ArrowRight size={14} />
        </Link>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        className="flex flex-col items-center justify-center text-center px-6 animate-fade-in-up"
        style={HERO_SECTION}
      >
        {/* Background glows */}
        <div style={GLOW_BLOB_L} />
        <div style={GLOW_BLOB_R} />
        <div style={GLOW_CENTER} />
        {/* Eye-scan SVG ring */}
        <EyeScanRing />

        {/* Content — sits above blobs */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            padding: '7px 18px', borderRadius: '999px',
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            background: `${ACCENT}0e`,
            border: `1px solid ${ACCENT_BORDER}`,
            color: ACCENT,
            marginBottom: '36px',
            boxShadow: `0 0 20px ${ACCENT}14`,
          }}>
            {/* Pulse dot */}
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: ACCENT,
              boxShadow: `0 0 6px ${ACCENT}`,
              animation: 'pulse-live 1.5s infinite',
              flexShrink: 0,
            }} />
            REAL-TIME · 100% LOCAL · AI-POWERED
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-syne)',
              fontSize: 'clamp(48px, 8vw, 96px)',
              fontWeight: 800,
              lineHeight: 1.05,
              marginBottom: '10px',
              background: 'linear-gradient(135deg, #f0f0f8 0%, #00ff88 60%, #00d4ff 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Your Eyes Work Hard.
          </h1>

          {/* Sub-headline */}
          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 21px)',
            fontFamily: 'var(--font-dm)',
            fontWeight: 300,
            color: 'var(--text-secondary)',
            maxWidth: '560px',
            lineHeight: 1.7,
            marginBottom: '48px',
          }}>
            GazeAware tracks <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>9 live biometric signals</strong> from your webcam and tells you exactly when your eyes need a break — before they burn out.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'center' }}>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 font-semibold transition-all duration-200"
              style={{
                fontFamily: 'var(--font-dm)',
                padding: '14px 32px', borderRadius: '16px',
                background: ACCENT,
                color: '#050507',
                fontSize: '15px',
                fontWeight: 700,
                boxShadow: `0 4px 28px ${ACCENT}44`,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 40px ${ACCENT}60` }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 28px ${ACCENT}44` }}
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <button
              onClick={() => {
                const section = document.getElementById('stats-section');
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="flex items-center gap-2 font-semibold transition-all duration-200"
              style={{
                fontFamily: 'var(--font-dm)',
                padding: '14px 32px', borderRadius: '16px',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '15px',
                border: '1px solid var(--border-default)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT_BORDER; e.currentTarget.style.background = `${ACCENT}0a`; e.currentTarget.style.color = ACCENT }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)' }}
            >
              <Eye size={16} /> Learn More
            </button>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <section id="stats-section" style={{
        padding: '28px 32px',
        borderTop: '1px solid rgba(0,255,136,0.10)',
        borderBottom: '1px solid rgba(0,255,136,0.10)',
        background: 'linear-gradient(180deg, rgba(0,255,136,0.03) 0%, transparent 100%)',
      }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'center', gap: '48px',
        }}>
          {[
            { value: '9', label: 'Biometric Signals' },
            { value: '500ms', label: 'Refresh Rate' },
            { value: '100%', label: 'Local Processing' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '30px', fontWeight: 700,
                color: ACCENT,
                textShadow: `0 0 20px ${ACCENT}60`,
              }}>
                {s.value}
              </span>
              <span style={{ fontFamily: 'var(--font-dm)', fontSize: '13px', color: 'var(--text-muted)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Signals grid ────────────────────────────────────────────────────── */}
      <section style={{ padding: '96px 32px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle section glow */}
        <div style={{
          position: 'absolute', bottom: '-100px', left: '50%', transform: 'translateX(-50%)',
          width: '700px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,212,255,0.04) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: '1060px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{
              fontFamily: 'var(--font-syne)', fontSize: '36px', fontWeight: 800,
              color: 'var(--text-primary)', marginBottom: '12px',
            }}>
              9 Signals.{' '}
              <span style={{ color: ACCENT }}>One Score.</span>
            </h2>
            <p style={{ fontFamily: 'var(--font-dm)', color: 'var(--text-secondary)', fontSize: '15px' }}>
              Every signal processed locally — no cloud, no uploads, no compromises.
            </p>
          </div>

          {/* 3-col grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '16px',
          }}>
            {SIGNALS.map(({ icon, label, desc }, i) => (
              <SignalCard
                key={label}
                icon={icon}
                label={label}
                desc={desc}
                accent={CARD_ACCENTS[i % CARD_ACCENTS.length]}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────────── */}
      <section style={{
        padding: '80px 32px 88px',
        background: 'linear-gradient(180deg, rgba(0,255,136,0.025) 0%, rgba(0,0,0,0) 100%)',
        borderTop: '1px solid rgba(0,255,136,0.08)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ maxWidth: '1020px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-syne)', fontSize: '36px', fontWeight: 800,
            textAlign: 'center', marginBottom: '72px', color: 'var(--text-primary)',
          }}>
            How It <span style={{ color: ACCENT }}>Works</span>
          </h2>

          {/* Steps row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', alignItems: 'flex-start', justifyContent: 'center' }}>
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <HowStep
                key={step}
                step={step}
                title={title}
                desc={desc}
                delay={`${i * 0.15}s`}
                isLast={i === HOW_IT_WORKS.length - 1}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 32px' }}>
        <div style={{
          maxWidth: '700px', margin: '0 auto',
          borderRadius: '28px',
          padding: '64px 48px',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px',
          background: `linear-gradient(145deg, rgba(0,255,136,0.06) 0%, rgba(0,212,255,0.03) 100%)`,
          border: `1.5px solid ${ACCENT_BORDER}`,
          boxShadow: `0 0 60px ${ACCENT}0f, inset 0 0 60px rgba(0,255,136,0.03)`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Corner glow */}
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: '220px', height: '220px', borderRadius: '50%',
            background: `radial-gradient(circle, ${ACCENT}14, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          {/* Icon */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${ACCENT}18`,
            border: `1.5px solid ${ACCENT_BORDER}`,
            boxShadow: `0 0 24px ${ACCENT}28`,
          }}>
            <CheckCircle size={34} style={{ color: ACCENT }} />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-syne)', fontSize: '32px', fontWeight: 800,
            color: 'var(--text-primary)',
          }}>
            Start Monitoring Now
          </h2>
          <p style={{
            fontFamily: 'var(--font-dm)', color: 'var(--text-secondary)',
            maxWidth: '380px', fontSize: '15px', lineHeight: '1.7',
          }}>
            The backend is already running. Open the dashboard to see live strain scores instantly.
          </p>

          <Link
            to="/dashboard"
            className="flex items-center gap-2 font-semibold transition-all duration-200"
            style={{
              fontFamily: 'var(--font-dm)',
              padding: '14px 36px', borderRadius: '16px',
              background: ACCENT,
              color: '#050507',
              fontSize: '15px', fontWeight: 700,
              boxShadow: `0 4px 28px ${ACCENT}44`,
              marginTop: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 48px ${ACCENT}66` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 28px ${ACCENT}44` }}
          >
            Launch Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,255,136,0.015)',
      }}>
        {/* ── Main footer columns ── */}
        <div style={{
          maxWidth: '1060px', margin: '0 auto',
          padding: '56px 32px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '40px',
        }}>

          {/* LEFT — Brand block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${ACCENT}18`, border: `1px solid ${ACCENT_BORDER}`, flexShrink: 0,
              }}>
                <Eye size={14} style={{ color: ACCENT }} />
              </div>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                GazeAware
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-dm)', fontSize: '12px', lineHeight: '1.75', color: 'var(--text-muted)', maxWidth: '240px' }}>
              AI-powered passive eye strain monitor. Webcam only. Fully local. Zero wearables.
            </p>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: ACCENT, letterSpacing: '0.04em' }}>
              Built at SZABIST, Karachi
            </span>
          </div>

          {/* MIDDLE — Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Navigation
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Dashboard', to: '/dashboard' },
                { label: 'History',   to: '/history'   },
                { label: 'Acuity Test', to: '/acuity'  },
                { label: 'Weekly Report', to: '/report' },
              ].map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  style={{
                    fontFamily: 'var(--font-dm)', fontSize: '13px',
                    color: 'var(--text-secondary)', textDecoration: 'none',
                    transition: 'color 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = ACCENT }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* RIGHT — Project info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Project
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {['Python 3.11+', 'MediaPipe', 'OpenCV', 'FastAPI', 'React', 'TinyLlama 1.1B'].map(item => (
                <span key={item} style={{ fontFamily: 'var(--font-dm)', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  · {item}
                </span>
              ))}
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.04em',
              color: ACCENT, marginTop: '4px',
            }}>
              100% Local Processing · No Data Uploaded
            </span>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '18px 32px',
          maxWidth: '1060px', margin: '0 auto',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: '10px',
        }}>
          <span style={{ fontFamily: 'var(--font-dm)', fontSize: '12px', color: 'var(--text-muted)' }}>
            © 2025 GazeAware — SZABIST, Karachi
          </span>
          <a
            href="https://github.com/sameerahmedai/GazeAware"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              fontFamily: 'var(--font-dm)', fontSize: '12px',
              color: ACCENT, textDecoration: 'none',
              transition: 'color 0.18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.color = ACCENT }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GITHUB
          </a>
        </div>
      </footer>
    </div>
  )
}
