'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { usePushNotification } from '@/hooks/usePushNotification'
import { History, Home, RefreshCw, ArrowLeft, Bell, BellOff, Circle, Check, CheckCheck, Sliders, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { ModalConfiguracoesNotificacoes } from '@/components/modals/modal-configuracoes-notificacoes'
import { toast } from 'sonner'

export default function HistoricoNotificacoesPage() {
  const router = useRouter()
  const { funcionario, isAdminGlobalOrRoot } = useAuthStore()
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [status, setStatus] = useState('todas')
  const [busca, setBusca] = useState('')
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

  const {
    isSupported,
    permissionState,
    isSubscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
    checkSubscription,
  } = usePushNotification()

  const canManage = funcionario?.is_superadmin || isAdminGlobalOrRoot?.()

  const loadNotificacoes = async () => {
    if (!funcionario?.auth_user_id) return
    setLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('notifications')
      .select('id, user_id, title, message, type, link, read, created_at, processado_por_nome, processado_em')
      .eq('user_id', funcionario.auth_user_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (status === 'nao_lidas') query = query.eq('read', false)
    if (status === 'lidas') query = query.eq('read', true)
    if (status === 'comunicados') query = query.in('type', ['comunicado', 'mural'])
    if (status === 'transferencias') query = query.eq('type', 'transferencia')

    if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00`)
    if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`)

    if (busca) {
      query = query.or(`title.ilike.%${busca}%,message.ilike.%${busca}%`)
    }

    try {
      const { data, error } = await query
      if (error) throw error
      if (data) setNotificacoes(data)
    } catch (error) {
      console.error('Erro ao carregar histórico de notificações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotificacoes()
  }, [funcionario?.auth_user_id, status, dataInicio, dataFim, busca])

  const limparFiltros = () => {
    setDataInicio('')
    setDataFim('')
    setStatus('todas')
    setBusca('')
  }

  const markAsRead = async (notifId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const supabase = createClient()
    try {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notifId)
      if (error) throw error
      setNotificacoes((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)))
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!funcionario?.auth_user_id) return
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', funcionario.auth_user_id)
        .eq('read', false)

      if (error) throw error
      toast.success('Todas as notificações foram marcadas como lidas.')
      loadNotificacoes()
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error)
      toast.error('Erro ao atualizar notificações.')
    }
  }

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-borderCustom">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <History className="w-6 h-6 text-highlight" /> 
          Histórico de Notificações
        </h2>
        
        <div className="flex items-center gap-3">
          {canManage && (
            <Button 
              variant="outline"
              onClick={() => setConfigOpen(true)}
              className="bg-purple-600/10 border-purple-600/30 text-purple-400 hover:bg-purple-600/20 hover:text-purple-300 cursor-pointer"
            >
              <Sliders className="w-4 h-4 mr-2" /> Configurar Regras
            </Button>
          )}
          <Button 
            variant="outline"
            onClick={() => router.push('/home')}
            className="bg-card border-borderCustom text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Home className="w-4 h-4 mr-2" /> Menu Inicial
          </Button>
        </div>
      </div>

      {/* Banner de Ativação / Status de Push Notifications */}
      {isSupported && (
        <div className="bg-card border border-borderCustom rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-[#3ea6ff]/10 text-[#3ea6ff] shrink-0 mt-0.5 sm:mt-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground text-base">Notificações Push no Dispositivo</h3>
                  {isSubscribed && permissionState === 'granted' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" /> Ativado
                    </span>
                  )}
                  {permissionState === 'denied' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Lock className="w-3 h-3" /> Bloqueado no Navegador
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Receba alertas nativos instantâneos de mensagens, comunicados do mural e solicitações neste aparelho.
                </p>
              </div>
            </div>

            {/* Botão Principal de Ativar / Desativar */}
            {permissionState !== 'denied' && (
              <Button
                onClick={async () => {
                  if (isSubscribed) {
                    const ok = await unsubscribe()
                    if (ok) toast.info('Notificações push desativadas neste dispositivo.')
                    else toast.error('Erro ao desativar notificações.')
                  } else {
                    const ok = await subscribe()
                    if (ok) {
                      toast.success('Notificações push ativadas com sucesso!')
                    } else {
                      toast.error('Não foi possível ativar as notificações push.')
                    }
                  }
                }}
                disabled={pushLoading}
                className={`shrink-0 cursor-pointer text-xs font-semibold transition-all h-9 px-4 ${
                  isSubscribed
                    ? 'bg-muted hover:bg-muted/80 text-foreground border border-borderCustom'
                    : 'bg-[#3ea6ff] hover:bg-[#2b95ee] text-zinc-950 font-bold'
                }`}
              >
                {pushLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : isSubscribed ? (
                  <BellOff className="w-4 h-4 mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                {isSubscribed ? 'Desativar neste Aparelho' : 'Ativar Notificações no Dispositivo'}
              </Button>
            )}
          </div>

          {/* Banner de Alerta em caso de Permissão Bloqueada (denied) */}
          {permissionState === 'denied' && (
            <div className="bg-rose-500/10 border border-rose-500/25 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-rose-300">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-200">As notificações estão bloqueadas nas configurações do seu navegador.</p>
                  <p className="text-rose-300/90 leading-relaxed">
                    Para reativar: clique no ícone de <strong>cadeado 🔒</strong> na barra de endereço (topo da tela), altere a opção <strong>"Notificações"</strong> para <strong>"Permitir"</strong> e clique em Reverificar.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => {
                  checkSubscription()
                  toast.info('Verificando permissões do navegador...')
                }}
                variant="outline"
                className="shrink-0 cursor-pointer bg-rose-950/40 border-rose-500/40 text-rose-200 hover:bg-rose-900/60 hover:text-white text-xs h-8"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reverificar Permissão
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-card border border-borderCustom rounded-xl p-4 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex-1 min-w-[180px]">
          <Label className="text-muted-foreground text-xs mb-1.5 block">Data de Início</Label>
          <Input 
            type="date" 
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="bg-input border-borderCustom text-foreground"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label className="text-muted-foreground text-xs mb-1.5 block">Data de Fim</Label>
          <Input 
            type="date" 
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="bg-input border-borderCustom text-foreground"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <Label className="text-muted-foreground text-xs mb-1.5 block">Status / Tipo</Label>
          <Select value={status} onValueChange={(val) => val && setStatus(val)}>
            <SelectTrigger className="bg-input border-borderCustom text-foreground">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-borderCustom text-popover-foreground">
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="lidas">Lidas</SelectItem>
              <SelectItem value="nao_lidas">Não Lidas</SelectItem>
              <SelectItem value="comunicados">Comunicados</SelectItem>
              <SelectItem value="transferencias">Apenas Transferências</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-[2] min-w-[220px]">
          <Label className="text-muted-foreground text-xs mb-1.5 block">Pesquisa rápida</Label>
          <Input 
            type="text" 
            placeholder="Buscar no título ou mensagem..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-input border-borderCustom text-foreground"
          />
        </div>
        <div className="flex gap-2">
          {notificacoes.some((n) => !n.read) && (
            <Button 
          <Input 
            type="text" 
            placeholder="Buscar no título ou mensagem..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="bg-input border-borderCustom text-foreground"
          />
        </div>
        <div className="flex gap-2">
          {notificacoes.some((n) => !n.read) && (
            <Button 
              variant="outline" 
              onClick={markAllAsRead}
              className="h-10 border-[#3ea6ff]/40 bg-[#3ea6ff]/10 text-[#3ea6ff] hover:bg-[#3ea6ff]/20 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas como lidas
            </Button>
          )}
          <Button 
            variant="ghost" 
            onClick={limparFiltros}
            className="h-10 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Limpar
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex flex-col gap-3 min-h-[200px]">
        {loading && <div className="text-center py-6 text-sm text-muted-foreground">Carregando...</div>}
        {!loading && notificacoes.map((notif) => (
          <div 
            key={notif.id} 
            className={`p-4.5 rounded-2xl border flex gap-4 cursor-pointer transition-all duration-200 group shadow-sm ${
              notif.read 
                ? 'bg-card border-borderCustom hover:bg-surface-2' 
                : 'bg-sky-50/90 border-sky-300 hover:bg-sky-100/90 dark:bg-sky-950/25 dark:border-sky-500/30 dark:hover:bg-sky-900/40'
            }`}
            onClick={async (e) => {
              if (!notif.read) {
                await markAsRead(notif.id, e)
              }
              if (notif.link) {
                router.push(notif.link)
              }
            }}
          >
            <div className="pt-0.5 shrink-0">
              {notif.read ? (
                <Bell className="w-5 h-5 text-muted-foreground/70" />
              ) : (
                <Circle className="w-4 h-4 fill-sky-600 text-sky-600 dark:fill-[#3ea6ff] dark:text-[#3ea6ff] mt-0.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1.5 gap-2">
                <h4 className="text-foreground font-bold text-sm sm:text-base truncate">{notif.title}</h4>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                    {new Date(notif.created_at).toLocaleString('pt-BR')}
                  </span>
                  {!notif.read && (
                    <button 
                      onClick={(e) => markAsRead(notif.id, e)}
                      className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
                      title="Marcar como lida"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-foreground/90 text-sm leading-relaxed font-normal">{notif.message}</p>
            </div>
          </div>
        ))}
        {!loading && notificacoes.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma notificação encontrada com os filtros selecionados.</div>
        title="Voltar ao início"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Modal de Configurações */}
      {configOpen && (
        <ModalConfiguracoesNotificacoes
          open={configOpen}
          onOpenChange={setConfigOpen}
        />
      )}
    </div>
  )
}
