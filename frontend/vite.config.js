import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // REST endpoints
      '/session':    'http://localhost:8000',
      '/snapshot':   'http://localhost:8000',
      '/history':    'http://localhost:8000',
      '/report':     'http://localhost:8000',
      '/health':     'http://localhost:8000',
      '/controls':   'http://localhost:8000',
      '/video_feed': 'http://localhost:8000',
      // WebSocket — Fix 1: rewriteWsOrigin ensures the upgrade header is correct
      '/ws': {
        target:          'ws://localhost:8000',
        ws:              true,
        rewriteWsOrigin: true,
      },
    }
  }
})
