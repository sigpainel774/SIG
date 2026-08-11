'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import {
  Printer,
  ArrowRightLeft,
  Calendar,
  Building,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  GraduationCap,
  Building2,
} from 'lucide-react'

export interface MovimentacaoItem {
  id: string
  data: string
  tipo: string
  descricao: string
  orgao_origem?: string
  orgao_destino?: string
  portaria?: string
  // Dados de Transferência (solicitações/tramitações)
  isTransferencia?: boolean
  status?: string // 'PENDENTE' | 'APROVADO' | 'RECUSADO'
  solicitanteNome?: string
  respondidoPorNome?: string
  respondidoEm?: string
  respostaTexto?: string
  motivo?: string
}

interface ModalMovimentacoesProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  funcionario?: {
    id?: string | null
    nome?: string | null
    cargo?: string | null
    orgao?: string | null
    status?: string | null
    data_nascimento?: string | null
    formacao?: string | null
  } | null
  nomeServidor?: string
  movimentacoes?: MovimentacaoItem[]
}

export function ModalMovimentacoes({
  open = false,
  onOpenChange,
  funcionario,
  nomeServidor,
  movimentacoes,
}: ModalMovimentacoesProps) {
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  const nome = funcionario?.nome || nomeServidor || 'Servidor'

  const [listMovimentacoes, setListMovimentacoes] = useState<MovimentacaoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    const fetchMovimentacoes = async () => {
      setLoading(true)
      if (movimentacoes && movimentacoes.length > 0) {
        setListMovimentacoes(movimentacoes)
        setLoading(false)
        return
      }

      if (funcionario?.id) {
        const supabase = createClient()

        // 1. Busca histórico de portarias/atos em movimentacoes_funcionarios
        const { data: dataMovs } = await supabase
          .from('movimentacoes_funcionarios')
          .select('id, funcionario_id, tipo, descricao, data, orgao_origem, orgao_destino, portaria, created_at')
          .eq('funcionario_id', funcionario.id)
          .order('data', { ascending: false })

        // 2. Busca histórico de solicitações e trâmites de transferência
        const { data: dataTransf } = await supabase
          .from('transferencias_funcionarios')
          .select(`
            id,
            funcionario_id,
            escola_origem_id,
            escola_destino_id,
            solicitante_id,
            motivo,
            fora_da_rede,
            status,
            resposta_texto,
            respondido_por,
            respondido_em,
            created_at,
            origem:escolas!transferencias_funcionarios_escola_origem_id_fkey(nome),
            destino:escolas!transferencias_funcionarios_escola_destino_id_fkey(nome),
            solicitante:funcionarios!transferencias_funcionarios_solicitante_id_fkey(nome),
            respondido:funcionarios!transferencias_funcionarios_respondido_por_fkey(nome)
          `)
          .eq('funcionario_id', funcionario.id)
          .order('created_at', { ascending: false })

        const itemsCombined: MovimentacaoItem[] = []

        // Mapeia atos funcionais
        if (dataMovs) {
          dataMovs.forEach((m: any) => {
            itemsCombined.push({
              id: m.id,
              data: m.data || m.created_at,
              tipo: m.tipo || 'Movimentação Funcional',
              descricao: m.descricao,
              orgao_origem: m.orgao_origem,
              orgao_destino: m.orgao_destino,
              portaria: m.portaria,
              isTransferencia: false,
            })
          })
        }

        // Mapeia trâmites de transferência
        if (dataTransf) {
          dataTransf.forEach((t: any) => {
            const statusUpper = (t.status || 'PENDENTE').toUpperCase()
            let tipo = 'Solicitação de Transferência'
            if (statusUpper === 'APROVADO') tipo = 'Transferência Aprovada'
            if (statusUpper === 'RECUSADO') tipo = 'Transferência Recusada'

            const origemNome = t.origem?.nome || 'Escola Origem'
            const destinoNome = t.fora_da_rede ? 'Fora da Rede Municipal' : (t.destino?.nome || 'Escola Destino')

            itemsCombined.push({
              id: t.id,
              data: t.created_at,
              tipo,
              descricao: t.motivo ? `Motivo do Pedido: ${t.motivo}` : 'Solicitação de transferência registrada.',
              orgao_origem: origemNome,
              orgao_destino: destinoNome,
              isTransferencia: true,
              status: statusUpper,
              solicitanteNome: t.solicitante?.nome || 'Sistema / Não identificado',
              respondidoPorNome: t.respondido?.nome,
              respondidoEm: t.respondido_em,
              respostaTexto: t.resposta_texto,
              motivo: t.motivo,
            })
          })
        }

        // Ordena por data decrescente
        itemsCombined.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        setListMovimentacoes(itemsCombined)
      }
      setLoading(false)
    }

    fetchMovimentacoes()
  }, [open, funcionario?.id, movimentacoes])

  const handlePrint = () => {
    window.print()
  }

  const getIconForType = (item: MovimentacaoItem) => {
    if (item.isTransferencia) {
      if (item.status === 'APROVADO') return <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
      if (item.status === 'RECUSADO') return <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
      return <Clock className="w-5 h-5 text-amber-500 dark:text-amber-400" />
    }

    switch (item.tipo) {
      case 'Lotação / Transferência':
        return <ArrowRightLeft className="w-5 h-5 text-blue-500 dark:text-blue-400" />
      case 'Admissão / Posse':
        return <Building className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
      case 'Progressão Funcional':
        return <ShieldCheck className="w-5 h-5 text-purple-500 dark:text-purple-400" />
      default:
        return <Calendar className="w-5 h-5 text-sky-500 dark:text-sky-400" />
    }
  }

  const formatarDataHora = (iso: string | undefined | null) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const formatarDataSimples = (iso: string | undefined | null) => {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Histórico de Movimentações"
      description={`Servidor: ${nome}`}
      maxWidth="sm:max-w-[750px]"
      footer={
        <div className="flex justify-end gap-2 w-full pt-3 border-t border-border">
          <Button
            type="button"
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="bg-transparent hover:bg-hoverCustom text-foreground border border-border font-semibold cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      }
    >
      {/* Conteúdo do Modal */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
        {/* Card Resumo do Funcionário com o mesmo estilo dos cards de funcionários */}
        {funcionario && (
          <div className="p-4 rounded-2xl bg-sidebar-accent dark:bg-zinc-800/40 border border-sidebar-border/60 dark:border-zinc-700/50 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-lg shrink-0">
                <Building2 className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Cargo / Órgão
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {funcionario.cargo || 'Não informado'} ({funcionario.orgao || 'Sem órgão'})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 rounded-lg shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Data de Nascimento
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {formatarDataSimples(funcionario.data_nascimento)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <span className="p-1.5 bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg shrink-0">
                <GraduationCap className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Formação
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {funcionario.formacao || 'Não informada'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline de Movimentações */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Linha do Tempo Funcional & Transferências
          </h4>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando movimentações...
            </div>
          ) : listMovimentacoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center bg-sidebar-accent dark:bg-zinc-800/20 border border-dashed border-border rounded-2xl">
              <ArrowRightLeft className="w-8 h-8 text-muted-foreground/50 mb-3" />
              <p>Nenhuma movimentação ou transferência registrada para este servidor.</p>
            </div>
          ) : (
            listMovimentacoes.map((mov, index) => (
              <div
                key={mov.id}
                className={`relative flex gap-4 sm:gap-6 ${
                  index !== listMovimentacoes.length - 1 ? 'pb-8' : ''
                }`}
              >
                {/* Linha vertical da timeline */}
                {index !== listMovimentacoes.length - 1 && (
                  <div className="absolute left-6 top-10 bottom-0 w-px bg-border" />
                )}

                {/* Ícone circular */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-sidebar-accent dark:bg-zinc-800/80 border border-sidebar-border dark:border-zinc-700/60 flex items-center justify-center shadow-sm">
                    {getIconForType(mov)}
                  </div>
                </div>

                {/* Conteúdo do Registro (Estilo Card Funcionário) */}
                <div className="flex-1 bg-sidebar dark:bg-card border border-sidebar-border/60 dark:border-border/50 rounded-2xl p-4 sm:p-5 hover:border-primary/40 transition-all shadow-sm space-y-3">
                  {/* Cabeçalho do Card */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-foreground font-bold text-sm sm:text-base">
                        {mov.tipo}
                      </h4>
                      {mov.isTransferencia && (
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border ${
                            mov.status === 'APROVADO'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                              : mov.status === 'RECUSADO'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {mov.status === 'APROVADO'
                            ? 'Aprovada'
                            : mov.status === 'RECUSADO'
                            ? 'Recusada'
                            : 'Pendente'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-sidebar-accent dark:bg-zinc-800/60 border border-border/50 text-muted-foreground w-fit">
                      {formatarDataHora(mov.data)}
                    </span>
                  </div>

                  {/* Origem e Destino */}
                  {(mov.orgao_origem || mov.orgao_destino) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs bg-sidebar-accent dark:bg-zinc-800/40 p-2.5 rounded-xl border border-sidebar-border/60 dark:border-zinc-700/50">
                      {mov.orgao_origem && (
                        <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-300 font-medium">
                          <span className="font-bold text-muted-foreground uppercase text-[10px]">De:</span> {mov.orgao_origem}
                        </span>
                      )}
                      {mov.orgao_origem && mov.orgao_destino && (
                        <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      {mov.orgao_destino && (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300 font-medium">
                          <span className="font-bold text-muted-foreground uppercase text-[10px]">Para:</span> {mov.orgao_destino}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Descrição / Motivo */}
                  {mov.descricao && (
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                      {mov.descricao}
                    </p>
                  )}

                  {/* Detalhes de Quem Solicitou e Resposta de Aceite/Recusa */}
                  {mov.isTransferencia && (
                    <div className="pt-2.5 border-t border-border/60 space-y-2 text-xs">
                      {/* Quem Solicitou */}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span>
                          Solicitado por: <strong className="text-foreground font-semibold">{mov.solicitanteNome}</strong>
                        </span>
                      </div>

                      {/* Quem Respondeu (Aprovou / Recusou) */}
                      {mov.respondidoPorNome && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <User className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>
                            {mov.status === 'RECUSADO' ? 'Recusado por' : 'Aprovado por'}:{' '}
                            <strong className="text-foreground font-semibold">{mov.respondidoPorNome}</strong>
                            {mov.respondidoEm && ` em ${formatarDataHora(mov.respondidoEm)}`}
                          </span>
                        </div>
                      )}

                      {/* Justificativa da Recusa ou Aprovação */}
                      {mov.respostaTexto && (
                        <div
                          className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                            mov.status === 'RECUSADO'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                          }`}
                        >
                          <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block uppercase text-[10px] tracking-wider mb-0.5">
                              {mov.status === 'RECUSADO' ? 'Motivo da Recusa:' : 'Observação da Resposta:'}
                            </span>
                            <span>{mov.respostaTexto}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Portaria Nº (se houver) */}
                  {mov.portaria && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Portaria: {mov.portaria}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </StandardDialog>
  )
}
