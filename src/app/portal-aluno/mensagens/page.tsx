'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  MessageSquareText,
  Send,
  Loader2,
  Building2,
  User,
  CheckCheck,
  Clock,
  Sparkles,
  School,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import PortalPaisLayout from '@/components/portal-pais/PortalPaisLayout'

const AZUL = '#0B4FB3'
const LARANJA = '#F47C12'

interface AlunoDependente {
  id: string
  nome: string
  numero_matricula: string | null
  escola: {
    id: string
    nome: string
    portal_pais_ativo: boolean
    portal_comunicacoes_ativo: boolean
  } | null
  turma: {
    id: string
    nome: string
  } | null
}

interface MensagemItem {
  id: string
  escola_id: string
  turma_id: string | null
  aluno_id: string
  professor_id: string | null
  responsavel_id: string | null
  remetente_tipo: 'professor' | 'responsavel'
  autor_nome: string | null
  titulo: string | null
  conteudo: string
  lida_responsavel: boolean
  lida_responsavel_em: string | null
  lida_professor: boolean
  lida_professor_em: string | null
  created_at: string
}

export default function MensagensPaisPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [responsavel, setResponsavel] = useState<{ id: string; nome: string; email: string } | null>(null)
  const [filhos, setFilhos] = useState<AlunoDependente[]>([])
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('')
  
  const [mensagens, setMensagens] = useState<MensagemItem[]>([])
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [enviando, setEnviando] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Carregar perfil do responsável e dependentes
  useEffect(() => {
    async function carregarDadosIniciais() {
      try {
        setLoading(true)
        const { data: authData } = await supabase.auth.getUser()
        const authUser = authData?.user

        if (!authUser) {
          router.push('/portal-aluno/login')
          return
        }

        const { data: respData, error: respError } = await supabase
          .from('responsaveis')
          .select('id, nome, email')
          .eq('auth_user_id', authUser.id)
          .maybeSingle()

        if (respError || !respData) {
          toast.error('Perfil de responsável não encontrado.')
          return
        }

        if (!isMounted.current) return
        setResponsavel(respData)

        // Buscar dependentes vinculados
        const { data: vinculosData, error: vincError } = await supabase
          .from('responsaveis_alunos')
          .select(`
            aluno_id,
            aluno:aluno_id (
              id,
              nome,
              numero_matricula,
              escola:escola_id (id, nome, portal_pais_ativo, portal_comunicacoes_ativo),
              turma:turma_id (id, nome)
            )
          `)
          .eq('responsavel_id', respData.id)

        if (vincError) throw vincError

        const listaFilhos: AlunoDependente[] = (vinculosData || [])
          .map((v: any) => v.aluno)
          .filter(Boolean)

        if (!isMounted.current) return
        setFilhos(listaFilhos)
        if (listaFilhos.length > 0) {
          setSelectedAlunoId(listaFilhos[0].id)
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar dados iniciais de mensagens:', err)
        toast.error('Erro ao carregar dependentes.')
      } finally {
        if (isMounted.current) setLoading(false)
      }
    }

    carregarDadosIniciais()
  }, [supabase, router])

  // Carregar mensagens do aluno selecionado
  useEffect(() => {
    if (!selectedAlunoId) {
      setMensagens([])
      return
    }

    async function carregarMensagensAluno() {
      setLoadingMensagens(true)
      try {
        const { data, error } = await supabase
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
            created_at
          `)
          .eq('aluno_id', selectedAlunoId)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (!isMounted.current) return
        setMensagens((data as MensagemItem[]) || [])

        // Marcar mensagens do professor/escola como lidas pelo responsável
        const naoLidas = (data || []).filter(
          (m: any) => m.remetente_tipo === 'professor' && !m.lida_responsavel
        )
        if (naoLidas.length > 0) {
          const ids = naoLidas.map((m: any) => m.id)
          await supabase
            .from('mensagens_responsaveis')
            .update({
              lida_responsavel: true,
              lida_responsavel_em: new Date().toISOString(),
            })
            .in('id', ids)
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar mensagens:', err)
        toast.error('Não foi possível carregar as mensagens.')
      } finally {
        if (isMounted.current) {
          setLoadingMensagens(false)
          setTimeout(scrollToBottom, 150)
        }
      }
    }

    carregarMensagensAluno()
  }, [selectedAlunoId, supabase])

  const alunoAtivo = useMemo(
    () => filhos.find((f) => f.id === selectedAlunoId) ?? null,
    [filhos, selectedAlunoId]
  )

  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!conteudo.trim()) {
      toast.error('Digite o conteúdo da mensagem.')
      return
    }

    if (!alunoAtivo || !alunoAtivo.escola?.id) {
      toast.error('Escola do dependente não encontrada.')
      return
    }

    setEnviando(true)

    try {
      const payload = {
        escola_id: alunoAtivo.escola.id,
        turma_id: alunoAtivo.turma?.id ?? null,
        aluno_id: alunoAtivo.id,
        professor_id: null, // Destinado à equipe da Escola/Secretaria
        responsavel_id: responsavel?.id ?? null,
        remetente_tipo: 'responsavel' as const,
        autor_nome: responsavel?.nome ?? 'Responsável',
        titulo: titulo.trim() || 'Recado da Família',
        conteudo: conteudo.trim(),
        lida_responsavel: true,
        lida_responsavel_em: new Date().toISOString(),
        lida_professor: false,
      }

      const { data, error } = await supabase
        .from('mensagens_responsaveis')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      setMensagens((prev) => [...prev, data as MensagemItem])
      setConteudo('')
      setTitulo('')
      toast.success('Mensagem enviada com sucesso para a escola!')
      setTimeout(scrollToBottom, 150)
    } catch (err: unknown) {
      console.error('Erro ao enviar mensagem:', err)
      toast.error('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/portal-aluno/login')
  }

  return (
    <PortalPaisLayout
      nomeResponsavel={responsavel?.nome ?? 'Responsável'}
      onLogout={handleLogout}
      headerSubtitle="Comunicação com a Escola"
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* Cabeçalho da Tela */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B4FB3] mb-1">
              <MessageSquareText className="w-4 h-4" />
              Canal de Mensagens
            </div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              Fale com a Escola
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Envie recados, justificativas e converse diretamente com a equipe escolar e secretaria.
            </p>
          </div>

          {/* Seletor de Dependente (se houver mais de um) */}
          {filhos.length > 1 && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#DCE7F2] shadow-xs">
              <span className="text-xs font-bold text-slate-500 pl-2">Filho:</span>
              <select
                value={selectedAlunoId}
                onChange={(e) => setSelectedAlunoId(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#102D50] focus:outline-none focus:ring-2 focus:ring-[#0B4FB3]/20"
              >
                {filhos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Card do Destinatário Ativo */}
        {alunoAtivo && (
          <div className="bg-white rounded-2xl border border-[#DCE7F2] p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: AZUL }}
              >
                <School className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destino das Mensagens</p>
                <p className="text-sm font-extrabold text-[#102D50]">
                  {alunoAtivo.escola?.nome ?? 'Escola Municipal'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 font-medium">
              <User className="w-3.5 h-3.5 text-[#0B4FB3]" />
              <span>
                Aluno: <strong>{alunoAtivo.nome}</strong> {alunoAtivo.turma?.nome ? `(${alunoAtivo.turma.nome})` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Caixa Principal de Chat / Mensagens */}
        <div className="bg-white rounded-2xl border border-[#DCE7F2] shadow-xs overflow-hidden flex flex-col h-[520px]">
          
          {/* Topo da Caixa */}
          <div className="px-5 py-3.5 border-b border-[#E3ECF4] bg-[#F9FBFE] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#102D50]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Canal Aberto com a Secretaria Escolar</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
            </span>
          </div>

          {/* Área de Rolagem das Mensagens */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F8FAFC]/50">
            {loading || loadingMensagens ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                <Loader2 className="w-7 h-7 animate-spin text-[#0B4FB3]" />
                <p className="text-xs text-slate-400">Carregando conversa...</p>
              </div>
            ) : mensagens.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0B4FB3] flex items-center justify-center">
                  <MessageSquareText className="w-6 h-6" />
                </div>
                <div className="max-w-xs space-y-1">
                  <p className="text-sm font-bold text-[#102D50]">Nenhuma mensagem ainda</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Envie uma mensagem abaixo para falar com a equipe ou secretaria da escola do seu filho.
                  </p>
                </div>
              </div>
            ) : (
              mensagens.map((msg) => {
                const isMine = msg.remetente_tipo === 'responsavel'
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 space-y-1.5 shadow-xs ${
                        isMine
                          ? 'bg-[#0B4FB3] text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-[#DCE7F2] rounded-bl-xs'
                      }`}
                    >
                      {/* Cabeçalho do Balão */}
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className={`font-bold ${isMine ? 'text-blue-100' : 'text-[#0B4FB3]'}`}>
                          {isMine ? 'Você (Responsável)' : (msg.autor_nome ?? 'Secretaria da Escola')}
                        </span>
                        <span className={`text-[10px] ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Título opcional da mensagem */}
                      {msg.titulo && msg.titulo !== 'Recado da Família' && (
                        <p className={`text-xs font-bold ${isMine ? 'text-orange-200' : 'text-slate-700'}`}>
                          {msg.titulo}
                        </p>
                      )}

                      {/* Conteúdo da Mensagem */}
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                        {msg.conteudo}
                      </p>

                      {/* Status de Leitura */}
                      <div className="flex items-center justify-end gap-1 pt-1 text-[10px]">
                        {isMine ? (
                          msg.lida_professor ? (
                            <span className="flex items-center gap-1 text-blue-200">
                              <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                              Lida pela escola
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-blue-200/80">
                              <Clock className="w-3 h-3" />
                              Entregue
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Formulário de Envio na Base */}
          <form
            onSubmit={handleEnviarMensagem}
            className="p-3.5 border-t border-[#E3ECF4] bg-white space-y-2"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Assunto (opcional, ex: Justificativa de Falta, Dúvida...)"
                disabled={enviando}
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B4FB3]/20 focus:border-[#0B4FB3]"
              />
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder={`Escreva sua mensagem para a escola ${alunoAtivo?.escola?.nome ? `(${alunoAtivo.escola.nome})` : ''}...`}
                rows={2}
                disabled={enviando}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleEnviarMensagem(e)
                  }
                }}
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B4FB3]/20 focus:border-[#0B4FB3] resize-none"
              />

              <Button
                type="submit"
                disabled={enviando || !conteudo.trim()}
                className="h-11 px-5 rounded-xl font-bold text-white shadow-md cursor-pointer gap-2 shrink-0"
                style={{ backgroundColor: AZUL }}
              >
                {enviando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Enviar</span>
                  </>
                )}
              </Button>
            </div>
          </form>

        </div>

      </div>
    </PortalPaisLayout>
  )
}
