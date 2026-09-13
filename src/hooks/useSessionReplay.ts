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
  event_type: 'click' | 'navigation' | 'input_focus' | 'input_blur' | 'input_change' | 'modal_open' | 'modal_close' | 'error' | 'network_info' | 'heartbeat'
  event_data: {
    pathname?: string
    search_params?: string
    page_title?: string
    x_pct?: number
    y_pct?: number
    viewport_w?: number
    viewport_h?: number
    target_tag?: string
    target_text?: string
    target_selector?: string
    field_name?: string
    field_type?: string
    character_count?: number
    modal_title?: string
    modal_id?: string
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
  return trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed
}

export function useSessionReplay() {
  const pathname = usePathname()
  const supabase = createClient()
  const { funcionario, escolaAtivaId } = useAuthStore()

  const activeSessionIdRef = useRef<string | null>(null)
  const userAuthIdRef = useRef<string | null>(null)
  const funcionarioIdRef = useRef<string | null>(funcionario?.id ?? null)
  const funcionarioNomeRef = useRef<string>(funcionario?.nome ?? 'Servidor')
  const funcionarioCargoRef = useRef<string>(funcionario?.cargo ?? 'Servidor')
  const funcionarioEmailRef = useRef<string>(funcionario?.email ?? '')
  const fotoUrlRef = useRef<string | null>(funcionario?.foto_url ?? null)
  const escolaIdRef = useRef<string | null>(escolaAtivaId ?? null)
  const escolaNomeRef = useRef<string>('Rede Municipal')
  const currentPathRef = useRef<string>(pathname || '/')
  const currentSearchRef = useRef<string>('')
  const sessionStartTimeRef = useRef<number>(Date.now())
  const activeModalTitleRef = useRef<string | null>(null)

  const queueRef = useRef<ReplayEventItem[]>([])
  const lastInteractionAtRef = useRef<number>(Date.now())
  const lastActionDescRef = useRef<string>('Navegação no sistema')
  const lastPingSentAtRef = useRef<number>(0)
  const isMounted = useRef<boolean>(true)
  const isHandlingErrorRef = useRef<boolean>(false)

  useEffect(() => {
    funcionarioIdRef.current = funcionario?.id ?? null
    funcionarioNomeRef.current = funcionario?.nome ?? 'Servidor'
    funcionarioCargoRef.current = funcionario?.cargo ?? 'Servidor'
    funcionarioEmailRef.current = funcionario?.email ?? ''
    fotoUrlRef.current = funcionario?.foto_url ?? null
    escolaIdRef.current = escolaAtivaId ?? null
  }, [funcionario, escolaAtivaId])

  // Disparo de Ping Econômico HTTP para /api/presence/ping
  const sendPresencePing = useCallback(async (actionDesc?: string, isOffline?: boolean) => {
    if (typeof window === 'undefined') return

    if (actionDesc) {
      lastActionDescRef.current = actionDesc
      lastInteractionAtRef.current = Date.now()
    }

    const now = Date.now()
    // Throttling: não envia pings com intervalo menor que 10 segundos (exceto se for offline ou troca de tela)
    if (!isOffline && !actionDesc?.startsWith('Navegou') && now - lastPingSentAtRef.current < 10000) {
      return
    }
    lastPingSentAtRef.current = now

    const isVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
    const hasFocus = typeof document !== 'undefined' ? (document.hasFocus ? document.hasFocus() : true) : true
    const isTabFocused = isVisible && hasFocus
    const secondsSinceInteraction = Math.floor((now - lastInteractionAtRef.current) / 1000)
    const isActivelyUsing = isTabFocused && secondsSinceInteraction <= 45

    const net = getNetworkDetails()

    const payload = {
      user_id: userAuthIdRef.current,
      funcionario_id: funcionarioIdRef.current,
      funcionario_nome: funcionarioNomeRef.current,
      funcionario_cargo: funcionarioCargoRef.current,
      funcionario_email: funcionarioEmailRef.current,
      foto_url: fotoUrlRef.current,
      escola_id: escolaIdRef.current,
      escola_nome: escolaNomeRef.current || 'Rede Municipal',
      current_pathname: currentPathRef.current || '/',
      last_action: lastActionDescRef.current,
      active_modal: activeModalTitleRef.current,
      is_actively_using: isActivelyUsing,
      is_tab_focused: isTabFocused,
      rtt: net.rtt,
      downlink: net.downlink,
      effective_type: net.effective_type,
      is_offline: Boolean(isOffline),
    }

    if (isOffline && navigator.sendBeacon) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon('/api/presence/ping', blob)
        return
      } catch {}
    }

    try {
      fetch('/api/presence/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }, [])

  // Despachar evento para persistência histórica (apenas se gravação ativada ou se for erro)
  const dispatchEvent = useCallback((event: Omit<ReplayEventItem, 'session_id' | 'funcionario_id' | 'escola_id'>) => {
    const sid = activeSessionIdRef.current || userAuthIdRef.current || 'anonymous'

    const fullItem: ReplayEventItem = {
      session_id: sid,
      funcionario_id: funcionarioIdRef.current,
      funcionario_nome: funcionarioNomeRef.current,
      escola_id: escolaIdRef.current,
      event_type: event.event_type,
      event_data: {
        ...event.event_data,
        pathname: event.event_data.pathname || currentPathRef.current,
        search_params: event.event_data.search_params || currentSearchRef.current,
        timestamp: event.event_data.timestamp || Date.now(),
        active_time_seconds: Math.floor((Date.now() - sessionStartTimeRef.current) / 1000),
      },
    }

    const isRecordingEnabled = typeof window !== 'undefined' && (
      (window as any).__SIG_RECORD_SESSION__ === true ||
      window.localStorage?.getItem('sig_record_session') === '1' ||
      event.event_type === 'error'
    )

    if (isRecordingEnabled) {
      queueRef.current.push(fullItem)
    }
  }, [])

  // Enviar lote de erros / gravação histórica
  const flushQueue = useCallback(async () => {
    if (queueRef.current.length === 0) return
    const batch = [...queueRef.current]
    queueRef.current = []

    try {
      await fetch('/api/admin/session-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      })
    } catch {}
  }, [])

  // 1. Inicializar sessão do usuário
  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const sid = session.access_token ? `${session.user.id}_${session.expires_at || Date.now()}` : session.user.id
          activeSessionIdRef.current = sid
          userAuthIdRef.current = session.user.id

          // Disparar ping inicial de presença HTTP
          sendPresencePing('Entrou no sistema')
        }
      } catch (err) {
        console.warn('[useSessionReplay] Erro ao carregar sessão:', err)
      }
    }

    initSession()
  }, [supabase, sendPresencePing])

  // 2. Heartbeat periódico inteligente (a cada 60s) via HTTP
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (!isMounted.current || typeof document === 'undefined') return
      if (document.visibilityState === 'visible') {
        sendPresencePing()
      }
    }, 60000)

    return () => clearInterval(heartbeatInterval)
  }, [sendPresencePing])

  // 3. Timer periódico de gravação a cada 5 segundos (apenas se houver eventos em fila)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current && queueRef.current.length > 0) {
        flushQueue()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [flushQueue])

  // 4. Listener de Navegação (Pathname e URL)
  useEffect(() => {
    currentPathRef.current = pathname || '/'
    if (typeof window !== 'undefined') {
      currentSearchRef.current = window.location.search || ''
    }

    sendPresencePing(`Navegou para ${pathname || '/'}`)

    dispatchEvent({
      event_type: 'navigation',
      event_data: {
        pathname: pathname || '/',
        search_params: currentSearchRef.current,
        page_title: typeof document !== 'undefined' ? document.title : pathname,
        timestamp: Date.now(),
      },
    })
  }, [pathname, dispatchEvent, sendPresencePing])

  // 5. Detecção Automática de Modais e Diálogos via MutationObserver
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    let lastKnownModalId: string | null = null
    let modalDebounceTimer: ReturnType<typeof setTimeout> | null = null

    const checkModalState = () => {
      if (!isMounted.current) return

      const openDialog = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], dialog[open], .modal.open, [data-dialog-open="true"]'
      ) || document.querySelector('[role="dialog"], [role="alertdialog"]')

      if (openDialog) {
        const titleElem = openDialog.querySelector(
          '[data-slot="dialog-title"], [class*="dialog-title"], [class*="DialogTitle"], [class*="modal-title"], h1, h2, h3, h4'
        )
        let modalTitle = sanitizeText(
          titleElem?.textContent ||
          openDialog.getAttribute('aria-label') ||
          openDialog.getAttribute('aria-labelledby') ||
          'Janela Modal do SIG'
        )

        const modalId = openDialog.id || modalTitle

        if (modalId !== lastKnownModalId) {
          lastKnownModalId = modalId
          activeModalTitleRef.current = modalTitle

          sendPresencePing(`Abriu modal "${modalTitle}"`)

          dispatchEvent({
            event_type: 'modal_open',
            event_data: {
              modal_title: modalTitle,
              modal_id: modalId,
              timestamp: Date.now(),
            },
          })
        }
      } else if (lastKnownModalId !== null) {
        const closedTitle = activeModalTitleRef.current || 'Modal'
        lastKnownModalId = null
        activeModalTitleRef.current = null

        sendPresencePing(`Fechou modal "${closedTitle}"`)

        dispatchEvent({
          event_type: 'modal_close',
          event_data: {
            modal_title: closedTitle,
            timestamp: Date.now(),
          },
        })
      }
    }

    const observer = new MutationObserver(() => {
      if (modalDebounceTimer) clearTimeout(modalDebounceTimer)
      modalDebounceTimer = setTimeout(checkModalState, 100)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'open', 'class', 'style', 'aria-hidden'],
    })

    checkModalState()

    return () => {
      if (modalDebounceTimer) clearTimeout(modalDebounceTimer)
      observer.disconnect()
    }
  }, [dispatchEvent, sendPresencePing])

  // 6. Captura de Ações e Erros
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    // Cliques
    const handleClick = (e: MouseEvent | TouchEvent) => {
      lastInteractionAtRef.current = Date.now()
      const target = e.target as HTMLElement | null
      const targetTag = target?.tagName || 'UNKNOWN'
      const targetText = sanitizeText(target?.innerText || target?.getAttribute('aria-label') || target?.getAttribute('title') || target?.getAttribute('placeholder'))

      let shortSelector = targetTag.toLowerCase()
      if (target?.id) shortSelector += `#${target.id}`

      const clickDesc = targetText ? `Clicou em "${targetText}"` : `Clicou em <${targetTag.toLowerCase()}>`
      lastActionDescRef.current = clickDesc

      dispatchEvent({
        event_type: 'click',
        event_data: {
          target_tag: targetTag,
          target_text: targetText,
          target_selector: shortSelector,
          timestamp: Date.now(),
        },
      })
    }

    // Foco em Campos
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const tagName = target.tagName
      const role = target.getAttribute('role')

      if (
        tagName === 'INPUT' ||
        tagName === 'SELECT' ||
        tagName === 'TEXTAREA' ||
        role === 'combobox' ||
        role === 'textbox' ||
        role === 'searchbox' ||
        role === 'switch'
      ) {
        const inputElem = target as HTMLInputElement
        const fieldName = inputElem.name || inputElem.id || inputElem.getAttribute('placeholder') || inputElem.getAttribute('aria-label') || 'Campo Formulário'
        lastActionDescRef.current = `Editando campo "${sanitizeText(fieldName)}"`

        dispatchEvent({
          event_type: 'input_focus',
          event_data: {
            field_name: sanitizeText(fieldName),
            field_type: inputElem.type || role || tagName.toLowerCase(),
            timestamp: Date.now(),
          },
        })
      }
    }

    // Erros Não Tratados
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

    // Interceptação Segura de console.error
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args)

      if (isHandlingErrorRef.current || !isMounted.current) return
      isHandlingErrorRef.current = true

      try {
        const msg = args
          .map((a) => (typeof a === 'string' ? a : a?.message || (typeof a === 'object' ? JSON.stringify(a) : String(a))))
          .join(' ')

        if (
          !msg.includes('[useSessionReplay]') &&
          !msg.includes('[ModalSessionReplay]') &&
          !msg.includes('Realtime') &&
          !msg.includes('Download the React DevTools')
        ) {
          dispatchEvent({
            event_type: 'error',
            event_data: {
              error_message: sanitizeText(msg),
              timestamp: Date.now(),
            },
          })
        }
      } catch {
      } finally {
        isHandlingErrorRef.current = false
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendPresencePing('Retornou para a aba')
      }
    }

    document.addEventListener('click', handleClick, { passive: true, capture: true })
    document.addEventListener('touchstart', handleClick, { passive: true, capture: true })
    document.addEventListener('focusin', handleFocusIn, { passive: true, capture: true })
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      console.error = originalConsoleError
      document.removeEventListener('click', handleClick, { capture: true })
      document.removeEventListener('touchstart', handleClick, { capture: true })
      document.removeEventListener('focusin', handleFocusIn, { capture: true })
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [dispatchEvent, sendPresencePing])

  // 7. Enviar desconexão e eventos pendentes no encerramento da página (beforeunload)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = () => {
      sendPresencePing('Saiu do sistema', true)

      if (queueRef.current.length > 0 && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify({ events: queueRef.current })], { type: 'application/json' })
          navigator.sendBeacon('/api/admin/session-events', blob)
        } catch {}
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sendPresencePing])

  return null
}
