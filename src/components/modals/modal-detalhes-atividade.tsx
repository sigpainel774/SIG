'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Printer,
  ArrowRight,
  Loader2,
  ClipboardList,
  History,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'

// ── tipos de status ────────────────────────────────────────────────────────────
type StatusAtividade = 'recebida' | 'em_impressao' | 'impressa' | 'entregue_professor'

const STATUS_CONFIG: Record<StatusAtividade, { label: string; class: string }> = {
  recebida: {
    label: 'Recebida',
    class: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  em_impressao: {
    label: 'Em Impressão',
    class: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  impressa: {
    label: 'Impressa',
    class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  entregue_professor: {
    label: 'Entregue ao Professor',
    class: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  },
}

const PROXIMO_STATUS: Record<StatusAtividade, { proximo: StatusAtividade; label: string } | null> =
  {
    recebida: { proximo: 'em_impressao', label: 'Marcar como Em Impressão' },
    em_impressao: { proximo: 'impressa', label: 'Marcar como Impressa' },
    impressa: {
      proximo: 'entregue_professor',
      label: 'Marcar como Entregue ao Professor',
    },
    entregue_professor: null,
  }

// ── props ──────────────────────────────────────────────────────────────────────
interface ModalDetalhesAtividadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  atividade: any
  onStatusChange: () => void
}

// ── componente ─────────────────────────────────────────────────────────────────
export function ModalDetalhesAtividade({
  open,
  onOpenChange,
  atividade,
  onStatusChange,
}: ModalDetalhesAtividadeProps) {
  const { funcionario, acessos, escolaAtivaId } = useAuthStore()
  const { isEditMode } = useEditModeStore()

  const [historico, setHistorico] = useState<any[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // Verificar se usuário é secretário (nível 3) na escola ativa
  const isSecretario = acessos.some(
    (a) => a.nivel === 3 && a.ativo && a.escola_id === escolaAtivaId,
  )

  const statusAtual: StatusAtividade = atividade?.status ?? 'recebida'
  const statusInfo = STATUS_CONFIG[statusAtual]
  const proximoStatusInfo = PROXIMO_STATUS[statusAtual]

  // Carregar histórico quando o modal abre
  useEffect(() => {
    if (!open || !atividade?.id) return
    const loadHistorico = async () => {
      setLoadingHistorico(true)
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('atividades_secretaria_historico')
        .select('*')
        .eq('atividade_id', atividade.id)
        .order('alterado_em', { ascending: false })
      if (error) console.error('Erro ao carregar histórico:', error)
      setHistorico(data ?? [])
      setLoadingHistorico(false)
    }
    loadHistorico()
  }, [open, atividade?.id])

  // ── alterar status ──────────────────────────────────────────────────────────
  const handleAlterarStatus = async () => {
    if (!proximoStatusInfo || !funcionario?.id || !atividade?.id) return

    setLoadingStatus(true)
    try {
      const supabase = createClient()
      const statusAnterior = statusAtual
      const statusNovo = proximoStatusInfo.proximo

      // 1. UPDATE atividade
      const { error: updateError } = await (supabase as any)
        .from('atividades_secretaria')
        .update({
          status: statusNovo,
          updated_by: funcionario.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', atividade.id)

      if (updateError) throw new Error(updateError.message)

      // 2. INSERT histórico
      await (supabase as any).from('atividades_secretaria_historico').insert({
        atividade_id: atividade.id,
        status_anterior: statusAnterior,
        status_novo: statusNovo,
        alterado_por: funcionario.id,
        alterado_por_nome: funcionario.nome ?? 'Secretaria',
      })

      // 3. Marcar notificação do grupo como processada (se for secretária)
      if (isSecretario && atividade?.grupo_id) {
        await (supabase as any)
          .from('notifications')
          .update({
            processado_por: funcionario.id,
            processado_por_nome: funcionario.nome ?? 'Secretaria',
            processado_em: new Date().toISOString(),
          })
          .eq('grupo_id', atividade.grupo_id)
          .is('processado_por', null)
      }

      toast.success(`Status atualizado para "${STATUS_CONFIG[statusNovo].label}"`)
      onStatusChange()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ?? 'Erro ao atualizar status.')
    } finally {
      setLoadingStatus(false)
    }
  }

  if (!atividade) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] bg-[#141416] border-[#26262a] text-white p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 border-b border-[#26262a]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <ClipboardList className="w-5 h-5 text-[#3ea6ff] mt-0.5 shrink-0" />
              <div>
                <DialogTitle className="text-white text-lg font-bold leading-snug">
                  {atividade.titulo ?? '—'}
                </DialogTitle>
                <p className="text-zinc-500 text-sm mt-1">
                  Ano letivo: {atividade.ano_letivo ?? '—'}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`shrink-0 text-xs font-semibold px-2.5 py-1 ${statusInfo.class}`}
            >
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh]">
          {/* Informações */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoRow label="Professor" value={atividade.professor_nome ?? atividade.professor_id ?? '—'} />
              <InfoRow label="Turma" value={atividade.turma_nome ?? atividade.turma_id ?? '—'} />
              <InfoRow label="Disciplina" value={atividade.materia_nome ?? atividade.materia_id ?? '—'} />
              <InfoRow
                label="Data de Aplicação"
                value={
                  atividade.data_aplicacao
                    ? new Date(atividade.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR')
                    : '—'
                }
              />
              <InfoRow
                label="Trimestre"
                value={
                  atividade.trimestre
                    ? `${atividade.trimestre}º Trimestre`
                    : '—'
                }
              />
              <InfoRow label="Ano Letivo" value={atividade.ano_letivo ?? '—'} />
            </div>

            {atividade.observacoes && (
              <div className="mt-4 rounded-lg border border-[#26262a] bg-[#1c1c1e] p-4">
                <p className="text-xs text-zinc-500 mb-1 font-medium uppercase tracking-wide">
                  Observações
                </p>
                <p className="text-sm text-zinc-300 whitespace-pre-line">
                  {atividade.observacoes}
                </p>
              </div>
            )}

            {/* Arquivo */}
            {atividade.arquivo_url && (
              <div className="mt-2 rounded-lg border border-[#26262a] bg-[#1c1c1e] p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5 font-medium uppercase tracking-wide">
                    Arquivo Anexado
                  </p>
                  <p className="text-sm text-white truncate max-w-[280px]">
                    {atividade.arquivo_nome ?? 'arquivo'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={atividade.arquivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#26262a] bg-transparent text-zinc-300 hover:text-white hover:bg-[#26262a] gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(atividade.arquivo_url, '_blank')}
                    className="border-[#26262a] bg-transparent text-zinc-300 hover:text-white hover:bg-[#26262a] gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                </div>
              </div>
            )}

            {/* Histórico de status */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-zinc-500" />
                <p className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                  Histórico de Status
                </p>
              </div>

              {loadingHistorico ? (
                <div className="flex items-center gap-2 text-zinc-500 text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando histórico...
                </div>
              ) : historico.length === 0 ? (
                <p className="text-sm text-zinc-600 py-2">Nenhuma alteração registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {historico.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg border border-[#26262a] bg-[#1c1c1e] px-4 py-3 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_CONFIG[h.status_anterior as StatusAtividade]?.class ?? 'text-zinc-400'}`}
                        >
                          {STATUS_CONFIG[h.status_anterior as StatusAtividade]?.label ?? h.status_anterior}
                        </Badge>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                        <Badge
                          variant="outline"
                          className={`text-xs ${STATUS_CONFIG[h.status_novo as StatusAtividade]?.class ?? 'text-zinc-400'}`}
                        >
                          {STATUS_CONFIG[h.status_novo as StatusAtividade]?.label ?? h.status_novo}
                        </Badge>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-zinc-400">{h.alterado_por_nome ?? '—'}</p>
                        <p className="text-xs text-zinc-600">
                          {h.alterado_em
                            ? new Date(h.alterado_em).toLocaleString('pt-BR')
                            : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ação de status — só visível para secretária em isEditMode */}
          {isEditMode && isSecretario && proximoStatusInfo && (
            <div className="px-6 pb-6">
              <div className="rounded-lg border border-dashed border-[#3ea6ff]/30 bg-[#3ea6ff]/5 p-4">
                <p className="text-xs text-zinc-400 mb-3">Avançar status desta atividade:</p>
                <Button
                  onClick={handleAlterarStatus}
                  disabled={loadingStatus}
                  className="bg-[#3ea6ff] hover:bg-[#0090ff] text-black font-bold gap-2 w-full sm:w-auto"
                >
                  {loadingStatus ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      {proximoStatusInfo.label}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── helper ──────────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  )
}
