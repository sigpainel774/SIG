'use client'

import { useEffect } from 'react'
import { sysLogger } from '@/lib/systemLogger'

function serializeConsoleArgs(args: any[]) {
  let primaryError: any = null
  let extractedCode: string | null = null
  const stringParts: string[] = []
  const safeArgs: any[] = []

  for (const arg of args) {
    if (arg instanceof Error) {
      if (!primaryError) primaryError = arg
      stringParts.push(arg.message)
      safeArgs.push({ name: arg.name, message: arg.message, stack: arg.stack })
    } else if (typeof arg === 'string') {
      stringParts.push(arg)
      safeArgs.push(arg)
    } else if (arg && typeof arg === 'object') {
      if (!primaryError && (arg.message || arg.details || arg.code)) {
        primaryError = arg
      }
      if (arg.code || arg.status || arg.statusCode) {
        extractedCode = String(arg.code || arg.status || arg.statusCode)
      }
      try {
        const json = JSON.stringify(arg)
        stringParts.push(arg.message || arg.details || json)
        safeArgs.push(JSON.parse(json))
      } catch {
        stringParts.push('[Object]')
        safeArgs.push('[Unserializable Object]')
      }
    } else {
      stringParts.push(String(arg))
      safeArgs.push(arg)
    }
  }

  const fullMessage = stringParts.join(' ').trim() || 'Erro no console'
  return { primaryError, extractedCode, fullMessage, safeArgs }
}

export function GlobalErrorListener() {
  useEffect(() => {
    // 1. Captura erros não tratados no React / JS (ex: referência nula durante o render)
    const handleWindowError = (event: ErrorEvent) => {
      sysLogger.error('Window Error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        pathname: typeof window !== 'undefined' ? window.location.pathname : undefined
      })
    }

    // 2. Captura promessas rejeitadas (ex: erro de API Supabase sem try/catch)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      sysLogger.error('Unhandled Promise Rejection', event.reason, {
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        pathname: typeof window !== 'undefined' ? window.location.pathname : undefined
      })
    }

    // 3. Intercepta console.error para capturar erros silenciados em blocos try/catch
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      // Executa o console original primeiro
      originalConsoleError.apply(console, args)
      
      try {
        const firstArg = args[0]
        
        // Ignora erros conhecidos que são "barulho" do Next.js / React dev
        if (typeof firstArg === 'string' && (
          firstArg.includes('Warning: React does not recognize') ||
          firstArg.includes('validateDOMNesting') ||
          firstArg.includes('Hydration failed') ||
          firstArg.includes('Failed to save to system_logs')
        )) {
          return
        }

        const { primaryError, extractedCode, fullMessage, safeArgs } = serializeConsoleArgs(args)
        
        const metadata: Record<string, any> = {
          args: safeArgs,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
          pathname: typeof window !== 'undefined' ? window.location.pathname : undefined
        }

        if (primaryError) {
          sysLogger.error('Console Error', primaryError, metadata)
        } else {
          sysLogger.log({
            severity: 'error',
            context: 'Console Error',
            message: fullMessage,
            error_code: extractedCode,
            metadata
          })
        }
      } catch(e) {
        // Fallback seguro caso o próprio interceptor falhe
        originalConsoleError('Falha no sysLogger do console.error', e)
      }
    }

    window.addEventListener('error', handleWindowError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleWindowError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      console.error = originalConsoleError
    }
  }, [])

  return null
}

