'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { 
  MessageSquare, 
  Send, 
  User, 
  CheckCheck, 
  Clock, 
  Loader2, 
  AlertCircle, 
  GraduationCap,
  ShieldCheck,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

interface TabComunicacoesTurmaProps {
  turma: any
  alunos: any[]
  loading?: boolean
}

export function TabComunicacoesTurma({
  turma,
  alunos,
  loading: parentLoading
}: TabComunicacoesTurmaProps) {
  const supabase = createClient()
  const { funcionario, escolaAtivaId } = useAuthStore()

  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('')
  const [buscaAluno, setBuscaAluno] = useState('')
  const [mensagens, setMensagens] = useState<any[]>([])
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Selecionar o primeiro aluno por padrão ao carregar lista
  useEffect(() => {
    if (alunos && alunos.length > 0 && !selectedAlunoId) {
      setSelectedAlunoId(alunos[0].id)
    }
  }, [alunos, selectedAlunoId])

  // Carregar mensagens quando o aluno selecionado mudar
  useEffect(() => {
    if (!selectedAlunoId) {
      setMensagens([])
      return
    }

    async function carregarMensagens() {
      setLoadingMensagens(true)
      try {
        const { data, error } = await (supabase as any)
          .from('mensagens_responsaveis')
          .select(`
            id,
            escola_id,
            turma_id,
            aluno_id,
            professor_id,
            responsavel_id,
            remetente_tipo,
            autor_nome,
            titulo,
            conteudo,
            lida_responsavel,
            lida_responsavel_em,
            lida_professor,
            lida_professor_em,
            created_at,
            professor:professor_id (id, nome, cargo)
          `)
          .eq('aluno_id', selectedAlunoId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (isMounted.current) {
          setMensagens((data as any[]) || [])

          // Marcar como lida pelo professor caso haja mensagens do responsável não lidas
          const naoLidas = (data || []).filter(
            (m: any) => m.remetente_tipo === 'responsavel' && !m.lida_professor
          )
          if (naoLidas.length > 0) {
            const ids = naoLidas.map((m: any) => m.id)
            await (supabase as any)
              .from('mensagens_responsaveis')
              .update({
                lida_professor: true,
                lida_professor_em: new Date().toISOString()
              })
              .in('id', ids)
          }
        }
      } catch (err: any) {
        console.error('Erro ao carregar mensagens com os responsáveis:', err)
        if (isMounted.current) {
          toast.error('Erro ao carregar histórico de recados.')
        }
      } finally {
        if (isMounted.current) {
          setLoadingMensagens(false)
        }
      }
    }

    carregarMensagens()
  }, [selectedAlunoId, supabase])

  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conteudo.trim()) {
      toast.error('Digite a mensagem a ser enviada aos pais.')
      return
    }
    if (!selectedAlunoId || !turma?.id || !escolaAtivaId) {
      toast.error('Dados incompletos para envio do recado.')
      return
    }

    setEnviando(true)
    try {
      const novaMensagem = {
        escola_id: escolaAtivaId,
        turma_id: turma.id,
        aluno_id: selectedAlunoId,
        professor_id: funcionario?.id ?? null,
        remetente_tipo: 'professor',
        autor_nome: funcionario?.nome ?? 'Professor(a)',
        titulo: titulo.trim() || 'Recado Pedagógico',
        conteudo: conteudo.trim(),
        lida_responsavel: false,
        lida_professor: true,
        lida_professor_em: new Date().toISOString()
      }

      const { data, error } = await (supabase as any)
        .from('mensagens_responsaveis')
        .insert(novaMensagem as any)
        .select(`
          id,
          escola_id,
          turma_id,
          aluno_id,
          professor_id,
          responsavel_id,
          remetente_tipo,
          autor_nome,
          titulo,
          conteudo,
          lida_responsavel,
          lida_responsavel_em,
          lida_professor,
          lida_professor_em,
          created_at,
          professor:professor_id (id, nome, cargo)
        `)
        .single()

      if (error) throw error

      setMensagens((prev) => [...prev, data])
      setConteudo('')
      setTitulo('')
      toast.success('Recado enviado com sucesso para os responsáveis!')
    } catch (err: any) {
      console.error('Erro ao enviar mensagem para os pais:', err)
      toast.error('Erro ao enviar o recado. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const alunosFiltrados = (alunos || []).filter((a) =>
    (a.nome || '').toLowerCase().includes(buscaAluno.toLowerCase())
  )

  const alunoAtual = (alunos || []).find((a) => a.id === selectedAlunoId)

  if (parentLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Carregando informações da turma...
      </div>
    )
  }

  if (!alunos || alunos.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center space-y-2">
        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto" />
        <h4 className="font-semibold text-foreground">Nenhum aluno nesta turma</h4>
        <p className="text-xs text-muted-foreground">
          Enturme os alunos na aba &quot;Alunos&quot; para iniciar o canal de comunicação com os pais.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      {/* Coluna da Esquerda: Lista de Alunos da Turma */}
      <div className="md:col-span-4 bg-card border border-border rounded-xl p-3 flex flex-col h-[520px]">
        <div className="pb-2 border-b border-border space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <User className="w-4 h-4 text-indigo-500" />
            <span>Alunos da Turma ({alunos.length})</span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
              placeholder="Buscar aluno..."
              className="h-8 text-xs pl-8 bg-background border-border"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-2 space-y-1 pr-1">
          {alunosFiltrados.map((aluno) => {
            const isSelected = aluno.id === selectedAlunoId
            return (
              <button
                key={aluno.id}
                onClick={() => setSelectedAlunoId(aluno.id)}
                className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center gap-2.5 ${
                  isSelected
                    ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/30'
                    : 'text-foreground hover:bg-muted/60 border border-transparent'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0 border border-border">
                  {aluno.nome?.substring(0, 2).toUpperCase() || 'AL'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="truncate block">{aluno.nome}</span>
                  {aluno.numero_matricula && (
                    <span className="text-[10px] text-muted-foreground font-mono block">
                      Matr: {aluno.numero_matricula}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
          {alunosFiltrados.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-6">
              Nenhum aluno encontrado.
            </p>
          )}
        </div>
      </div>

      {/* Coluna da Direita: Histórico de Conversa e Envio de Recado */}
      <div className="md:col-span-8 bg-card border border-border rounded-xl p-4 flex flex-col h-[520px]">
        {/* Cabeçalho do Aluno Selecionado */}
        <div className="pb-3 border-b border-border flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-muted-foreground">Canal de Comunicação com os Pais:</span>
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              {alunoAtual?.nome || 'Selecione um Aluno'}
            </h4>
          </div>
          <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20 gap-1">
            <ShieldCheck className="w-3 h-3" />
            Portal Ativo
          </Badge>
        </div>

        {/* Área de Mensagens / Chat */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {loadingMensagens ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Carregando mensagens...
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-muted-foreground p-6">
              <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-xs">Nenhum recado registrado com os pais deste aluno ainda.</p>
              <p className="text-[11px] text-muted-foreground/70">
                Envie um aviso, elogio ou comunicado pedagógico no campo abaixo.
              </p>
            </div>
          ) : (
            mensagens.map((msg) => {
              const isProfessor = msg.remetente_tipo === 'professor'
              const dataFormatada = new Date(msg.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isProfessor ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 space-y-1.5 shadow-sm text-xs ${
                      isProfessor
                        ? 'bg-indigo-600 text-white rounded-tr-xs'
                        : 'bg-muted border border-border text-foreground rounded-tl-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 border-b border-white/15 pb-1">
                      <span className="font-semibold">
                        {isProfessor ? (msg.autor_nome || 'Você (Professor)') : (msg.autor_nome || 'Responsável pelo Aluno')}
                      </span>
                      <span>{dataFormatada}</span>
                    </div>

                    {msg.titulo && msg.titulo !== 'Recado Pedagógico' && (
                      <p className="font-bold text-[11px] pt-0.5">{msg.titulo}</p>
                    )}

                    <p className="whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>

                    <div className="flex items-center justify-end gap-1 text-[10px] pt-1 opacity-75">
                      {isProfessor ? (
                        msg.lida_responsavel ? (
                          <span className="flex items-center gap-1 text-emerald-300">
                            <CheckCheck className="w-3 h-3" />
                            Lido pelos pais
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Aguardando leitura
                          </span>
                        )
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <CheckCheck className="w-3 h-3" />
                          Mensagem dos pais
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Formulário de Envio de Mensagem */}
        <form onSubmit={handleEnviarMensagem} className="pt-3 border-t border-border space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Assunto (opcional)"
              className="sm:col-span-1 h-8 text-xs bg-background border-border"
            />
            <Input
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Digite o recado para os responsáveis..."
              className="sm:col-span-3 h-8 text-xs bg-background border-border"
              required
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={enviando || !conteudo.trim()}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 gap-1.5"
            >
              {enviando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Enviar Recado aos Pais
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
