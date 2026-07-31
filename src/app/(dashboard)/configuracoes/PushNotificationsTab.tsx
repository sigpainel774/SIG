'use client'

import { usePushNotification } from '@/hooks/usePushNotification'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Smartphone,
  Info,
  Loader2,
  Share,
  PlusSquare,
} from 'lucide-react'
import { useState, useEffect } from 'react'

export function PushNotificationsTab() {
  const {
    isSupported,
    permissionState,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
  } = usePushNotification()

  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase()
      const iosDevice = /iphone|ipad|ipod/.test(userAgent)
      setIsIOS(iosDevice)

      // Checa se está rodando instalado como PWA no iOS
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
      setIsStandalone(standalone)
    }
  }, [])

  const handleToggle = async () => {
    if (isSubscribed) {
      const ok = await unsubscribe()
      if (ok) {
        toast.info('Notificações push desativadas neste dispositivo.')
      } else {
        toast.error('Erro ao desativar notificações.')
      }
    } else {
      const ok = await subscribe()
      if (ok) {
        toast.success('🎉 Notificações Push ativadas com sucesso neste dispositivo!')
      } else if (permissionState === 'denied') {
        toast.error('Permissão bloqueada no navegador. Siga as instruções abaixo para liberar.')
      } else {
        toast.error('Não foi possível ativar as notificações push. Verifique o suporte do seu navegador.')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header do Card */}
      <Card className="p-6 bg-card border-borderCustom space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-borderCustom pb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-highlight/10 text-highlight shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foregroundCustom">Notificações Push no Dispositivo</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Receba alertas nativos de <strong className="text-foregroundCustom">Mensagens Internas</strong> e <strong className="text-foregroundCustom">Comunicados do Mural</strong> diretamente na central de notificações do seu celular, tablet ou computador.
              </p>
            </div>
          </div>

          {/* Badge Status */}
          <div className="shrink-0">
            {isSubscribed && permissionState === 'granted' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ativado neste dispositivo
              </span>
            )}
            {!isSubscribed && permissionState === 'granted' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                Permitido (Pendente de Inscrição)
              </span>
            )}
            {permissionState === 'default' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Info className="w-3.5 h-3.5" />
                Pronto para Ativar
              </span>
            )}
            {permissionState === 'denied' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Lock className="w-3.5 h-3.5" />
                Bloqueado no Navegador
              </span>
            )}
            {permissionState === 'unsupported' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                <BellOff className="w-3.5 h-3.5" />
                Não Suportado
              </span>
            )}
          </div>
        </div>

        {/* Ação Principal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-borderCustom">
          <div className="space-y-1">
            <h3 className="font-semibold text-foregroundCustom text-sm">
              {isSubscribed ? 'Notificações Push estão Ativas' : 'Deseja receber avisos neste aparelho?'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? 'Seu aparelho está registrado e pronto para receber avisos instantâneos mesmo com o aplicativo fechado.'
                : 'Clique no botão ao lado para conceder permissão e receber avisos no seu celular ou tablet.'}
            </p>
          </div>

          <Button
            onClick={handleToggle}
            disabled={loading || permissionState === 'unsupported'}
            className={`shrink-0 cursor-pointer font-semibold transition-all ${
              isSubscribed
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                : 'bg-[#185FA5] hover:bg-[#144f8a] dark:bg-[#3ea6ff] dark:hover:bg-[#2b95ee] text-white dark:text-zinc-950'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : isSubscribed ? (
              <BellOff className="w-4 h-4 mr-2" />
            ) : (
              <Bell className="w-4 h-4 mr-2" />
            )}
            {isSubscribed ? 'Desativar Push neste Aparelho' : 'Ativar Notificações Push'}
          </Button>
        </div>

        {/* Alerta de Permissão Bloqueada (Prevenção de Erros Silenciosos) */}
        {permissionState === 'denied' && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
            <Lock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-200">As notificações estão bloqueadas nas configurações do seu navegador.</p>
              <p>
                Para liberar e conseguir ativar as notificações push:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-rose-300/90 pl-1 mt-1">
                <li>Clique no ícone de <strong>cadeado 🔒</strong> ou <strong>ajustes 🎛️</strong> ao lado do endereço do site (URL) na topo da tela.</li>
                <li>Localize a opção <strong>"Notificações"</strong> e mude para <strong>"Permitir"</strong>.</li>
                <li>Recarregue a página e clique no botão acima novamente.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Alerta de iOS / iPhone / iPad */}
        {isIOS && !isStandalone && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 text-amber-300 text-xs leading-relaxed">
            <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-200">Aviso importante para usuários de iPhone / iPad (iOS):</p>
              <p>
                A Apple exige que o SIG seja adicionado à sua <strong>Tela de Início</strong> para permitir notificações push no iPhone ou iPad.
              </p>
              <div className="flex items-center gap-2 mt-2 pt-1 border-t border-amber-500/20 text-amber-200 font-medium">
                <span>1. Toque no ícone de Compartilhar <Share className="w-3.5 h-3.5 inline mx-0.5 text-amber-400" /></span>
                <span>➔</span>
                <span>2. Selecione <strong>"Adicionar à Tela de Início"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-amber-400" /></span>
              </div>
            </div>
          </div>
        )}

        {/* Nota Informativa de Privacidade */}
        <div className="bg-muted/20 border border-borderCustom rounded-xl p-3 flex items-center gap-3 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-[#185FA5] dark:text-[#3ea6ff] shrink-0" />
          <p>
            Suas notificações são criptografadas de ponta a ponta. Nenhuma informação pessoal confidencial do município é trafegada fora dos servidores protegidos.
          </p>
        </div>
      </Card>
    </div>
  )
}
