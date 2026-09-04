import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'

export type LogSeverity = 'info' | 'warning' | 'error' | 'critical'

interface LogPayload {
  severity: LogSeverity
  context: string
  message: string
  error_code?: string | null
  metadata?: any
}

// Prevenção de Spam (ES-2)
const logCache = new Map<string, number>()
const DEBOUNCE_MS = 10000 // 10 segundos

// Prevenção de Loop Infinito (ES-1)
let isLogging = false

// Sanitização de dados sensíveis (ES-4)
function sanitizeMetadata(metadata: any): any {
  if (!metadata) return metadata
  
  try {
    const str = JSON.stringify(metadata)
    const obj = JSON.parse(str)
    
    const sanitizeRecursive = (o: any) => {
      if (Array.isArray(o)) {
        o.forEach(sanitizeRecursive)
      } else if (o !== null && typeof o === 'object') {
        for (const key in o) {
          const lowerKey = key.toLowerCase()
          if (
            lowerKey.includes('password') || 
            lowerKey.includes('token') || 
            lowerKey.includes('secret') ||
            lowerKey.includes('authorization')
          ) {
            o[key] = '[SANITIZED]'
          } else {
            sanitizeRecursive(o[key])
          }
        }
      }
    }
    
    sanitizeRecursive(obj)
    return obj
  } catch (e) {
    return { error_parsing_metadata: true }
  }
}

export const sysLogger = {
  log: async (payload: LogPayload) => {
    if (isLogging) return // Previne loop infinito (ES-1)
    
    // Hash simples para debounce
    const logHash = `${payload.context}_${payload.message}_${payload.error_code || ''}`
    const lastLogTime = logCache.get(logHash)
    const now = Date.now()
    
    if (lastLogTime && (now - lastLogTime < DEBOUNCE_MS)) {
      return // Ignora se o mesmo erro aconteceu recentemente (ES-2)
    }
    
    logCache.set(logHash, now)
    
    isLogging = true
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const safeMetadata = sanitizeMetadata(payload.metadata || {})

      // Inclui rota e dados do usuário caso esteja no browser
      if (typeof window !== 'undefined') {
        if (!safeMetadata.pathname) {
          safeMetadata.pathname = window.location.pathname
          safeMetadata.url = window.location.href
        }

        if (!safeMetadata.usuario) {
          try {
            const authState = useAuthStore.getState()
            const schoolState = useSchoolStore.getState()
            const func = authState.getFuncionarioAtivo?.() || authState.funcionario
            if (func || user) {
              safeMetadata.usuario = {
                id: func?.id || user?.id || null,
                auth_user_id: user?.id || func?.auth_user_id || null,
                nome: func?.nome || user?.user_metadata?.nome || user?.email || 'Usuário Não Identificado',
                email: func?.email || user?.email || 'N/A',
                cargo: func?.cargo || (func?.is_superadmin ? 'Superadmin' : 'Usuário'),
                escola: schoolState.selectedEscola?.nome || null
              }
            }
          } catch {
            // Ignora erro ao acessar store
          }
        }
      }

      await (supabase.from as any)('system_logs').insert({
        severity: payload.severity,
        context: payload.context,
        message: payload.message || 'Erro sem mensagem',
        error_code: payload.error_code || null,
        user_id: user?.id || null,
        metadata: safeMetadata
      })
    } catch (err) {
      // Se falhar silenciosamente, ignoramos para não derrubar o frontend
      // Mas logamos nativamente sem passar pelo logger para evitar loops
      console.warn('Failed to save to system_logs', err)
    } finally {
      isLogging = false
    }
  },
  
  error: (context: string, error: any, metadata?: any) => {
    let message = 'Unknown Error'
    let errorCode: string | null = null
    let stack = undefined
    
    if (error instanceof Error) {
      message = error.message
      stack = error.stack
      errorCode = (error as any).status || (error as any).code || null
    } else if (typeof error === 'string') {
      message = error === '[object Object]' ? 'Erro de objeto não serializado' : error
    } else if (error && typeof error === 'object') {
      message = error.message || error.error_description || error.details || error.hint || ''
      if (!message) {
        try {
          message = JSON.stringify(error)
        } catch {
          message = 'Erro em objeto não serializável'
        }
      }
      errorCode = error.status || error.code || error.statusCode || null
    }

    // Se for erro de Supabase API / Auth
    if (error?.status === 401 || error?.code === '401' || errorCode === '401' || (errorCode as any) === 401) {
      errorCode = '401'
    }

    sysLogger.log({
      severity: 'error',
      context,
      message,
      error_code: errorCode ? String(errorCode) : null,
      metadata: { ...metadata, stack }
    })
  }
}
