'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'

interface NavBatchItem {
  session_id: string | null
  user_id: string | null
  funcionario_id: string | null
  pathname: string
  page_title: string
  opened_at: string
  closed_at: string | null
  duration_seconds: number
  ip_address: string | null
  user_agent: string | null
}

function normalizePath(rawPath: string): string {
  if (!rawPath) return '/'
  let path = rawPath.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
  path = path.replace(/\/(\d+)(?=\/|$)/g, '/[id]')
  return path
}

export function AccessTracker() {
  const pathname = usePathname()
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const activeSessionIdRef = useRef<string | null>(null)
  const userAuthIdRef = useRef<string | null>(null)
  const funcionarioIdRef = useRef<string | null>(funcionario?.id ?? null)
  const currentPathRef = useRef<string>(pathname)

  const pageOpenedAtRef = useRef<number>(Date.now())
  const activeSecondsRef = useRef<number>(0)
  const lastActiveTimestampRef = useRef<number>(Date.now())
  const isVisibleRef = useRef<boolean>(typeof document !== 'undefined' ? document.visibilityState === 'visible' : true)
  const isIdleRef = useRef<boolean>(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const queueRef = useRef<NavBatchItem[]>([])
  const isMounted = useRef<boolean>(true)

  useEffect(() => {
    funcionarioIdRef.current = funcionario?.id ?? null
  }, [funcionario?.id])

  useEffect(() => {
    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          activeSessionIdRef.current = session.access_token ? session.user.id + '_' + (session.expires_at || Date.now()) : session.user.id
          userAuthIdRef.current = session.user.id
        }
      } catch {
        // Absorver erro de checagem inicial de sessão
      }
    }
    loadSession()
  }, [supabase])

  const resetIdleTimer = useCallback(() => {
    isIdleRef.current = false
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true
    }, 300000)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleUserActivity = () => {
      if (isVisibleRef.current) {
        resetIdleTimer()
      }
    }

    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible'
      isVisibleRef.current = visible

      if (visible) {
        lastActiveTimestampRef.current = Date.now()
        resetIdleTimer()
      } else {
        const now = Date.now()
        const delta = Math.floor((now - lastActiveTimestampRef.current) / 1000)
        if (delta > 0 && !isIdleRef.current) {
          activeSecondsRef.current += delta
        }
      }
    }

    window.addEventListener('mousemove', handleUserActivity, { passive: true })
    window.addEventListener('keydown', handleUserActivity, { passive: true })
    window.addEventListener('touchstart', handleUserActivity, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    resetIdleTimer()

    return () => {
      window.removeEventListener('mousemove', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
      window.removeEventListener('touchstart', handleUserActivity)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer])

  const flushNavQueue = useCallback(async () => {
    if (queueRef.current.length === 0) return
    const batch = [...queueRef.current]
    queueRef.current = []

    try {
      const { error } = await (supabase as any).from('user_navigation_trail').insert(batch)
      if (error) {
        console.warn('[AccessTracker] Aviso ao salvar lote de navegação:', error.message)
      }
    } catch {
      // Absorção silenciosa
    }
  }, [supabase])

  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current) {
        flushNavQueue()
      }
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [flushNavQueue])

  useEffect(() => {
    const now = Date.now()
    const prevPath = currentPathRef.current
    const prevOpenedAt = new Date(pageOpenedAtRef.current).toISOString()

    let duration = activeSecondsRef.current
    if (isVisibleRef.current && !isIdleRef.current) {
      const delta = Math.floor((now - lastActiveTimestampRef.current) / 1000)
      if (delta > 0) duration += delta
    }

    if (prevPath && prevOpenedAt) {
      const item: NavBatchItem = {
        session_id: activeSessionIdRef.current,
        user_id: userAuthIdRef.current,
        funcionario_id: funcionarioIdRef.current,
        pathname: normalizePath(prevPath),
        page_title: typeof document !== 'undefined' ? document.title || prevPath : prevPath,
        opened_at: prevOpenedAt,
        closed_at: new Date(now).toISOString(),
        duration_seconds: Math.max(0, duration),
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }

      queueRef.current.push(item)
    }

    currentPathRef.current = pathname
    pageOpenedAtRef.current = now
    lastActiveTimestampRef.current = now
    activeSecondsRef.current = 0

    flushNavQueue()
  }, [pathname, flushNavQueue])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = () => {
      const now = Date.now()
      let duration = activeSecondsRef.current
      if (isVisibleRef.current && !isIdleRef.current) {
        const delta = Math.floor((now - lastActiveTimestampRef.current) / 1000)
        if (delta > 0) duration += delta
      }

      const item: NavBatchItem = {
        session_id: activeSessionIdRef.current,
        user_id: userAuthIdRef.current,
        funcionario_id: funcionarioIdRef.current,
        pathname: normalizePath(currentPathRef.current),
        page_title: typeof document !== 'undefined' ? document.title || currentPathRef.current : currentPathRef.current,
        opened_at: new Date(pageOpenedAtRef.current).toISOString(),
        closed_at: new Date(now).toISOString(),
        duration_seconds: Math.max(0, duration),
        ip_address: null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }

      if (navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify({ events: [item] })], { type: 'application/json' })
          navigator.sendBeacon('/api/admin/acessos/geolocate', blob)
        } catch {
          // Ignorar erro de beacon
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return null
}
