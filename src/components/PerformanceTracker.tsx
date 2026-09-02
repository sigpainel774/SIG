'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useReportWebVitals } from 'next/web-vitals'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0]

interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
}
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

interface PendingNavigation {
  startTime: number
  targetPath: string
  timeoutId: ReturnType<typeof setTimeout>
}

function getConnectionType(): string | null {
  if (typeof navigator === 'undefined') return null
  const nav = navigator as NavigatorWithConnection
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection
  return conn?.effectiveType ?? null
}

function getDeviceMemory(): number | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null
}

function getHardwareConcurrency(): number | null {
  if (typeof navigator === 'undefined') return null
  return navigator.hardwareConcurrency ?? null
}

// Helper para normalizar parâmetros dinâmicos e UUIDs no caminho da URL
function normalizePathname(rawPath: string): string {
  if (!rawPath) return '/'
  // Substituir UUIDs por [id]
  let path = rawPath.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
  // Substituir IDs numéricos por [id]
  path = path.replace(/\/(\d+)(?=\/|$)/g, '/[id]')
  return path
}

export function PerformanceTracker() {
  const pathname = usePathname()
  const supabase = createClient()
  const { funcionario, escolaAtivaId } = useAuthStore()

  const isMounted = useRef(true)
  const pendingNavigationRef = useRef<PendingNavigation | null>(null)
  const prevPathnameRef = useRef<string | null>(null)

  // Armazenar referências mutáveis para evitar dependências instáveis nos efeitos
  const funcionarioRef = useRef(funcionario)
  const escolaAtivaIdRef = useRef(escolaAtivaId)

  useEffect(() => {
    funcionarioRef.current = funcionario
    escolaAtivaIdRef.current = escolaAtivaId
  }, [funcionario, escolaAtivaId])

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
      if (pendingNavigationRef.current?.timeoutId) {
        clearTimeout(pendingNavigationRef.current.timeoutId)
      }
    }
  }, [])

  // Capturar intenções de navegação em memória com expiração de 10s e filtros anti-contaminação
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const handleClick = (e: MouseEvent) => {
      // Ignorar botões secundários, atalhos de navegação e eventos já prevenidos
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.defaultPrevented) return

      const target = e.target as HTMLElement
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return

      // Ignorar links de abertura em nova guia e downloads
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return

      try {
        const url = new URL(href, window.location.origin)

        // Ignorar links externos
        if (url.origin !== window.location.origin) return

        // Ignorar se for a mesma rota atual (apenas âncora ou query param sem mudança de página)
        if (url.pathname === window.location.pathname) return

        // Descartar se a aba estiver oculta (evita medições infladas por throttle de segundo plano)
        if (document.visibilityState === 'hidden') return

        // Cancelar expiração anterior se existir
        if (pendingNavigationRef.current?.timeoutId) {
          clearTimeout(pendingNavigationRef.current.timeoutId)
        }

        // Agendar expiração (TTL de 10s) para descartar navegações abandonadas
        const timeoutId = setTimeout(() => {
          if (pendingNavigationRef.current?.timeoutId === timeoutId) {
            pendingNavigationRef.current = null
          }
        }, 10000)

        pendingNavigationRef.current = {
          startTime: performance.now(),
          targetPath: normalizePathname(url.pathname),
          timeoutId,
        }
      } catch {
        // Ignorar URLs malformadas
      }
    }

    // Se o usuário minimizar ou trocar de aba enquanto havia transição pendente, descartar
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingNavigationRef.current) {
        clearTimeout(pendingNavigationRef.current.timeoutId)
        pendingNavigationRef.current = null
      }
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const queueRef = useRef<any[]>([])
  const shouldSampleRef = useRef(Math.random() <= 1.0) // 100% amostragem inicial, ajustável

  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0) return
    const batch = [...queueRef.current]
    queueRef.current = []

    try {
      // Envio via endpoint de lote otimizado no servidor
      const res = await fetch('/api/admin/desempenho/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: batch }),
        keepalive: true,
      })

      if (!res.ok) {
        // Fallback defensivo com cliente Supabase se rota responder erro
        const { error } = await supabase.from('performance_metrics').insert(batch)
        if (error) console.warn('[Perf] Fallback supabase insert:', error.message)
      }
    } catch {
      // Fallback silencioso sem travar a interface do usuário
      try {
        await supabase.from('performance_metrics').insert(batch)
      } catch {}
    }
  }, [supabase])

  useEffect(() => {
    const interval = setInterval(flushQueue, 5000)
    return () => {
      clearInterval(interval)
      flushQueue()
    }
  }, [flushQueue])

  // Callback para Core Web Vitals com sanitização
  const handleWebVitals = useCallback(
    (metric: Metric) => {
      if (!shouldSampleRef.current) return
      // Descartar se a aba estiver em segundo plano no momento da captura
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      // Ignorar deslocamentos insignificantes de CLS (< 0.01) para evitar rajadas de inserts
      if (metric.name === 'CLS' && metric.value < 0.01) return
      // Descartar valores anômalos ou irreais de Web Vitals (> 60 segundos ou negativos)
      if (metric.name !== 'CLS' && (metric.value < 1 || metric.value > 60000)) return

      const normalizedPath = normalizePathname(pathname)

      const payload = {
        record_id: crypto.randomUUID(),
        funcionario_id: funcionarioRef.current?.id ?? null,
        escola_id: escolaAtivaIdRef.current ?? null,
        pathname: normalizedPath,
        metric_name: metric.name,
        metric_value: metric.name === 'CLS' ? Number(metric.value.toFixed(4)) : Math.round(metric.value),
        rating: metric.rating ?? 'needs-improvement',
        connection_type: getConnectionType(),
        device_memory: getDeviceMemory(),
        hardware_concurrency: getHardwareConcurrency(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }

      queueRef.current.push(payload)
      if (queueRef.current.length >= 10) {
        flushQueue() // Forçar flush se a fila crescer rápido
      }
    },
    [pathname, flushQueue]
  )

  useReportWebVitals(handleWebVitals)

  // Medição de troca de rota protegida contra contaminações de background e cancelamentos
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!shouldSampleRef.current) return

    if (
      pendingNavigationRef.current &&
      prevPathnameRef.current !== null &&
      prevPathnameRef.current !== pathname
    ) {
      const nav = pendingNavigationRef.current
      pendingNavigationRef.current = null
      clearTimeout(nav.timeoutId)

      const normalizedPath = normalizePathname(pathname)

      // Verificar correspondência com a rota pretendida e se a aba continuou visível
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        normalizedPath === nav.targetPath
      ) {
        const durationMs = performance.now() - nav.startTime

        // Filtro de acurácia: apenas durações entre 15ms e 15.000ms (15s)
        if (durationMs >= 15 && durationMs <= 15000 && isMounted.current) {
          const roundedMs = Math.round(durationMs)
          const rating =
            roundedMs < 300 ? 'good'
            : roundedMs < 1000 ? 'needs-improvement'
            : 'poor'

          const payload = {
            record_id: crypto.randomUUID(),
            funcionario_id: funcionarioRef.current?.id ?? null,
            escola_id: escolaAtivaIdRef.current ?? null,
            pathname: normalizedPath,
            metric_name: 'ROUTE_CHANGE_MS',
            metric_value: roundedMs,
            rating,
            connection_type: getConnectionType(),
            device_memory: getDeviceMemory(),
            hardware_concurrency: getHardwareConcurrency(),
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          }

          queueRef.current.push(payload)
        }
      }
    }

    prevPathnameRef.current = pathname
  }, [pathname])

  return null
}
