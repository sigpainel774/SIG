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

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href]')
      if (anchor) {
        try {
          performance.mark('route-start')
        } catch {
          // Ignora se a API de performance não estiver disponível
        }
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  // Callback para Core Web Vitals
  const handleWebVitals = useCallback(
    async (metric: Metric) => {
      // Ignorar deslocamentos insignificantes de CLS (< 0.01) para evitar rajadas de inserts (ES-2)
      if (metric.name === 'CLS' && metric.value < 0.01) return

      const normalizedPath = normalizePathname(pathname)

      const payload = {
        funcionario_id: funcionario?.id ?? null,
        escola_id: escolaAtivaId ?? null,
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
    [funcionario?.id, escolaAtivaId, pathname, supabase]
  )

  useReportWebVitals(handleWebVitals)

  // Rastreamento de transição de rota com timing e normalização
  useEffect(() => {
    if (typeof window === 'undefined') return

    let durationMs: number | null = null

    try {
      const entries = performance.getEntriesByName('route-start', 'mark')
      if (entries.length > 0) {
        durationMs = performance.now() - entries[entries.length - 1].startTime
        performance.clearMarks('route-start')
      }
    } catch {
      // API não disponível
    }

    if (durationMs === null || durationMs < 50) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    const normalizedPath = normalizePathname(pathname)

    debounceRef.current = setTimeout(async () => {
      // Mitigar ES-4: verificar se o componente ainda está montado antes de gravar
      if (!isMounted.current) return

      const rating =
        durationMs! < 300 ? 'good'
        : durationMs! < 1000 ? 'needs-improvement'
        : 'poor'

      const payload = {
        funcionario_id: funcionario?.id ?? null,
        escola_id: escolaAtivaId ?? null,
        pathname: normalizedPath,
        metric_name: 'ROUTE_CHANGE_MS',
        metric_value: durationMs!,
        rating,
        connection_type: getConnectionType(),
        device_memory: getDeviceMemory(),
        hardware_concurrency: getHardwareConcurrency(),
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }

      try {
        const { error } = await supabase
          .from('performance_metrics')
          .insert(payload)
        if (error) console.warn('[Perf] Erro ao salvar transição de rota:', error.message)
      } catch {
        // Falha silenciosa intencional
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [pathname, funcionario?.id, escolaAtivaId, supabase])

  return null
}
