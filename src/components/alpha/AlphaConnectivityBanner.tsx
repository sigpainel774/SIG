'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudOff, AlertCircle } from 'lucide-react'
import { obterFilaPendenteAlpha, sincronizarFilaAlphaGlobal } from '@/lib/alphaOfflineManager'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function AlphaConnectivityBanner() {
  const supabase = createClient()
  const [isOnline, setIsOnline] = useState(true)
  const [pendentesCount, setPendentesCount] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)

  const carregarPendentes = useCallback(async () => {
    try {
      const items = await obterFilaPendenteAlpha()
      setPendentesCount(items.length)
    } catch {}
  }, [])

  const handleSincronizarManual = async () => {
    if (!navigator.onLine) {
      toast.warning('Sem conexão à internet no momento.')
      return
    }

    setSincronizando(true)
    try {
      const res = await sincronizarFilaAlphaGlobal(supabase, undefined, { forcar: true })
      await carregarPendentes()

      if (res.sincronizados > 0) {
        toast.success(`${res.sincronizados} registro(s) sincronizado(s) com o servidor!`)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sig_visitas_dados_atualizados'))
        }
      } else if (res.erros > 0) {
        toast.error('Alguns itens não puderam ser enviados. Tentaremos novamente em breve.')
      } else {
        toast.info('Tudo atualizado! Nenhum registro pendente.')
      }
    } catch (err) {
      toast.error('Erro ao sincronizar com o servidor.')
    } finally {
      setSincronizando(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    setIsOnline(navigator.onLine)
    carregarPendentes()

    const onOnline = () => {
      setIsOnline(true)
      carregarPendentes()
      handleSincronizarManual()
    }

    const onOffline = () => {
      setIsOnline(false)
      carregarPendentes()
    }

    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    // Intervalo suave de checagem a cada 15 segundos
    const interval = setInterval(carregarPendentes, 15000)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(interval)
    }
  }, [carregarPendentes])

  return (
    <div className="flex items-center gap-2">
      {/* Indicador de Rede */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors shadow-2xs select-none backdrop-blur-md',
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
        )}
        title={
          isOnline
            ? 'Conectado à internet. Sincronização automática ativa.'
            : 'Dispositivo offline. Todos os módulos continuam funcionando e gravando dados no aparelho.'
        }
      >
        {isOnline ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shadow-xs shadow-emerald-500/40" />
            <span className="hidden sm:inline">Online</span>
            <span className="sm:hidden">ON</span>
          </>
        ) : (
          <>
            <CloudOff className="w-3 h-3 text-amber-700" />
            <span className="hidden sm:inline">Modo Offline (Local)</span>
            <span className="sm:hidden">Offline</span>
          </>
        )}
      </div>

      {/* Botão de Pendências & Sincronismo */}
      {pendentesCount > 0 && (
        <button
          type="button"
          onClick={handleSincronizarManual}
          disabled={sincronizando || !isOnline}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-2xs disabled:opacity-60 select-none backdrop-blur-md',
            isOnline
              ? 'bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border hover:bg-sidebar-accent/80'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          )}
          title="Clique para sincronizar os dados acumulados no aparelho com o banco de dados"
        >
          <RefreshCw className={cn('w-3 h-3', sincronizando && 'animate-spin')} />
          <span>
            {sincronizando
              ? 'Enviando...'
              : `${pendentesCount} ${pendentesCount === 1 ? 'pendência' : 'pendências'}`}
          </span>
        </button>
      )}
    </div>
  )
}
