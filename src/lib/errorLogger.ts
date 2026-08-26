'use client'

import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_RECENT_ROUTES = 8
const DEDUPLICATION_TTL_MS = 3000

// Cache de deduplicação recente para evitar flood de logs idênticos
const recentErrorsCache = new Map<string, number>()

let isLoggerInitialized = false
let isLoggingInternal = false

/**
 * Registra a rota atual no histórico de navegação local da sessão (sessionStorage)
 */
export function recordNavigationStep(pathname: string, pageTitle?: string) {
  if (typeof window === 'undefined' || !pathname) return

  try {
    const raw = sessionStorage.getItem('sig_session_trail')
    const trail: { pathname: string; title?: string; timestamp: string }[] = raw ? JSON.parse(raw) : []

    const last = trail[trail.length - 1]
    if (last && last.pathname === pathname) {
      return // Não duplica se for a mesma rota consecutiva
    }

    trail.push({
      pathname,
      title: pageTitle || (typeof document !== 'undefined' ? document.title : 'SIG'),
      timestamp: new Date().toISOString()
    })

    // Mantém apenas os últimos N passos
    if (trail.length > MAX_RECENT_ROUTES) {
      trail.splice(0, trail.length - MAX_RECENT_ROUTES)
    }

    sessionStorage.setItem('sig_session_trail', JSON.stringify(trail))
  } catch {
    // Silencioso se sessionStorage estiver bloqueado
  }
}

/**
 * Obtém a trilha de navegação recente da sessão
 */
function getRecentNavigationTrail(): { pathname: string; title?: string; timestamp: string }[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem('sig_session_trail')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Envia o log de erro/não conformidade de forma não-bloqueante para o backend
 */
async function sendErrorLog(errorMessage: string, options?: any) {
  if (isLoggingInternal || typeof window === 'undefined') return

  const currentPath = window.location.pathname || '/'
  const currentTitle = document.title || 'SIG'

  // Chave de deduplicação simples
  const deduplicationKey = `${currentPath}:${errorMessage}`
  const now = Date.now()
  const lastTime = recentErrorsCache.get(deduplicationKey)
  if (lastTime && now - lastTime < DEDUPLICATION_TTL_MS) {
    return // Ignora envio duplicado dentro do intervalo
  }
  recentErrorsCache.set(deduplicationKey, now)

  // Limpeza de cache antigo
  if (recentErrorsCache.size > 50) {
    for (const [key, timestamp] of recentErrorsCache.entries()) {
      if (now - timestamp > DEDUPLICATION_TTL_MS * 2) {
        recentErrorsCache.delete(key)
      }
    }
  }

  isLoggingInternal = true

  try {
    const authState = useAuthStore.getState()
    const schoolState = useSchoolStore.getState()
    const func = authState.getFuncionarioAtivo?.() || authState.funcionario
    const trail = getRecentNavigationTrail()

    // Identificação de sessão local ou auth
    let sessionId: string | null = null
    try {
      sessionId = sessionStorage.getItem('sig_session_id') || null
    } catch {}

    const safeUserId = func?.id && UUID_REGEX.test(func.id) ? func.id : null

    // Ação inferida a partir da página / título / contexto
    const acaoContexto = `Erro disparado em: ${currentTitle} (${currentPath})`

    const payload = {
      message: errorMessage,
      context: currentPath,
      severity: 'error',
      user_id: safeUserId,
      metadata: {
        tipo_registro: 'NAO_CONFORMIDADE_AUTOMATICA',
        origem: 'toast.error',
        acao_usuario: acaoContexto,
        pathname: currentPath,
        page_title: currentTitle,
        full_url: window.location.href,
        session_id: sessionId,
        usuario: {
          id: func?.id ?? null,
          nome: func?.nome ?? 'Usuário Anônimo / Não Autenticado',
          email: func?.email ?? 'N/A',
          cargo: func?.cargo ?? 'Visitante',
          escola: schoolState.selectedEscola?.nome ?? null
        },
        trilha_navegacao_recente: trail,
        user_agent: navigator.userAgent,
        extra_options: typeof options === 'object' ? options : null,
        timestamp: new Date().toISOString()
      }
    }

    // Disparo assíncrono via fetch não bloqueante
    fetch('/api/admin/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {
      // Falhas no envio são estritamente absorvidas para não impactar a UX
    })
  } catch {
    // Absorve qualquer falha interna
  } finally {
    isLoggingInternal = false
  }
}

/**
 * Inicializa a interceptação global de toast.error do Sonner
 */
export function initErrorToastInterceptor() {
  if (isLoggerInitialized || typeof window === 'undefined') return
  isLoggerInitialized = true

  const originalToastError = toast.error

  toast.error = (message: any, options?: any) => {
    // 1. Mantém a renderização original visual do toast para o usuário
    const toastResult = originalToastError(message, options)

    // 2. Extrai a string do erro de forma defensiva
    try {
      let msgStr = ''
      if (typeof message === 'string') {
        msgStr = message
      } else if (message instanceof Error) {
        msgStr = message.message
      } else if (typeof message === 'function') {
        msgStr = 'Erro dinâmico de função'
      } else if (message && typeof message === 'object') {
        msgStr = (message as any).message || (message as any).description || JSON.stringify(message)
      } else {
        msgStr = String(message ?? 'Erro desconhecido')
      }

      if (msgStr.trim()) {
        sendErrorLog(msgStr, options)
      }
    } catch {
      // Ignora erro de parsing
    }

    return toastResult
  }
}
