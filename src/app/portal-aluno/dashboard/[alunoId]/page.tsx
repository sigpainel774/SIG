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
  FileCheck2,
  FileText,
  Plus,
  Printer,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  TrendingUp,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import PortalPaisLayout from '@/components/portal-pais/PortalPaisLayout'

// ─── Tokens visuais ────────────────────────────────────────────────────────
const AZUL = '#0B4FB3'
const LARANJA = '#F47C12'
const BORDA = '#E5EDF5'

// Timestamp de sessão estável para cache-busting (ES-22)
const sessionTs = Date.now()

// ─── Interfaces ────────────────────────────────────────────────────────────
interface MateriaInfo {
  id: string
  nome: string
  base_curricular?: string | null
}

interface NotaRegistro {
  id: string
  unidade: number
  nota1: number | null
  nota2: number | null
  nota3: number | null
  materia_id: string
  materia?: {
    id: string
    nome: string
  } | null
}

interface RecuperacaoFinalRegistro {
  id: string
  materia_id: string
  nota: number | null
}

interface FrequenciaRegistro {
  id: string
  data: string
  presenca: boolean
  materia_id?: string | null
  materia?: {
    nome: string
  } | null
}

interface OcorrenciaRegistro {
  id: string
  data: string
  tipo: string
  gravidade: string | null
  descricao: string
  status_pais: string | null
  created_at: string | null
}

interface SolicitacaoRegistro {
  id: string
  tipo: string
  titulo: string
  observacoes: string | null
  status: 'pendente' | 'em_analise' | 'concluido' | 'recusado'
  resposta_escola: string | null
  concluido_em: string | null
  created_at: string
}

interface MensagemRegistro {
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

// ─── Helpers de Cálculo ───────────────────────────────────────────────────

/** Calcula a média de uma unidade com base em nota1, nota2 e nota3 */
function calcularMediaUnidade(n1: unknown, n2: unknown, n3: unknown): number | null {
  const valores = [n1, n2, n3]
    .map((v) => (v != null && v !== '' ? Number(v) : null))
    .filter((v): v is number => v !== null && !isNaN(v))
  if (valores.length === 0) return null
  return parseFloat((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1))
}

/** Formata data YYYY-MM-DD para pt-BR sem sofrer offset de timezone UTC (ES-05) */
function formatarData(dataStr: string) {
  if (!dataStr) return '—'
  const partes = dataStr.split('T')[0].split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return new Date(dataStr + 'T00:00:00').toLocaleDateString('pt-BR')
}

// ─── Componente Principal ─────────────────────────────────────────────────
export default function DetalhesAlunoPortalPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const alunoId = params?.alunoId as string

  type TabKey = 'notas' | 'frequencia' | 'ocorrencias' | 'comunicacoes' | 'solicitacoes'
  const [activeTab, setActiveTab] = useState<TabKey>('notas')
  const [loading, setLoading] = useState(true)
  const [aluno, setAluno] = useState<any | null>(null)
  const [responsavel, setResponsavel] = useState<any | null>(null)

  // Dados escolares
  const [materias, setMaterias] = useState<MateriaInfo[]>([])
  const [notas, setNotas] = useState<NotaRegistro[]>([])
  const [recuperacoes, setRecuperacoes] = useState<RecuperacaoFinalRegistro[]>([])
  const [frequencias, setFrequencias] = useState<FrequenciaRegistro[]>([])
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaRegistro[]>([])
  const [mensagens, setMensagens] = useState<MensagemRegistro[]>([])
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoRegistro[]>([])

  // Estados de controle de UI
  const [mostrarDetalhamentoNotas, setMostrarDetalhamentoNotas] = useState(false)
  const [marcandoCienteId, setMarcandoCienteId] = useState<string | null>(null)
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)
  const [novaMensagemTitulo, setNovaMensagemTitulo] = useState('')
  const [novaMensagemConteudo, setNovaMensagemConteudo] = useState('')
  const [imgError, setImgError] = useState(false)

  const markedAsReadRef = useRef(false)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!alunoId) return
    markedAsReadRef.current = false

    async function carregarAlunoCompleto() {
      if (isMounted.current) setLoading(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/portal-aluno/login')
          return
        }

        // 1. Perfil do responsável
        const { data: respData } = await supabase
          .from('responsaveis')
          .select('id, nome, email, telefone')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (respData && isMounted.current) setResponsavel(respData)

        // 2. Dados cadastrais do aluno
        const { data: alunoDataRaw, error: alunoErr } = await supabase
          .from('alunos')
          .select(`
            id,
            nome,
            numero_matricula,
            foto_url,
            serie,
            escola_id,
            turma_id,
            turma:turma_id (id, nome, turno, ano_letivo),
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
        if (isMounted.current) setAluno(alunoData)

        // 3. Carregar em paralelo todas as informações acadêmicas do estudante
        const [materiasRes, notasRes, recsRes, freqRes, ocoRes, solRes] = await Promise.all([
          // Matérias da turma / escola
          alunoData.turma_id
            ? supabase
                .from('materias')
                .select('id, nome, base_curricular')
                .eq('turma_id', alunoData.turma_id)
                .order('nome')
            : supabase
                .from('materias')
                .select('id, nome, base_curricular')
                .eq('escola_id', alunoData.escola_id)
                .order('nome'),
          // Notas dos trimestres
          supabase
            .from('notas')
            .select('id, unidade, nota1, nota2, nota3, materia_id, materia:materia_id (id, nome)')
            .eq('aluno_id', alunoId)
            .order('unidade'),
          // Recuperações Finais (ES-01)
          supabase
            .from('recuperacoes_finais')
            .select('id, materia_id, nota')
            .eq('aluno_id', alunoId),
          // Frequências (todas do período para cálculo exato de assiduidade - ES-04)
          supabase
            .from('frequencias')
            .select('id, data, presenca, materia_id, materia:materia_id (nome)')
            .eq('aluno_id', alunoId)
            .order('data', { ascending: false }),
          // Ocorrências disciplinares
          supabase
            .from('ocorrencias')
            .select('id, data, tipo, gravidade, descricao, status_pais, created_at')
            .eq('aluno_id', alunoId)
            .order('data', { ascending: false }),
          // Solicitações
          (supabase as any)
            .from('solicitacoes_responsaveis')
            .select('id, tipo, titulo, observacoes, status, resposta_escola, concluido_em, created_at')
            .eq('aluno_id', alunoId)
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
        ])

        if (isMounted.current) {
          setMaterias((materiasRes.data as MateriaInfo[]) ?? [])
          setNotas((notasRes.data as NotaRegistro[]) ?? [])
          setRecuperacoes((recsRes.data as RecuperacaoFinalRegistro[]) ?? [])
          setFrequencias((freqRes.data as FrequenciaRegistro[]) ?? [])
          setOcorrencias((ocoRes.data as OcorrenciaRegistro[]) ?? [])
          setSolicitacoes((solRes.data as SolicitacaoRegistro[]) ?? [])
        }

        // 4. Comunicações (se ativado na escola)
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
              created_at
            `)
            .eq('aluno_id', alunoId)
            .is('deleted_at', null)
            .order('created_at', { ascending: true })

          if (isMounted.current) setMensagens((msgData as MensagemRegistro[]) ?? [])
        }
      } catch (err: unknown) {
        console.error('Erro ao carregar detalhes completos do aluno:', err)
        if (isMounted.current) toast.error('Erro ao carregar dados do estudante.')
      } finally {
        if (isMounted.current) setLoading(false)
      }
    }

    carregarAlunoCompleto()
  }, [alunoId, supabase, router])

  // Marcar mensagens do professor como lidas ao abrir a aba
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

        if (isMounted.current) {
          setMensagens((prev) =>
            prev.map((m) => (ids.includes(m.id) ? { ...m, lida_responsavel: true } : m))
          )
        }
      } catch (err: unknown) {
        console.error('Erro ao marcar mensagens como lidas:', err)
      }
    })()
  }, [activeTab, mensagens, supabase])

  // ─── Processamento do Boletim Consolidado (ES-02 e ES-03) ───────────────────
  const boletimConsolidado = useMemo(() => {
    // Coleta todas as matérias conhecidas (da tabela materias ou inferidas das notas)
    const mapaMaterias = new Map<string, { id: string; nome: string }>()

    materias.forEach((m) => {
      mapaMaterias.set(m.id, { id: m.id, nome: m.nome })
    })

    notas.forEach((n) => {
      if (n.materia_id && !mapaMaterias.has(n.materia_id)) {
        mapaMaterias.set(n.materia_id, {
          id: n.materia_id,
          nome: n.materia?.nome ?? 'Disciplina',
        })
      }
    })

    const listaDisciplinas = Array.from(mapaMaterias.values()).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR')
    )

    return listaDisciplinas.map((disc) => {
      // Notas dos trimestres
      const nTri1 = notas.find((n) => n.materia_id === disc.id && n.unidade === 1)
      const nTri2 = notas.find((n) => n.materia_id === disc.id && n.unidade === 2)
      const nTri3 = notas.find((n) => n.materia_id === disc.id && n.unidade === 3)

      const med1 = nTri1 ? calcularMediaUnidade(nTri1.nota1, nTri1.nota2, nTri1.nota3) : null
      const med2 = nTri2 ? calcularMediaUnidade(nTri2.nota1, nTri2.nota2, nTri2.nota3) : null
      const med3 = nTri3 ? calcularMediaUnidade(nTri3.nota1, nTri3.nota2, nTri3.nota3) : null

      const rec = recuperacoes.find((r) => r.materia_id === disc.id)?.nota ?? null

      const trimestresValidos = [med1, med2, med3].filter((m): m is number => m !== null)
      const totalTrimestres = trimestresValidos.length

      // Média anual ou parcial
      let mediaAnual: number | null = null
      if (totalTrimestres > 0) {
        const soma = trimestresValidos.reduce((acc, v) => acc + v, 0)
        mediaAnual = parseFloat((soma / totalTrimestres).toFixed(1))
      }

      // Média Final (considerando recuperação final se realizada)
      let mediaFinal = mediaAnual
      let situacao: 'aprovado' | 'em_curso' | 'recuperacao' | 'reprovado' = 'em_curso'
      let situacaoTexto = 'Em Curso'

      if (totalTrimestres === 3 && mediaAnual !== null) {
        if (mediaAnual >= 6.0) {
          situacao = 'aprovado'
          situacaoTexto = 'Aprovado'
        } else {
          // Abaixo de 6.0 ao fim do 3º trimestre
          if (rec !== null) {
            // Média pós-recuperação
            const medPosRec = parseFloat(((mediaAnual + rec) / 2).toFixed(1))
            mediaFinal = Math.max(medPosRec, mediaAnual)
            if (mediaFinal >= 5.0) {
              situacao = 'aprovado'
              situacaoTexto = 'Aprovado após Rec.'
            } else {
              situacao = 'reprovado'
              situacaoTexto = 'Reprovado'
            }
          } else {
            situacao = 'recuperacao'
            situacaoTexto = 'Em Recuperação'
          }
        }
      } else if (totalTrimestres > 0 && mediaAnual !== null) {
        if (mediaAnual >= 6.0) {
          situacao = 'em_curso'
          situacaoTexto = 'Bom Desempenho'
        } else {
          situacao = 'em_curso'
          situacaoTexto = 'Atenção'
        }
      }

      return {
        materiaId: disc.id,
        nome: disc.nome,
        tri1: med1,
        tri2: med2,
        tri3: med3,
        detalheTri1: nTri1,
        detalheTri2: nTri2,
        detalheTri3: nTri3,
        mediaAnual,
        recuperacao: rec,
        mediaFinal,
        situacao,
        situacaoTexto,
      }
    })
  }, [materias, notas, recuperacoes])

  // ─── Processamento de Frequência & Bolsa Família (ES-04) ────────────────────
  const metricasFrequencia = useMemo(() => {
    const totalAulas = frequencias.length
    if (totalAulas === 0) {
      return {
        totalAulas: 0,
        presencas: 0,
        faltas: 0,
        percentual: 100,
        statusBolsaFamilia: 'Sem registros' as const,
      }
    }

    const presencas = frequencias.filter((f) => f.presenca).length
    const faltas = totalAulas - presencas
    const percentual = parseFloat(((presencas / totalAulas) * 100).toFixed(1))

    let statusBolsaFamilia: 'regular' | 'atencao' | 'em_risco' = 'regular'
    if (percentual < 75) {
      statusBolsaFamilia = 'em_risco'
    } else if (percentual < 85) {
      statusBolsaFamilia = 'atencao'
    }

    return {
      totalAulas,
      presencas,
      faltas,
      percentual,
      statusBolsaFamilia,
    }
  }, [frequencias])

  // ─── Ações ────────────────────────────────────────────────────────────────
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
      toast.error('Digite sua mensagem para a escola.')
      return
    }

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
        .select()
        .single()

      if (error) throw error

      setMensagens((prev) => [...prev, data])
      setNovaMensagemConteudo('')
      setNovaMensagemTitulo('')
      toast.success('Mensagem enviada com sucesso para a escola!')
    } catch (err: unknown) {
      console.error('Erro ao enviar mensagem:', err)
      toast.error('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setEnviandoMensagem(false)
    }
  }

  const handlePrintBoletim = () => {
    window.print()
  }

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
          <p className="text-sm text-slate-500">Carregando boletim e histórico acadêmico...</p>
        </div>
      </div>
    )
  }

  const portalComunicacoesAtivo = aluno?.escola?.portal_comunicacoes_ativo === true
  const temMensagensNaoLidas = mensagens.some((m) => m.remetente_tipo === 'professor' && !m.lida_responsavel)
  const temOcorrenciaPendente = ocorrencias.some((o) => o.status_pais !== 'Cientes')

  const fotoUrl = aluno?.foto_url && !imgError
    ? `${aluno.foto_url.split('?')[0]}?t=${sessionTs}`
    : null

  const tabs: { key: TabKey; label: string; icon: React.ElementType; badge?: React.ReactNode }[] = [
    { key: 'notas', label: 'Boletim & Notas', icon: BookOpen },
    { key: 'frequencia', label: 'Frequência & Assiduidade', icon: CalendarCheck },
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
    {
      key: 'solicitacoes',
      label: 'Solicitações',
      icon: FileCheck2,
      badge: solicitacoes.filter((s) => s.status === 'pendente' || s.status === 'em_analise').length > 0 ? (
        <span className="size-2 rounded-full bg-blue-600" aria-label="Solicitação ativa" />
      ) : null,
    },
  ]

  return (
    <PortalPaisLayout
      nomeResponsavel={responsavel?.nome ?? 'Responsável'}
      onLogout={handleLogout}
      headerSubtitle={`Boletim de ${aluno?.nome?.split(' ')[0] ?? 'Estudante'}`}
    >
      {/* Botão de Retorno */}
      <div className="print:hidden">
        <Link href="/portal-aluno/dashboard">
          <button className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-[#0B4FB3]">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar à visão geral
          </button>
        </Link>
      </div>

      {/* ── Banner Principal do Aluno ── */}
      <div
        className="rounded-2xl border bg-white p-5 shadow-[0_10px_26px_rgba(18,45,76,0.06)] sm:p-6 mb-6"
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
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="text-xl font-extrabold text-[#102D50]"
                  style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
                >
                  {aluno?.nome}
                </h1>
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5">
                  Matrícula Ativa
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <School className="size-3.5 shrink-0" style={{ color: AZUL }} aria-hidden="true" />
                  {aluno?.escola?.nome ?? 'Escola Municipal'}
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Turma: <strong className="text-[#102D50]">{aluno?.turma?.nome ?? 'Sem Turma'}</strong>
                  {aluno?.turma?.turno ? ` (${aluno.turma.turno})` : ''}
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

          <div className="flex items-center gap-2 self-start sm:self-center print:hidden">
            <Button
              onClick={handlePrintBoletim}
              variant="outline"
              className="text-xs font-bold gap-1.5 h-10 rounded-xl border-[#DCE7F2] text-slate-700 hover:bg-[#F2F7FC] hover:text-[#0B4FB3]"
            >
              <Printer className="size-4" />
              Imprimir Boletim
            </Button>
          </div>
        </div>
      </div>

      {/* ── Abas de Navegação ── */}
      <div
        className="flex gap-1 overflow-x-auto border-b pb-0 print:hidden"
        style={{ borderColor: '#E5EDF5' }}
        role="tablist"
        aria-label="Seções do acompanhamento escolar"
      >
        {tabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={`tab-panel-${key}`}
            onClick={() => setActiveTab(key)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 pb-3 text-sm font-bold transition-colors cursor-pointer ${
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

      {/* ── CONTEÚDO DAS ABAS ── */}

      {/* 1. ABA DE NOTAS / BOLETIM */}
      {activeTab === 'notas' && (
        <div id="tab-panel-notas" role="tabpanel" className="mt-6 space-y-6">
          
          {/* Cabeçalho da Seção de Notas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border" style={{ borderColor: BORDA }}>
            <div>
              <h2 className="text-base font-extrabold text-[#102D50] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#0B4FB3]" />
                Boletim Escolar Oficial
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhe o rendimento trimestral por componente curricular. Média mínima para aprovação: <strong>6.0</strong>.
              </p>
            </div>

            <button
              onClick={() => setMostrarDetalhamentoNotas((v) => !v)}
              className="text-xs font-bold text-[#0B4FB3] hover:underline flex items-center gap-1 self-start sm:self-center cursor-pointer"
            >
              {mostrarDetalhamentoNotas ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Ocultar Detalhes das Provas
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Ver Detalhes (Atividades, Provas e Qualitativa)
                </>
              )}
            </button>
          </div>

          {/* Tabela do Boletim Consolidado */}
          {boletimConsolidado.length === 0 ? (
            <div
              className="rounded-2xl border bg-white p-10 text-center space-y-2 shadow-xs"
              style={{ borderColor: BORDA }}
            >
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-[#102D50]">Nenhuma disciplina com notas lançadas até o momento.</p>
              <p className="text-xs text-slate-400">
                Os registros serão atualizados assim que os professores digitarem as avaliações no sistema.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white overflow-hidden shadow-xs" style={{ borderColor: BORDA }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead
                    className="border-b text-xs font-bold uppercase tracking-wider text-slate-600"
                    style={{ backgroundColor: '#F4F8FC', borderColor: BORDA }}
                  >
                    <tr>
                      <th className="py-3.5 px-4">Componente Curricular</th>
                      <th className="py-3.5 px-3 text-center">1º Trimestre</th>
                      <th className="py-3.5 px-3 text-center">2º Trimestre</th>
                      <th className="py-3.5 px-3 text-center">3º Trimestre</th>
                      <th className="py-3.5 px-3 text-center font-extrabold text-[#0B4FB3]">Média Parcial / Anual</th>
                      <th className="py-3.5 px-3 text-center">Rec. Final</th>
                      <th className="py-3.5 px-3 text-center font-extrabold text-[#102D50]">Média Final</th>
                      <th className="py-3.5 px-4 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#F0F5FA' }}>
                    {boletimConsolidado.map((item) => {
                      const formatarNota = (val: number | null) =>
                        val !== null ? val.toFixed(1) : '–'

                      const getCorNota = (val: number | null) => {
                        if (val === null) return 'text-slate-400'
                        if (val >= 6.0) return 'text-emerald-700 font-bold'
                        if (val >= 5.0) return 'text-amber-600 font-bold'
                        return 'text-rose-600 font-bold'
                      }

                      return (
                        <tr key={item.materiaId} className="hover:bg-[#F9FBFE] transition-colors">
                          {/* Disciplina */}
                          <td className="py-3.5 px-4 font-bold text-[#102D50]">
                            {item.nome}
                          </td>

                          {/* 1º Trimestre */}
                          <td className="py-3.5 px-3 text-center font-mono text-xs">
                            <span className={getCorNota(item.tri1)}>{formatarNota(item.tri1)}</span>
                          </td>

                          {/* 2º Trimestre */}
                          <td className="py-3.5 px-3 text-center font-mono text-xs">
                            <span className={getCorNota(item.tri2)}>{formatarNota(item.tri2)}</span>
                          </td>

                          {/* 3º Trimestre */}
                          <td className="py-3.5 px-3 text-center font-mono text-xs">
                            <span className={getCorNota(item.tri3)}>{formatarNota(item.tri3)}</span>
                          </td>

                          {/* Média Parcial / Anual */}
                          <td className="py-3.5 px-3 text-center font-mono font-extrabold text-sm bg-slate-50/60">
                            <span className={getCorNota(item.mediaAnual)}>
                              {formatarNota(item.mediaAnual)}
                            </span>
                          </td>

                          {/* Recuperação Final */}
                          <td className="py-3.5 px-3 text-center font-mono text-xs">
                            <span className={getCorNota(item.recuperacao)}>
                              {formatarNota(item.recuperacao)}
                            </span>
                          </td>

                          {/* Média Final */}
                          <td className="py-3.5 px-3 text-center font-mono font-black text-sm bg-blue-50/40">
                            <span className={getCorNota(item.mediaFinal)}>
                              {formatarNota(item.mediaFinal)}
                            </span>
                          </td>

                          {/* Situação */}
                          <td className="py-3.5 px-4 text-center">
                            {item.situacao === 'aprovado' && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                {item.situacaoTexto}
                              </Badge>
                            )}
                            {item.situacao === 'em_curso' && (
                              <Badge className="bg-blue-50 text-[#0B4FB3] border-blue-200 text-[10px] font-bold">
                                {item.situacaoTexto}
                              </Badge>
                            )}
                            {item.situacao === 'recuperacao' && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                                {item.situacaoTexto}
                              </Badge>
                            )}
                            {item.situacao === 'reprovado' && (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                                {item.situacaoTexto}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detalhamento das Avaliações (Atividades, Provas, Qualitativa) */}
          {mostrarDetalhamentoNotas && (
            <div className="bg-white rounded-2xl border p-5 space-y-4 shadow-xs" style={{ borderColor: BORDA }}>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#0B4FB3]" />
                <h3 className="text-sm font-extrabold text-[#102D50]">
                  Detalhamento de Cada Nota Lançada por Trimestre
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {notas.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl border bg-slate-50/60 text-xs space-y-2"
                    style={{ borderColor: BORDA }}
                  >
                    <div className="flex items-center justify-between border-b pb-1.5" style={{ borderColor: '#E5EDF5' }}>
                      <span className="font-bold text-[#102D50]">{n.materia?.nome ?? 'Disciplina'}</span>
                      <Badge variant="outline" className="text-[10px] font-bold bg-white">
                        {n.unidade}º Trimestre
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="text-[9px] text-slate-400 block font-sans">Atividades</span>
                        <span className="font-bold text-[#102D50]">{n.nota1 ?? '–'}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="text-[9px] text-slate-400 block font-sans">Avaliação</span>
                        <span className="font-bold text-[#102D50]">{n.nota2 ?? '–'}</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <span className="text-[9px] text-slate-400 block font-sans">Qualitativa</span>
                        <span className="font-bold text-[#102D50]">{n.nota3 ?? '–'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legenda Explicativa */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Notas computadas conforme os critérios da Secretaria Municipal de Educação de Sapeaçu.</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Média &ge; 6.0: Aprovado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> &lt; 6.0: Recuperação
              </span>
            </div>
          </div>

        </div>
      )}

      {/* 2. ABA DE FREQUÊNCIA & BOLSA FAMÍLIA */}
      {activeTab === 'frequencia' && (
        <div id="tab-panel-frequencia" role="tabpanel" className="mt-6 space-y-6">
          
          {/* Card Resumo de Assiduidade e Bolsa Família */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Índice Geral */}
            <div className="bg-white rounded-2xl border p-5 shadow-xs" style={{ borderColor: BORDA }}>
              <span className="text-xs font-bold text-slate-500">Frequência Geral</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className="text-3xl font-black"
                  style={{
                    color:
                      metricasFrequencia.percentual >= 85
                        ? '#15803D'
                        : metricasFrequencia.percentual >= 75
                        ? '#D97706'
                        : '#DC2626',
                    fontFamily: 'var(--font-manrope), sans-serif',
                  }}
                >
                  {metricasFrequencia.percentual}%
                </span>
                <span className="text-xs font-bold text-slate-400">de presença</span>
              </div>
            </div>

            {/* Presenças */}
            <div className="bg-white rounded-2xl border p-5 shadow-xs" style={{ borderColor: BORDA }}>
              <span className="text-xs font-bold text-slate-500">Total de Presenças</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-emerald-700" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                  {metricasFrequencia.presencas}
                </span>
                <span className="text-xs font-bold text-slate-400">dias/aulas</span>
              </div>
            </div>

            {/* Faltas */}
            <div className="bg-white rounded-2xl border p-5 shadow-xs" style={{ borderColor: BORDA }}>
              <span className="text-xs font-bold text-slate-500">Total de Faltas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-rose-600" style={{ fontFamily: 'var(--font-manrope), sans-serif' }}>
                  {metricasFrequencia.faltas}
                </span>
                <span className="text-xs font-bold text-slate-400">registros</span>
              </div>
            </div>

            {/* Status Bolsa Família */}
            <div className="bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between" style={{ borderColor: BORDA }}>
              <span className="text-xs font-bold text-slate-500">Status Bolsa Família</span>
              <div className="mt-1">
                {metricasFrequencia.statusBolsaFamilia === 'regular' && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-extrabold gap-1 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Regular (&ge; 75%)
                  </Badge>
                )}
                {metricasFrequencia.statusBolsaFamilia === 'atencao' && (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-extrabold gap-1 py-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Atenção (75% a 85%)
                  </Badge>
                )}
                {metricasFrequencia.statusBolsaFamilia === 'em_risco' && (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs font-extrabold gap-1 py-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Em Risco (&lt; 75%)
                  </Badge>
                )}
                {metricasFrequencia.statusBolsaFamilia === 'Sem registros' && (
                  <span className="text-xs text-slate-400 font-bold">Sem registros</span>
                )}
              </div>
            </div>
          </div>

          {/* Histórico Recente de Presenças */}
          <div className="bg-white rounded-2xl border p-5 shadow-xs space-y-4" style={{ borderColor: BORDA }}>
            <h3 className="text-sm font-extrabold text-[#102D50]">
              Histórico Detalhado de Frequência
            </h3>

            {frequencias.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum registro de chamada lançado para este aluno até o momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {frequencias.map((f) => (
                  <div
                    key={f.id}
                    className={`rounded-xl border p-3 flex items-center justify-between text-xs ${
                      f.presenca
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                        : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <span className="font-extrabold block">{formatarData(f.data)}</span>
                      <span className="text-[11px] opacity-75">{f.materia?.nome ?? 'Aula Regular'}</span>
                    </div>
                    <Badge
                      className={
                        f.presenca
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                          : 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                      }
                    >
                      {f.presenca ? 'PRESENTE' : 'FALTA'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ABA DE OCORRÊNCIAS */}
      {activeTab === 'ocorrencias' && (
        <div id="tab-panel-ocorrencias" role="tabpanel" className="mt-6 space-y-4">
          {ocorrencias.length === 0 ? (
            <div className="bg-white rounded-2xl border p-10 text-center space-y-2 shadow-xs" style={{ borderColor: BORDA }}>
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-[#102D50]">Nenhuma ocorrência registrada</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Excelente! Não há registros disciplinares ou advertências pendentes para este estudante.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {ocorrencias.map((oco) => {
                const isCiente = oco.status_pais === 'Cientes'
                return (
                  <div
                    key={oco.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
                      !isCiente ? 'border-amber-300 bg-amber-50/20' : 'border-[#DCE7F2]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: '#F0F5FA' }}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4 text-amber-500 shrink-0" aria-hidden="true" />
                        <span className="font-extrabold text-[#102D50] text-sm">{oco.tipo}</span>
                        {oco.gravidade && (
                          <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-800 border-amber-200">
                            {oco.gravidade}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        Data do ocorrido: {formatarData(oco.data)}
                      </span>
                    </div>

                    <p className="text-xs text-[#102D50] leading-relaxed p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      {oco.descricao}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-xs">
                        {isCiente ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                            <CheckCircle2 className="size-4" />
                            Ciência Registrada pelo Responsável
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-700 font-medium">
                            <Clock className="size-4" />
                            Aguardando confirmação de leitura
                          </span>
                        )}
                      </div>

                      {!isCiente && (
                        <button
                          disabled={marcandoCienteId === oco.id}
                          onClick={() => handleMarcarCiente(oco.id)}
                          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-white transition hover:opacity-90 disabled:opacity-60 cursor-pointer shadow-xs"
                          style={{ backgroundColor: LARANJA }}
                        >
                          {marcandoCienteId === oco.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3.5" />
                          )}
                          Dar Ciência
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

      {/* 4. ABA DE COMUNICAÇÕES */}
      {activeTab === 'comunicacoes' && portalComunicacoesAtivo && (
        <div id="tab-panel-comunicacoes" role="tabpanel" className="mt-6 rounded-2xl border bg-white p-5 shadow-xs space-y-5" style={{ borderColor: BORDA }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#EDF2F7' }}>
            <div>
              <h3 className="text-base font-extrabold text-[#102D50] flex items-center gap-2">
                <MessageSquare className="size-5 text-[#0B4FB3]" />
                Canal Direto com a Escola
              </h3>
              <p className="text-xs text-slate-500">
                Converse com a secretaria e professores sobre o acompanhamento de {aluno?.nome?.split(' ')[0]}.
              </p>
            </div>
            <Badge className="bg-blue-50 text-[#0B4FB3] border-blue-200 text-xs font-bold">
              {mensagens.length} {mensagens.length === 1 ? 'mensagem' : 'mensagens'}
            </Badge>
          </div>

          {/* Histórico */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {mensagens.length === 0 ? (
              <div className="rounded-xl border p-8 text-center text-xs text-slate-400 space-y-2 bg-slate-50/60" style={{ borderColor: BORDA }}>
                <MessageSquare className="size-8 text-slate-300 mx-auto" />
                <p>Nenhuma mensagem trocada ainda.</p>
                <p>Utilize o formulário abaixo para enviar um recado à escola.</p>
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
                  <div key={msg.id} className={`flex flex-col ${isDoProfessor ? 'items-start' : 'items-end'}`}>
                    <div
                      className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 space-y-2 text-xs shadow-xs ${
                        isDoProfessor
                          ? 'rounded-tl-none bg-[#F1F6FC] text-[#102D50] border border-[#DCE7F2]'
                          : 'rounded-tr-none bg-[#0B4FB3] text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[11px] opacity-80 border-b pb-1.5" style={{ borderColor: isDoProfessor ? BORDA : 'rgba(255,255,255,0.2)' }}>
                        <span className="font-extrabold">
                          {isDoProfessor ? (msg.autor_nome ?? 'Secretaria / Professor') : 'Você (Responsável)'}
                        </span>
                        <span className="font-mono">{dataFormatada}</span>
                      </div>

                      {msg.titulo && msg.titulo !== 'Mensagem da Família' && (
                        <h5 className="font-extrabold text-sm">{msg.titulo}</h5>
                      )}

                      <p className="whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>

                      <div className="flex items-center justify-end gap-1 text-[10px] pt-1 opacity-80">
                        {isDoProfessor ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCheck className="size-3.5" /> Mensagem da Escola
                          </span>
                        ) : msg.lida_professor ? (
                          <span className="flex items-center gap-1 text-emerald-200">
                            <CheckCheck className="size-3.5" /> Lido pela escola
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 opacity-70">
                            <Clock className="size-3.5" /> Enviado à escola
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Form de Envio */}
          <form onSubmit={handleEnviarMensagemResponsavel} className="pt-3 border-t space-y-3" style={{ borderColor: '#EDF2F7' }}>
            <span className="text-xs font-extrabold text-[#102D50]">Enviar Mensagem à Escola:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <Input
                value={novaMensagemTitulo}
                onChange={(e) => setNovaMensagemTitulo(e.target.value)}
                placeholder="Assunto (opcional)"
                className="sm:col-span-1 bg-white border text-xs"
                style={{ borderColor: BORDA }}
              />
              <Input
                value={novaMensagemConteudo}
                onChange={(e) => setNovaMensagemConteudo(e.target.value)}
                placeholder="Digite sua mensagem para a escola..."
                className="sm:col-span-3 bg-white border text-xs"
                style={{ borderColor: BORDA }}
                required
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={enviandoMensagem || !novaMensagemConteudo.trim()}
                className="font-bold text-white text-xs h-10 px-5 rounded-xl cursor-pointer shadow-md"
                style={{ backgroundColor: AZUL }}
              >
                {enviandoMensagem ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="size-3.5 mr-1.5" />
                    Enviar para a Escola
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 5. ABA DE SOLICITAÇÕES */}
      {activeTab === 'solicitacoes' && (
        <div id="tab-panel-solicitacoes" role="tabpanel" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border" style={{ borderColor: BORDA }}>
            <div>
              <h3 className="text-sm font-extrabold text-[#102D50]">
                Declarações e Documentos deste Aluno
              </h3>
              <p className="text-xs text-slate-500">
                Peça declarações de matrícula, Bolsa Família e históricos para a secretaria escolar.
              </p>
            </div>
            <Link href="/portal-aluno/solicitacoes">
              <Button
                className="font-bold text-white rounded-xl text-xs h-9 px-4 gap-1.5 cursor-pointer shadow-xs"
                style={{ backgroundColor: AZUL }}
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Solicitação
              </Button>
            </Link>
          </div>

          {solicitacoes.length === 0 ? (
            <div className="rounded-2xl border bg-white p-8 text-center space-y-3 shadow-xs" style={{ borderColor: BORDA }}>
              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-[#102D50]">Nenhuma solicitação enviada para este aluno ainda.</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Quando você pedir uma declaração de Bolsa Família ou matrícula, poderá acompanhar o andamento por aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {solicitacoes.map((sol) => (
                <div key={sol.id} className="rounded-2xl border bg-white p-4 sm:p-5 shadow-xs space-y-3" style={{ borderColor: BORDA }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0B4FB3] flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-[#102D50]">{sol.titulo}</h4>
                        <p className="text-[11px] text-slate-400">
                          Pedido em: {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="self-start sm:self-center">
                      {sol.status === 'pendente' && (
                        <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 font-bold text-xs gap-1">
                          <Clock className="w-3 h-3" />
                          Aguardando Secretaria
                        </Badge>
                      )}
                      {sol.status === 'em_analise' && (
                        <Badge className="bg-sky-500/10 text-sky-700 border-sky-300 font-bold text-xs gap-1">
                          <Clock className="w-3 h-3" />
                          Em Confecção
                        </Badge>
                      )}
                      {sol.status === 'concluido' && (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-xs gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Pronto para Retirada
                        </Badge>
                      )}
                      {sol.status === 'recusado' && (
                        <Badge className="bg-rose-500/10 text-rose-700 border-rose-300 font-bold text-xs">
                          Recusada
                        </Badge>
                      )}
                    </div>
                  </div>

                  {sol.observacoes && (
                    <div className="bg-slate-50 rounded-xl p-2.5 text-xs text-slate-600 border border-slate-100">
                      <span className="font-bold text-slate-700">Observações enviadas: </span>
                      {sol.observacoes}
                    </div>
                  )}

                  {sol.resposta_escola && (
                    <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-900 border border-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-950">Resposta da Secretaria Escolar:</p>
                        <p className="mt-0.5">{sol.resposta_escola}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </PortalPaisLayout>
  )
}
