'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { logAudit } from '@/lib/audit/audit-agent'
import { 
  ArrowLeftRight, 
  Search, 
  Check, 
  X, 
  Eye, 
  RefreshCw, 
  Building2, 
  User, 
  FileText,
  Plus,
  ArrowLeft,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalTransferirFuncionario } from '@/components/modals/modal-transferir-funcionario'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function TransferenciasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const { funcionario, escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()
  const { isEditMode } = useEditModeStore()

  // Abas de estado
  const [activeTab, setActiveTab] = useState<'alunos' | 'funcionarios'>('alunos')
  const [activeSubTab, setActiveSubTab] = useState<'recebimentos' | 'submissoes'>('recebimentos')
  const [historicoAberto, setHistoricoAberto] = useState(false)

  // Estados dos Modais
  const [modalFuncionarioOpen, setModalFuncionarioOpen] = useState(false)
  const [transferenciaSelecionada, setTransferenciaSelecionada] = useState<any>(null)
  const [modalDecisaoOpen, setModalDecisaoOpen] = useState(false)
  const [justificativa, setJustificativa] = useState('')
  const [processing, setProcessing] = useState(false)

  // Listagem de dados
  const [transferenciasAlunos, setTransferenciasAlunos] = useState<any[]>([])
  const [transferenciasFuncionarios, setTransferenciasFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // URL Params parsing
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const subtabParam = searchParams.get('subtab')
    const idParam = searchParams.get('id')

    if (tabParam === 'alunos' || tabParam === 'funcionarios') {
      setActiveTab(tabParam)
    }
    if (subtabParam === 'recebimentos' || subtabParam === 'submissoes') {
      setActiveSubTab(subtabParam)
    }
    
    if (idParam) {
      loadTransferencias().then((data) => {
        if (!data) return
        const { al, func } = data
        let found = null
        if (tabParam === 'funcionarios') {
          found = func.find((f: any) => f.id === idParam)
        } else {
          found = al.find((a: any) => a.id === idParam)
        }
        if (found) {
          setTransferenciaSelecionada(found)
          setModalDecisaoOpen(true)
        }
      })
    }
  }, [searchParams])

  const loadTransferencias = async () => {
    if (!escolaAtivaId) return
    setLoading(true)
    
    try {
      // 1. Alunos
      const { data: alData } = await supabase
        .from('transferencias_alunos')
        .select(`
          *,
          alunos(nome, cpf),
          origem:escola_origem_id(nome),
          destino:escola_destino_id(nome),
          solicitante:solicitante_id(nome)
        `)
        .or(`escola_origem_id.eq.${escolaAtivaId},escola_destino_id.eq.${escolaAtivaId}`)
        .order('created_at', { ascending: false })

      // 2. Funcionários
      const { data: funcData } = await supabase
        .from('transferencias_funcionarios')
        .select(`
          *,
          funcionarios(nome, cpf, cargo),
          origem:escola_origem_id(nome),
          destino:escola_destino_id(nome),
          solicitante:solicitante_id(nome)
        `)
        .or(`escola_origem_id.eq.${escolaAtivaId},escola_destino_id.eq.${escolaAtivaId}`)
        .order('created_at', { ascending: false })

      const alList = alData || []
      const funcList = funcData || []

      setTransferenciasAlunos(alList)
      setTransferenciasFuncionarios(funcList)
      
      setLoading(false)
      return { al: alList, func: funcList }
    } catch (err) {
      console.error('Erro ao carregar transferências:', err)
      toast.error('Erro ao atualizar dados.')
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransferencias()
  }, [escolaAtivaId])

  // Filtragem local baseada nas sub-abas e histórico
  const getTransferenciasFiltradas = () => {
    const list = activeTab === 'alunos' ? transferenciasAlunos : transferenciasFuncionarios
    
    if (historicoAberto) {
      // Histórico mostra resolvidas (ACEITA, REJEITADA ou concluídas)
      return list.filter((t: any) => t.status !== 'PENDENTE')
    }

    if (activeSubTab === 'recebimentos') {
      // Recebidas PENDENTES
      return list.filter((t: any) => t.escola_destino_id === escolaAtivaId && t.status === 'PENDENTE')
    } else {
      // Enviadas (Submissões)
      return list.filter((t: any) => t.escola_origem_id === escolaAtivaId)
    }
  }

  const handleDecidirTransferencia = async (aceitar: boolean) => {
    if (!funcionario) return toast.error('Usuário não autenticado')
    if (!transferenciaSelecionada) return
    if (!aceitar && !justificativa) {
      toast.error('Informe a justificativa de rejeição.')
      return
    }

    setProcessing(true)
    const statusDestino = aceitar ? 'ACEITA' : 'REJEITADA'

    try {
      if (activeTab === 'alunos') {
        const { error: updateError } = await supabase
          .from('transferencias_alunos')
          .update({
            status: statusDestino,
            resposta_texto: justificativa,
            respondido_por: funcionario.id,
            respondido_em: new Date().toISOString()
          })
          .eq('id', transferenciaSelecionada.id)

        if (updateError) throw updateError

        if (aceitar) {
          // 1. Buscar anexos ativos do aluno antes da transferência
          const { data: anexosAtivos } = await supabase
            .from('alunos_anexos')
            .select('*')
            .eq('aluno_id', transferenciaSelecionada.aluno_id)
            .is('deleted_at', null)

          // 2. Atualiza escola_id na tabela alunos
          const { error: studentUpdateError } = await supabase
            .from('alunos')
            .update({ escola_id: transferenciaSelecionada.escola_destino_id })
            .eq('id', transferenciaSelecionada.aluno_id)

          if (studentUpdateError) throw studentUpdateError

          // 3. Gravar cópia histórica na tabela arquivados vinculada à escola de origem (com todos os anexos)
          const { error: archiveError } = await supabase
            .from('arquivados')
            .insert({
              tipo: 'ALUNO_TRANSFERIDO',
              referencia_id: transferenciaSelecionada.aluno_id,
              tabela_origem: 'alunos',
              motivo: `TRANSFERENCIA: Transferido para a escola ${transferenciaSelecionada.destino?.nome ?? 'Destino'}`,
              escola_origem_id: transferenciaSelecionada.escola_origem_id,
              arquivado_por: funcionario.id,
              payload_completo: transferenciaSelecionada.ficha_snapshot || {},
              arquivos_anexos: anexosAtivos || [],
              status: 'TRANSFERIDO'
            })

          if (archiveError) throw archiveError

          // 4. Soft-delete no comprovante de residência antigo nos anexos ativos do aluno
          const { error: deleteDocError } = await supabase
            .from('alunos_anexos')
            .update({ 
              deleted_at: new Date().toISOString(),
              motivo_arquivamento: 'TRANSFERENCIA: Comprovante de residência antigo removido na transferência'
            })
            .eq('aluno_id', transferenciaSelecionada.aluno_id)
            .is('deleted_at', null)
            .ilike('nome', '%residencia%')

          if (deleteDocError) throw deleteDocError

          // 5. Log de auditoria
          await logAudit({
            supabase,
            action: 'UPDATE',
            entity: 'alunos (TRANSFERENCIA)',
            entityId: transferenciaSelecionada.aluno_id,
            newData: { escola_id: transferenciaSelecionada.escola_destino_id },
            performedBy: { id: funcionario.id, name: funcionario.nome, email: funcionario.email },
            tenantId: transferenciaSelecionada.escola_origem_id
          })
        }

        // 4. Notificar solicitante
        await (supabase as any).rpc('criar_notificacoes', {
          p_destinatarios: [transferenciaSelecionada.solicitante_id],
          p_title: `Transferência de Aluno ${statusDestino}`,
          p_message: `O pedido de transferência do aluno ${transferenciaSelecionada.alunos?.nome ?? 'Aluno'} foi ${statusDestino.toLowerCase()} pela escola de destino.`,
          p_type: aceitar ? 'SUCCESS' : 'ERROR',
          p_link: '/transferencias?tab=alunos&subtab=submissoes'
        })

      } else {
        // Funcionários
        if (transferenciaSelecionada.lotacao_id) {
          // Chamada da RPC segura para transferência de lotação
          const { error: rpcError } = await (supabase as any).rpc('processar_decisao_transferencia_lotacao', {
            p_transferencia_id: transferenciaSelecionada.id,
            p_aceitar: aceitar,
            p_resposta_texto: justificativa,
            p_respondido_por_id: funcionario.id
          })

          if (rpcError) throw rpcError
        } else {
          // Fluxo legado para transferência completa (mantido por compatibilidade)
          const { error: updateError } = await supabase
            .from('transferencias_funcionarios')
            .update({
              status: statusDestino,
              resposta_texto: justificativa,
              respondido_por: funcionario.id,
              respondido_em: new Date().toISOString()
            })
            .eq('id', transferenciaSelecionada.id)

          if (updateError) throw updateError

          if (aceitar) {
            // 1. Inativar vínculo anterior na escola de origem
            const { error: deactivateError } = await supabase
              .from('vinculos_funcionarios')
              .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
              .eq('funcionario_id', transferenciaSelecionada.funcionario_id)
              .eq('escola_id', transferenciaSelecionada.escola_origem_id)
              .eq('ativo', true)

            if (deactivateError) throw deactivateError

            // 2. Criar novo vínculo na escola de destino
            const cargoAnterior = transferenciaSelecionada.funcionarios?.cargo || 'Funcionário'
            const { error: activateError } = await supabase
              .from('vinculos_funcionarios')
              .insert({
                funcionario_id: transferenciaSelecionada.funcionario_id,
                escola_id: transferenciaSelecionada.escola_destino_id,
                cargo: cargoAnterior,
                ativo: true,
                data_inicio: new Date().toISOString().split('T')[0]
              })

            if (activateError) throw activateError

            // 3. Atualizar escola em acessos_usuarios para manter a permissão
            const { error: accessError } = await supabase
              .from('acessos_usuarios')
              .update({ escola_id: transferenciaSelecionada.escola_destino_id })
              .eq('funcionario_id', transferenciaSelecionada.funcionario_id)
              .eq('escola_id', transferenciaSelecionada.escola_origem_id)

            if (accessError) throw accessError

            // 4. Salvar histórico em arquivados da escola de origem
            const { error: archiveError } = await supabase
              .from('arquivados')
              .insert({
                tipo: 'FUNCIONARIO_TRANSFERIDO',
                referencia_id: transferenciaSelecionada.funcionario_id,
                tabela_origem: 'funcionarios',
                motivo: `TRANSFERENCIA: Transferido para a escola ${transferenciaSelecionada.destino?.nome ?? 'Destino'}`,
                escola_origem_id: transferenciaSelecionada.escola_origem_id,
                arquivado_por: funcionario.id,
                payload_completo: transferenciaSelecionada.ficha_snapshot || {},
                status: 'TRANSFERIDO'
              })

            if (archiveError) throw archiveError

            // 5. Log de auditoria
            await logAudit({
              supabase,
              action: 'UPDATE',
              entity: 'funcionarios (TRANSFERENCIA)',
              entityId: transferenciaSelecionada.funcionario_id,
              newData: { escola_destino_id: transferenciaSelecionada.escola_destino_id },
              performedBy: { id: funcionario.id, name: funcionario.nome, email: funcionario.email },
              tenantId: transferenciaSelecionada.escola_origem_id
            })
          }
        }

        // 6. Notificar solicitante (comum a ambos os fluxos)
        await (supabase as any).rpc('criar_notificacoes', {
          p_destinatarios: [transferenciaSelecionada.solicitante_id],
          p_title: `Transferência de Funcionário ${statusDestino}`,
          p_message: `O pedido de transferência do funcionário ${transferenciaSelecionada.funcionarios?.nome ?? 'Funcionário'} foi ${statusDestino.toLowerCase()} pela escola de destino.`,
          p_type: aceitar ? 'SUCCESS' : 'ERROR',
          p_link: '/transferencias?tab=funcionarios&subtab=submissoes'
        })
      }

      toast.success(`Solicitação ${aceitar ? 'aprovada' : 'rejeitada'} com sucesso!`)
      setModalDecisaoOpen(false)
      setJustificativa('')
      setTransferenciaSelecionada(null)
      loadTransferencias()
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao salvar decisão: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleReverterTransferencia = async () => {
    if (!funcionario || !transferenciaSelecionada) return
    setProcessing(true)
    try {
      const { error } = await (supabase as any).rpc('reverter_transferencia_lotacao', {
        p_transferencia_id: transferenciaSelecionada.id,
        p_revertido_por_id: funcionario.id
      })

      if (error) throw error

      // Notificar diretores da escola de origem e de destino
      const userIds = new Set<string>()
      
      const { data: acessosEnvolvidos } = await supabase
        .from('acessos_usuarios')
        .select('funcionarios(id)')
        .in('escola_id', [transferenciaSelecionada.escola_origem_id, transferenciaSelecionada.escola_destino_id])
        .eq('nivel', 2)
        .eq('ativo', true)

      if (acessosEnvolvidos) {
        acessosEnvolvidos.forEach((acc: any) => {
          const funcId = acc.funcionarios?.id
          if (funcId) userIds.add(funcId)
        })
      }

      if (userIds.size > 0) {
        await (supabase as any).rpc('criar_notificacoes', {
          p_destinatarios: Array.from(userIds),
          p_title: 'Transferência Revertida pelo Admin',
          p_message: `A transferência de lotação do funcionário ${transferenciaSelecionada.funcionarios?.nome ?? 'Funcionário'} foi revertida pelo Administrador Global.`,
          p_type: 'WARNING',
          p_link: '/transferencias?tab=funcionarios'
        })
      }

      toast.success('Transferência de lotação revertida com sucesso!')
      setModalDecisaoOpen(false)
      setTransferenciaSelecionada(null)
      loadTransferencias()
    } catch (err: any) {
      console.error(err)
      toast.error(`Erro ao reverter: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const items = getTransferenciasFiltradas()

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0 pb-12">
      {/* Modais */}
      {modalFuncionarioOpen && (
        <ModalTransferirFuncionario
          open={modalFuncionarioOpen}
          onOpenChange={setModalFuncionarioOpen}
          onSuccess={loadTransferencias}
        />
      )}

      {/* Modal de Avaliação de Pedido (Aprovar/Rejeitar) */}
      {modalDecisaoOpen && transferenciaSelecionada && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-[#3f3f46] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#26262a] flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 m-0">
                <ArrowLeftRight className="w-5 h-5 text-sky-500" />
                Avaliar Transferência
              </h3>
              <button 
                onClick={() => setModalDecisaoOpen(false)}
                className="text-[#aaa] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs text-[#aaa]">Nome do {activeTab === 'alunos' ? 'Aluno' : 'Funcionário'}</span>
                <p className="text-white font-semibold text-base">
                  {activeTab === 'alunos' 
                    ? (transferenciaSelecionada.alunos?.nome ?? transferenciaSelecionada.ficha_snapshot?.nome)
                    : (transferenciaSelecionada.funcionarios?.nome ?? transferenciaSelecionada.ficha_snapshot?.nome)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-[#aaa]">Origem</span>
                  <p className="text-white text-sm font-medium">{transferenciaSelecionada.origem?.nome ?? 'Rede'}</p>
                </div>
                <div>
                  <span className="text-xs text-[#aaa]">Destino</span>
                  <p className="text-white text-sm font-medium">
                    {transferenciaSelecionada.fora_da_rede ? 'Fora da Rede Municipal' : (transferenciaSelecionada.destino?.nome ?? 'Rede')}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs text-[#aaa]">Motivo da Solicitação</span>
                <div className="bg-[#121212] p-3 rounded-lg border border-[#26262a] text-zinc-300 text-sm mt-1">
                  {transferenciaSelecionada.motivo ?? 'Sem motivo informado.'}
                </div>
              </div>

              {transferenciaSelecionada.status === 'PENDENTE' && isEditMode ? (
                <div className="space-y-2 pt-2">
                  <label className="text-xs text-[#aaa] font-medium">Justificativa / Observações (Obrigatório para Rejeitar)</label>
                  <textarea
                    value={justificativa}
                    onChange={(e) => setJustificativa(e.target.value)}
                    placeholder="Escreva a resposta para o solicitante..."
                    className="w-full min-h-[90px] p-3 rounded-lg bg-[#121212] border border-[#3f3f46] text-white text-sm outline-none focus:border-sky-500 resize-none"
                  />
                </div>
              ) : (
                transferenciaSelecionada.resposta_texto && (
                  <div>
                    <span className="text-xs text-[#aaa]">Justificativa do Retorno</span>
                    <div className="bg-[#121212] p-3 rounded-lg border border-[#26262a] text-zinc-300 text-sm mt-1 italic">
                      "{transferenciaSelecionada.resposta_texto}"
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="p-6 border-t border-[#26262a] bg-[#121214] flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setModalDecisaoOpen(false)}
                className="text-[#aaa] hover:bg-[#27272a] hover:text-white"
              >
                Fechar
              </Button>
              {activeTab === 'funcionarios' && 
               transferenciaSelecionada.status === 'ACEITA' && 
               transferenciaSelecionada.lotacao_id && 
               isAdminGlobalOrRoot() && (
                <Button
                  disabled={processing}
                  onClick={handleReverterTransferencia}
                  className="bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white border border-amber-600/50 font-bold gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", processing && "animate-spin")} />
                  Reverter Transferência
                </Button>
              )}
              {transferenciaSelecionada.status === 'PENDENTE' && isEditMode && (
                <>
                  <Button 
                    disabled={processing}
                    onClick={() => handleDecidirTransferencia(false)}
                    className="bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-600/50"
                  >
                    <X className="w-4 h-4 mr-2" /> Rejeitar
                  </Button>
                  <Button 
                    disabled={processing}
                    onClick={() => handleDecidirTransferencia(true)}
                    className="bg-sky-600 text-white hover:bg-sky-700"
                  >
                    <Check className="w-4 h-4 mr-2" /> Aceitar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Topo / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="p-2.5 rounded-2xl bg-[#e0f2fe] text-[#185FA5] dark:bg-[#1b253b] dark:text-[#3ea6ff] border-[0.5px] border-[#3f3f46] shadow-sm flex items-center justify-center">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Central de Transferências</h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2 ml-1">
            Gestão unificada de fluxo de entradas (Recebimentos) e saídas (Submissões) de alunos e funcionários.
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadTransferencias} 
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a] h-11"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {isEditMode && (
            <Button
              onClick={() => {
                if (activeTab === 'alunos') {
                  router.push('/alunos/transferencia')
                } else {
                  setModalFuncionarioOpen(true)
                }
              }}
              className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white font-semibold gap-2 h-11 px-4 rounded-xl shadow-md border-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Transferência</span>
            </Button>
          )}
        </div>
      </div>

      {/* Grid Central */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar Local de Navegação */}
        <div className="bg-[#121212] border border-[#3f3f46] p-4 rounded-2xl space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-2">Domínio</span>
            <button
              onClick={() => {
                setActiveTab('alunos')
                setHistoricoAberto(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'alunos' && !historicoAberto ? 'bg-sky-600/10 text-sky-400 font-bold border border-sky-600/20' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
            >
              <User className="w-4 h-4" />
              Alunos
            </button>
            <button
              onClick={() => {
                setActiveTab('funcionarios')
                setHistoricoAberto(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeTab === 'funcionarios' && !historicoAberto ? 'bg-sky-600/10 text-sky-400 font-bold border border-sky-600/20' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
            >
              <Building2 className="w-4 h-4" />
              Funcionários
            </button>
          </div>

          <div className="pt-2 border-t border-[#26262a] space-y-1">
            <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider px-2">Ações Locais</span>
            {!historicoAberto && (
              <>
                <button
                  onClick={() => setActiveSubTab('recebimentos')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeSubTab === 'recebimentos' ? 'bg-[#27272a] text-white' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
                >
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Recebimentos (Pendentes)
                </button>
                <button
                  onClick={() => setActiveSubTab('submissoes')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${activeSubTab === 'submissoes' ? 'bg-[#27272a] text-white' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
                >
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Submissões (Enviadas)
                </button>
              </>
            )}
            <button
              onClick={() => setHistoricoAberto(true)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left ${historicoAberto ? 'bg-[#27272a] text-white' : 'text-[#aaa] hover:bg-[#1c1c1e] hover:text-white'}`}
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              Histórico Geral
            </button>
          </div>
        </div>

        {/* Tabela Principal */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#121212] border border-[#3f3f46] rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-[#3f3f46] bg-[#18181b] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 m-0">
                {historicoAberto ? 'Histórico de Finalizados' : activeSubTab === 'recebimentos' ? 'Novos Pedidos Recebidos' : 'Pedidos Submetidos'}
                <span className="bg-[#27272a] text-zinc-400 text-xs px-2 py-0.5 rounded-full font-bold">{items.length}</span>
              </h3>
            </div>

            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">{activeTab === 'alunos' ? 'Aluno' : 'Funcionário'}</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Fluxo</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Solicitante</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((sol) => {
                  const nome = activeTab === 'alunos' 
                    ? (sol.alunos?.nome ?? sol.ficha_snapshot?.nome ?? 'Sem nome')
                    : (sol.funcionarios?.nome ?? sol.ficha_snapshot?.nome ?? 'Sem nome')
                  const subinfo = activeTab === 'alunos' 
                    ? (sol.alunos?.cpf ? `CPF: ${sol.alunos.cpf}` : `Série: ${sol.ficha_snapshot?.serie ?? '-'}`)
                    : (sol.funcionarios?.cargo ?? sol.ficha_snapshot?.cargo ?? 'Sem cargo')
                  
                  return (
                    <TableRow key={sol.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                      <TableCell>
                        <div className="font-bold text-white">{nome}</div>
                        <div className="text-xs text-[#888]">{subinfo}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-[#ccc] flex flex-col">
                          <span>Origem: {sol.origem?.nome ?? 'Rede'}</span>
                          <span className="text-[#888]">Destino: {sol.fora_da_rede ? 'Fora da Rede' : (sol.destino?.nome ?? 'Rede')}</span>
                          {activeTab === 'funcionarios' && (
                            <span className="text-[10px] text-sky-400 font-semibold mt-1">
                              {sol.lotacao_id ? 'Lotação Específica' : 'Transferência Completa'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#aaa]">
                        {sol.solicitante?.nome?.split(' ')[0] ?? 'Sistema'}
                      </TableCell>
                      <TableCell className="text-xs text-[#aaa]">
                        {sol.created_at ? new Date(sol.created_at).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            sol.status === 'PENDENTE' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            sol.status === 'ACEITA' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }
                        >
                          {sol.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setTransferenciaSelecionada(sol)
                            setModalDecisaoOpen(true)
                          }}
                          className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 h-8 px-2.5 rounded-lg"
                        >
                          <Eye className="w-4 h-4 mr-1.5" />
                          Visualizar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {items.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-[#888] text-sm">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-6 h-6 text-zinc-600" />
                        <span>Nenhuma solicitação de transferência encontrada nesta categoria.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-[#aaa]">
                      Buscando transferências...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'

export default function TransferenciasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#aaa]">Carregando central de transferências...</div>}>
      <TransferenciasContent />
    </Suspense>
  )
}
