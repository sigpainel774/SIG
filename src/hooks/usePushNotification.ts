'use client'

import { useState, useEffect, useCallback } from 'react'

export type PushPermissionState = 'unsupported' | 'denied' | 'granted' | 'default'

/**
 * Converte chave pública VAPID de string Base64URL para Uint8Array.
 * Evita o erro TypeError: Failed to execute 'subscribe' on 'PushManager'
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotification() {
  const [permissionState, setPermissionState] = useState<PushPermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  // Checa se Push API & Service Worker são suportados e lê o estado atual
  const checkSubscription = useCallback(async () => {
    if (typeof window === 'undefined') return

    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window

    setIsSupported(supported)

    if (!supported) {
      setPermissionState('unsupported')
      return
    }

    const currentPermission = Notification.permission as PushPermissionState
    setPermissionState(currentPermission)

    if (currentPermission === 'denied') {
      setIsSubscribed(false)
      return
    }

    try {
      // Timeout defensivo de 5 segundos em ready
      const swPromise = navigator.serviceWorker.ready
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('SW ready timeout')), 5000)
      )

      const reg = (await Promise.race([swPromise, timeoutPromise])) as ServiceWorkerRegistration | null
      if (reg) {
        const existingSub = await reg.pushManager.getSubscription()
        setIsSubscribed(!!existingSub)
      }
    } catch (err) {
      console.warn('[usePushNotification] Aviso ao checar inscrição:', err)
    }
  }, [])

  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])

  // Inscrever o dispositivo para Push Notifications
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Push Notifications não são suportadas neste navegador.')
      return false
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY não está configurada nas variáveis de ambiente.')
      return false
    }

    setLoading(true)
    try {
      // Pedir permissão ao usuário via gesto explícito
      const permission = await Notification.requestPermission()
      setPermissionState(permission as PushPermissionState)

      if (permission !== 'granted') {
        setIsSubscribed(false)
        return false
      }

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey)
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as unknown as BufferSource,
        })
      }

      const subJSON = sub.toJSON()
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: subJSON.keys,
          userAgent: navigator.userAgent,
        }),
      })

      if (!res.ok) {
        throw new Error(`Falha no servidor (${res.status}) ao salvar inscrição`)
      }

      setIsSubscribed(true)
      return true
    } catch (err: any) {
      console.error('[usePushNotification] Erro ao inscrever no Push:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Desinscrever o dispositivo
  const unsubscribe = async (): Promise<boolean> => {
    if (!isSupported) return false

    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()

      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()

        await fetch('/api/push/unsubscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        }).catch(() => {})
      }

      setIsSubscribed(false)
      return true
    } catch (err: any) {
      console.error('[usePushNotification] Erro ao desinscrever do Push:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    isSupported,
    permissionState,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    checkSubscription,
  }
}
