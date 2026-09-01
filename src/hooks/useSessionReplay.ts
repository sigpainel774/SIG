'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'

export interface ReplayEventItem {
  session_id: string
  funcionario_id: string | null
  funcionario_nome?: string
  escola_id: string | null
  event_type: 'click' | 'navigation' | 'input_focus' | 'input_blur' | 'error' | 'network_info' | 'heartbeat'
  event_data: {
    pathname?: string
    page_title?: string
    x_pct?: number // 0 a 100% da largura da tela
    y_pct?: number // 0 a 100% da altura da tela
    viewport_w?: number
    viewport_h?: number
    target_tag?: string
    target_text?: string
    target_selector?: string
    field_name?: string
    field_type?: string
    error_message?: string
    error_stack?: string
    rtt?: number
    downlink?: number
    effective_type?: string
    packet_loss_estimate_pct?: number
    active_time_seconds?: number
    timestamp: number
  }
}

interface NetworkInformation {
  effectiveType?: string
  rtt?: number
  downlink?: number
}
interface NavigatorWithConn extends Navigator {
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
}

function getNetworkDetails(): { rtt: number; downlink: number; effective_type: string; packet_loss_estimate_pct: number } {
  if (typeof navigator === 'undefined') {
    return { rtt: 40, downlink: 10, effective_type: '4g', packet_loss_estimate_pct: 0 }
  }
  const nav = navigator as NavigatorWithConn
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection
  const rtt = conn?.rtt ?? 45
  const downlink = conn?.downlink ?? 10
  const effective_type = conn?.effectiveType ?? '4g'

  // Estimativa baseada em RTT e throughput
  let loss = 0
  if (rtt > 300) loss += 8
  if (rtt > 600) loss += 15
  if (effective_type === '2g' || effective_type === 'slow-2g') loss += 20

  return {
    rtt,
    downlink,
    effective_type,
    packet_loss_estimate_pct: Math.min(100, loss),
  }
}

function sanitizeText(str: string | null | undefined): string {
  if (!str) return ''
  const trimmed = str.replace(/\s+/g, ' ').trim()
  return trimmed.length > 40 ? trimmed.substring(0, 40) + '...' : trimmed
}

export function useSessionReplay() {
  const pathname = usePathname()
  const supabase = createClient()
  const { funcionario, escolaAtivaId } = useAuthStore()

  const activeSessionIdRef = useRef<string | null>(null)
  const userAuthIdRef = useRef<string | null>(null)
  const funcionarioIdRef = useRef<string | null>(funcionario?.id ?? null)
  const funcionarioNomeRef = useRef<string>(funcionario?.nome ?? 'Servidor')
  const escolaIdRef = useRef<string | null>(escolaAtivaId ?? null)
  const currentPathRef = useRef<string>(pathname)
  const sessionStartTimeRef = useRef<number>(Date.now())

  const channelRef = useRef<any>(null)
  const queueRef = useRef<ReplayEventItem[]>([])
  const isMounted = useRef<boolean>(true)

  useEffect(() => {
    funcionarioIdRef.current = funcionario?.id ?? null
    funcionarioNomeRef.current = funcionario?.nome ?? 'Servidor'
    escolaIdRef.current = escolaAtivaId ?? null
  }, [funcionario, escolaAtivaId])

  // 1. Inicializar sessão e canal Realtime Broadcast
  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const sid = session.access_token ? `${session.user.id}_${session.expires_at || Date.now()}` : session.user.id
          activeSessionIdRef.current = sid
          userAuthIdRef.current = session.user.id

          // Canal realtime broadcast de transmissão de comandos visuais
          const channelName = `session_replay:${sid}`
          const channel = supabase.channel(channelName, {
            config: { broadcast: { self: false } },
          })

          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              // Envia evento de presença / início
              const net = getNetworkDetails()
              channel.send({
                type: 'broadcast',
                event: 'event',
                payload: {
                  session_id: sid,
                  funcionario_id: funcionarioIdRef.current,
                  funcionario_nome: funcionarioNomeRef.current,
                  escola_id: escolaIdRef.current,
                  event_type: 'heartbeat',
                  event_data: {
                    pathname: currentPathRef.current,
                    page_title: typeof document !== 'undefined' ? document.title : '',
                    rtt: net.rtt,
                    downlink: net.downlink,
                    effective_type: net.effective_type,
                    packet_loss_estimate_pct: net.packet_loss_estimate_pct,
                    active_time_seconds: 0,
                    timestamp: Date.now(),
                  },
                },
              })
            }
          })

          channelRef.current = channel
        }
      } catch (err) {
        console.warn('[useSessionReplay] Erro ao carregar sessão para replay:', err)
      }
    }

    initSession()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase])

  // Despachar evento para o canal Realtime e enfileirar para persistência
  const dispatchEvent = useCallback((event: Omit<ReplayEventItem, 'session_id' | 'funcionario_id' | 'escola_id'>) => {
    const sid = activeSessionIdRef.current
    if (!sid) return

    const fullItem: ReplayEventItem = {
      session_id: sid,
      funcionario_id: funcionarioIdRef.current,
      funcionario_nome: funcionarioNomeRef.current,
      escola_id: escolaIdRef.current,
      event_type: event.event_type,
      event_data: {
        ...event.event_data,
        pathname: event.event_data.pathname || currentPathRef.current,
        timestamp: event.event_data.timestamp || Date.now(),
        active_time_seconds: Math.floor((Date.now() - sessionStartTimeRef.current) / 1000),
      },
    }

    // 1. Enviar broadcast em tempo real (para quem estiver assistindo ao vivo)
    if (channelRef.current) {
      try {
        channelRef.current.send({
          type: 'broadcast',
          event: 'event',
          payload: fullItem,
        })
      } catch {
        // Falha suave no broadcast
      }
    }

    // 2. Colocar na fila de persistência histórica
    queueRef.current.push(fullItem)
  }, [])

  // Enviar lote para a API de persistência histórica
  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0) return
    const batch = [...queueRef.current]
    queueRef.current = []

    try {
      const res = await fetch('/api/admin/session-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      })
      if (!res.ok) {
        console.warn('[useSessionReplay] Erro na gravação do lote de eventos:', res.statusText)
      }
    } catch {
      // Ignorar falha transitória de envio
    }
  }, [])

  // Timer periódico de gravação a cada 4 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current) {
        flushQueue()
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [flushQueue])

  // 2. Listener de Navegação (Pathname)
  useEffect(() => {
    currentPathRef.current = pathname
    const net = getNetworkDetails()

    dispatchEvent({
      event_type: 'navigation',
      event_data: {
        pathname,
        page_title: typeof document !== 'undefined' ? document.title : pathname,
        rtt: net.rtt,
        downlink: net.downlink,
        effective_type: net.effective_type,
        packet_loss_estimate_pct: net.packet_loss_estimate_pct,
        timestamp: Date.now(),
      },
    })
  }, [pathname, dispatchEvent])

  // 3. Captura de Cliques e Toques (Coordenadas Percentuais)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    const handleClick = (e: MouseEvent | TouchEvent) => {
      let clientX = 0
      let clientY = 0

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX
        clientY = (e as MouseEvent).clientY
      }

      const vw = window.innerWidth || 1
      const vh = window.innerHeight || 1
      const xPct = Math.round((clientX / vw) * 10000) / 100
      const yPct = Math.round((clientY / vh) * 10000) / 100

      const target = e.target as HTMLElement | null
      const targetTag = target?.tagName || 'UNKNOWN'
      const targetText = sanitizeText(target?.innerText || target?.getAttribute('aria-label') || target?.getAttribute('title'))
      
      // Seletor curto para referência
      let shortSelector = targetTag.toLowerCase()
      if (target?.id) shortSelector += `#${target.id}`
      else if (target?.className && typeof target.className === 'string') {
        const firstClass = target.className.split(' ')[0]
        if (firstClass && !firstClass.includes(':')) shortSelector += `.${firstClass}`
      }

      const net = getNetworkDetails()

      dispatchEvent({
        event_type: 'click',
        event_data: {
          x_pct: xPct,
          y_pct: yPct,
          viewport_w: vw,
          viewport_h: vh,
          target_tag: targetTag,
          target_text: targetText,
          target_selector: shortSelector,
          rtt: net.rtt,
          downlink: net.downlink,
          effective_type: net.effective_type,
          packet_loss_estimate_pct: net.packet_loss_estimate_pct,
          timestamp: Date.now(),
        },
      })
    }

    // 4. Captura de Foco em Campos (Apenas Metadados do Campo, NUNCA o Valor)
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const tagName = target.tagName
      if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
        const inputElem = target as HTMLInputElement
        const fieldName = inputElem.name || inputElem.id || inputElem.getAttribute('placeholder') || 'Campo Formulário'
        const fieldType = inputElem.type || tagName.toLowerCase()

        dispatchEvent({
          event_type: 'input_focus',
          event_data: {
            field_name: sanitizeText(fieldName),
            field_type: fieldType,
            timestamp: Date.now(),
          },
        })
      }
    }

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const tagName = target.tagName
      if (tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
        const inputElem = target as HTMLInputElement
        const fieldName = inputElem.name || inputElem.id || inputElem.getAttribute('placeholder') || 'Campo Formulário'

        dispatchEvent({
          event_type: 'input_blur',
          event_data: {
            field_name: sanitizeText(fieldName),
            field_type: inputElem.type || tagName.toLowerCase(),
            timestamp: Date.now(),
          },
        })
      }
    }

    // 5. Captura de Erros Não Tratados na Sessão do Usuário
    const handleError = (e: ErrorEvent) => {
      dispatchEvent({
        event_type: 'error',
        event_data: {
          error_message: sanitizeText(e.message || 'Erro inesperado de script'),
          error_stack: sanitizeText(e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : 'N/A'),
          timestamp: Date.now(),
        },
      })
    }

    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reasonStr = typeof e.reason === 'string' ? e.reason : (e.reason?.message || 'Rejeição de Promise')
      dispatchEvent({
        event_type: 'error',
        event_data: {
          error_message: sanitizeText(reasonStr),
          timestamp: Date.now(),
        },
      })
    }

    document.addEventListener('click', handleClick, { passive: true, capture: true })
    document.addEventListener('touchstart', handleClick, { passive: true, capture: true })
    document.addEventListener('focusin', handleFocusIn, { passive: true, capture: true })
    document.addEventListener('focusout', handleFocusOut, { passive: true, capture: true })
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
      document.removeEventListener('touchstart', handleClick, { capture: true })
      document.removeEventListener('focusin', handleFocusIn, { capture: true })
      document.removeEventListener('focusout', handleFocusOut, { capture: true })
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [dispatchEvent])

  // 6. Enviar eventos pendentes no encerramento da página (unload)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = () => {
      if (queueRef.current.length === 0) return
      const batch = [...queueRef.current]
      queueRef.current = []

      if (navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify({ events: batch })], { type: 'application/json' })
          navigator.sendBeacon('/api/admin/session-events', blob)
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
