import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@store/auth'
import { apiService } from '@services/api'

/**
 * Hook de tracking de analytics.
 *
 * - Encola eventos y los envía en lotes cada 30s o cuando acumula 10.
 * - Heartbeat cada 60s mientras la pestaña está visible.
 * - Trackea cambios de ruta automáticamente.
 * - Flushea eventos restantes al cerrar la pestaña.
 */

const FLUSH_INTERVAL = 30_000 // 30 segundos
const BATCH_SIZE = 10
const HEARTBEAT_INTERVAL = 60_000 // 60 segundos

interface QueuedEvent {
  event_type: string
  details?: Record<string, unknown>
}

let sessionId = crypto.randomUUID()

export function useAnalytics() {
  const bufferRef = useRef<QueuedEvent[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ultimoPathRef = useRef<string>('')
  const startTimeRef = useRef<number>(Date.now())
  const { usuario } = useAuthStore()
  const ubicacion = useLocation()

  const flush = useCallback(async () => {
    const events = bufferRef.current
    if (events.length === 0 || !usuario) return
    bufferRef.current = []
    try {
      await apiService.trackEvents(events)
    } catch {
      // Silenciar errores de tracking
    }
  }, [usuario])

  const trackEvent = useCallback(
    (eventType: string, details: Record<string, unknown> = {}) => {
      if (!usuario) return
      bufferRef.current.push({ event_type: eventType, details })
      if (bufferRef.current.length >= BATCH_SIZE) {
        void flush()
      }
    },
    [usuario, flush]
  )

  // Flush periódico
  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      void flush()
    }, FLUSH_INTERVAL)
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current)
    }
  }, [flush])

  // Heartbeat
  useEffect(() => {
    if (!usuario) return

    const heartbeat = () => {
      if (document.hidden) return
      trackEvent('heartbeat', {
        session_id: sessionId,
        duration_seconds: Math.round((Date.now() - startTimeRef.current) / 1000),
      })
    }

    heartbeatTimerRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL)
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
    }
  }, [usuario, trackEvent])

  // Track page views on route change
  useEffect(() => {
    if (!usuario) return
    const path = ubicacion.pathname
    if (path === ultimoPathRef.current) return

    // Track duration on previous page
    if (ultimoPathRef.current) {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      trackEvent('page_view', { path: ultimoPathRef.current, duration_seconds: duration })
    }

    ultimoPathRef.current = path
    startTimeRef.current = Date.now()
  }, [ubicacion.pathname, usuario, trackEvent])

  // Flush on page close — fetch con keepalive para enviar auth headers
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (bufferRef.current.length > 0 && usuario) {
        const token = localStorage.getItem('authToken')
        if (!token) return
        const payload = JSON.stringify({ events: bufferRef.current })
        const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'}/analytics/event`
        // fetch con keepalive funciona como sendBeacon pero soporta headers
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: payload,
          keepalive: true,
        }).catch(() => {})
        bufferRef.current = []
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [usuario])

  return { trackEvent }
}
