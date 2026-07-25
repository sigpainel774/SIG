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

  // Capturar intenções de navegação em memória com expiração de 10s e filtros
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

    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  // Callback para Core Web Vitals
  const handleWebVitals = useCallback(
    async (metric: Metric) => {
      // Ignorar deslocamentos insignificantes de CLS (< 0.01) para evitar rajadas de inserts (ES-2)
      if (metric.name === 'CLS' && metric.value < 0.01) return

      const normalizedPath = normalizePathname(pathname)

      const payload = {
        funcionario_id: funcionarioRef.current?.id ?? null,
        escola_id: escolaAtivaIdRef.current ?? null,
        pathname: normalizedPath,
        metric_name: metric.name,
        metric_value: metric.value,
        rating: metric.rating ?? 'needs-improvement',
        connection_type: getConnectionType(),
        device_memory: getDeviceMemory(),
        hardware_concurrency: getHardwareConcurrency(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }

      try {
        const { error } = await supabase
          .from('performance_metrics')
          .insert(payload)
        if (error) console.warn('[Perf] Erro ao salvar Web Vital:', error.message)
      } catch {
        // Falha silenciosa intencional
      }
    },
    [pathname, supabase]
  )

  useReportWebVitals(handleWebVitals)

  // Medição executada exclusivamente quando pathname realmente muda
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (
      pendingNavigationRef.current &&
      prevPathnameRef.current !== null &&
      prevPathnameRef.current !== pathname
    ) {
      const nav = pendingNavigationRef.current
      pendingNavigationRef.current = null
      clearTimeout(nav.timeoutId)

      const durationMs = performance.now() - nav.startTime

      if (durationMs > 0 && isMounted.current) {
        const normalizedPath = normalizePathname(pathname)

        const rating =
          durationMs < 300 ? 'good'
          : durationMs < 1000 ? 'needs-improvement'
          : 'poor'

        const payload = {
          funcionario_id: funcionarioRef.current?.id ?? null,
          escola_id: escolaAtivaIdRef.current ?? null,
          pathname: normalizedPath,
          metric_name: 'ROUTE_CHANGE_MS',
          metric_value: durationMs,
          rating,
          connection_type: getConnectionType(),
          device_memory: getDeviceMemory(),
          hardware_concurrency: getHardwareConcurrency(),
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        }

        const saveMetric = async () => {
          try {
            const { error } = await supabase
              .from('performance_metrics')
              .insert(payload)
            if (error) console.warn('[Perf] Erro ao salvar transição de rota:', error.message)
          } catch {
            // Falha silenciosa intencional
          }
        }

        saveMetric()
      }
    }

    prevPathnameRef.current = pathname
  }, [pathname, supabase])

  return null
}
