'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { ArrowLeftRight, Save, X, Search, FileUp, School, Loader2 } from 'lucide-react'
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
  const [alunos, setAlunos] = useState<any[]>([])
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<any>(null)
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [escolas, setEscolas] = useState<any[]>([])
  
  const [destinoId, setDestinoId] = useState('')
  const [foraDaRede, setForaDaRede] = useState(false)
  const [motivo, setMotivo] = useState('')

  const autocompleteRef = useRef<HTMLDivElement>(null)

  // Clique fora do autocomplete fecha as sugestões
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Carregar todos os alunos da escola ativa ao iniciar a página
  useEffect(() => {
    const loadAlunos = async () => {
      const isAdmin = useAuthStore.getState().isAdminGlobalOrRoot()
      if (!escolaAtivaId && !isAdmin) {
        setAlunos([])
        return
      }

      setLoadingAlunos(true)
      try {
        let query = supabase
          .from('alunos')
          .select('*, escolas(nome), turmas(nome)')
          .is('deleted_at', null)

        if (escolaAtivaId) {
          query = query.eq('escola_id', escolaAtivaId)
        }

        const { data, error } = await query.order('nome', { ascending: true })
        if (error) throw error
        setAlunos(data || [])
      } catch (err) {
        console.error('Erro ao carregar alunos:', err)
        toast.error('Erro ao carregar lista de alunos.')
      } finally {
        setLoadingAlunos(false)
      }
    }

    loadAlunos()
  }, [escolaAtivaId, supabase])

  // Normalização de strings para a busca dinâmica
  const normalizeString = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  // Filtrar lista com base na digitação
  const sugestoesAlunos = alunos.filter((aluno) => {
    if (!buscaAluno) return false

    const buscaNormalizada = normalizeString(buscaAluno)
    const nomeNormalizado = normalizeString(aluno.nome || '')
    const idNormalizado = normalizeString(aluno.id || '')

    return nomeNormalizado.includes(buscaNormalizada) || idNormalizado.includes(buscaNormalizada)
  }).slice(0, 10)

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

        // Notificar diretores e secretários da escola de destino (níveis 2 e 3 ativos)
        const { data: acessosDest } = await supabase
          .from('acessos_usuarios')
          .select('funcionarios(auth_user_id)')
          .eq('escola_id', destinoId)
          .in('nivel', [2, 3])
          .eq('ativo', true)

        const { data: escolaDest } = await supabase
          .from('escolas')
          .select('diretor_id')
          .eq('id', destinoId)
          .single()

        const userIds = new Set<string>()
        if (escolaDest?.diretor_id) {
          userIds.add(escolaDest.diretor_id)
        }

        if (acessosDest) {
          acessosDest.forEach((acc: any) => {
            const authId = acc.funcionarios?.auth_user_id
            if (authId) {
              userIds.add(authId)
            }
          })
        }

        if (userIds.size > 0) {
          const notificationsToInsert = Array.from(userIds).map((userId) => ({
            user_id: userId,
            title: 'Nova Solicitação de Transferência',
            message: `O aluno ${alunoSelecionado.nome} solicitou transferência para sua escola.`,
            type: 'INFO',
            link: `/transferencias?tab=alunos&subtab=recebimentos${transferId ? `&id=${transferId}` : ''}`,
            read: false
          }))
          await supabase.from('notifications').insert(notificationsToInsert)
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
        <div className="space-y-3 relative" ref={autocompleteRef}>
          <label className="text-sm font-semibold text-white">1. Buscar Aluno (Escola Atual)</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="Digite o nome ou matrícula do aluno..." 
              value={buscaAluno}
              onChange={(e) => {
                setBuscaAluno(e.target.value)
                setShowSugestoes(true)
                if (alunoSelecionado) setAlunoSelecionado(null)
              }}
              onFocus={() => setShowSugestoes(true)}
              onClick={() => setShowSugestoes(true)}
              className="pl-9 pr-10 bg-[#18181a] border-[#3f3f46] text-white rounded-xl h-10 text-sm focus:ring-2 focus:ring-sky-500/50"
            />
            {buscaAluno && (
              <button
                type="button"
                onClick={() => {
                  setBuscaAluno('')
                  setAlunoSelecionado(null)
                  setShowSugestoes(false)
                }}
                className="absolute right-3 top-3 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sugestões do Autocomplete */}
          {showSugestoes && buscaAluno && (
            <div className="absolute z-50 w-full mt-1 bg-[#121214] border border-[#3f3f46] rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
              {loadingAlunos ? (
                <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...
                </div>
              ) : sugestoesAlunos.length > 0 ? (
                sugestoesAlunos.map((aluno) => (
                  <button
                    key={aluno.id}
                    type="button"
                    onClick={() => {
                      setAlunoSelecionado(aluno)
                      setBuscaAluno(aluno.nome)
                      setShowSugestoes(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-[#185FA5]/10 hover:text-[#3ea6ff] text-zinc-300 transition-colors border-b border-[#26262a] last:border-none cursor-pointer flex flex-col gap-0.5"
                  >
                    <span className="font-bold text-white uppercase">{aluno.nome}</span>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                      <span>Matrícula: {aluno.id}</span>
                      {aluno.turmas?.nome && (
                        <>
                          <span>•</span>
                          <span className="text-[#3ea6ff] font-sans font-semibold">Turma: {aluno.turmas.nome}</span>
                        </>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-zinc-500">Nenhum aluno encontrado.</div>
              )}
            </div>
          )}

          {/* Ficha Rápida do Aluno Selecionado */}
          {alunoSelecionado && (
            <div className="p-4 bg-background border border-border rounded-xl space-y-3 animate-in fade-in duration-200 mt-2">
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border pb-1">
                Ficha Rápida do Aluno
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-xs uppercase tracking-wide text-zinc-500 block mb-0.5">Aluno(a)</span>
                  <span className="text-sm font-semibold text-white uppercase">{alunoSelecionado.nome}</span>
                </div>
                {alunoSelecionado.turmas?.nome && (
                  <div>
                    <span className="text-xs uppercase tracking-wide text-zinc-500 block mb-0.5">Turma</span>
                    <span className="text-sm font-normal text-zinc-300 uppercase">{alunoSelecionado.turmas.nome}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs uppercase tracking-wide text-zinc-500 block mb-0.5">Mãe / Responsável</span>
                  <span className="text-sm font-normal text-zinc-300 uppercase">{alunoSelecionado.nome_mae ?? 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wide text-zinc-500 block mb-0.5">Escola de Origem</span>
                  <span className="text-sm font-normal text-zinc-300 uppercase">{alunoSelecionado.escolas?.nome ?? 'Rede'}</span>
                </div>
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
