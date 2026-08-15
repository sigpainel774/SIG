'use client'

import { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Users, MessageSquare, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useSchoolStore } from '@/store/useSchoolStore'

interface ModalContasPaisEscolaProps {
  escola: {
    id: string
    nome: string
    codigo?: number | string
    portal_pais_ativo?: boolean
    portal_comunicacoes_ativo?: boolean
    [key: string]: any
  }
  open: boolean
  onClose: () => void
  onTogglePortal: (novoEstado: boolean) => void
  onToggleComunicacoes?: (novoEstado: boolean) => void
}

export function ModalContasPaisEscola({
  escola,
  open,
  onClose,
  onTogglePortal,
  onToggleComunicacoes
}: ModalContasPaisEscolaProps) {
  const supabase = createClient()
  const [ativo, setAtivo] = useState(Boolean(escola.portal_pais_ativo))
  const [comunicacoesAtivo, setComunicacoesAtivo] = useState(Boolean(escola.portal_comunicacoes_ativo))
  const [loading, setLoading] = useState(false)
  const [loadingCom, setLoadingCom] = useState(false)

  const handleToggle = async () => {
    if (loading) return
    const novoStatus = !ativo
    setLoading(true)
    try {
      const updates: any = { portal_pais_ativo: novoStatus }
      if (!novoStatus) {
        // Se desativar o portal dos pais, desativa também as comunicações
        updates.portal_comunicacoes_ativo = false
        setComunicacoesAtivo(false)
        onToggleComunicacoes?.(false)
      }

      const { error } = await supabase
        .from('escolas')
        .update(updates)
        .eq('id', escola.id)

      if (error) throw error

      setAtivo(novoStatus)
      onTogglePortal(novoStatus)

      // Sincronizar useSchoolStore se esta for a escola atualmente selecionada
      const currentSelected = useSchoolStore.getState().selectedEscola
      if (currentSelected && currentSelected.id === escola.id) {
        useSchoolStore.getState().setSelectedEscola({
          ...currentSelected,
          portal_pais_ativo: novoStatus,
          ...((!novoStatus) ? { portal_comunicacoes_ativo: false } : {})
        })
      }
      useSchoolStore.getState().loadEscolas(true)

      if (novoStatus) {
        toast.success(`Portal dos Pais ATIVADO para ${escola.nome}! O menu "Portal dos Pais" já está disponível na Secretaria.`)
      } else {
        toast.info(`Portal dos Pais DESATIVADO para ${escola.nome}. Todos os dados e vínculos foram preservados.`)
      }
    } catch (err: any) {
      console.error('Erro ao alternar status do portal dos pais:', err)
      toast.error('Erro ao atualizar status do Portal dos Pais. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleComunicacoes = async () => {
    if (loadingCom || !ativo) return
    const novoStatus = !comunicacoesAtivo
    setLoadingCom(true)
    try {
      const { error } = await supabase
        .from('escolas')
        .update({ portal_comunicacoes_ativo: novoStatus } as any)
        .eq('id', escola.id)

      if (error) throw error

      setComunicacoesAtivo(novoStatus)
      onToggleComunicacoes?.(novoStatus)

      // Sincronizar useSchoolStore se for a escola selecionada
      const currentSelected = useSchoolStore.getState().selectedEscola
      if (currentSelected && currentSelected.id === escola.id) {
        useSchoolStore.getState().setSelectedEscola({
          ...currentSelected,
          portal_comunicacoes_ativo: novoStatus
        })
      }
      useSchoolStore.getState().loadEscolas(true)

      if (novoStatus) {
        toast.success(`Canal de Comunicações ATIVADO para ${escola.nome}! A aba de comunicações agora está disponível para professores e pais.`)
      } else {
        toast.info(`Canal de Comunicações DESATIVADO para ${escola.nome}.`)
      }
    } catch (err: any) {
      console.error('Erro ao alternar status das comunicações:', err)
      toast.error('Erro ao atualizar canal de comunicações. Tente novamente.')
    } finally {
      setLoadingCom(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Portal dos Pais & Responsáveis"
      description={`Configuração de acesso para ${escola.nome}`}
      maxWidth="sm:max-w-[520px]"
    >
      <div className="space-y-4 pt-2">
        {/* Card 1: Switch Principal do Portal dos Pais */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-semibold text-foreground text-sm sm:text-base">
                  Acesso ao Portal dos Pais
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Permite que os responsáveis consultem boletim, faltas e ocorrências dos alunos desta unidade escolar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button
                type="button"
                role="switch"
                aria-checked={ativo}
                onClick={handleToggle}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-background ${
                  ativo ? 'bg-indigo-600' : 'bg-muted-foreground/30'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    ativo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status do Portal:</span>
            <span className={`font-semibold px-2 py-0.5 rounded-full ${
              ativo 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                : 'bg-muted text-muted-foreground border border-border dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20'
            }`}>
              {ativo ? 'HABILITADO' : 'DESABILITADO'}
            </span>
          </div>
        </div>

        {/* Card 2: Switch do Canal de Comunicações (Fica embaixo do botão de ativar portal dos pais) */}
        <div className={`bg-card border rounded-xl p-5 space-y-3 shadow-xs transition-opacity ${
          !ativo ? 'border-border opacity-50' : 'border-border'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-semibold text-foreground text-sm sm:text-base">
                  Canal de Comunicações (Professores ↔ Pais)
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Habilita a aba de envio e resposta de recados pedagógicos diretos entre os professores e os responsáveis pelos alunos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {loadingCom && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button
                type="button"
                role="switch"
                aria-checked={comunicacoesAtivo}
                onClick={handleToggleComunicacoes}
                disabled={loadingCom || !ativo}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-background ${
                  comunicacoesAtivo && ativo ? 'bg-indigo-600 cursor-pointer' : 'bg-muted-foreground/30 cursor-pointer'
                } ${(!ativo || loadingCom) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    comunicacoesAtivo && ativo ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status das Comunicações:</span>
            <span className={`font-semibold px-2 py-0.5 rounded-full ${
              comunicacoesAtivo && ativo 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                : 'bg-muted text-muted-foreground border border-border dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20'
            }`}>
              {comunicacoesAtivo && ativo ? 'HABILITADO' : 'DESABILITADO'}
            </span>
          </div>

          {!ativo && (
            <p className="text-[11px] text-amber-500/90 pt-1">
              * Requer que o Acesso ao Portal dos Pais esteja habilitado primeiro.
            </p>
          )}
        </div>

        {/* Informações explicativas */}
        {ativo ? (
          <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-indigo-900 dark:text-indigo-200/90 leading-relaxed">
              <p className="font-semibold text-indigo-950 dark:text-indigo-300">Acesso Habilitado:</p>
              <p>
                Os pais desta escola podem acessar suas contas em <strong>/portal-aluno/login</strong>. {comunicacoesAtivo ? 'A aba de comunicações está liberada para professores e pais.' : 'O canal de comunicações encontra-se desativado.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-amber-900 dark:text-amber-200/90 leading-relaxed">
              <p className="font-semibold text-amber-950 dark:text-amber-300">Preservação Integral de Dados:</p>
              <p>
                Se desativado, nenhum cadastro ou histórico é perdido. Pais que tentarem acessar verão mensagem informando indisponibilidade temporária.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose} className="border-[#3f3f46]">
            Fechar
          </Button>
        </div>
      </div>
    </StandardDialog>
  )
}
