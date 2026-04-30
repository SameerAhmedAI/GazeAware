import { useState, useEffect, useRef } from 'react'

/**
 * Fix 1: useGazeSocket — accepts a path ('strain' | 'signals') and builds
 * the WebSocket URL relative to window.location.host so Vite's proxy handles it.
 */
export function useGazeSocket(path) {
  const [data, setData]           = useState(null)
  const [connected, setConnected] = useState(false)
  const wsRef    = useRef(null)
  const retryRef = useRef(null)

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const url      = `${protocol}//${window.location.host}/ws/${path}`
      const ws       = new WebSocket(url)
      wsRef.current  = ws

      ws.onopen = () => {
        console.log(`[GazeSocket] Connected → /ws/${path}`)
        setConnected(true)
      }

      ws.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data)
          setData(parsed)
        } catch (err) {
          console.error('[GazeSocket] Parse error:', err)
        }
      }

      ws.onclose = () => {
        console.log(`[GazeSocket] Disconnected from /ws/${path} — retry in 2s`)
        setConnected(false)
        retryRef.current = setTimeout(connect, 2000)
      }

      ws.onerror = (err) => {
        console.error(`[GazeSocket] Error on /ws/${path}:`, err)
        ws.close()
      }
    }

    connect()

    return () => {
      clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [path])

  return { data, connected }
}
