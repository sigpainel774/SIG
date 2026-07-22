'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { ArrowLeft, Check, X, FileText, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { logAudit } from '@/lib/audit/audit-agent'

export default function AvaliarSolicitacaoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const supabase = createClient()
  const { funcionario } = useAuthStore()
  
  const [solicitacao, setSolicitacao] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [justificativa, setJustificativa] = useState('')

  useEffect(() => {
    const fetchSol = async () => {
      const { data } = await supabase
        .from('transferencias_alunos')
        .select(`
          *,
          alunos(nome, cpf),
          origem:escola_origem_id(nome),
          destino:escola_destino_id(nome),
          solicitante:solicitante_id(nome)
        `)
        .eq('id', params.id)
        .single()
      
      if (data) setSolicitacao(data)
      setLoading(false)
    }
    fetchSol()
  }, [params.id, supabase])

  const handleResponder = async (aceitar: boolean) => {
    if (!funcionario) return toast.error('Usuário não autenticado')
    if (!aceitar && !justificativa) return toast.error('Por favor, insira o motivo da rejeição')

    setProcessing(true)
    try {
      const novoStatus = aceitar ? 'ACEITA' : 'REJEITADA'
      
      // Atualiza a solicitação
      const { error: updateError } = await supabase
        .from('transferencias_alunos')
        .update({
          status: novoStatus,
          resposta_texto: justificativa,
          respondido_por: funcionario.id,
          respondido_em: new Date().toISOString()
        })
        .eq('id', solicitacao.id)

      if (updateError) throw updateError

      // Se aceitar, atualizar o aluno (mudar escola_id) e arquivar ficha completa
      if (aceitar && solicitacao.escola_destino_id) {
        const { data: currentStudent } = await supabase
          .from('alunos')
          .select('dados_matricula')
          .eq('id', solicitacao.aluno_id)
          .single()

        const updatedDm = {
          ...((currentStudent?.dados_matricula as Record<string, any>) || {}),
          escolaId: solicitacao.escola_destino_id,
          turmaIdAluno: null,
          turmaAluno: ''
        }

        const { error: alunoError } = await supabase
          .from('alunos')
          .update({
            escola_id: solicitacao.escola_destino_id,
            turma_id: null,
            dados_matricula: updatedDm
          })
          .eq('id', solicitacao.aluno_id)
          
        if (alunoError) throw alunoError

        // 1. Buscar a ficha completa do aluno na tabela 'alunos' (com acesso RLS agora na escola destino)
        const { data: alunoCompleto } = await supabase
          .from('alunos')
          .select('*')
          .eq('id', solicitacao.aluno_id)
          .single()

        // 2. Buscar anexos ativos do aluno (também com acesso RLS)
        const { data: anexosAtivos } = await supabase
          .from('alunos_anexos')
          .select('*')
          .eq('aluno_id', solicitacao.aluno_id)
          .is('deleted_at', null)

        // Ajustar o escola_id no payload cadastral para refletir a escola de origem no arquivamento histórico
        const payloadCadastral = alunoCompleto
          ? { ...alunoCompleto, escola_id: solicitacao.escola_origem_id }
          : { ...solicitacao.ficha_snapshot, escola_id: solicitacao.escola_origem_id }

        // 3. Gravar cópia histórica na tabela arquivados vinculada à escola de origem
        const { error: archiveError } = await supabase
          .from('arquivados')
          .insert({
            tipo: 'ALUNO_TRANSFERIDO',
            referencia_id: solicitacao.aluno_id,
            tabela_origem: 'alunos',
            motivo: `TRANSFERENCIA: Transferido para a escola ${solicitacao.destino?.nome ?? 'Destino'}`,
            escola_origem_id: solicitacao.escola_origem_id,
            arquivado_por: funcionario.id,
            payload_completo: payloadCadastral,
            arquivos_anexos: anexosAtivos || [],
            status: 'TRANSFERIDO'
          })

        if (archiveError) throw archiveError

        await logAudit({
          supabase,
          action: 'UPDATE',
          entity: 'alunos (TRANSFERENCIA)',
          entityId: solicitacao.aluno_id,
          newData: { escola_id: solicitacao.escola_destino_id },
          performedBy: { id: funcionario.id, name: funcionario.nome, email: funcionario.email }
        })
      }

      // Notificar quem solicitou
      await (supabase as any).rpc('criar_notificacoes', {
        p_destinatarios: [solicitacao.solicitante_id],
        p_title: `Transferência ${novoStatus}`,
        p_message: `O pedido de transferência do aluno ${solicitacao.alunos?.nome} foi ${novoStatus.toLowerCase()} pela escola de destino.`,
        p_type: aceitar ? 'SUCCESS' : 'ERROR'
      })

      toast.success(`Transferência ${aceitar ? 'aceita' : 'rejeitada'} com sucesso!`)
      router.push('/admin/solicitacoes')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao responder solicitação')
    }
    setProcessing(false)
  }

  if (loading) return <div className="p-8 text-center text-[#aaa]">Carregando solicitação...</div>
  if (!solicitacao) return <div className="p-8 text-center text-[#aaa]">Solicitação não encontrada.</div>

  const isResolvida = solicitacao.status !== 'PENDENTE'

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-[#3f3f46] flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-[#aaa] hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-white">Avaliar Transferência</h2>
          <p className="text-[#aaa] text-sm mt-1">
            Origem: <strong className="text-white">{solicitacao.origem?.nome}</strong> → 
            Destino: <strong className="text-white">{solicitacao.destino?.nome}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Painel do Aluno */}
        <div className="bg-[#121212] border border-[#3f3f46] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-bold text-white">Ficha do Aluno</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#aaa]">Nome Completo</label>
              <div className="text-white font-medium">{solicitacao.ficha_snapshot?.nome || solicitacao.alunos?.nome}</div>
            </div>
            <div>
              <label className="text-xs text-[#aaa]">Série / Turma Original</label>
              <div className="text-white">{solicitacao.ficha_snapshot?.serie || 'Não informada'}</div>
            </div>
            <div>
              <label className="text-xs text-[#aaa]">Motivo da Solicitação</label>
              <div className="text-white bg-[#1a1a1c] p-3 rounded-md border border-[#2a2a2a] mt-1">
                {solicitacao.motivo}
              </div>
            </div>
          </div>
        </div>

        {/* Anexos e Resolução */}
        <div className="space-y-6">
          <div className="bg-[#121212] border border-[#3f3f46] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Documentos Anexos</h3>
            </div>
            {solicitacao.arquivos_anexos?.length > 0 ? (
              <ul className="space-y-2">
                {solicitacao.arquivos_anexos.map((arq: any, i: number) => (
                  <li key={i} className="text-sm text-sky-400 hover:underline cursor-pointer">
                    {arq.nome || `Anexo ${i + 1}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#aaa]">Apenas a ficha original anexada (sem novos documentos).</p>
            )}
          </div>

          <div className="bg-[#121212] border border-[#3f3f46] rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Decisão</h3>
            
            {isResolvida ? (
              <div className="space-y-2">
                <p className="text-sm text-[#aaa]">Status atual: <strong className={solicitacao.status === 'ACEITA' ? 'text-emerald-500' : 'text-rose-500'}>{solicitacao.status}</strong></p>
                {solicitacao.resposta_texto && (
                  <div className="text-sm text-white bg-[#1a1a1c] p-3 rounded-md border border-[#2a2a2a]">
                    <strong className="block text-[#aaa] text-xs mb-1">Justificativa:</strong>
                    {solicitacao.resposta_texto}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  placeholder="Justificativa (obrigatória em caso de rejeição)"
                  className="w-full min-h-[80px] p-3 rounded-md bg-[#18181a] border border-[#3f3f46] text-white text-sm outline-none focus:border-purple-500 resize-none"
                />
                
                <div className="flex gap-3">
                  <Button 
                    disabled={processing}
                    onClick={() => handleResponder(false)} 
                    className="flex-1 bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-600/50"
                  >
                    <X className="w-4 h-4 mr-2" /> Rejeitar
                  </Button>
                  <Button 
                    disabled={processing}
                    onClick={() => handleResponder(true)} 
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4 mr-2" /> Aceitar Aluno
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
