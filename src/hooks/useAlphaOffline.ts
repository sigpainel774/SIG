'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  enfileirarAcaoSyncAlpha,
  obterFilaPendenteAlpha,
  sincronizarFilaAlphaGlobal,
  salvarCacheEntidadeAlpha,
  obterCacheEntidadeAlpha,
  AlphaItemFilaSync,
} from '@/lib/alphaOfflineManager'

export interface UseAlphaOfflineReturn {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  pendingItems: AlphaItemFilaSync[]
  enqueue: (tabela: string, acao: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE', payload: Record<string, any>, id?: string) => Promise<AlphaItemFilaSync>
  syncNow: () => Promise<{ sincronizados: number; erros: number }>
  cacheData: <T = any>(chave: string, dados: T) => Promise<void>
  getCachedData: <T = any>(chave: string) => Promise<T | null>
}

/**
 * Hook universal para tornar qualquer módulo do Sistema Alpha 100% Offline-First
 * @param modulo Identificador único do módulo (ex: 'rotas-escolas', 'inspecao', etc.)
 */
export function useAlphaOffline(modulo: string): UseAlphaOfflineReturn {
  const supabase = createClient()
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingItems, setPendingItems] = useState<AlphaItemFilaSync[]>([])
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Carrega itens pendentes do módulo
  const refreshPending = useCallback(async () => {
    try {
      const items = await obterFilaPendenteAlpha(modulo)
      if (isMounted.current) {
        setPendingItems(items)
      }
    } catch {}
  }, [modulo])

  // Sincroniza a fila com o Supabase
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast.warning('Dispositivo sem conexão à internet. Sincronização adiada.')
      return { sincronizados: 0, erros: 0 }
    }

    setIsSyncing(true)
    try {
      const resultado = await sincronizarFilaAlphaGlobal(supabase, modulo)
      await refreshPending()

      if (resultado.sincronizados > 0) {
        toast.success(
          `${resultado.sincronizados} registro(s) do módulo "${modulo}" sincronizado(s) com sucesso!`,
          { icon: '📶' }
        )
      }
      if (resultado.erros > 0) {
        toast.error(`${resultado.erros} item(ns) aguardando nova tentativa de envio.`)
      }

      return resultado
    } catch (err: any) {
      console.error('Erro na sincronização do Alpha:', err)
      return { sincronizados: 0, erros: 1 }
    } finally {
      if (isMounted.current) {
        setIsSyncing(false)
      }
    }
  }, [supabase, modulo, refreshPending])

  // Monitora status da rede (online/offline)
  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)
    refreshPending()

    const handleOnline = () => {
      if (isMounted.current) setIsOnline(true)
      toast.success('Conexão restabelecida! Sincronizando dados em segundo plano...', {
        icon: '📶',
      })
      syncNow()
    }

    const handleOffline = () => {
      if (isMounted.current) setIsOnline(false)
      toast.warning('Você está offline. As alterações serão salvas localmente no aparelho.', {
        icon: '📡',
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncNow, refreshPending])

  // Enfileira ação para envio offline
  const enqueue = useCallback(
    async (
      tabela: string,
      acao: 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE',
      payload: Record<string, any>,
      id?: string
    ) => {
      const item = await enfileirarAcaoSyncAlpha({
        id,
        modulo,
        tabela,
        acao,
        payload,
      })

      await refreshPending()

      // Se estiver online, dispara sincronização imediata em segundo plano
      if (navigator.onLine) {
        syncNow()
      } else {
        toast.info(`Salvo localmente no aparelho. Será enviado quando a internet voltar.`, {
          icon: '💾',
        })
      }

      return item
    },
    [modulo, refreshPending, syncNow]
  )

  // Salva dados no cache local da entidade
  const cacheData = useCallback(
    async <T = any>(chave: string, dados: T) => {
      await salvarCacheEntidadeAlpha(modulo, chave, dados)
    },
    [modulo]
  )

  // Recupera dados do cache local da entidade
  const getCachedData = useCallback(
    async <T = any>(chave: string): Promise<T | null> => {
      return await obterCacheEntidadeAlpha<T>(modulo, chave)
    },
    [modulo]
  )

  return {
    isOnline,
    isSyncing,
    pendingCount: pendingItems.length,
    pendingItems,
    enqueue,
    syncNow,
    cacheData,
    getCachedData,
  }
}
