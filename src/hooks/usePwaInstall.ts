'use client'

import { useState, useEffect, useCallback } from 'react'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// Armazena o evento globalmente para não perdê-lo em transições de rotas
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)

  useEffect(() => {
    // 1. Checa se o app já está rodando em modo standalone (PWA instalado)
    const isStandaloneMode =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true)

    setIsInstalled(Boolean(isStandaloneMode))

    // 2. Detecção de iOS / iPadOS (incluindo iPads que fingem ser Mac com tela touch)
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase()
      const isAppleMobile =
        /iphone|ipad|ipod/.test(userAgent) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
      setIsIOS(isAppleMobile)
    }

    if (isStandaloneMode) return

    // 3. Listener do evento nativo do Chromium (Android tablet, celulares, desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      globalDeferredPrompt = promptEvent
      setDeferredPrompt(promptEvent)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      globalDeferredPrompt = null
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Se já havia sido capturado antes
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = useCallback(async () => {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }

    if (!deferredPrompt) {
      // Caso o navegador não tenha disparado beforeinstallprompt (ex: Chrome em modo Desktop no tablet)
      // Podemos orientar o usuário
      return false
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        globalDeferredPrompt = null
        setDeferredPrompt(null)
        return true
      }
      return false
    } catch (err) {
      console.error('[usePwaInstall] Erro ao disparar prompt de instalação:', err)
      return false
    }
  }, [deferredPrompt, isIOS])

  return {
    isInstalled,
    canInstall: Boolean(deferredPrompt) || (isIOS && !isInstalled),
    deferredPrompt,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    installApp,
  }
}
