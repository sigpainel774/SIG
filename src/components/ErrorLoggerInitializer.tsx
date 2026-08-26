'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initErrorToastInterceptor, recordNavigationStep } from '@/lib/errorLogger'

export function ErrorLoggerInitializer() {
  const pathname = usePathname()

  useEffect(() => {
    // 1. Inicializa o interceptador global de toasts de erro
    initErrorToastInterceptor()

    // 2. Garante ID de sessão no sessionStorage
    if (typeof window !== 'undefined') {
      try {
        if (!sessionStorage.getItem('sig_session_id')) {
          sessionStorage.setItem('sig_session_id', 'sess_' + crypto.randomUUID().slice(0, 8))
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    // 3. Registra a navegação a cada troca de rota
    if (pathname) {
      recordNavigationStep(pathname)
    }
  }, [pathname])

  return null
}
