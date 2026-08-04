'use client'

import { useEffect, useState } from 'react'
import { Share, PlusSquare, Trash2, X, Smartphone, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PWAIconUpdateNotice() {
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Detecta iOS
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isIOS) return

    // 2. Detecta se está rodando em modo Standalone PWA
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches

    if (!isStandalone) return

    // 3. Verifica se o usuário já dispensou este aviso nesta versão
    const dismissedVersion = localStorage.getItem('sig_ios_icon_notice_dismissed_v12')
    if (!dismissedVersion) {
      setShowNotice(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('sig_ios_icon_notice_dismissed_v12', 'true')
    setShowNotice(false)
  }

  if (!showNotice) return null

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-[9999] bg-[#141416] border border-sky-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
          <Smartphone className="w-4 h-4 text-sky-400 animate-bounce" />
          <span>Novo Ícone do App no iOS</span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[#888] hover:text-white p-1 rounded-lg hover:bg-[#26262a] transition-colors"
          aria-label="Fechar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-[#ccc] leading-relaxed mb-4">
        O iOS não atualiza o ícone da tela inicial automaticamente. Para ver a nova marca do SIG no seu iPhone/iPad:
      </p>

      <div className="space-y-2 mb-4 text-xs text-[#aaa]">
        <div className="flex items-center gap-2 bg-[#1c1c20] p-2.5 rounded-xl border border-[#2a2a30]">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold text-[10px]">1</span>
          <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
          <span>Apague o atalho antigo da Tela de Início</span>
        </div>

        <div className="flex items-center gap-2 bg-[#1c1c20] p-2.5 rounded-xl border border-[#2a2a30]">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold text-[10px]">2</span>
          <Share className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Abra pelo Safari e toque em <strong>Compartilhar</strong></span>
        </div>

        <div className="flex items-center gap-2 bg-[#1c1c20] p-2.5 rounded-xl border border-[#2a2a30]">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">3</span>
          <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Toque em <strong>Adicionar à Tela de Início</strong></span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#26262a]">
        <span className="text-[11px] text-[#666] flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          Sua sessão permanecerá intacta
        </span>
        <Button
          onClick={handleDismiss}
          size="sm"
          className="h-8 text-xs bg-sky-600 hover:bg-sky-500 text-white rounded-lg px-3"
        >
          Entendi
        </Button>
      </div>
    </div>
  )
}
