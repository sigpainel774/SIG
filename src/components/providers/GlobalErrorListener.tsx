'use client'

import { useEffect } from 'react'
import { sysLogger } from '@/lib/systemLogger'

export function GlobalErrorListener() {
  useEffect(() => {
    // 1. Captura erros não tratados no React / JS (ex: referência nula durante o render)
    const handleWindowError = (event: ErrorEvent) => {
      sysLogger.error('Window Error', event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    }

    // 2. Captura promessas rejeitadas (ex: erro de API Supabase sem try/catch)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      sysLogger.error('Unhandled Promise Rejection', event.reason)
    }

    // 3. Intercepta console.error para capturar erros silenciados em blocos try/catch
    const originalConsoleError = console.error
    console.error = (...args: any[]) => {
      // Executa o console original primeiro
      originalConsoleError.apply(console, args)
      
      try {
        const firstArg = args[0]
        
        // Ignora erros conhecidos que são "barulho" do Next.js
        if (typeof firstArg === 'string' && (
          firstArg.includes('Warning: React does not recognize') ||
          firstArg.includes('validateDOMNesting')
        )) {
          return
        }

        let errorObj = null
        let context = 'Console Error'
        
        // Procura por objetos Error nos argumentos
        for (const arg of args) {
          if (arg instanceof Error) {
            errorObj = arg
            break
          }
        }
        
        // Se achou um erro explícito
        if (errorObj) {
          sysLogger.error(context, errorObj, { args: args.map(a => typeof a === 'object' ? String(a) : a) })
        } else {
          // Senão apenas loga os argumentos como string
          sysLogger.error(context, args.join(' '))
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
