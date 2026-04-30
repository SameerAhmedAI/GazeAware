# GazeAware — UI Design Specification
**Version:** 1.0 | **Theme:** Dark Clinical Intelligence | **Stack:** React 18 + Vite + Tailwind CSS

---

## Design Philosophy

GazeAware sits at the intersection of medical technology and passive AI monitoring. The UI should feel like a **high-end clinical intelligence terminal** — the kind of interface a specialist would trust with biometric data. Not a consumer wellness app. Not a startup dashboard. A serious, precise, quietly impressive tool.

**Inspiration references (Dribbble):**
- Telecare Healthcare Dashboard (One Week Wonders) — dark clinical depth
- Medizinisch Healthcare Technology Concept — structured data hierarchy
- Aircraft Monitoring Web UI (Nixtio) — real-time data panels, status indicators
- Health Monitoring Dashboard (Awsmd) — signal visualization, metric density

**One thing someone will remember:** The live strain gauge — a glowing circular arc that breathes and pulses with your actual eye health in real time. Everything else supports this centrepiece.

---

## Typography

```
Display / Headings:    'Syne' (Google Fonts) — geometric, clinical authority
Body / UI Labels:      'DM Sans' (Google Fonts) — clean, modern, readable
Data / Numbers:        'JetBrains Mono' (Google Fonts) — monospace, precise
```

Import in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Usage rules:
- All headings: `font-syne font-bold`
- All UI text, labels, descriptions: `font-dm`
- All numbers, scores, values, timestamps: `font-mono` (JetBrains Mono)
- Hero headline: `font-syne font-extrabold text-7xl tracking-tight`
- Section titles: `font-syne font-bold text-2xl tracking-tight`
- Uppercase labels: `font-dm font-medium text-xs tracking-widest uppercase`

Add to `tailwind.config.js`:
```js
fontFamily: {
  syne: ['Syne', 'sans-serif'],
  dm: ['DM Sans', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
}
```

---

## Color System

### Base Palette (CSS Variables in `index.css`)

```css
:root {
  /* Backgrounds — layered depth */
  --bg-void:       #050507;   /* outermost page background */
  --bg-base:       #09090f;   /* main content background */
  --bg-surface:    #0f0f17;   /* card level 1 */
  --bg-elevated:   #14141e;   /* card level 2, hover states */
  --bg-overlay:    #1a1a26;   /* tooltips, dropdowns */

  /* Borders */
  --border-subtle: #1e1e2e;   /* default card borders */
  --border-default:#2a2a3d;   /* interactive borders */
  --border-active: #3d3d5c;   /* focused/active borders */

  /* Text */
  --text-primary:  #f0f0f8;   /* main readable text */
  --text-secondary:#8888aa;   /* supporting text */
  --text-muted:    #44445a;   /* labels, placeholders */
  --text-disabled: #2a2a3a;

  /* Accent — White/Cool */
  --accent:        #e8e8f8;   /* primary interactive accent */
  --accent-dim:    #9090b8;   /* secondary accent */
  --accent-glow:   rgba(232, 232, 248, 0.08);

  /* Strain Zones */
  --zone-green:    #10b981;   /* emerald-500 */
  --zone-green-bg: rgba(16, 185, 129, 0.08);
  --zone-green-border: rgba(16, 185, 129, 0.25);

  --zone-yellow:   #f59e0b;   /* amber-500 */
  --zone-yellow-bg: rgba(245, 158, 11, 0.08);
  --zone-yellow-border: rgba(245, 158, 11, 0.25);

  --zone-red:      #ef4444;   /* red-500 */
  --zone-red-bg:   rgba(239, 68, 68, 0.08);
  --zone-red-border: rgba(239, 68, 68, 0.25);

  --zone-critical: #dc2626;   /* red-600 */
  --zone-critical-bg: rgba(220, 38, 38, 0.12);
  --zone-critical-border: rgba(220, 38, 38, 0.4);

  /* Signal bar thresholds */
  --signal-low:    #10b981;   /* 0.0 – 0.39 */
  --signal-mid:    #f59e0b;   /* 0.40 – 0.69 */
  --signal-high:   #ef4444;   /* 0.70 – 1.0 */
}
```

### Tailwind Config Extension

```js
// tailwind.config.js
colors: {
  void:     '#050507',
  base:     '#09090f',
  surface:  '#0f0f17',
  elevated: '#14141e',
  overlay:  '#1a1a26',
  border: {
    subtle:  '#1e1e2e',
    default: '#2a2a3d',
    active:  '#3d3d5c',
  },
  text: {
    primary:   '#f0f0f8',
    secondary: '#8888aa',
    muted:     '#44445a',
  },
  accent: '#e8e8f8',
  zone: {
    green:    '#10b981',
    yellow:   '#f59e0b',
    red:      '#ef4444',
    critical: '#dc2626',
  }
}
```

---

## Card System

### Base Card (`GlassCard.jsx`)

```jsx
// Standard dark card — used everywhere
<div className="bg-surface border border-border-subtle rounded-2xl p-6">
  {children}
</div>
```

### Card Variants

```
Default:    bg-surface  border-border-subtle   rounded-2xl
Elevated:   bg-elevated border-border-default  rounded-2xl  (hover/active states)
Critical:   bg-[rgba(220,38,38,0.06)] border-zone-red/30 rounded-2xl  (alarm state)
Success:    bg-[rgba(16,185,129,0.06)] border-zone-green/30 rounded-2xl
Warning:    bg-[rgba(245,158,11,0.06)] border-zone-yellow/30 rounded-2xl
```

### Card Header Pattern

Every card has a consistent header:
```
[UPPERCASE LABEL]        [optional: live indicator dot]
Section Title
```

```jsx
<div className="flex items-center justify-between mb-6">
  <div>
    <p className="font-dm font-medium text-xs tracking-widest uppercase text-text-muted mb-1">
      {label}
    </p>
    <h3 className="font-syne font-bold text-lg text-text-primary">{title}</h3>
  </div>
  {/* optional right slot */}
</div>
```

---

## Layout System

### Sidebar Navigation

```
Width:        240px fixed left
Background:   bg-void (darkest layer)
Border:       border-r border-border-subtle
Top:          GazeAware logo + wordmark
Nav items:    full-width, left-aligned, with left indicator bar when active
Bottom:       version tag, GitHub link
```

**Nav item states:**
```
Default:  text-text-muted, no background
Hover:    bg-elevated, text-text-secondary, transition-all duration-200
Active:   bg-surface, text-text-primary, border-l-2 border-accent
```

**Logo treatment:**
```
Eye icon (Lucide) in text-accent + "GazeAware" in font-syne font-bold text-text-primary
Subtitle: "Eye Intelligence" in font-dm text-xs text-text-muted
```

### Main Content Area

```
Background:  bg-base
Padding:     p-8
Max-width:   none (fills available space)
Overflow:    auto (scrollable per page)
```

### Page Header (consistent across all app pages)

```jsx
<div className="mb-8">
  <p className="font-dm text-xs tracking-widest uppercase text-text-muted mb-2">{section}</p>
  <h1 className="font-syne font-bold text-3xl text-text-primary">{title}</h1>
  <p className="font-dm text-text-secondary mt-1">{description}</p>
</div>
```

---

## Animation System

### Keyframes (add to `index.css`)

```css
@keyframes pulse-critical {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
  50%       { box-shadow: 0 0 20px 4px rgba(220, 38, 38, 0.35); }
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.85); }
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

@keyframes scan-line {
  0%   { transform: translateY(-100%); opacity: 0; }
  10%  { opacity: 0.6; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(100vh); opacity: 0; }
}

@keyframes number-glow {
  0%, 100% { text-shadow: 0 0 0px rgba(240,240,248,0); }
  50%       { text-shadow: 0 0 24px rgba(240,240,248,0.4); }
}
```

### Motion Rules

```
Page entry:         fade-in-up, 300ms, staggered per section (delay: 0ms, 100ms, 200ms)
Data updates:       transition-all duration-500 ease-in-out (smooth WebSocket ticks)
Hover states:       transition-all duration-200
Critical state:     pulse-critical animation on card border, 2s infinite
Live dot:           pulse-live animation, 1.5s infinite
Score number:       number-glow when zone is RED or CRITICAL, 2s infinite
```

---

## Component Specifications

### StrainGauge.jsx

The hero component of the entire app.

```
Container:    280px × 280px, centered
Arc:          SVG, strokeWidth 12, rounded linecap
Arc radius:   110px (circumference ≈ 691px)
Background:   faint arc in border-default color (full 270° sweep)
Active arc:   fills proportionally (0% = empty, 100% = full 270°)
Arc color:    matches zone (green/yellow/red/critical)
Center:       score number font-mono font-bold text-6xl, zone color
Below score:  zone badge
Outer ring:   thin 1px ring in border-subtle
Critical:     outer ring pulses with pulse-critical keyframe

SVG arc implementation:
- Total arc: 270 degrees (starting from 135deg, ending at 45deg clockwise)
- strokeDasharray: circumference
- strokeDashoffset: circumference * (1 - score/100) * (270/360)
- CSS transition: stroke-dashoffset 500ms ease-in-out
```

### SignalBar.jsx

```
Layout:       label left, value right, bar full-width below
Label:        font-dm uppercase text-xs text-text-muted tracking-widest
Value:        font-mono text-sm text-text-primary
Bar track:    h-1.5 bg-elevated rounded-full w-full
Bar fill:     h-1.5 rounded-full, width = value * 100%, transition-all duration-500
Fill color:   green if <0.4, yellow if 0.40–0.69, red if ≥0.7
```

### ZoneBadge.jsx

```
Shape:    rounded-full pill
Padding:  px-3 py-1
Font:     font-dm font-medium text-xs tracking-widest uppercase

GREEN:    bg-zone-green/10 text-zone-green border border-zone-green/20
YELLOW:   bg-zone-yellow/10 text-zone-yellow border border-zone-yellow/20
RED:      bg-zone-red/10 text-zone-red border border-zone-red/20
CRITICAL: bg-zone-critical/15 text-zone-critical border border-zone-critical/30 + pulse-critical
```

### ConnectionStatus.jsx

```
Layout:   flex row, items-center, gap-2
Dot:      8px × 8px rounded-full
          Connected:    bg-zone-green + pulse-live animation
          Disconnected: bg-zone-red
Label:    font-dm text-xs
          Connected:    "LIVE" text-zone-green
          Disconnected: "DISCONNECTED" text-zone-red
```

### StatCard.jsx (for Weekly Report)

```
Layout:   GlassCard, flex col, icon top-right, value bottom-left
Icon:     Lucide icon, text-text-muted, 20px
Label:    uppercase muted label
Value:    font-mono font-bold text-3xl text-text-primary
Subtext:  optional small muted description
```

---

## Page Specifications

### Landing Page (`/`)

No sidebar. Standalone full-screen experience.

**Navbar:**
```
Position:   fixed top-0, full width, z-50
Background: bg-void/90 backdrop-blur-sm
Border:     border-b border-border-subtle
Height:     64px
Left:       Logo (Eye icon + GazeAware wordmark)
Right:      "Launch Dashboard" — bg-accent text-void rounded-xl px-5 py-2 font-dm font-medium
```

**Hero Section:**
```
Height:       100vh
Background:   bg-void
Center:       vertical + horizontal
Effects:      Two large radial gradient orbs — very subtle, barely visible
              Orb 1: top-left, rgba(232,232,248,0.04) radial
              Orb 2: bottom-right, rgba(16,185,129,0.03) radial
              Slow movement via CSS animation (20s infinite alternate ease-in-out)

Content stack (centered, max-w-3xl):
  1. Small label pill: "AI-Powered Eye Intelligence" — border border-border-default, font-dm text-xs text-text-muted px-4 py-1.5 rounded-full
  2. Headline: "Your Eyes Work Hard." — font-syne font-extrabold text-7xl text-text-primary leading-none tracking-tight
  3. Subheadline: font-dm text-xl text-text-secondary max-w-xl leading-relaxed
  4. Button row: "Launch Dashboard" (filled) + "View on GitHub" (ghost border)
  5. Scroll hint: small arrow down icon, animated bounce, text-text-muted

Animation: fade-in-up staggered, each element 100ms later than previous
```

**Stats Bar:**
```
Background:   bg-surface border-y border-border-subtle
Height:       72px
Content:      3 stats with vertical dividers between them
Layout:       flex row, justify-center, gap-16

Each stat:
  Number:  font-mono font-bold text-2xl text-text-primary
  Label:   font-dm text-xs text-text-muted uppercase tracking-widest
```

**Signals Grid:**
```
Background:   bg-base
Padding:      py-24 px-16
Heading:      "What We Monitor" — font-syne font-bold text-4xl text-text-primary
Subheading:   font-dm text-text-secondary
Grid:         3 columns, gap-4

Each signal card:
  Background:   bg-surface border border-border-subtle rounded-2xl p-6
  Hover:        bg-elevated border-border-default transition-all duration-200
  Icon:         Lucide icon, text-text-secondary, mb-4, 24px
  Name:         font-syne font-bold text-text-primary
  Description:  font-dm text-sm text-text-secondary leading-relaxed mt-2
```

**How It Works:**
```
Background:   bg-void
Padding:      py-24

Steps: horizontal row, 3 items connected by dashed lines
Each step:
  Number circle:  48px, border-2 border-border-active, font-mono font-bold text-text-primary
  Title:          font-syne font-bold text-text-primary mt-4
  Description:    font-dm text-sm text-text-secondary mt-2 max-w-xs

Connector:  dashed line between circles, border-t-2 border-dashed border-border-subtle, flex-1
```

**Footer:**
```
Background:   bg-void border-t border-border-subtle
Padding:      py-8 px-16
Layout:       3 columns — logo left, credits center, GitHub right
Credits:      font-dm text-xs text-text-muted "Built at SZABIST Karachi by Sameer Ahmed & Muhammad Ahmed Rayyan"
```

---

### Live Dashboard (`/dashboard`)

The most critical page. Professional real-time monitoring layout.

**Layout:** 3 sections stacked vertically

**Section 1 — Status Bar (full width):**
```
Card:     bg-surface border-border-subtle rounded-2xl px-6 py-4
Layout:   flex row, 3 groups separated by vertical dividers

Left group:
  Label:  "ACTIVE SESSION"
  Value:  "Session #{id}" font-mono text-text-primary
  Sub:    start time formatted as "Started HH:mm:ss" text-text-muted

Center group:
  Baseline status indicator
  If calibrating: pulsing yellow dot + "Calibrating Baseline..." text-zone-yellow
  If ready:       green dot + "Baseline Ready" text-zone-green

Right group:
  ConnectionStatus component
  Tick counter: "Tick #{n}" font-mono text-xs text-text-muted
```

**Section 2 — Main Grid (3 columns, ratio 1:1:1):**

*Column 1 — Strain Gauge:*
```
Card:     bg-surface, centered vertically and horizontally
Content:  StrainGauge component (280px)
Below:    ZoneBadge component
Below:    "Updated {n}ms ago" font-dm text-xs text-text-muted
```

*Column 2 — Stacked cards:*

Top — Crash Predictor:
```
Label:  "COGNITIVE CRASH PREDICTOR"
States:
  Stable:   Lucide TrendingDown icon text-zone-green + "Trajectory Stable" font-syne text-zone-green
            Confidence bar: thin, zone-green fill, low percentage
  Warning:  Lucide AlertTriangle text-zone-yellow pulsing
            "CRASH IMMINENT" font-syne font-bold text-zone-yellow
            Countdown: font-mono text-4xl text-zone-yellow "~42s"
            Confidence: "83% confidence" with bar fill
```

Bottom — TFSI Stability:
```
Label:  "TEAR FILM STABILITY INDEX"
Value:  large font-mono percentage, colored by level
Bar:    horizontal stability bar (same as SignalBar but wider, h-2)
Status: auto-trigger badge if fired — small "AUTO-ALERT" pill in zone-red
```

*Column 3 — Active Prescription:*
```
Card full height of column
Label:  "AI PRESCRIPTION ENGINE"
States:
  Clear:  Lucide CheckCircle2 text-zone-green (32px) centered
          "No intervention required" font-syne text-text-secondary
          "All signals nominal" font-dm text-sm text-text-muted

  Active: Card variant switches to Warning card styling
          Prescription text: font-syne font-bold text-lg text-text-primary uppercase leading-relaxed
          Timestamp: font-mono text-xs text-text-muted mt-4
          Animated left border: 3px solid zone-yellow, pulsing opacity
```

**Section 3 — Signal Monitor (full width):**
```
Card:   bg-surface
Label:  "LIVE SIGNAL MONITOR"
Layout: 3 columns grid of SignalBar components
Below:  Supplementary readings row (lighting score, distance drift)
        Each: label + font-mono value in a small surface pill
```

---

### Session History (`/history`)

**Charts styling (all Recharts):**
```
Background:       bg-surface (set on the wrapping div, not chart itself)
CartesianGrid:    stroke="#1e1e2e"
Axis ticks:       fill="#44445a" fontFamily="JetBrains Mono" fontSize={11}
Tooltip:          contentStyle={{ background: '#14141e', border: '1px solid #2a2a3d', borderRadius: '8px', fontFamily: 'DM Sans' }}
```

**Strain Timeline:**
```
Type:         LineChart, height 280px
Line:         stroke="#e8e8f8" strokeWidth={2} dot={false}
References:   y=50 stroke="#f59e0b" strokeDasharray="4 4"
              y=70 stroke="#ef4444" strokeDasharray="4 4"
```

**Signal Breakdown:**
```
Type:         AreaChart, height 220px
blink_rate:   stroke="#e8e8f8" fill="rgba(232,232,248,0.08)"
blink_quality:stroke="#8888aa" fill="rgba(136,136,170,0.06)"
squint_ratio: stroke="#44445a" fill="rgba(68,68,90,0.05)"
```

**Prescription Log Table:**
```
Header row:   bg-void, font-dm uppercase text-xs text-text-muted tracking-widest
Data rows:    bg-surface hover:bg-elevated transition-colors duration-150
              border-b border-border-subtle
              font-dm text-sm text-text-primary
Recovered:    Lucide CheckCircle2 text-zone-green / XCircle text-zone-red
```

---

### Acuity Test (`/acuity`)

**Latest result hero card:**
```
Large centered display:
  Snellen fraction: font-mono font-bold text-6xl, colored by result
  Interpretation label below: ZoneBadge variant
  Test date: font-dm text-xs text-text-muted
```

**Results table:** Same dark table pattern as History page.

**Trend chart:** Same LineChart styling, reference line at y=1.0 (20/20) dashed white.

---

### Weekly Report (`/report`)

**Degradation Risk Banner:**
```
Stable:   bg-zone-green/5 border border-zone-green/20 rounded-2xl p-6
          Lucide ShieldCheck text-zone-green text-2xl
          "No Degradation Risk Detected" font-syne font-bold text-zone-green

At Risk:  bg-zone-red/5 border border-zone-red/20 rounded-2xl p-6
          Lucide AlertOctagon text-zone-red pulsing
          "Vision Degradation Risk Detected" font-syne font-bold text-zone-red
          Summary text below in text-text-secondary
```

**4 Stat Cards:** Use `StatCard.jsx` component, row of 4.

**Weekly Bar Chart:**
```
Type:       BarChart, height 240px
Bar fill:   conditional — <50 zone-green, 50–70 zone-yellow, >70 zone-red
Same dark styling as other charts
```

---

## Loading, Empty & Error States

### Loading Spinner
```jsx
<div className="flex flex-col items-center justify-center h-64 gap-4">
  <div className="w-10 h-10 rounded-full border-2 border-border-default border-t-accent animate-spin" />
  <p className="font-dm text-sm text-text-muted">Loading...</p>
</div>
```

### Empty State
```jsx
<div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
  <LucideIcon className="text-text-muted" size={32} />
  <p className="font-syne font-bold text-text-secondary">{title}</p>
  <p className="font-dm text-sm text-text-muted max-w-xs">{description}</p>
</div>
```

### Error State
```jsx
<div className="bg-zone-red/5 border border-zone-red/20 rounded-2xl p-6 flex items-start gap-4">
  <AlertCircle className="text-zone-red mt-0.5 shrink-0" size={20} />
  <div>
    <p className="font-syne font-bold text-text-primary">{error}</p>
    <button onClick={retry} className="mt-3 font-dm text-sm text-accent underline">
      Try again
    </button>
  </div>
</div>
```

---

## Responsive Rules

Minimum supported width: **1280px** (desktop monitoring app).

Sidebar collapses to icon-only at 1280px if needed but stays visible.
Dashboard grid: 3 columns at ≥1440px, 2+1 stacked at 1280–1439px.

---

## File Checklist

```
frontend/
├── index.html                          ← Google Fonts import
├── tailwind.config.js                  ← extended colors, fontFamily
├── vite.config.js                      ← proxy to localhost:8000
├── src/
│   ├── index.css                       ← CSS variables, keyframes, base styles
│   ├── main.jsx
│   ├── App.jsx                         ← React Router config
│   ├── components/
│   │   ├── GlassCard.jsx
│   │   ├── StrainGauge.jsx
│   │   ├── SignalBar.jsx
│   │   ├── ZoneBadge.jsx
│   │   ├── ConnectionStatus.jsx
│   │   └── StatCard.jsx
│   ├── hooks/
│   │   └── useGazeSocket.js
│   ├── services/
│   │   └── api.js
│   ├── layouts/
│   │   └── AppLayout.jsx
│   └── pages/
│       ├── Landing.jsx
│       ├── Dashboard.jsx
│       ├── History.jsx
│       ├── Acuity.jsx
│       └── Report.jsx
```

---

## Do Not List

- No Inter, Roboto, Arial, or system fonts anywhere
- No purple gradients or generic "AI aesthetic" color schemes
- No white backgrounds anywhere in the app
- No Bootstrap or MUI — Tailwind only
- No inline styles — CSS variables + Tailwind classes only
- No placeholder/hardcoded data — everything from API or WebSocket
- No border-radius below 8px on cards — keep it refined, not boxy
- No emojis in the app UI (landing page text only if used sparingly)

---