'use client'

import { Download, Sparkles, Share, PlusSquare } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'

export function PortalPaisInstallButton() {
  const { isInstalled, isIOS, showIOSModal, setShowIOSModal, installApp } = usePwaInstall()

  if (isInstalled) return null

  return (
    <>
      <div className="w-full max-w-sm mx-auto mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <button
          type="button"
          onClick={installApp}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Instalar App dos Pais na Tela Inicial</span>
          <Download className="w-3.5 h-3.5 opacity-70 ml-auto" />
        </button>
      </div>

      <StandardDialog
        open={showIOSModal}
        onOpenChange={setShowIOSModal}
        title="Instalar App no iPad / iPhone"
        maxWidth="sm:max-w-[440px]"
        footer={
          <Button
            type="button"
            onClick={() => setShowIOSModal(false)}
            className="w-full h-11 bg-[#0B4FB3] hover:bg-[#093d8b] text-white font-bold rounded-xl cursor-pointer"
          >
            Entendi
          </Button>
        }
      >
        <div className="space-y-4 text-zinc-300 text-sm py-2">
          <div className="flex items-start gap-3 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
              <Share className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white">1. Toque em Compartilhar</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                No Safari, toque no botão de compartilhar (quadrado com seta para cima).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <PlusSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white">2. Adicionar à Tela de Início</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                Role o menu para baixo e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
              </p>
            </div>
          </div>
        </div>
      </StandardDialog>
    </>
  )
}
