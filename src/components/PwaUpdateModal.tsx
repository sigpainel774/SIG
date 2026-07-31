'use client'

import { useEffect, useState } from 'react'
import { usePwaUpdateWatcher } from '@/hooks/usePwaUpdateWatcher'
import { RefreshCw, Sparkles, ShieldCheck, Download, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PwaUpdateModal() {
  const { showUpdateModal, newVersion, newMessage, triggerUpdate } = usePwaUpdateWatcher()
  const [updating, setUpdating] = useState(false)
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!showUpdateModal) {
      setCountdown(5)
      setUpdating(false)
      return
    }

    // Regressão automática de 5 a 0 segundos
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleUpdate()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showUpdateModal])

  const handleUpdate = () => {
    setUpdating(true)
    triggerUpdate()
  }

  if (!showUpdateModal) return null

  const progressPercent = ((5 - countdown) / 5) * 100

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#141416] border border-[#26262a] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden select-none">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Dynamic Header Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-sky-400" />
            <span>Nova Versão Disponível</span>
          </div>

          {newVersion && (
            <span className="px-2.5 py-0.5 rounded-md bg-[#26262a] text-[#a78bfa] border border-[#3f3f46] text-xs font-extrabold tracking-wider uppercase">
              {newVersion}
            </span>
          )}
        </div>

        {/* Animated Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500/20 to-purple-500/20 border border-sky-500/30 text-sky-400 shadow-inner">
            <RefreshCw className={`w-10 h-10 ${updating ? 'animate-spin text-purple-400' : 'animate-spin text-sky-400'}`} style={{ animationDuration: '6s' }} />
            <ShieldCheck className="w-5 h-5 absolute text-emerald-400 bottom-1 right-1 drop-shadow" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-2 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {updating ? 'Atualizando Aplicativo...' : 'Atualização Obrigatória do SIG'}
          </h2>
          <p className="text-xs sm:text-sm text-[#aaa] leading-relaxed">
            {newMessage}
          </p>
        </div>

        {/* Progress Bar & Countdown */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-center text-xs text-[#888] font-medium">
            <span>{updating ? 'Reiniciando aplicação...' : 'Atualização automática em:'}</span>
            <span className="text-sky-400 font-bold">{updating ? '0s' : `${countdown}s`}</span>
          </div>

          <div className="w-full h-2 bg-[#222226] rounded-full overflow-hidden border border-[#333338]">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleUpdate}
            disabled={updating}
            className="w-full h-12 bg-gradient-to-r from-sky-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-sky-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {updating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Aplicando Pacote...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Atualizar Agora ({countdown}s)</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>

          <p className="text-[11px] text-center text-[#666]">
            Os dados salvos localmente não serão perdidos durante a atualização.
          </p>
        </div>
      </div>
    </div>
  )
}
