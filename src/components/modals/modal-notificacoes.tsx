'use client'
import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Bell, BellRing, BellOff, Loader2, History, Circle, Check, CheckCheck, Sliders, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { ModalConfiguracoesNotificacoes } from '@/components/modals/modal-configuracoes-notificacoes'
import { usePushNotification } from '@/hooks/usePushNotification'
import { toast } from 'sonner'

interface ModalNotificacoesProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ModalNotificacoes({ open = false, onOpenChange }: ModalNotificacoesProps) {
  const router = useRouter()
  const { funcionario, acessos, isAdminGlobalOrRoot } = useAuthStore()
  const [filtro, setFiltro] = useState('todas')
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [configOpen, setConfigOpen] = useState(false)

  const canManage = funcionario?.is_superadmin || isAdminGlobalOrRoot?.()

  const loadNotificacoes = async () => {
    if (!funcionario?.auth_user_id) return
    const supabase = createClient()
    
    let query = supabase
      .from('notifications')
      .select('id, tenant_id, user_id, title, message, type, link, read, created_at, grupo_id, processado_por, processado_por_nome, processado_em')
      .eq('user_id', funcionario.auth_user_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (filtro === 'nao_lidas') query = query.eq('read', false)
    if (filtro === 'comunicados') query = query.in('type', ['comunicado', 'mural'])
    if (filtro === 'transferencias') query = query.eq('type', 'transferencia')
    if (filtro === 'atividade_secretaria') query = query.eq('type', 'atividade_secretaria')

    try {
      const { data, error } = await query
      if (error) throw error
      if (data) setNotificacoes(data)
    } catch (error) {
      console.error('Erro ao carregar notificações:', error)
    }
  }

  useEffect(() => {
    if (open && funcionario?.auth_user_id) {
      loadNotificacoes()
    }
  }, [open, filtro, funcionario?.auth_user_id])

  const markAsRead = async (notif: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const supabase = createClient()
    try {
      const { data, error } = await (supabase as any).rpc('marcar_notificacao_lida_grupo', {
        p_notif_id: notif.id,
        p_funcionario_id: funcionario?.id ?? null,
        p_funcionario_nome: funcionario?.nome ?? 'Secretaria/Direção',
      })

      if (error) throw error

      if (notif.grupo_id) {
        toast.success('Notificação processada para a equipe.')
      }

      loadNotificacoes()
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
      toast.error('Erro ao atualizar notificação.')
    }
  }

  const markAllAsRead = async () => {
    if (!funcionario?.auth_user_id) return
    const supabase = createClient()
    try {
      const { error } = await (supabase as any).rpc('marcar_todas_notificacoes_lidas_usuario', {
        p_auth_user_id: funcionario.auth_user_id,
        p_funcionario_id: funcionario?.id ?? null,
        p_funcionario_nome: funcionario?.nome ?? 'Secretaria/Direção',
      })

      if (error) throw error
      toast.success('Todas as notificações foram marcadas como lidas.')
      loadNotificacoes()
    } catch (error: any) {
      console.error('Erro ao marcar todas como lidas:', error)
      toast.error('Erro ao atualizar notificações.')
    }
  }

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  const irParaHistorico = () => {
    handleOpenChange(false)
    router.push('/historico-notificacoes')
  }

  const {
    isSupported,
    permissionState,
    isSubscribed,
    loading: pushLoading,
    subscribe,
    unsubscribe,
  } = usePushNotification()

  const handleTogglePush = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSubscribed) {
      const ok = await unsubscribe()
      if (ok) {
        toast.info('Notificações push desativadas neste aparelho.')
      } else {
        toast.error('Erro ao desativar notificações.')
      }
    } else {
      const ok = await subscribe()
      if (ok) {
        toast.success('🎉 Push Notifications ativadas com sucesso!')
      } else if (permissionState === 'denied') {
        toast.error('Permissão bloqueada no navegador. Desbloqueie no ícone de cadeado 🔒 da barra de endereço.')
      } else {
        toast.error('Não foi possível ativar as notificações push neste navegador.')
      }
    }
  }

  return (
    <StandardDialog
      open={!!open}
      onOpenChange={handleOpenChange}
      title="Notificações"
      maxWidth="sm:max-w-[380px]"
      className="sm:absolute sm:top-[60px] sm:right-[20px] sm:translate-x-0 sm:translate-y-0 sm:left-auto"
      footer={
        <div className="w-full border-t border-borderCustom bg-surface-2 pt-2">
          <Button 
            variant="ghost" 
            onClick={irParaHistorico}
            className="w-full border border-dashed border-[#0067c0] dark:border-[#3ea6ff] text-[#0067c0] dark:text-[#3ea6ff] hover:bg-[#0067c0]/10 hover:text-[#0067c0] rounded-xl h-auto py-2 text-xs font-semibold gap-2 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" /> Ver Histórico Completo
          </Button>
        </div>
      }
    >
      {/* Botão de Push ao lado do X no cabeçalho do modal */}
      <div className="absolute top-3.5 right-11 z-50">
        <button
          type="button"
          onClick={handleTogglePush}
          disabled={pushLoading || permissionState === 'unsupported'}
          title={
            isSubscribed
              ? 'Push Ativado neste aparelho (Clique para desativar)'
              : permissionState === 'denied'
              ? 'Push Bloqueado no Navegador'
              : 'Ativar Notificações Push neste aparelho'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
            isSubscribed
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : permissionState === 'denied'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 opacity-70 cursor-not-allowed'
              : 'bg-[#0067c0]/10 text-[#0067c0] dark:bg-[#3ea6ff]/20 dark:text-[#3ea6ff] border-[#0067c0]/30 dark:border-[#3ea6ff]/30 hover:bg-[#0067c0]/20 dark:hover:bg-[#3ea6ff]/30'
          }`}
        >
          {pushLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isSubscribed ? (
            <BellRing className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Bell className="w-3 h-3" />
          )}
          <span>{isSubscribed ? 'Push Ativo' : 'Ativar Push'}</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-borderCustom">
          {notificacoes.some((n) => !n.read) ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-[#0067c0] dark:text-[#3ea6ff] hover:text-[#0067c0]/80 hover:bg-[#0067c0]/10 h-7 px-2 cursor-pointer gap-1.5 text-xs font-semibold"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar todas como lidas</span>
            </Button>
          ) : <div />}

          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="text-muted-foreground hover:text-foreground h-7 px-2 cursor-pointer gap-1.5 text-xs font-semibold"
              title="Configurações de Notificações"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </Button>
          )}
        </div>
        
        {/* Filtros */}
        <div className="px-4 py-3 border-b border-borderCustom bg-surface-2 flex gap-2 rounded-xl">
          <select 
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 bg-input border border-borderCustom text-foreground rounded-lg p-1.5 text-xs outline-none font-medium"
          >
            <option value="todas">Todas</option>
            <option value="nao_lidas">Não Lidas</option>
            <option value="comunicados">Comunicados</option>
            <option value="transferencias">Transferências</option>
            <option value="atividade_secretaria">Atividades</option>
          </select>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 flex flex-col gap-2">
          {notificacoes.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-3 rounded-xl border flex gap-3 cursor-pointer transition-all duration-200 group ${
                notif.read 
                  ? 'bg-card border-borderCustom/60 hover:bg-surface-2' 
                  : 'bg-sky-50/90 border-sky-300 hover:bg-sky-100/90 dark:bg-sky-950/30 dark:border-sky-500/30 dark:hover:bg-sky-900/40'
              }`}
              onClick={async (e) => {
                if (!notif.read) {
                  await markAsRead(notif, e)
                }
                if (notif.link) {
                  router.push(notif.link)
                  handleOpenChange(false)
                }
              }}
            >
              <div className="pt-1">
                {/* Badge */}
                {!notif.read && !notif.processado_por && <Circle className="w-2.5 h-2.5 fill-[#0067c0] text-[#0067c0] dark:fill-[#3ea6ff] dark:text-[#3ea6ff]" />}
                {!notif.read && notif.processado_por && <Circle className="w-2.5 h-2.5 fill-muted-foreground text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-foreground mb-1 truncate">{notif.title}</p>
                  {!notif.read && (
                    <button 
                      onClick={(e) => markAsRead(notif, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded"
                      title="Marcar como lida"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
                {/* Mostrar quem processou */}
                {notif.processado_por && notif.processado_por_nome && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Processada por {notif.processado_por_nome}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground/70 mt-1 font-medium">{new Date(notif.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          ))}
          {notificacoes.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma notificação encontrada.</div>
          )}
        </div>

        {/* Modal de Configurações */}
        {configOpen && (
          <ModalConfiguracoesNotificacoes
            open={configOpen}
            onOpenChange={setConfigOpen}
          />
        )}
      </div>
    </StandardDialog>
  )
}
