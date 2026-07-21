'use client'
import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Bell, History, Circle, Check, Sliders, UserCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { ModalConfiguracoesNotificacoes } from '@/components/modals/modal-configuracoes-notificacoes'
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
      .select('*')
      .eq('user_id', funcionario.auth_user_id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (filtro === 'nao_lidas') query = query.eq('read', false)
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
    if (open) loadNotificacoes()
  }, [open, filtro, funcionario?.auth_user_id])

  const markAsRead = async (notif: any, e: React.MouseEvent) => {
    e.stopPropagation()
    const supabase = createClient()
    const podeProcessarGrupo = funcionario && acessos?.some((a: any) => (a.nivel === 2 || a.nivel === 3) && a.ativo)
    try {
      // Marcar a própria notificação como lida
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id)

      // Se for secretário/diretor e a notificação ainda não tiver processado_por, processar o grupo
      if (podeProcessarGrupo && notif.grupo_id && !notif.processado_por) {
        const { data, error } = await (supabase as any)
          .from('notifications')
          .update({
            processado_por: funcionario?.id ?? null,
            processado_por_nome: funcionario?.nome ?? 'Secretaria/Direção',
            processado_em: new Date().toISOString(),
          })
          .eq('grupo_id', notif.grupo_id)
          .is('processado_por', null)
          .select()

        if (error) throw error

        if (!data || data.length === 0) {
          toast.warning('Esta atividade já foi processada por outro colega.')
        } else {
          toast.success('Atividade marcada como processada.')
        }
      }

      loadNotificacoes()
    } catch (error) {
      console.error('Erro ao marcar como lida:', error)
      toast.error('Erro ao atualizar notificação.')
    }
  }

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  const irParaHistorico = () => {
    handleOpenChange(false)
    router.push('/historico-notificacoes')
  }

  return (
    <StandardDialog
      open={!!open}
      onOpenChange={handleOpenChange}
      title="Notificações"
      maxWidth="sm:max-w-[380px]"
      className="sm:absolute sm:top-[60px] sm:right-[20px] sm:translate-x-0 sm:translate-y-0 sm:left-auto"
      footer={
        <div className="w-full border-t border-[#3f3f46] bg-[#121214] pt-2">
          <Button 
            variant="ghost" 
            onClick={irParaHistorico}
            className="w-full border border-dashed border-[#3ea6ff] text-[#3ea6ff] hover:bg-[#3ea6ff]/10 hover:text-[#3ea6ff] rounded-md h-auto py-2 text-xs font-semibold gap-2"
          >
            <History className="w-3.5 h-3.5" /> Ver Histórico Completo
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {canManage && (
          <div className="flex justify-end pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfigOpen(true)}
              className="text-zinc-400 hover:text-white h-8 cursor-pointer gap-1.5 text-xs"
              title="Configurações de Notificações"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurações</span>
            </Button>
          </div>
        )}
        
        {/* Filtros */}
        <div className="px-4 py-3 border-b border-[#3f3f46] bg-[#121214] flex gap-2">
          <select 
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 bg-[#27272a] border border-[#3f3f46] text-white rounded-md p-1.5 text-xs outline-none"
          >
            <option value="todas">Todas</option>
            <option value="nao_lidas">Não Lidas</option>
            <option value="transferencias">Transferências</option>
            <option value="atividade_secretaria">Atividades</option>
          </select>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 flex flex-col gap-2">
          {notificacoes.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-3 rounded-lg border flex gap-3 cursor-pointer transition-colors group ${notif.read ? 'bg-transparent border-transparent hover:bg-[#27272a]' : 'bg-[#27272a]/50 border-[#3ea6ff]/30 hover:bg-[#27272a]'}`}
              onClick={() => {
                if (notif.link) {
                  router.push(notif.link)
                  handleOpenChange(false)
                }
              }}
            >
              <div className="pt-1">
                {/* Badge: só mostrar se não lida E (sem processado_por OU o usuário é secretário) */}
                {!notif.read && !notif.processado_por && <Circle className="w-2 h-2 fill-[#3ea6ff] text-[#3ea6ff]" />}
                {!notif.read && notif.processado_por && <Circle className="w-2 h-2 fill-zinc-500 text-zinc-500" />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-white mb-1">{notif.title}</p>
                  {!notif.read && (
                    <button 
                      onClick={(e) => markAsRead(notif, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#aaa] hover:text-white"
                      title="Marcar como lida"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-[#aaa]">{notif.message}</p>
                {/* Mostrar quem processou (para outras secretárias que ainda não leram) */}
                {notif.processado_por && notif.processado_por_nome && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400">
                      Processada por {notif.processado_por_nome}
                    </span>
                  </div>
                )}
                <p className="text-xs text-[#aaa] mt-1">{new Date(notif.created_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          ))}
          {notificacoes.length === 0 && (
            <div className="text-center py-6 text-sm text-[#aaa]">Nenhuma notificação encontrada.</div>
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
