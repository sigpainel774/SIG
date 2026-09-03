'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'

const LOCAL_STORAGE_KEY = 'sig_pwa_version'

export interface PwaUpdateInfo {
  showUpdateModal: boolean
  newVersion: string
  newMessage: string
  currentVersion: string
  staggerSeconds: number
  lastUpdatedAt: string | null
  updatedByName: string | null
  triggerUpdate: () => void
  dismissModal: () => void
}

export function usePwaUpdateWatcher(): PwaUpdateInfo {
  const supabase = createClient()
  const isMounted = useRef(true)

  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [newVersion, setNewVersion] = useState('')
  const [newMessage, setNewMessage] = useState('Uma nova versão do SIG foi disponibilizada. O sistema será atualizado automaticamente em instantes.')
  const [currentVersion, setCurrentVersion] = useState('v13')
  const [staggerSeconds, setStaggerSeconds] = useState(60)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [updatedByName, setUpdatedByName] = useState<string | null>(null)

  const checkVersion = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from('system_config' as any) as any)
        .select('chave, valor, updated_at, updated_by, funcionarios(nome)')
        .in('chave', ['pwa_version', 'pwa_update_message', 'pwa_stagger_seconds'])

      if (error || !data || !isMounted.current) return

      // Prevenção de loop de rebaixamento de versão: se a query retornou vazia
      // (ex: não autenticado no login e bloqueado por RLS), abortar a checagem.
      if (data.length === 0) return

      let serverVer = 'v13'
      let serverMsg = 'Uma nova versão do SIG foi disponibilizada. O sistema será atualizado automaticamente em instantes.'
      let serverStagger = 60
      let updatedAt: string | null = null
      let updatedBy: string | null = null

      data.forEach((item: any) => {
        if (item.chave === 'pwa_version') {
          serverVer = item.valor
          updatedAt = item.updated_at || null
          updatedBy = item.funcionarios?.nome || null
        } else if (item.chave === 'pwa_update_message') {
          serverMsg = item.valor
        } else if (item.chave === 'pwa_stagger_seconds') {
          serverStagger = parseInt(item.valor, 10) || 60
        }
      })

      if (isMounted.current) {
        setCurrentVersion(serverVer)
        setNewMessage(serverMsg)
        setStaggerSeconds(serverStagger)
        setLastUpdatedAt(updatedAt)
        setUpdatedByName(updatedBy)
      }

      const localVer = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null

      if (!localVer) {
        // Primeira abertura do app: registra a versão atual sem forçar modal
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, serverVer)
        }
      } else if (localVer !== serverVer) {
        // Versão no servidor mudou! Exibir modal de atualização
        if (isMounted.current) {
          setNewVersion(serverVer)
          setShowUpdateModal(true)
        }
      }
    } catch (err) {
      console.error('[usePwaUpdateWatcher] Erro ao checar versão do PWA:', err)
    }
  }, [supabase])

  useEffect(() => {
    isMounted.current = true
    let channel: any = null

    // 1. Checagem inicial
    checkVersion()

    // 2. Realtime subscription apenas se houver sessão autenticada (evita conexões WebSocket de deslogados)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted.current || !session) return

      channel = supabase
        .channel('system_config_pwa_watcher')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'system_config' },
          (payload: any) => {
            if (!isMounted.current) return
            const newRow = payload.new
            if (!newRow) return

            if (newRow.chave === 'pwa_version') {
              let localVer: string | null = null
              if (typeof window !== 'undefined') {
                try {
                  localVer = localStorage.getItem(LOCAL_STORAGE_KEY)
                } catch (e) {
                  console.warn('[usePwaUpdateWatcher] Falha ao ler localStorage:', e)
                }
              }
              setCurrentVersion(newRow.valor)
              if (newRow.updated_at) setLastUpdatedAt(newRow.updated_at)

              if (localVer && localVer !== newRow.valor) {
                setNewVersion(newRow.valor)
                setShowUpdateModal(true)
              }
            } else if (newRow.chave === 'pwa_update_message') {
              setNewMessage(newRow.valor)
            } else if (newRow.chave === 'pwa_stagger_seconds') {
              setStaggerSeconds(parseInt(newRow.valor, 10) || 60)
            }
          }
        )
        .subscribe()
    })

    return () => {
      isMounted.current = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, checkVersion])

  const triggerUpdate = useCallback(() => {
    const verToSave = newVersion || currentVersion || 'v13'

    // 1. Salva nova versão no localStorage para não disparar novamente
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, verToSave)
      } catch (e) {
        console.warn('[usePwaUpdateWatcher] Falha ao gravar localStorage:', e)
      }
    }

    // 2. Atualiza o registro e ativa somente um worker que esteja aguardando.
    // O listener global de `controllerchange` cuida do recarregamento quando
    // houver troca de worker; o timer abaixo é apenas um fallback.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.allSettled(registrations.map((registration) => registration.update()))
        registrations.forEach((registration) => {
          registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        })
      }).catch(() => {})
    }

    // 3. Fallback para instalações sem um novo Service Worker aguardando.
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    }, 4000)
  }, [newVersion, currentVersion])

  const dismissModal = useCallback(() => {
    setShowUpdateModal(false)
  }, [])

  return {
    showUpdateModal,
    newVersion,
    newMessage,
    currentVersion,
    staggerSeconds,
    lastUpdatedAt,
    updatedByName,
    triggerUpdate,
    dismissModal,
  }
}
