'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useReportWebVitals } from 'next/web-vitals'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0]

// Interfaces tipadas para evitar typos e (navigator as any)
interface NetworkInformation {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g'
}
interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

// Helpers de hardware/rede
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

export function PerformanceTracker() {
  const pathname = usePathname()
  const supabase = createClient()
  const { funcionario, escolaAtivaId } = useAuthStore()

  // Referência ao timer de debounce para rotas
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mede o tempo desde o clique (performance.mark 'route-start')
  // até o useEffect rodar (após commit do React = tela pintada)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href]')
      if (anchor) {
        // Marca o início da navegação no instante exato do clique
        try {
          performance.mark('route-start')
        } catch (err) {
          // Ignora se a API de performance não estiver disponível
        }
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  // Callback estável para evitar re-registro de observers pelo useReportWebVitals interno.
  const handleWebVitals = useCallback(
    async (metric: Metric) => {
      const payload = {
        funcionario_id: funcionario?.id ?? null,
        escola_id: escolaAtivaId ?? null,
        pathname,
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
        // Falha silenciosa intencional: o monitoramento nunca deve quebrar a navegação
      }
    },
    [funcionario?.id, escolaAtivaId, pathname]
  )

  // 1. Rastreamento de Core Web Vitals via hook nativo do Next.js 16
  useReportWebVitals(handleWebVitals)

  // 2. Rastreamento de transição de rota com timing correto e debounce
  useEffect(() => {
    if (typeof window === 'undefined') return

    let durationMs: number | null = null

    try {
      const entries = performance.getEntriesByName('route-start', 'mark')
      if (entries.length > 0) {
        durationMs = performance.now() - entries[entries.length - 1].startTime
        // Limpar a mark para não contaminar a próxima navegação
        performance.clearMarks('route-start')
      }
    } catch {
      // API não disponível no ambiente (SSR, etc.)
    }

    if (durationMs === null || durationMs < 50) return // navegação muito rápida ou sem mark

    // Debounce de 500ms — cancela se o usuário saltou para outra rota
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const rating =
        durationMs! < 300 ? 'good'
        : durationMs! < 1000 ? 'needs-improvement'
        : 'poor'

      const payload = {
        funcionario_id: funcionario?.id ?? null,
        escola_id: escolaAtivaId ?? null,
        pathname,
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
  }, [pathname, funcionario?.id, escolaAtivaId])

  return null
}
