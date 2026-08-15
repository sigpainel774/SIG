'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import PortalPaisLayout from '@/components/portal-pais/PortalPaisLayout'

// ─── Tokens visuais ────────────────────────────────────────────────────────
const AZUL = '#0B4FB3'
const BORDA = '#E5EDF5'

// Timestamp de sessão para cache-busting (ES-22)
const sessionTs = Date.now()

// ─── Helpers ──────────────────────────────────────────────────────────────
/** ES-02: Cálculo seguro de média — filtra null, undefined e NaN */
function calcularMedia(n1: unknown, n2: unknown, n3: unknown): string {
  const valores = [n1, n2, n3]
    .map((v) => (v != null ? Number(v) : null))
    .filter((v): v is number => v !== null && !isNaN(v))
  if (valores.length === 0) return '–'
  return (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1)
}

/** Formata data do banco (YYYY-MM-DD) para pt-BR sem offset de timezone */
function formatarData(dataStr: string) {
  return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ─── Página ───────────────────────────────────────────────────────────────
export default function DetalhesAlunoPortalPage() {
  const params = useParams()
  const router = useRouter()
  // ES-07: createClient estável com useMemo
  const supabase = useMemo(() => createClient(), [])
  const alunoId = params?.alunoId as string

  type TabKey = 'notas' | 'frequencia' | 'ocorrencias' | 'comunicacoes'
  const [activeTab, setActiveTab] = useState<TabKey>('notas')
  const [loading, setLoading] = useState(true)
  const [aluno, setAluno] = useState<any | null>(null)
  const [responsavel, setResponsavel] = useState<any | null>(null)

  // Dados das abas
  const [notas, setNotas] = useState<any[]>([])
  const [frequencias, setFrequencias] = useState<any[]>([])
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [mensagens, setMensagens] = useState<any[]>([])
  const [marcandoCienteId, setMarcandoCienteId] = useState<string | null>(null)

  // Comunicações
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)
  const [novaMensagemTitulo, setNovaMensagemTitulo] = useState('')
  const [novaMensagemConteudo, setNovaMensagemConteudo] = useState('')

  // Cache-busting de foto (ES-22) — state aqui para respeitar regras de hooks
  const [imgError, setImgError] = useState(false)

  // ES-03: ref de controle de leitura de mensagens (resetado a cada mudança de alunoId)
  const markedAsReadRef = useRef(false)

  useEffect(() => {
    if (!alunoId) return

    // ES-03: resetar ref ao mudar de filho
    markedAsReadRef.current = false

    // ES-06: flag de montagem para evitar setState em componente desmontado
    let active = true

    async function carregarAluno() {
      if (active) setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/portal-aluno/login')
          return
        }

        // 1. Buscar responsável logado
        const { data: respData } = await supabase
          .from('responsaveis')
          .select('id, nome, email, telefone')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (respData && active) setResponsavel(respData)

        // 2. Buscar dados do aluno
        // ES-01: incluir escola_id (coluna bruta) junto ao relacionamento
        const { data: alunoDataRaw, error: alunoErr } = await supabase
          .from('alunos')
          .select(`
            id,
            nome,
            numero_matricula,
            foto_url,
            serie,
            escola_id,
            turma:turma_id (id, nome, turno),
            escola:escola_id (id, nome, portal_pais_ativo, portal_comunicacoes_ativo)
          `)
          .eq('id', alunoId)
          .single()

        if (alunoErr || !alunoDataRaw) {
          toast.error('Aluno não localizado ou sem permissão de acesso.')
          router.push('/portal-aluno/dashboard')
          return
        }

        const alunoData = alunoDataRaw as any
        if (active) setAluno(alunoData)

        // ES-09: carregar notas, frequências, ocorrências em paralelo
        const [notasRes, freqRes, ocoRes] = await Promise.all([
          supabase
            .from('notas')
            .select('id, unidade, nota1, nota2, nota3, materia:materia_id (id, nome)')
            .eq('aluno_id', alunoId)
            .order('unidade'),
          supabase
            .from('frequencias')
            .select('id, data, presenca, materia:materia_id (nome)')
            .eq('aluno_id', alunoId)
            .order('data', { ascending: false })
            .limit(60),
          supabase
            .from('ocorrencias')
            .select('id, data, tipo, gravidade, descricao, status_pais, created_at')
            .eq('aluno_id', alunoId)
            .order('data', { ascending: false }),
        ])

        if (active) {
          setNotas(notasRes.data ?? [])
          setFrequencias(freqRes.data ?? [])
          setOcorrencias(ocoRes.data ?? [])
        }

        // Comunicações (condicional na feature flag da escola)
        if (alunoData?.escola?.portal_comunicacoes_ativo) {
          const { data: msgData } = await (supabase as any)
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

          if (active) setMensagens((msgData as any[]) ?? [])
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar detalhes do aluno:', err)
        if (active) toast.error('Erro ao carregar dados do aluno.')
      } finally {
        if (active) setLoading(false)
      }
    }

    carregarAluno()

    // ES-06: cleanup
    return () => {
      active = false
    }
    // ES-08: dependência correta — apenas alunoId
  }, [alunoId, supabase, router])

  // ES-03: marcar mensagens como lidas ao abrir aba — com deps corretas
  useEffect(() => {
    if (activeTab !== 'comunicacoes' || markedAsReadRef.current || mensagens.length === 0) return

    const naoLidas = mensagens.filter(
      (m) => m.remetente_tipo === 'professor' && !m.lida_responsavel
    )
    if (naoLidas.length === 0) return

    markedAsReadRef.current = true
    const ids = naoLidas.map((m) => m.id)

    ;(async () => {
      try {
        await (supabase as any)
          .from('mensagens_responsaveis')
          .update({
            lida_responsavel: true,
            lida_responsavel_em: new Date().toISOString(),
          })
          .in('id', ids)

        setMensagens((prev) =>
          prev.map((m) => (ids.includes(m.id) ? { ...m, lida_responsavel: true } : m))
        )
      } catch (err: unknown) {
        // ES-07-catch: não silenciar totalmente
        console.error('Erro ao marcar mensagens como lidas:', err)
        toast.warning('Não foi possível marcar as mensagens como lidas.')
      }
    })()
  }, [activeTab, mensagens, supabase])

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
      )
      toast.success('Ciência registrada com sucesso!')
    } catch (err: unknown) {
      console.error('Erro ao marcar ciência:', err)
      toast.error('Erro ao registrar ciência. Tente novamente.')
    } finally {
      setMarcandoCienteId(null)
    }
  }

  const handleEnviarMensagemResponsavel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaMensagemConteudo.trim()) {
      toast.error('Digite sua mensagem para os professores.')
      return
    }

    // ES-01: usar escola_id (coluna bruta) com fallback para aluno.escola?.id
    const escolaId = aluno?.escola_id ?? aluno?.escola?.id ?? null

    if (!aluno?.id || !escolaId) {
      toast.error('Dados do estudante não disponíveis. Recarregue a página.')
      return
    }

    setEnviandoMensagem(true)
    try {
      const novaMsg = {
        escola_id: escolaId,
        turma_id: aluno.turma?.id ?? null,
        aluno_id: aluno.id,
        // ES-05: professor_id não existe na tabela turmas — deixar null
        professor_id: null,
        responsavel_id: responsavel?.id ?? null,
        remetente_tipo: 'responsavel',
        autor_nome: responsavel?.nome ?? 'Responsável',
        titulo: novaMensagemTitulo.trim() || 'Mensagem da Família',
        conteudo: novaMensagemConteudo.trim(),
        lida_responsavel: true,
        lida_responsavel_em: new Date().toISOString(),
        lida_professor: false,
      }

      const { data, error } = await (supabase as any)
        .from('mensagens_responsaveis')
        .insert(novaMsg as any)
        .select(`
          id, escola_id, turma_id, aluno_id, professor_id, responsavel_id,
          remetente_tipo, autor_nome, titulo, conteudo,
          lida_responsavel, lida_responsavel_em, lida_professor, lida_professor_em,
          created_at, professor:professor_id (id, nome, cargo)
        `)
        .single()

      if (error) throw error

      setMensagens((prev) => [...prev, data])
      setNovaMensagemConteudo('')
      setNovaMensagemTitulo('')
      toast.success('Mensagem enviada com sucesso!')
    } catch (err: unknown) {
      console.error('Erro ao enviar mensagem do responsável:', err)
      toast.error('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setEnviandoMensagem(false)
    }
  }

  // Logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/portal-aluno/login')
    } catch (err: unknown) {
      console.error('Erro ao sair:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F6F9FC' }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: AZUL }} />
          <p className="text-sm text-slate-500">Carregando boletim e histórico...</p>
        </div>
      </div>
    )
  }

  const portalComunicacoesAtivo = aluno?.escola?.portal_comunicacoes_ativo === true
  
  const temMensagensNaoLidas = useMemo(
    () => mensagens.some((m) => m.remetente_tipo === 'professor' && !m.lida_responsavel),
    [mensagens]
  )

  const temOcorrenciaPendente = useMemo(
    () => ocorrencias.some((o) => o.status_pais !== 'Cientes'),
    [ocorrencias]
  )

  // Foto com cache-busting (state declarado no topo do componente)
  const fotoUrl = aluno?.foto_url && !imgError
    ? `${aluno.foto_url.split('?')[0]}?t=${sessionTs}`
    : null

  const tabs = useMemo<
    { key: TabKey; label: string; icon: React.ElementType; badge?: React.ReactNode }[]
  >(
    () => [
      { key: 'notas', label: 'Boletim & Notas', icon: BookOpen },
      { key: 'frequencia', label: 'Frequência', icon: CalendarCheck },
      {
        key: 'ocorrencias',
        label: 'Ocorrências',
        icon: AlertTriangle,
        badge: temOcorrenciaPendente ? (
          <span className="size-2 rounded-full bg-amber-500 animate-pulse" aria-label="Ocorrência pendente" />
        ) : null,
      },
      ...(portalComunicacoesAtivo
        ? [
            {
              key: 'comunicacoes' as TabKey,
              label: 'Comunicações',
              icon: MessageSquare,
              badge: temMensagensNaoLidas ? (
                <span className="size-2 rounded-full animate-pulse" style={{ backgroundColor: AZUL }} aria-label="Mensagens não lidas" />
              ) : null,
            },
          ]
        : []),
    ],
    [portalComunicacoesAtivo, temMensagensNaoLidas, temOcorrenciaPendente]
  )

  return (
    <PortalPaisLayout
      nomeResponsavel={responsavel?.nome ?? 'Responsável'}
      onLogout={handleLogout}
      headerSubtitle={`Boletim de ${aluno?.nome?.split(' ')[0] ?? 'Aluno'}`}
    >
      {/* Voltar */}
      <Link href="/portal-aluno/dashboard">
        <button className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-[#0B4FB3]">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar à visão geral
        </button>
      </Link>

      {/* ── Banner do aluno ── */}
      <div
        className="rounded-2xl border bg-white p-5 shadow-[0_10px_26px_rgba(18,45,76,0.06)] sm:p-6"
        style={{ borderColor: BORDA }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="size-16 shrink-0 rounded-2xl overflow-hidden border grid place-items-center"
              style={{ borderColor: BORDA, backgroundColor: '#E8F1FA' }}
            >
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt={aluno?.nome}
                  className="size-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <GraduationCap className="size-8 text-slate-400" aria-hidden="true" />
              )}
            </div>
            <div className="space-y-1">
              <h1
                className="text-xl font-extrabold"
                style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
              >
                {aluno?.nome}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <School className="size-3.5 shrink-0" style={{ color: AZUL }} aria-hidden="true" />
                  {aluno?.escola?.nome ?? '—'}
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Turma:{' '}
                  <strong className="text-[#102D50]">{aluno?.turma?.nome ?? 'Sem Turma'}</strong>
                </span>
                {aluno?.numero_matricula && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono text-slate-400">
                      Matr. {aluno.numero_matricula}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Abas de navegação ── */}
      <div
        className="mt-5 flex gap-1 overflow-x-auto border-b pb-0"
        style={{ borderColor: '#E5EDF5' }}
        role="tablist"
        aria-label="Seções do boletim"
      >
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={`tab-panel-${key}`}
            onClick={() => setActiveTab(key)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 pb-3 text-sm font-bold transition-colors ${
              activeTab === key
                ? 'border-[#0B4FB3] text-[#0B4FB3]'
                : 'border-transparent text-slate-500 hover:text-[#102D50]'
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
            {badge}
          </button>
        ))}
      </div>

      {/* ── Conteúdo das abas ── */}

      {/* NOTAS */}
      {activeTab === 'notas' && (
        <div
          id="tab-panel-notas"
          role="tabpanel"
          aria-label="Boletim e Notas"
          className="mt-5 space-y-4"
        >
          {notas.length === 0 ? (
            <div
              className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-400 shadow-sm"
              style={{ borderColor: BORDA }}
            >
              Nenhuma nota lançada para este período letivo até o momento.
            </div>
          ) : (
            <div
              className="rounded-2xl border bg-white overflow-hidden shadow-sm"
              style={{ borderColor: BORDA }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead
                    className="border-b text-xs font-bold uppercase tracking-wider text-slate-500"
                    style={{ backgroundColor: '#F1F6FC', borderColor: BORDA }}
                  >
                    <tr>
                      <th className="py-3 px-4">Disciplina</th>
                      <th className="py-3 px-4 text-center">Unidade</th>
                      <th className="py-3 px-4 text-center">Atividades</th>
                      <th className="py-3 px-4 text-center">Avaliação</th>
                      <th className="py-3 px-4 text-center">Qualitativa</th>
                      <th className="py-3 px-4 text-center font-extrabold" style={{ color: AZUL }}>
                        Média
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#F0F5FA' }}>
                    {notas.map((n) => {
                      // ES-02: usar helper seguro de média
                      const media = calcularMedia(n.nota1, n.nota2, n.nota3)
                      const mediaNum = parseFloat(media)
                      const mediaColor =
                        isNaN(mediaNum) || media === '–'
                          ? '#102D50'
                          : mediaNum >= 7
                          ? '#1D7A3C'
                          : mediaNum >= 5
                          ? '#D96507'
                          : '#CC2B2B'

                      return (
                        <tr key={n.id} className="transition-colors hover:bg-[#F8FAFC]">
                          <td className="py-3.5 px-4 font-semibold text-[#102D50]">
                            {n.materia?.nome ?? 'Disciplina'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                backgroundColor: '#EDF4FD',
                                color: '#2A6AB5',
                                border: '1px solid #C8DCF5',
                              }}
                            >
                              {n.unidade}º Trim.
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-[#102D50]">
                            {n.nota1 ?? '–'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-[#102D50]">
                            {n.nota2 ?? '–'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-[#102D50]">
                            {n.nota3 ?? '–'}
                          </td>
                          <td
                            className="py-3.5 px-4 text-center font-mono font-extrabold text-base"
                            style={{ color: mediaColor }}
                          >
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

      {/* FREQUÊNCIA */}
      {activeTab === 'frequencia' && (
        <div
          id="tab-panel-frequencia"
          role="tabpanel"
          aria-label="Frequência Diária"
          className="mt-5 space-y-4"
        >
          {frequencias.length === 0 ? (
            <div
              className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-400 shadow-sm"
              style={{ borderColor: BORDA }}
            >
              Nenhum registro de frequência lançado para este aluno.
            </div>
          ) : (
            <div
              className="rounded-2xl border bg-white p-5 shadow-sm space-y-3"
              style={{ borderColor: BORDA }}
            >
              <h3 className="text-sm font-extrabold" style={{ color: '#102D50' }}>
                Histórico Recente de Presença
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {frequencias.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-xl border p-3 flex items-center justify-between text-xs ${
                      f.presenca
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold block text-[#102D50]">
                        {formatarData(f.data)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {f.materia?.nome ?? 'Aula Regular'}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        f.presenca
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          : 'bg-rose-100 text-rose-700 border-rose-300'
                      }
                    >
                      {f.presenca ? 'PRESENTE' : 'FALTA'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* OCORRÊNCIAS */}
      {activeTab === 'ocorrencias' && (
        <div
          id="tab-panel-ocorrencias"
          role="tabpanel"
          aria-label="Ocorrências"
          className="mt-5 space-y-4"
        >
          {ocorrencias.length === 0 ? (
            <div
              className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-400 shadow-sm"
              style={{ borderColor: BORDA }}
            >
              Nenhuma ocorrência disciplinar registrada.
            </div>
          ) : (
            <div className="space-y-3">
              {ocorrencias.map((oco) => {
                const isCiente = oco.status_pais === 'Cientes'
                return (
                  <div
                    key={oco.id}
                    className="rounded-2xl border-l-4 border border-amber-300 bg-white p-5 shadow-sm space-y-3"
                    style={{ borderLeftColor: '#F59E0B', borderColor: BORDA, borderLeftWidth: 4 }}
                  >
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3"
                      style={{ borderColor: '#F0F5FA' }}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-amber-500 shrink-0" aria-hidden="true" />
                        <span className="font-extrabold text-[#102D50] text-sm">{oco.tipo}</span>
                        {oco.gravidade && (
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{ backgroundColor: '#FFF7ED', color: '#9A3412', borderColor: '#FED7AA' }}
                          >
                            {oco.gravidade}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {formatarData(oco.data)}
                      </span>
                    </div>

                    <p
                      className="text-xs text-[#102D50] leading-relaxed p-3.5 rounded-xl"
                      style={{ backgroundColor: '#F8FAFC', border: `1px solid ${BORDA}` }}
                    >
                      {oco.descricao}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        {isCiente ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                            <CheckCircle2 className="size-4" aria-hidden="true" />
                            Ciência Registrada
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-600">
                            <Clock className="size-4" aria-hidden="true" />
                            Aguardando confirmação de leitura
                          </span>
                        )}
                      </div>
                      {!isCiente && (
                        <button
                          disabled={marcandoCienteId === oco.id}
                          onClick={() => handleMarcarCiente(oco.id)}
                          className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold text-white transition hover:opacity-90 disabled:opacity-60"
                          style={{ backgroundColor: AZUL }}
                        >
                          {marcandoCienteId === oco.id ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          )}
                          Marcar como Ciente
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* COMUNICAÇÕES */}
      {activeTab === 'comunicacoes' && portalComunicacoesAtivo && (
        <div
          id="tab-panel-comunicacoes"
          role="tabpanel"
          aria-label="Comunicações"
          className="mt-5 rounded-2xl border bg-white p-5 shadow-sm space-y-5 sm:p-6"
          style={{ borderColor: BORDA }}
        >
          <div
            className="flex items-center justify-between border-b pb-3"
            style={{ borderColor: '#EDF2F7' }}
          >
            <div className="space-y-0.5">
              <h3 className="text-base font-extrabold flex items-center gap-2" style={{ color: '#102D50' }}>
                <MessageSquare className="size-5" style={{ color: AZUL }} aria-hidden="true" />
                Canal Direto com Professores
              </h3>
              <p className="text-xs text-slate-500">
                Troca de recados, comunicados e esclarecimentos pedagógicos sobre o aluno
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-xs"
              style={{ backgroundColor: '#EDF4FD', color: '#2A6AB5', borderColor: '#C8DCF5' }}
            >
              {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
            </Badge>
          </div>

          {/* Histórico de mensagens */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {mensagens.length === 0 ? (
              <div
                className="rounded-xl border p-8 text-center text-xs text-slate-400 space-y-2"
                style={{ backgroundColor: '#F8FAFC', borderColor: BORDA }}
              >
                <MessageSquare className="size-8 text-slate-300 mx-auto" aria-hidden="true" />
                <p>Nenhum recado trocado com os professores ainda.</p>
                <p className="text-slate-400">
                  Utilize o formulário abaixo caso deseje enviar uma mensagem.
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
                  minute: '2-digit',
                })

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isDoProfessor ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 space-y-2 shadow-sm text-xs ${
                        isDoProfessor
                          // ES-16: usar rounded-tl-none em vez de rounded-tl-xs
                          ? 'rounded-tl-none text-[#102D50]'
                          : 'rounded-tr-none text-white'
                      }`}
                      style={
                        isDoProfessor
                          ? { backgroundColor: '#F1F6FC', border: `1px solid ${BORDA}` }
                          : { backgroundColor: AZUL }
                      }
                    >
                      <div
                        className="flex items-center justify-between gap-3 text-[11px] opacity-80 border-b pb-1.5"
                        style={{ borderColor: isDoProfessor ? BORDA : 'rgba(255,255,255,0.2)' }}
                      >
                        <span className="font-extrabold">
                          {isDoProfessor
                            ? `Professor(a): ${msg.autor_nome ?? 'Corpo Docente'}`
                            : `Você (${msg.autor_nome ?? 'Responsável'})`}
                        </span>
                        <span className="font-mono">{dataFormatada}</span>
                      </div>

                      {msg.titulo && msg.titulo !== 'Recado Pedagógico' && (
                        <h5 className="font-extrabold text-sm pt-0.5">{msg.titulo}</h5>
                      )}

                      <p className="whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>

                      <div className="flex items-center justify-end gap-1 text-[10px] pt-1 opacity-80">
                        {isDoProfessor ? (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCheck className="size-3.5" aria-hidden="true" />
                            Mensagem da Escola
                          </span>
                        ) : msg.lida_professor ? (
                          <span className="flex items-center gap-1 text-emerald-200">
                            <CheckCheck className="size-3.5" aria-hidden="true" />
                            Lido pela escola
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 opacity-70">
                            <Clock className="size-3.5" aria-hidden="true" />
                            Enviado à escola
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Formulário de envio */}
          <form
            onSubmit={handleEnviarMensagemResponsavel}
            className="pt-3 border-t space-y-3"
            style={{ borderColor: '#EDF2F7' }}
          >
            <span className="text-xs font-extrabold" style={{ color: '#102D50' }}>
              Enviar Mensagem ao Corpo Docente:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                value={novaMensagemTitulo}
                onChange={(e) => setNovaMensagemTitulo(e.target.value)}
                placeholder="Assunto (opcional)"
                aria-label="Assunto da mensagem"
                className="sm:col-span-1 bg-white border text-xs"
                style={{ borderColor: BORDA }}
              />
              <Input
                value={novaMensagemConteudo}
                onChange={(e) => setNovaMensagemConteudo(e.target.value)}
                placeholder="Digite sua mensagem aqui..."
                aria-label="Conteúdo da mensagem"
                className="sm:col-span-3 bg-white border text-xs"
                style={{ borderColor: BORDA }}
                required
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={enviandoMensagem || !novaMensagemConteudo.trim()}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-90 disabled:opacity-60 shadow-md"
                style={{ backgroundColor: AZUL, boxShadow: '0 8px 18px rgba(11,79,179,0.22)' }}
              >
                {enviandoMensagem ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="size-3.5" aria-hidden="true" />
                )}
                Enviar para a Escola
              </button>
            </div>
          </form>
        </div>
      )}
    </PortalPaisLayout>
  )
}
