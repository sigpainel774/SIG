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
    x_pct?: number // 0 a 100% da largura da tela
    y_pct?: number // 0 a 100% da altura da tela
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
  const escolaNomeRef = useRef<string>('')
  const currentPathRef = useRef<string>(pathname || '/')
  const currentSearchRef = useRef<string>('')
  const sessionStartTimeRef = useRef<number>(Date.now())
  const activeModalTitleRef = useRef<string | null>(null)

  const channelRef = useRef<any>(null)
  const userChannelRef = useRef<any>(null)
  const presenceChannelRef = useRef<any>(null)
  const isChannelSubscribedRef = useRef<boolean>(false)
  const pendingBroadcastsRef = useRef<ReplayEventItem[]>([])
  const queueRef = useRef<ReplayEventItem[]>([])
  const lastInteractionAtRef = useRef<number>(Date.now())
  const lastActionDescRef = useRef<string>('Navegação no sistema')
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

  // Atualizar estado de presença em tempo real
  const updatePresenceState = useCallback((actionDesc?: string) => {
    if (actionDesc) {
      lastActionDescRef.current = actionDesc
      lastInteractionAtRef.current = Date.now()
    }
    if (!presenceChannelRef.current || !userAuthIdRef.current) return

    const isVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
    const hasFocus = typeof document !== 'undefined' ? (document.hasFocus ? document.hasFocus() : true) : true
    const isTabFocused = isVisible && hasFocus
    const now = Date.now()
    const secondsSinceInteraction = Math.floor((now - lastInteractionAtRef.current) / 1000)
    const isActivelyUsing = isTabFocused && secondsSinceInteraction <= 45

    const net = getNetworkDetails()

    presenceChannelRef.current.track({
      session_id: activeSessionIdRef.current || userAuthIdRef.current,
      user_id: userAuthIdRef.current,
      funcionario_id: funcionarioIdRef.current,
      funcionario_nome: funcionarioNomeRef.current,
      funcionario_email: funcionarioEmailRef.current,
      funcionario_cargo: funcionarioCargoRef.current,
      foto_url: fotoUrlRef.current,
      escola_nome: escolaNomeRef.current || 'Rede Municipal',
      current_pathname: currentPathRef.current || '/',
      online_at: new Date().toISOString(),
      last_interaction_at: lastInteractionAtRef.current,
      last_action_desc: lastActionDescRef.current,
      active_modal: activeModalTitleRef.current ? { isOpen: true, title: activeModalTitleRef.current } : null,
      is_actively_using: isActivelyUsing,
      is_tab_focused: isTabFocused,
      rtt: net.rtt,
      downlink: net.downlink,
      effective_type: net.effective_type,
      active_time_seconds: Math.floor((now - sessionStartTimeRef.current) / 1000),
    }).catch(() => {})
  }, [])

  // Despachar evento para o canal Realtime e enfileirar para persistência
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

    // 1. Enviar broadcast em tempo real (ou enfileirar se canal ainda estiver conectando)
    if (isChannelSubscribedRef.current) {
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'event',
            payload: fullItem,
          })
        } catch {
          // Falha suave no broadcast primário
        }
      }
      if (userChannelRef.current) {
        try {
          userChannelRef.current.send({
            type: 'broadcast',
            event: 'event',
            payload: fullItem,
          })
        } catch {
          // Falha suave no broadcast secundário
        }
      }
    } else {
      // Guarda no buffer temporário para descarregar assim que conectar
      pendingBroadcastsRef.current.push(fullItem)
      if (pendingBroadcastsRef.current.length > 50) {
        pendingBroadcastsRef.current.shift()
      }
    }

    // 2. Colocar na fila de persistência histórica apenas se gravação estiver ativa ou se for erro
    const isRecordingEnabled = typeof window !== 'undefined' && (
      (window as any).__SIG_RECORD_SESSION__ === true ||
      window.localStorage?.getItem('sig_record_session') === '1' ||
      event.event_type === 'error'
    )
    if (isRecordingEnabled) {
      queueRef.current.push(fullItem)
    }
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
        // Ignorar falha transitória
      }
    } catch {
      // Ignorar falha de rede transitória
    }
  }, [])

  // Descarregar buffer de broadcasts pendentes
  const flushPendingBroadcasts = useCallback(() => {
    if (pendingBroadcastsRef.current.length === 0) return
    const pending = [...pendingBroadcastsRef.current]
    pendingBroadcastsRef.current = []

    pending.forEach((item) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'event',
          payload: item,
        })
      }
      if (userChannelRef.current) {
        userChannelRef.current.send({
          type: 'broadcast',
          event: 'event',
          payload: item,
        })
      }
    })
  }, [])

  // 1. Inicializar sessão, Realtime Presence e Canal Broadcast
  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const sid = session.access_token ? `${session.user.id}_${session.expires_at || Date.now()}` : session.user.id
          activeSessionIdRef.current = sid
          userAuthIdRef.current = session.user.id

          const net = getNetworkDetails()

          // A. Canal Realtime Presence Global para identificar quem está ao vivo no SIG
          const presenceChannel = supabase.channel('sig_live_presence', {
            config: { presence: { key: session.user.id } },
          })

          presenceChannel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              try {
                await presenceChannel.track({
                  session_id: sid,
                  user_id: session.user.id,
                  funcionario_id: funcionarioIdRef.current,
                  funcionario_nome: funcionarioNomeRef.current,
                  funcionario_email: funcionarioEmailRef.current,
                  funcionario_cargo: funcionarioCargoRef.current,
                  foto_url: fotoUrlRef.current,
                  escola_nome: escolaNomeRef.current || 'Rede Municipal',
                  current_pathname: currentPathRef.current || '/',
                  online_at: new Date().toISOString(),
                  last_interaction_at: lastInteractionAtRef.current,
                  last_action_desc: 'Entrou no sistema',
                  active_modal: activeModalTitleRef.current ? { isOpen: true, title: activeModalTitleRef.current } : null,
                  is_actively_using: true,
                  is_tab_focused: true,
                  rtt: net.rtt,
                  downlink: net.downlink,
                  effective_type: net.effective_type,
                  active_time_seconds: 0,
                })
              } catch (trackErr) {
                console.warn('[useSessionReplay] Erro ao registrar presença:', trackErr)
              }
            }
          })
          presenceChannelRef.current = presenceChannel

          // B. Canal realtime broadcast primário (por session_id)
          const channelName = `session_replay:${sid}`
          const channel = supabase.channel(channelName, {
            config: { broadcast: { self: false } },
          })

          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              isChannelSubscribedRef.current = true
              flushPendingBroadcasts()

              // Dispara evento inicial de presença/heartbeat imediatamente
              dispatchEvent({
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
              })
              flushQueue()
            }
          })
          channelRef.current = channel

          // C. Canal realtime broadcast secundário (por user_id) para garantir entrega garantida
          if (session.user.id !== sid) {
            const userChannel = supabase.channel(`session_replay:${session.user.id}`, {
              config: { broadcast: { self: false } },
            })
            userChannel.subscribe()
            userChannelRef.current = userChannel
          }

          // Disparar navegação inicial garantida
          dispatchEvent({
            event_type: 'navigation',
            event_data: {
              pathname: currentPathRef.current,
              search_params: currentSearchRef.current,
              page_title: typeof document !== 'undefined' ? document.title : currentPathRef.current,
              rtt: net.rtt,
              downlink: net.downlink,
              effective_type: net.effective_type,
              packet_loss_estimate_pct: net.packet_loss_estimate_pct,
              timestamp: Date.now(),
            },
          })
        }
      } catch (err) {
        console.warn('[useSessionReplay] Erro ao carregar sessão:', err)
      }
    }

    initSession()

    return () => {
      isChannelSubscribedRef.current = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (userChannelRef.current) {
        supabase.removeChannel(userChannelRef.current)
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current)
      }
    }
  }, [supabase, dispatchEvent, flushQueue, flushPendingBroadcasts])

  // Heartbeat periódico (a cada 15s) para atualizar presença e manter vivo no banco
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      if (!isMounted.current || typeof document === 'undefined') return
      if (document.visibilityState === 'visible') {
        const net = getNetworkDetails()
        dispatchEvent({
          event_type: 'heartbeat',
          event_data: {
            pathname: currentPathRef.current,
            page_title: document.title,
            rtt: net.rtt,
            downlink: net.downlink,
            effective_type: net.effective_type,
            packet_loss_estimate_pct: net.packet_loss_estimate_pct,
            timestamp: Date.now(),
          },
        })

        updatePresenceState()
      }
    }, 15000)

    return () => clearInterval(heartbeatInterval)
  }, [dispatchEvent, updatePresenceState])

  // Timer periódico de gravação a cada 4 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMounted.current) {
        flushQueue()
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [flushQueue])

  // 2. Listener de Navegação (Pathname e URL)
  useEffect(() => {
    currentPathRef.current = pathname || '/'
    if (typeof window !== 'undefined') {
      currentSearchRef.current = window.location.search || ''
    }

    const net = getNetworkDetails()
    updatePresenceState(`Navegou para ${pathname || '/'}`)

    dispatchEvent({
      event_type: 'navigation',
      event_data: {
        pathname: pathname || '/',
        search_params: currentSearchRef.current,
        page_title: typeof document !== 'undefined' ? document.title : pathname,
        rtt: net.rtt,
        downlink: net.downlink,
        effective_type: net.effective_type,
        packet_loss_estimate_pct: net.packet_loss_estimate_pct,
        timestamp: Date.now(),
      },
    })
  }, [pathname, dispatchEvent, updatePresenceState])

  // 3. Detecção Automática de Modais e Diálogos via MutationObserver
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    let lastKnownModalId: string | null = null
    let modalDebounceTimer: ReturnType<typeof setTimeout> | null = null

    const checkModalState = () => {
      if (!isMounted.current) return

      // Procura elementos com role="dialog", role="alertdialog" ou data-state="open"
      const openDialog = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], dialog[open], .modal.open, [data-dialog-open="true"]'
      ) || document.querySelector('[role="dialog"], [role="alertdialog"]')

      if (openDialog) {
        // Extrair título do modal
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

          updatePresenceState(`Abriu modal "${modalTitle}"`)

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
        // Modal foi fechado
        const closedTitle = activeModalTitleRef.current || 'Modal'
        lastKnownModalId = null
        activeModalTitleRef.current = null

        updatePresenceState(`Fechou modal "${closedTitle}"`)

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

    // Checagem inicial
    checkModalState()

    return () => {
      if (modalDebounceTimer) clearTimeout(modalDebounceTimer)
      observer.disconnect()
    }
  }, [dispatchEvent, updatePresenceState])

  // 4. Captura de Cliques, Foco, Digitação em Campos e Erros
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    // A. Cliques e Toques
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
      const targetText = sanitizeText(target?.innerText || target?.getAttribute('aria-label') || target?.getAttribute('title') || target?.getAttribute('placeholder'))

      let shortSelector = targetTag.toLowerCase()
      if (target?.id) shortSelector += `#${target.id}`
      else if (target?.className && typeof target.className === 'string') {
        const firstClass = target.className.split(' ')[0]
        if (firstClass && !firstClass.includes(':')) shortSelector += `.${firstClass}`
      }

      const net = getNetworkDetails()
      const clickDesc = targetText ? `Clicou em "${targetText}"` : `Clicou em <${targetTag.toLowerCase()}>`
      updatePresenceState(clickDesc)

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

    // B. Foco e Blur em Campos (HTML Nativo e Radix/Shadcn)
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
        const fieldType = inputElem.type || role || tagName.toLowerCase()

        updatePresenceState(`Editando campo "${fieldName}"`)

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
      const role = target.getAttribute('role')

      if (
        tagName === 'INPUT' ||
        tagName === 'SELECT' ||
        tagName === 'TEXTAREA' ||
        role === 'combobox' ||
        role === 'textbox' ||
        role === 'searchbox'
      ) {
        const inputElem = target as HTMLInputElement
        const fieldName = inputElem.name || inputElem.id || inputElem.getAttribute('placeholder') || inputElem.getAttribute('aria-label') || 'Campo Formulário'

        dispatchEvent({
          event_type: 'input_blur',
          event_data: {
            field_name: sanitizeText(fieldName),
            field_type: inputElem.type || role || tagName.toLowerCase(),
            timestamp: Date.now(),
          },
        })
      }
    }

    // C. Digitação em Campos (com debounce e proteção de privacidade)
    let typingDebounceTimer: ReturnType<typeof setTimeout> | null = null
    const handleInput = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const tagName = target.tagName
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        const inputElem = target as HTMLInputElement
        const fieldName = inputElem.name || inputElem.id || inputElem.getAttribute('placeholder') || inputElem.getAttribute('aria-label') || 'Campo'
        const isPassword = inputElem.type === 'password'
        const charCount = isPassword ? 0 : (inputElem.value?.length || 0)

        if (typingDebounceTimer) clearTimeout(typingDebounceTimer)
        typingDebounceTimer = setTimeout(() => {
          if (!isMounted.current) return
          dispatchEvent({
            event_type: 'input_change',
            event_data: {
              field_name: sanitizeText(fieldName),
              field_type: inputElem.type || tagName.toLowerCase(),
              character_count: charCount,
              timestamp: Date.now(),
            },
          })
        }, 400)
      }
    }

    // D. Captura de Erros Não Tratados e Rejeições de Promises
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

    // E. Interceptação Segura de console.error (com proteção contra recursão infinita)
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args)

      if (isHandlingErrorRef.current || !isMounted.current) return
      isHandlingErrorRef.current = true

      try {
        const msg = args
          .map((a) => (typeof a === 'string' ? a : a?.message || (typeof a === 'object' ? JSON.stringify(a) : String(a))))
          .join(' ')

        // Ignorar logs internos do próprio sistema de telemetria ou warnings Supabase conhecidos
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
        // Falha suave
      } finally {
        isHandlingErrorRef.current = false
      }
    }

    // F. Detecção de foco/visibilidade da aba
    const handleVisibility = () => {
      updatePresenceState(document.visibilityState === 'visible' ? 'Retornou para a aba' : 'Minimizou a aba')
    }

    // G. Detecção de navegação via popstate / hashchange
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const currentLoc = window.location.pathname
        currentPathRef.current = currentLoc
        currentSearchRef.current = window.location.search || ''

        dispatchEvent({
          event_type: 'navigation',
          event_data: {
            pathname: currentLoc,
            search_params: currentSearchRef.current,
            page_title: document.title,
            timestamp: Date.now(),
          },
        })
      }
    }

    document.addEventListener('click', handleClick, { passive: true, capture: true })
    document.addEventListener('touchstart', handleClick, { passive: true, capture: true })
    document.addEventListener('focusin', handleFocusIn, { passive: true, capture: true })
    document.addEventListener('focusout', handleFocusOut, { passive: true, capture: true })
    document.addEventListener('input', handleInput, { passive: true, capture: true })
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('popstate', handlePopState)

    return () => {
      console.error = originalConsoleError
      if (typingDebounceTimer) clearTimeout(typingDebounceTimer)
      document.removeEventListener('click', handleClick, { capture: true })
      document.removeEventListener('touchstart', handleClick, { capture: true })
      document.removeEventListener('focusin', handleFocusIn, { capture: true })
      document.removeEventListener('focusout', handleFocusOut, { capture: true })
      document.removeEventListener('input', handleInput, { capture: true })
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [dispatchEvent, updatePresenceState])

  // 5. Enviar eventos pendentes no encerramento da página (unload)
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

