'use client'

import { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Users, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useSchoolStore } from '@/store/useSchoolStore'

interface ModalContasPaisEscolaProps {
  escola: {
    id: string
    nome: string
    codigo?: number | string
    portal_pais_ativo?: boolean
    [key: string]: any
  }
  open: boolean
  onClose: () => void
  onTogglePortal: (novoEstado: boolean) => void
}

export function ModalContasPaisEscola({
  escola,
  open,
  onClose,
  onTogglePortal
}: ModalContasPaisEscolaProps) {
  const supabase = createClient()
  const [ativo, setAtivo] = useState(Boolean(escola.portal_pais_ativo))
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (loading) return
    const novoStatus = !ativo
    setLoading(true)
    try {
      const { error } = await supabase
        .from('escolas')
        .update({ portal_pais_ativo: novoStatus } as any)
        .eq('id', escola.id)

      if (error) throw error

      setAtivo(novoStatus)
      onTogglePortal(novoStatus)

      // Sincronizar useSchoolStore se esta for a escola atualmente selecionada
      const currentSelected = useSchoolStore.getState().selectedEscola
      if (currentSelected && currentSelected.id === escola.id) {
        useSchoolStore.getState().setSelectedEscola({
          ...currentSelected,
          portal_pais_ativo: novoStatus
        })
      }
      // Forçar recarga leve do cache de escolas
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

  return (
    <StandardDialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Portal dos Pais & Responsáveis"
      description={`Configuração de acesso para ${escola.nome}`}
      maxWidth="sm:max-w-[500px]"
    >
      <div className="space-y-6 pt-2">
        {/* Card Principal com Toggle */}
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h4 className="font-semibold text-foreground text-base">
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#18181b] ${
                  ativo ? 'bg-indigo-600' : 'bg-zinc-700'
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

          <div className="pt-3 border-t border-[#27272a]/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Status do Recurso:</span>
            <span className={`font-semibold px-2 py-0.5 rounded-full ${
              ativo 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
            }`}>
              {ativo ? 'HABILITADO' : 'DESABILITADO'}
            </span>
          </div>
        </div>

        {/* Informações explicativas */}
        {ativo ? (
          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-indigo-200/90 leading-relaxed">
              <p className="font-semibold text-indigo-300">Como gerenciar os pais desta escola:</p>
              <p>
                Ao selecionar esta escola no cabeçalho, acesse o menu <strong>SECRETARIA &gt; Portal dos Pais</strong> na barra lateral para cadastrar novos responsáveis, definir senhas provisórias e vincular dependentes.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-200/90 leading-relaxed">
              <p className="font-semibold text-amber-300">Preservação Integral de Dados:</p>
              <p>
                Se desativado, nenhum cadastro ou histórico é perdido. Caso os pais tentem acessar, verão apenas uma mensagem amigável informando que o portal está indisponível para esta escola no momento.
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
