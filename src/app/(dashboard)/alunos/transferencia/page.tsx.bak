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
  const [resultadosBusca, setResultadosBusca] = useState<any[]>([])
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null)
  const [escolas, setEscolas] = useState<any[]>([])
  
  const [destinoId, setDestinoId] = useState('')
  const [foraDaRede, setForaDaRede] = useState(false)
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    // Carrega escolas ativas para o select de destino (exceto a escola atual)
    const loadEscolas = async () => {
      const { data } = await supabase
        .from('escolas')
        .select('id, nome')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome', { ascending: true })
      if (data) {
        setEscolas(data.filter(e => e.id !== escolaAtivaId))
      }
    }
    loadEscolas()
  }, [escolaAtivaId, supabase])

  const handleBuscarAluno = async () => {
    if (!buscaAluno) return
    
    const isAdmin = useAuthStore.getState().isAdminGlobalOrRoot()
    if (!escolaAtivaId && !isAdmin) {
      toast.error('Nenhuma escola ativa selecionada.')
      return
    }

    setLoading(true)
    setAlunoSelecionado(null)
    setResultadosBusca([])

    try {
      let query = supabase
        .from('alunos')
        .select('*')
        .ilike('nome', `%${buscaAluno}%`)
        .is('deleted_at', null)

      if (escolaAtivaId) {
        query = query.eq('escola_id', escolaAtivaId)
      }

      const { data, error } = await query.limit(10)

      if (data && data.length > 0) {
        setResultadosBusca(data)
        if (data.length === 1) {
          setAlunoSelecionado(data[0])
        }
      } else {
        toast.error('Nenhum aluno encontrado com esse nome.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar alunos.')
    } finally {
      setLoading(false)
    }
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
          escolaOrigemId: alunoSelecionado.escola_id || undefined, // Mitigação: usar escola_id do aluno ao invés da ativa do usuário
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
        const { data: insertData, error: insertError } = await supabase
          .from('transferencias_alunos')
          .insert({
            aluno_id: alunoSelecionado.id,
            escola_origem_id: alunoSelecionado.escola_id, // Mitigação: usar escola_id do aluno ao invés da ativa do usuário
            escola_destino_id: destinoId || null, // Mitigação: converter string vazia para null para evitar erro de UUID
            solicitante_id: funcionario.id,
            motivo,
            fora_da_rede: false,
            ficha_snapshot: alunoSelecionado,
            status: 'PENDENTE'
          })
          .select('id')
          .single()
        
        if (insertError) throw insertError

        const transferId = insertData?.id

        // Notificar o diretor da escola de destino
        const { data: escolaDest } = await supabase.from('escolas').select('diretor_id').eq('id', destinoId).single()
        if (escolaDest && escolaDest.diretor_id) {
          await supabase.from('notifications').insert({
            user_id: escolaDest.diretor_id,
            title: 'Nova Solicitação de Transferência',
            message: `O aluno ${alunoSelecionado.nome} solicitou transferência para sua escola.`,
            type: 'INFO',
            link: `/transferencias?tab=alunos&subtab=recebimentos${transferId ? `&id=${transferId}` : ''}`
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleBuscarAluno()
                }
              }}
              className="bg-[#18181a] border-[#3f3f46] text-white"
            />
            <Button onClick={handleBuscarAluno} disabled={loading} className="bg-[#27272a] hover:bg-[#3f3f46]">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Resultados de Busca se houver múltiplos */}
          {resultadosBusca.length > 1 && !alunoSelecionado && (
            <div className="mt-2 border border-[#3f3f46] bg-[#18181a] rounded-lg max-h-40 overflow-y-auto divide-y divide-[#26262a]">
              {resultadosBusca.map((aluno) => (
                <button
                  key={aluno.id}
                  onClick={() => setAlunoSelecionado(aluno)}
                  className="w-full text-left px-3 py-2.5 text-sm text-zinc-300 hover:bg-[#27272a] hover:text-white transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">{aluno.nome}</span>
                  <span className="text-xs text-zinc-500">ID: {aluno.id.split('-')[0]}</span>
                </button>
              ))}
            </div>
          )}

          {alunoSelecionado && (
            <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 font-bold">
                  {alunoSelecionado.nome.charAt(0)}
                </div>
                <div>
                  <p className="text-emerald-500 font-semibold">{alunoSelecionado.nome}</p>
                  <p className="text-xs text-emerald-500/70">ID: {alunoSelecionado.id.split('-')[0]}</p>
                </div>
              </div>
              {resultadosBusca.length > 1 && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setAlunoSelecionado(null)}
                  className="text-xs text-[#aaa] hover:text-white hover:bg-zinc-800"
                >
                  Alterar
                </Button>
              )}
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
