'use client'

import { useState } from 'react'
import { Download, Sparkles, Share, PlusSquare, Tablet, Smartphone, HelpCircle } from 'lucide-react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'

interface PwaInstallButtonProps {
  variant?: 'button' | 'sidebar' | 'banner' | 'login'
  className?: string
}

export function PwaInstallButton({ variant = 'button', className = '' }: PwaInstallButtonProps) {
  const { isInstalled, canInstall, isIOS, showIOSModal, setShowIOSModal, installApp, deferredPrompt } = usePwaInstall()
  const [showAndroidTabletHelp, setShowAndroidTabletHelp] = useState(false)

  // Se já está rodando como aplicativo instalado, não renderiza nada
  if (isInstalled) return null

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }

    if (deferredPrompt) {
      await installApp()
    } else {
      // Se não há deferredPrompt (ex: navegador em Desktop mode no tablet)
      setShowAndroidTabletHelp(true)
    }
  }

  // Se for variante Login
  if (variant === 'login') {
    return (
      <>
        <div className={`w-full max-w-[420px] mt-3 ${className}`}>
          <button
            type="button"
            onClick={handleClick}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-[#1c1c20] hover:bg-[#25252b] text-[#389fff] text-xs font-semibold border border-[#389fff]/20 shadow-md transition-all active:scale-[0.98] cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-[#389fff] group-hover:rotate-12 transition-transform" />
            <span>Instalar Aplicativo SIG no Aparelho</span>
            <Download className="w-3.5 h-3.5 text-zinc-400 ml-auto" />
          </button>
        </div>

        {/* Modal de instruções para iPad/iOS */}
        <StandardDialog
          open={showIOSModal}
          onOpenChange={setShowIOSModal}
          title="Instalar SIG no iPad / iPhone"
          maxWidth="sm:max-w-[440px]"
          footer={
            <Button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full h-11 bg-[#389fff] hover:bg-[#288ffa] text-black font-bold rounded-xl cursor-pointer"
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
                  No Safari do iPad ou iPhone, toque no botão de compartilhar (ícone de quadrado com seta para cima).
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
                  Role o menu para baixo e selecione a opção <strong>&quot;Adicionar à Tela de Início&quot;</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-zinc-900/80 rounded-xl border border-zinc-800">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <Tablet className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-white">3. Concluir Instalação</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Toque em <strong>&quot;Adicionar&quot;</strong> no canto superior direito. O SIG abrirá como aplicativo independente.
                </p>
              </div>
            </div>
          </div>
        </StandardDialog>

        {/* Modal de instruções para Tablet Android */}
        <StandardDialog
          open={showAndroidTabletHelp}
          onOpenChange={setShowAndroidTabletHelp}
          title="Instalação no Tablet ou Navegador"
          maxWidth="sm:max-w-[440px]"
          footer={
            <Button
              type="button"
              onClick={() => setShowAndroidTabletHelp(false)}
              className="w-full h-11 bg-[#389fff] hover:bg-[#288ffa] text-black font-bold rounded-xl cursor-pointer"
            >
              Entendi
            </Button>
          }
        >
          <div className="space-y-3.5 text-zinc-300 text-sm py-2">
            <p className="text-xs text-zinc-400">
              Para instalar o SIG no seu tablet ou computador:
            </p>

            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-white font-medium text-xs">
                <Tablet className="w-4 h-4 text-sky-400" />
                <span>Se estiver no Chrome do Tablet:</span>
              </div>
              <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside pl-1 leading-relaxed">
                <li>Abra o menu do Chrome (<strong>3 pontinhos</strong> no canto superior direito).</li>
                <li>Se a opção <strong>&quot;Para computador&quot;</strong> estiver ativada, desmarque-a temporariamente.</li>
                <li>Selecione <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong>.</li>
                <li>Ou toque no ícone de instalação diretamente na barra de endereço (ao lado do link).</li>
              </ul>
            </div>
          </div>
        </StandardDialog>
      </>
    )
  }

  // Se for variante Sidebar
  if (variant === 'sidebar') {
    return (
      <>
        <div className={`px-2 py-1.5 ${className}`}>
          <button
            type="button"
            onClick={handleClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#1e1e22] hover:bg-[#292930] text-zinc-200 hover:text-white text-xs font-medium border border-zinc-800/80 transition-all cursor-pointer group"
          >
            <Download className="w-4 h-4 text-[#389fff] group-hover:scale-110 transition-transform" />
            <span>Instalar Aplicativo</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#389fff]/10 text-[#389fff] font-bold">
              PWA
            </span>
          </button>
        </div>

        {/* Modal de instruções para iPad/iOS */}
        <StandardDialog
          open={showIOSModal}
          onOpenChange={setShowIOSModal}
          title="Instalar SIG no iPad / iPhone"
          maxWidth="sm:max-w-[440px]"
          footer={
            <Button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full h-11 bg-[#389fff] hover:bg-[#288ffa] text-black font-bold rounded-xl cursor-pointer"
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
                  No Safari do iPad ou iPhone, toque no botão de compartilhar (ícone de quadrado com seta para cima).
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

        {/* Modal de instruções para Tablet Android */}
        <StandardDialog
          open={showAndroidTabletHelp}
          onOpenChange={setShowAndroidTabletHelp}
          title="Instalação no Tablet ou Computador"
          maxWidth="sm:max-w-[440px]"
          footer={
            <Button
              type="button"
              onClick={() => setShowAndroidTabletHelp(false)}
              className="w-full h-11 bg-[#389fff] hover:bg-[#288ffa] text-black font-bold rounded-xl cursor-pointer"
            >
              Entendi
            </Button>
          }
        >
          <div className="space-y-3.5 text-zinc-300 text-sm py-2">
            <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-white font-medium text-xs">
                <Tablet className="w-4 h-4 text-sky-400" />
                <span>Instalação no Chrome do Tablet:</span>
              </div>
              <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside pl-1 leading-relaxed">
                <li>Abra o menu de <strong>3 pontinhos</strong> do navegador.</li>
                <li>Se <strong>&quot;Para computador&quot;</strong> estiver ativo, desmarque-o.</li>
                <li>Toque em <strong>&quot;Instalar aplicativo&quot;</strong>.</li>
                <li>Ou clique no ícone de instalação dentro da barra de endereços.</li>
              </ul>
            </div>
          </div>
        </StandardDialog>
      </>
    )
  }

  // Padrão / Banner
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1c1c20] hover:bg-[#282830] text-[#389fff] text-xs font-semibold border border-[#389fff]/20 shadow-sm transition-all cursor-pointer ${className}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#389fff]" />
        <span>Instalar Aplicativo</span>
        <Download className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      <StandardDialog
        open={showIOSModal}
        onOpenChange={setShowIOSModal}
        title="Instalar SIG no iPad / iPhone"
        maxWidth="sm:max-w-[440px]"
        footer={
          <Button
            type="button"
            onClick={() => setShowIOSModal(false)}
            className="w-full h-11 bg-[#389fff] hover:bg-[#288ffa] text-black font-bold rounded-xl cursor-pointer"
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
                No Safari do iPad ou iPhone, toque no botão de compartilhar (ícone de quadrado com seta para cima).
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

      <StandardDialog
        open={showAndroidTabletHelp}
        onOpenChange={setShowAndroidTabletHelp}
        title="Instalação no Tablet ou Computador"
        maxWidth="sm:max-w-[440px]"
        footer={
          <Button
            type="button"
            onClick={() => setShowAndroidTabletHelp(false)}
            className="w-full h-11 bg-[#389fff] hover:bg-[#288ffa] text-black font-bold rounded-xl cursor-pointer"
          >
            Entendi
          </Button>
        }
      >
        <div className="space-y-3.5 text-zinc-300 text-sm py-2">
          <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-white font-medium text-xs">
              <Tablet className="w-4 h-4 text-sky-400" />
              <span>Instalação no Chrome do Tablet:</span>
            </div>
            <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside pl-1 leading-relaxed">
              <li>Abra o menu de <strong>3 pontinhos</strong> do navegador.</li>
              <li>Se <strong>&quot;Para computador&quot;</strong> estiver ativo, desmarque-o.</li>
              <li>Toque em <strong>&quot;Instalar aplicativo&quot;</strong>.</li>
              <li>Ou clique no ícone de instalação dentro da barra de endereços.</li>
            </ul>
          </div>
        </div>
      </StandardDialog>
    </>
  )
}
