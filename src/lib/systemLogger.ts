import { createClient } from '@/lib/supabaseClient'

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
            lowerKey.includes('secret')
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
      
      const safeMetadata = sanitizeMetadata(payload.metadata)

      await (supabase.from as any)('system_logs').insert({
        severity: payload.severity,
        context: payload.context,
        message: payload.message,
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
    let errorCode = null
    let stack = undefined
    
    if (error instanceof Error) {
      message = error.message
      stack = error.stack
      errorCode = (error as any).status || (error as any).code || null
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error === 'object') {
      message = error.message || JSON.stringify(error)
      errorCode = error.status || error.code || null
    }

    // Se for erro de Supabase API
    if (error?.status === 401 || error?.code === '401' || errorCode === 401) {
      errorCode = '401'
    }

    sysLogger.log({
      severity: 'error',
      context,
      message,
      error_code: String(errorCode || ''),
      metadata: { ...metadata, stack }
    })
  }
}
