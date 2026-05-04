import { useState, useEffect, useRef } from 'react'

const STRAIN_URL = 'ws://127.0.0.1:8000/ws/strain'
const SIGNALS_URL = 'ws://127.0.0.1:8000/ws/signals'

export function useGazeSocket() {
  const [strainData, setStrainData] = useState(null)
  const [signalsData, setSignalsData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  const strainWs = useRef(null)
  const signalsWs = useRef(null)
  const unmounted = useRef(false)
  const strainOpen = useRef(false)
  const signalsOpen = useRef(false)
  const lastStrainRef = useRef(null)
  const lastSignalRef = useRef(null)

  // Keepalive interval refs — send ping every 10s so server's receive_text() doesn't block
  const strainPingRef = useRef(null)
  const signalsPingRef = useRef(null)

  const updateConnected = () => {
    setIsConnected(strainOpen.current && signalsOpen.current)
  }

  const connectStrain = () => {
    if (unmounted.current) return
    try {
      const ws = new WebSocket(STRAIN_URL)
      strainWs.current = ws

      ws.onopen = () => {
        if (unmounted.current) { ws.close(); return }
        strainOpen.current = true
        updateConnected()
        console.log('[GazeSocket] /ws/strain connected')
        // Send initial ping so server's receive_text() unblocks
        ws.send('ping')
        // Keep sending every 10s
        strainPingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping')
        }, 10000)
      }

      ws.onmessage = (e) => {
        if (unmounted.current) return
        try {
          const data = JSON.parse(e.data)
          lastStrainRef.current = Date.now()
          setStrainData(data)
        } catch (_) { }
      }

      ws.onclose = () => {
        clearInterval(strainPingRef.current)
        if (unmounted.current) return
        strainOpen.current = false
        updateConnected()
        console.log('[GazeSocket] /ws/strain closed — reconnecting in 2s')
        setTimeout(connectStrain, 2000)
      }

      ws.onerror = () => {
        clearInterval(strainPingRef.current)
        ws.close()
      }
    } catch (err) {
      console.error('[GazeSocket] strain connect error:', err)
      setTimeout(connectStrain, 2000)
    }
  }

  const connectSignals = () => {
    if (unmounted.current) return
    try {
      const ws = new WebSocket(SIGNALS_URL)
      signalsWs.current = ws

      ws.onopen = () => {
        if (unmounted.current) { ws.close(); return }
        signalsOpen.current = true
        updateConnected()
        console.log('[GazeSocket] /ws/signals connected')
        ws.send('ping')
        signalsPingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping')
        }, 10000)
      }

      ws.onmessage = (e) => {
        if (unmounted.current) return
        try {
          const data = JSON.parse(e.data)
          lastSignalRef.current = Date.now()
          setSignalsData(data)
        } catch (_) { }
      }

      ws.onclose = () => {
        clearInterval(signalsPingRef.current)
        if (unmounted.current) return
        signalsOpen.current = false
        updateConnected()
        console.log('[GazeSocket] /ws/signals closed — reconnecting in 2s')
        setTimeout(connectSignals, 2000)
      }

      ws.onerror = () => {
        clearInterval(signalsPingRef.current)
        ws.close()
      }
    } catch (err) {
      console.error('[GazeSocket] signals connect error:', err)
      setTimeout(connectSignals, 2000)
    }
  }

  useEffect(() => {
    unmounted.current = false
    connectStrain()
    connectSignals()
    return () => {
      unmounted.current = true
      clearInterval(strainPingRef.current)
      clearInterval(signalsPingRef.current)
      strainWs.current?.close()
      signalsWs.current?.close()
    }
  }, [])

  return { strainData, signalsData, isConnected, lastStrainRef }
}