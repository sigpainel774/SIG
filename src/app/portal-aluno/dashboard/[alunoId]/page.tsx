'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { 
  GraduationCap, 
  ArrowLeft, 
  BookOpen, 
  CalendarCheck, 
  AlertTriangle, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  School,
  MessageSquare,
  Send,
  CheckCheck,
  UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

export default function DetalhesAlunoPortalPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const alunoId = params?.alunoId as string

  const [activeTab, setActiveTab] = useState<'notas' | 'frequencia' | 'ocorrencias' | 'comunicacoes'>('notas')
  const [loading, setLoading] = useState(true)
  const [aluno, setAluno] = useState<any | null>(null)
  const [responsavel, setResponsavel] = useState<any | null>(null)

  // Dados das abas
  const [notas, setNotas] = useState<any[]>([])
  const [frequencias, setFrequencias] = useState<any[]>([])
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [marcandoCienteId, setMarcandoCienteId] = useState<string | null>(null)

  // Dados da aba de Comunicações
  const [mensagens, setMensagens] = useState<any[]>([])
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)
  const [novaMensagemTitulo, setNovaMensagemTitulo] = useState('')
  const [novaMensagemConteudo, setNovaMensagemConteudo] = useState('')
  const markedAsReadRef = useRef(false)

  useEffect(() => {
    if (!alunoId) return

    async function carregarAluno() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/portal-aluno/login')
          return
        }

        // 1. Buscar responsável logado
        const { data: respData } = await supabase
          .from('responsaveis')
          .select('id, nome, email, cpf, telefone')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (respData) {
          setResponsavel(respData)
        }

        // 2. Validar e carregar dados do aluno
        const { data: alunoData, error: alunoErr } = await supabase
          .from('alunos')
          .select(`
            id,
            nome,
            numero_matricula,
            foto_url,
            serie,
            turma:turma_id (id, nome, turno),
            escola:escola_id (id, nome, portal_pais_ativo, portal_comunicacoes_ativo)
          `)
          .eq('id', alunoId)
          .single()

        if (alunoErr || !alunoData) {
          toast.error('Aluno não localizado ou sem permissão de acesso.')
          router.push('/portal-aluno/dashboard')
          return
        }

        setAluno(alunoData)

        // 3. Carregar Notas
        const { data: notasData } = await supabase
          .from('notas')
          .select(`
            id,
            unidade,
            nota1,
            nota2,
            nota3,
            materia:materia_id (id, nome)
          `)
          .eq('aluno_id', alunoId)
          .order('unidade')

        setNotas(notasData || [])

        // 4. Carregar Frequências
        const { data: freqData } = await supabase
          .from('frequencias')
          .select(`
            id,
            data,
            presenca,
            materia:materia_id (nome)
          `)
          .eq('aluno_id', alunoId)
          .order('data', { ascending: false })
          .limit(60)

        setFrequencias(freqData || [])

        // 5. Carregar Ocorrências
        const { data: ocoData } = await supabase
          .from('ocorrencias')
          .select(`
            id,
            data,
            tipo,
            gravidade,
            descricao,
            status_pais,
            created_at
          `)
          .eq('aluno_id', alunoId)
          .order('data', { ascending: false })

        setOcorrencias(ocoData || [])

        // 6. Carregar Mensagens (se canal de comunicação estiver ativo na escola)
        if (alunoData.escola?.portal_comunicacoes_ativo) {
          const { data: msgData } = await supabase
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
            .eq('aluno_id', alunoId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })

          setMensagens(msgData || [])
        }
      } catch (err: any) {
        console.error('Erro ao carregar detalhes do aluno:', err)
        toast.error('Erro ao carregar dados do aluno.')
      } finally {
        setLoading(false)
      }
    }

    carregarAluno()
  }, [alunoId, router, supabase])

  // Marcar mensagens do professor como lidas quando os pais abrirem a aba de Comunicações
  useEffect(() => {
    if (activeTab === 'comunicacoes' && !markedAsReadRef.current && mensagens.length > 0) {
      const naoLidas = mensagens.filter(
        (m) => m.remetente_tipo === 'professor' && !m.lida_responsavel
      )
      if (naoLidas.length > 0) {
        markedAsReadRef.current = true
        const ids = naoLidas.map((m) => m.id)
        supabase
          .from('mensagens_responsaveis')
          .update({
            lida_responsavel: true,
            lida_responsavel_em: new Date().toISOString()
          } as any)
          .in('id', ids)
          .then(() => {
            setMensagens((prev) =>
              prev.map((m) =>
                ids.includes(m.id) ? { ...m, lida_responsavel: true } : m
              )
            )
          })
          .catch((err) => console.error('Erro ao marcar mensagens como lidas:', err))
      }
    }
  }, [activeTab, mensagens, supabase])

  // Ação de registrar ciência em ocorrência
  const handleMarcarCiente = async (ocorrenciaId: string) => {
    setMarcandoCienteId(ocorrenciaId)
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .update({ status_pais: 'Cientes' } as any)
        .eq('id', ocorrenciaId)

      if (error) throw error

      setOcorrencias((prev) =>
        prev.map((o) => (o.id === ocorrenciaId ? { ...o, status_pais: 'Cientes' } : o))
      );
      toast.success('Ciência registrada com sucesso para a equipe pedagógica!')
    } catch (err: any) {
      console.error('Erro ao marcar ciência:', err)
      toast.error('Erro ao registrar ciência. Tente novamente.')
    } finally {
      setMarcandoCienteId(null)
    }
  }

  // Ação de envio de mensagem pelos pais aos professores
  const handleEnviarMensagemResponsavel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaMensagemConteudo.trim()) {
      toast.error('Digite sua mensagem para os professores.')
      return
    }
    if (!aluno?.id || !aluno?.escola_id) {
      toast.error('Dados do estudante não disponíveis.')
      return
    }

    setEnviandoMensagem(true)
    try {
      const novaMsg = {
        escola_id: aluno.escola_id,
        turma_id: aluno.turma?.id ?? null,
        aluno_id: aluno.id,
        professor_id: aluno.turma?.professor_id ?? null,
        responsavel_id: responsavel?.id ?? null,
        remetente_tipo: 'responsavel',
        autor_nome: responsavel?.nome ?? 'Responsável',
        titulo: novaMensagemTitulo.trim() || 'Mensagem da Família',
        conteudo: novaMensagemConteudo.trim(),
        lida_responsavel: true,
        lida_responsavel_em: new Date().toISOString(),
        lida_professor: false
      }

      const { data, error } = await supabase
        .from('mensagens_responsaveis')
        .insert(novaMsg as any)
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
      setNovaMensagemConteudo('')
      setNovaMensagemTitulo('')
      toast.success('Mensagem enviada com sucesso para a equipe pedagógica!')
    } catch (err: any) {
      console.error('Erro ao enviar mensagem do responsável:', err)
      toast.error('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setEnviandoMensagem(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm text-zinc-400">Carregando boletim e histórico...</p>
        </div>
      </div>
    )
  }

  const portalComunicacoesAtivo = aluno?.escola?.portal_comunicacoes_ativo === true
  const temMensagensNaoLidas = mensagens.some(
    (m) => m.remetente_tipo === 'professor' && !m.lida_responsavel
  )

  return (
    <div className="min-h-screen bg-[#0f0f11] text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-[#27272a] bg-[#141416]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/portal-aluno/dashboard">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white gap-2 text-xs">
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Filhos
            </Button>
          </Link>
          <span className="text-xs text-zinc-500 font-mono">Boletim Escolar Oficial</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full p-4 sm:p-8 flex-1 space-y-6">
        {/* Banner do Aluno */}
        <div className="bg-[#141416] border border-[#27272a] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden border border-[#27272a] flex items-center justify-center shrink-0">
              {aluno?.foto_url ? (
                <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="w-8 h-8 text-zinc-500" />
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white">{aluno?.nome}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-indigo-400" />
                  {aluno?.escola?.nome}
                </span>
                <span>•</span>
                <span>Turma: <strong className="text-zinc-200">{aluno?.turma?.nome || 'Sem Turma'}</strong></span>
                {aluno?.numero_matricula && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-zinc-500">Matrícula: {aluno.numero_matricula}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-[#27272a] gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('notas')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'notas'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Boletim & Notas
          </button>
          <button
            onClick={() => setActiveTab('frequencia')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'frequencia'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            Frequência Diária
          </button>
          <button
            onClick={() => setActiveTab('ocorrencias')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors shrink-0 ${
              activeTab === 'ocorrencias'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Ocorrências
            {ocorrencias.some((o) => o.status_pais !== 'Cientes') && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
          {portalComunicacoesAtivo && (
            <button
              onClick={() => setActiveTab('comunicacoes')}
              className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors shrink-0 relative ${
                activeTab === 'comunicacoes'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Comunicações
              {temMensagensNaoLidas && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'notas' && (
          <div className="space-y-4">
            {notas.length === 0 ? (
              <div className="bg-[#141416] border border-[#27272a] rounded-2xl p-8 text-center text-zinc-500 text-sm">
                Nenhuma nota lançada para este período letivo até o momento.
              </div>
            ) : (
              <div className="bg-[#141416] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#18181b] border-b border-[#27272a] text-xs text-zinc-400 uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Disciplina / Matéria</th>
                        <th className="py-3 px-4 text-center">Unidade / Trimestre</th>
                        <th className="py-3 px-4 text-center">Atividades</th>
                        <th className="py-3 px-4 text-center">Avaliação</th>
                        <th className="py-3 px-4 text-center">Qualitativa</th>
                        <th className="py-3 px-4 text-center font-bold">Média</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#27272a]/60">
                      {notas.map((n) => {
                        const n1 = n.nota1 !== null ? Number(n.nota1) : null
                        const n2 = n.nota2 !== null ? Number(n.nota2) : null
                        const n3 = n.nota3 !== null ? Number(n.nota3) : null
                        const notasValidas = [n1, n2, n3].filter((x): x is number => x !== null)
                        const media = notasValidas.length > 0 ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1) : '-'

                        return (
                          <tr key={n.id} className="hover:bg-[#18181b]/50 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-white">
                              {n.materia?.nome || 'Disciplina'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700">
                                {n.unidade}º Trimestre
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                              {n.nota1 ?? '-'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                              {n.nota2 ?? '-'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                              {n.nota3 ?? '-'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-400">
                              {media}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'frequencia' && (
          <div className="space-y-4">
            {frequencias.length === 0 ? (
              <div className="bg-[#141416] border border-[#27272a] rounded-2xl p-8 text-center text-zinc-500 text-sm">
                Nenhum registro de frequência lançado para este aluno.
              </div>
            ) : (
              <div className="bg-[#141416] border border-[#27272a] rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-semibold text-zinc-300">Histórico Recente de Presença</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {frequencias.map((f) => {
                    const dataFormatada = new Date(f.data + 'T00:00:00').toLocaleDateString('pt-BR')
                    return (
                      <div
                        key={f.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          f.presenca 
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                            : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold block">{dataFormatada}</span>
                          <span className="text-[11px] text-zinc-400">{f.materia?.nome || 'Aula Regular'}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={f.presenca ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}
                        >
                          {f.presenca ? 'PRESENTE' : 'FALTA'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ocorrencias' && (
          <div className="space-y-4">
            {ocorrencias.length === 0 ? (
              <div className="bg-[#141416] border border-[#27272a] rounded-2xl p-8 text-center text-zinc-500 text-sm">
                Nenhuma ocorrência disciplinar registrada.
              </div>
            ) : (
              <div className="space-y-3">
                {ocorrencias.map((oco) => {
                  const dataFormatada = new Date(oco.data + 'T00:00:00').toLocaleDateString('pt-BR')
                  const isCiente = oco.status_pais === 'Cientes'

                  return (
                    <div
                      key={oco.id}
                      className="bg-[#141416] border border-[#27272a] rounded-2xl p-5 space-y-3 shadow-lg"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a]/60 pb-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="font-bold text-white text-sm">{oco.tipo}</span>
                          {oco.gravidade && (
                            <Badge variant="outline" className="text-[10px] bg-zinc-800 text-zinc-300 border-zinc-700">
                              {oco.gravidade}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-zinc-400 font-mono">Data: {dataFormatada}</span>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed bg-[#18181b] p-3.5 rounded-xl border border-[#27272a]/40">
                        {oco.descricao}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          {isCiente ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              Ciência Registrada
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <Clock className="w-4 h-4" />
                              Aguardando confirmação de leitura
                            </span>
                          )}
                        </div>

                        {!isCiente && (
                          <Button
                            size="sm"
                            disabled={marcandoCienteId === oco.id}
                            onClick={() => handleMarcarCiente(oco.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-8 gap-1.5"
                          >
                            {marcandoCienteId === oco.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            Marcar como Ciente
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Nova Aba de Comunicações (Visível apenas se portal_comunicacoes_ativo === true) */}
        {activeTab === 'comunicacoes' && portalComunicacoesAtivo && (
          <div className="bg-[#141416] border border-[#27272a] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                  Canal Direto com Professores
                </h3>
                <p className="text-xs text-zinc-400">
                  Troca de recados, comunicados e esclarecimentos pedagógicos sobre o aluno
                </p>
              </div>
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-xs">
                {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
              </Badge>
            </div>

            {/* Histórico de Mensagens */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {mensagens.length === 0 ? (
                <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-8 text-center text-zinc-500 text-xs space-y-2">
                  <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p>Nenhum recado trocado com os professores ainda.</p>
                  <p className="text-zinc-600">
                    Utilize o formulário abaixo caso deseje enviar uma mensagem para a coordenação ou corpo docente.
                  </p>
                </div>
              ) : (
                mensagens.map((msg) => {
                  const isDoProfessor = msg.remetente_tipo === 'professor'
                  const dataFormatada = new Date(msg.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isDoProfessor ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 space-y-2 shadow-md text-xs ${
                          isDoProfessor
                            ? 'bg-zinc-900 border border-[#27272a] text-zinc-200 rounded-tl-xs'
                            : 'bg-indigo-600 text-white rounded-tr-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[11px] opacity-75 border-b border-white/10 pb-1.5">
                          <span className="font-semibold">
                            {isDoProfessor
                              ? `Professor(a): ${msg.autor_nome || 'Corpo Docente'}`
                              : `Você (${msg.autor_nome || 'Responsável'})`}
                          </span>
                          <span className="font-mono">{dataFormatada}</span>
                        </div>

                        {msg.titulo && msg.titulo !== 'Recado Pedagógico' && (
                          <h5 className="font-bold text-sm text-white pt-0.5">{msg.titulo}</h5>
                        )}

                        <p className="whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>

                        <div className="flex items-center justify-end gap-1 text-[10px] pt-1 opacity-70">
                          {isDoProfessor ? (
                            <span className="flex items-center gap-1 text-emerald-400">
                              <CheckCheck className="w-3.5 h-3.5" />
                              Mensagem da Escola
                            </span>
                          ) : (
                            msg.lida_professor ? (
                              <span className="flex items-center gap-1 text-emerald-200">
                                <CheckCheck className="w-3.5 h-3.5" />
                                Lido pela escola
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Enviado à escola
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Formulário de Envio do Responsável */}
            <form onSubmit={handleEnviarMensagemResponsavel} className="pt-3 border-t border-[#27272a] space-y-3">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-300">Enviar Mensagem ao Corpo Docente:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Input
                  value={novaMensagemTitulo}
                  onChange={(e) => setNovaMensagemTitulo(e.target.value)}
                  placeholder="Assunto (ex: Dúvida de tarefa, Falta justificada)"
                  className="sm:col-span-1 bg-[#18181b] border-[#27272a] text-xs text-foreground"
                />
                <Input
                  value={novaMensagemConteudo}
                  onChange={(e) => setNovaMensagemConteudo(e.target.value)}
                  placeholder="Digite sua mensagem aqui..."
                  className="sm:col-span-3 bg-[#18181b] border-[#27272a] text-xs text-foreground"
                  required
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={enviandoMensagem || !novaMensagemConteudo.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-9 gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  {enviandoMensagem ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Enviar Mensagem para a Escola
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
