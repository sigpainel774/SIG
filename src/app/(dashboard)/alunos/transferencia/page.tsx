'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { ArrowLeftRight, Save, X, Search, FileUp, School } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { arquivarAluno } from '@/lib/audit/archive-agent'

export default function TransferenciaAlunoPage() {
  const router = useRouter()
  const supabase = createClient()
  const { funcionario, escolaAtivaId } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null)
  const [escolas, setEscolas] = useState<any[]>([])
  
  const [destinoId, setDestinoId] = useState('')
  const [foraDaRede, setForaDaRede] = useState(false)
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    // Carrega escolas ativas para o select de destino (exceto a escola atual)
    const loadEscolas = async () => {
      const { data } = await supabase.from('escolas').select('id, nome').eq('ativo', true)
      if (data) {
        setEscolas(data.filter(e => e.id !== escolaAtivaId))
      }
    }
    loadEscolas()
  }, [escolaAtivaId, supabase])

  const handleBuscarAluno = async () => {
    if (!buscaAluno || !escolaAtivaId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('escola_id', escolaAtivaId)
      .ilike('nome', `%${buscaAluno}%`)
      .is('deleted_at', null)
      .limit(1)

    if (data && data.length > 0) {
      setAlunoSelecionado(data[0])
    } else {
      toast.error('Nenhum aluno encontrado na sua escola com esse nome.')
      setAlunoSelecionado(null)
    }
    setLoading(false)
  }

  const handleSubmeter = async () => {
    if (!alunoSelecionado) return toast.error('Selecione um aluno')
    if (!motivo) return toast.error('Descreva o motivo da transferência')
    if (!foraDaRede && !destinoId) return toast.error('Selecione a escola de destino ou marque "Fora da Rede"')
    if (!funcionario) return toast.error('Usuário não autenticado')

    setLoading(true)
    try {
      if (foraDaRede) {
        // Se fora da rede, arquiva diretamente e encerra
        const res = await arquivarAluno({
          supabase,
          aluno: alunoSelecionado,
          motivo: `TRANSFERENCIA_FORA_REDE: ${motivo}`,
          escolaOrigemId: escolaAtivaId || undefined,
          arquivadoPor: { id: funcionario.id, name: funcionario.nome, email: funcionario.email }
        })
        if (res.success) {
          toast.success('Aluno transferido para Fora da Rede e arquivado com sucesso!')
          router.push('/alunos')
        } else {
          throw new Error('Falha no arquivamento')
        }
      } else {
        // Se interna, cria a solicitação na tabela de transferências
        const { error: insertError } = await supabase.from('transferencias_alunos').insert({
          aluno_id: alunoSelecionado.id,
          escola_origem_id: escolaAtivaId,
          escola_destino_id: destinoId,
          solicitante_id: funcionario.id,
          motivo,
          fora_da_rede: false,
          ficha_snapshot: alunoSelecionado,
          status: 'PENDENTE'
        })
        
        if (insertError) throw insertError

        // Notificar o diretor da escola de destino (buscando quem é o diretor lá, ou mandando pra todos de lá)
        // Por simplicidade, inserimos uma notificação geral. 
        // Na prática, deve-se pegar os usuários que gerenciam a `escola_destino_id`.
        
        // Simulação: Enviar notificação para a escola destino (usuário placeholder ou pegando do DB)
        const { data: escolaDest } = await supabase.from('escolas').select('diretor_id').eq('id', destinoId).single()
        if (escolaDest && escolaDest.diretor_id) {
          await supabase.from('notifications').insert({
            user_id: escolaDest.diretor_id,
            title: 'Nova Solicitação de Transferência',
            message: `O aluno ${alunoSelecionado.nome} solicitou transferência para sua escola.`,
            type: 'INFO'
          })
        }

        toast.success('Solicitação enviada para a escola de destino!')
        router.push('/alunos')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao processar transferência')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="pb-4 border-b border-[#3f3f46]">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-sky-500" /> Solicitar Transferência
        </h2>
        <p className="text-[#aaa] text-sm mt-1">Transfira um aluno para outra escola da rede ou para fora do município.</p>
      </div>

      <div className="bg-[#121212] border border-[#3f3f46] p-6 rounded-xl space-y-6">
        
        {/* Passo 1: Selecionar Aluno */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-white">1. Buscar Aluno (Escola Atual)</label>
          <div className="flex gap-2">
            <Input 
              placeholder="Nome do aluno..." 
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
              className="bg-[#18181a] border-[#3f3f46] text-white"
            />
            <Button onClick={handleBuscarAluno} disabled={loading} className="bg-[#27272a] hover:bg-[#3f3f46]">
              <Search className="w-4 h-4" />
            </Button>
          </div>
          {alunoSelecionado && (
            <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 font-bold">
                {alunoSelecionado.nome.charAt(0)}
              </div>
              <div>
                <p className="text-emerald-500 font-semibold">{alunoSelecionado.nome}</p>
                <p className="text-xs text-emerald-500/70">ID: {alunoSelecionado.id.split('-')[0]}</p>
              </div>
            </div>
          )}
        </div>

        {/* Passo 2: Destino */}
        <div className="space-y-3 pt-4 border-t border-[#3f3f46]">
          <label className="text-sm font-semibold text-white">2. Destino e Motivo</label>
          
          <div className="flex items-center gap-3 mb-4 p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg">
            <input 
              type="checkbox" 
              id="foraDaRede" 
              checked={foraDaRede}
              onChange={(e) => setForaDaRede(e.target.checked)}
              className="w-4 h-4 accent-sky-500 rounded border-gray-600 bg-gray-700"
            />
            <label htmlFor="foraDaRede" className="text-sm text-sky-400 font-medium cursor-pointer">
              Transferência para FORA DA REDE MUNICIPAL (O aluno será arquivado)
            </label>
          </div>

          {!foraDaRede && (
            <div className="space-y-1.5">
              <label className="text-xs text-[#aaa]">Escola de Destino</label>
              <select 
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-[#18181a] border border-[#3f3f46] text-white text-sm outline-none focus:border-sky-500"
              >
                <option value="">Selecione uma escola...</option>
                {escolas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5 pt-2">
            <label className="text-xs text-[#aaa]">Motivo / Justificativa</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo da transferência..."
              className="w-full min-h-[80px] p-3 rounded-md bg-[#18181a] border border-[#3f3f46] text-white text-sm outline-none focus:border-sky-500 resize-none"
            />
          </div>
        </div>

        {/* Passo 3: Arquivos */}
        <div className="space-y-3 pt-4 border-t border-[#3f3f46]">
          <label className="text-sm font-semibold text-white">3. Anexos Adicionais (Opcional)</label>
          <div className="border-2 border-dashed border-[#3f3f46] rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#1a1a1c] transition-colors cursor-pointer">
            <FileUp className="w-8 h-8 text-[#aaa] mb-2" />
            <p className="text-sm text-white font-medium">Clique ou arraste arquivos aqui</p>
            <p className="text-xs text-[#777] mt-1">PDF, JPG, PNG (Ficha, Histórico, etc)</p>
          </div>
          <p className="text-xs text-amber-500/80">Nota: A ficha atual do sistema será anexada automaticamente.</p>
        </div>

        <div className="pt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => router.back()} className="text-[#aaa] hover:text-white">
            Cancelar
          </Button>
          <Button onClick={handleSubmeter} disabled={loading || !alunoSelecionado} className="bg-sky-600 text-white hover:bg-sky-700">
            {loading ? 'Processando...' : 'Confirmar Transferência'}
          </Button>
        </div>
      </div>
    </div>
  )
}
