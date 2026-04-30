/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm:   ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
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
          disabled:  '#2a2a3a',
        },
        accent:     '#e8e8f8',
        'accent-dim': '#9090b8',
        zone: {
          green:    '#10b981',
          yellow:   '#f59e0b',
          red:      '#ef4444',
          critical: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}
