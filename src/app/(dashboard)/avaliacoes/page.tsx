'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import {
  ClipboardList,
  Search,
  Plus,
  ArrowLeft,
  Loader2,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Filter,
  Download
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useCheckPermissao } from '@/hooks/useCheckPermissao'
import { createClient } from '@/lib/supabaseClient'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ModalNovaAtividade } from '@/components/modals/modal-nova-atividade'
import { ModalDetalhesAtividade } from '@/components/modals/modal-detalhes-atividade'

// ── STATUS CONFIG ──────────────────────────────────────────────────────────────
type StatusAtividade = 'recebida' | 'em_impressao' | 'impressa' | 'entregue_professor'

const STATUS_CONFIG: Record<StatusAtividade, { label: string; class: string }> = {
  recebida: {
    label: 'Recebida',
    class: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400',
  },
  em_impressao: {
    label: 'Em Impressão',
    class: 'bg-blue-500/15 text-blue-700 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400',
  },
  impressa: {
    label: 'Impressa',
    class: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
  entregue_professor: {
    label: 'Entregue ao Professor',
    class: 'bg-slate-500/10 text-slate-700 border-slate-500/25 dark:bg-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/30',
  },
}

// ── componente ─────────────────────────────────────────────────────────────────
function AvaliacoesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { funcionario, acessos, escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const { isEditMode } = useEditModeStore()

  // Modais
  const [novaAtividadeOpen, setNovaAtividadeOpen] = useState(false)
  const [detalhesOpen, setDetalhesOpen] = useState(false)
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<any>(null)

  // Estados de dados
  const [atividades, setAtividades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [turmasDocente, setTurmasDocente] = useState<any[]>([])
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState<string>('')
  const [pendenciasPrazo, setPendenciasPrazo] = useState<any[]>([])
  const [initialNovaAtiv, setInitialNovaAtiv] = useState<{ turmaId?: string; materiaId?: string; trimestre?: string }>({})

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroTrimestre, setFiltroTrimestre] = useState('all')
  const [filtroStatus, setFiltroStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('')

  // KPIs
  const [kpis, setKpis] = useState({
    totalMes: 0,
    pendentesImpressao: 0,
    concluidas: 0,
    tempoMedioImpressao: '—',
    tempoMedioEntrega: '—',
  })

  // Determinar perfis e permissões
  const { temPermissao: podeVerFila } = useCheckPermissao('atividades.ver_fila')
  const { temPermissao: podeImprimirAtividades } = useCheckPermissao('atividades.imprimir')
  const { temPermissao: podeAtualizarStatusAtividades } = useCheckPermissao('atividades.atualizar_status')

  const isGlobalAdmin = isAdminGlobalOrRoot?.() ?? false
  const nivelNaEscola = escolaAtivaId
    ? acessos.find((a) => a.escola_id === escolaAtivaId)?.nivel ?? 99
    : 99

  const isProfessor = nivelNaEscola === 4 || nivelNaEscola === 5 || funcionario?.cargo?.toLowerCase().includes('professor')
  const isSecretario = nivelNaEscola === 3 && podeVerFila
  const isDiretoria = nivelNaEscola === 2 || isGlobalAdmin

  // Carregar turmas vinculadas ao docente na escola ativa
  useEffect(() => {
    if (!escolaAtivaId || !funcionario?.id) return
    let active = true

    const loadTurmasDocente = async () => {
      const supabase = createClient()
      let query = (supabase as any)
        .from('turmas')
        .select('id, nome, turno, ano_letivo')
        .eq('escola_id', escolaAtivaId)
        .order('nome', { ascending: true })

      if (isProfessor && !isDiretoria && !isSecretario) {
        const { data: vinculos } = await (supabase as any)
          .from('vinculos_turmas')
          .select('turma_id')
          .eq('funcionario_id', funcionario.id)
          .eq('escola_id', escolaAtivaId)
          .eq('tipo', 'professor')

        const turmaIds = (vinculos ?? []).map((v: any) => v.turma_id)
        if (turmaIds.length > 0) {
          query = query.in('id', turmaIds)
        } else {
          if (active) setTurmasDocente([])
          return
        }
      }

      const { data, error } = await query
      if (!error && data && active) {
        setTurmasDocente(data)
        const urlTurma = searchParams.get('turma')
        if (urlTurma && data.some((t: any) => t.id === urlTurma)) {
          setTurmaSelecionadaId(urlTurma)
        } else if (data.length > 0 && !turmaSelecionadaId) {
          setTurmaSelecionadaId(data[0].id)
        }
      }
    }

    loadTurmasDocente()
    return () => {
      active = false
    }
  }, [escolaAtivaId, funcionario?.id, isProfessor, isDiretoria, isSecretario, searchParams])

  // Verificar pendências de pontuação no trimestre (5 dias para o prazo)
  useEffect(() => {
    if (!escolaAtivaId) return
    let active = true

    const checkPendencias = async () => {
      try {
        const supabase = createClient()
        const profId = (isProfessor && !isDiretoria && !isGlobalAdmin) ? funcionario?.id : null
        const { data, error } = await (supabase as any).rpc('verificar_pendencias_pontuacao_trimestre', {
          p_escola_id: escolaAtivaId,
          p_professor_id: profId
        })
        if (!error && data && active) {
          setPendenciasPrazo(data ?? [])
        }
      } catch (e) {
        console.error('Erro ao verificar pendências de pontuação:', e)
      }
    }

    checkPendencias()
    return () => {
      active = false
    }
  }, [escolaAtivaId, funcionario?.id, isProfessor, isDiretoria, isGlobalAdmin])

  // Definir aba ativa inicial com base no perfil
  useEffect(() => {
    if (activeTab) return
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      if (tabParam === 'central') {
        setActiveTab(isSecretario ? 'recebidas_impressao' : 'visao_geral')
      } else {
        setActiveTab(tabParam)
      }
      return
    }

    if (isProfessor) {
      setActiveTab('minhas_atividades')
    } else if (isSecretario) {
      setActiveTab('recebidas_impressao')
    } else {
      setActiveTab('visao_geral')
    }
  }, [isProfessor, isSecretario, activeTab, searchParams])

  // Abrir atividade direto por ID se vier da URL (ex: clique na notificação)
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (!idParam) return
    const abrirAtividadePorId = async () => {
      const supabase = createClient()
      const { data, error } = await (supabase as any)
        .from('atividades_secretaria')
        .select('*, funcionarios!professor_id(nome), turmas(nome), materias(nome)')
        .eq('id', idParam)
        .maybeSingle()

      if (error) {
        console.error('Erro ao buscar atividade por ID:', error)
        return
      }

      if (data) {
        const formatado = {
          ...data,
          professor_nome: data.funcionarios?.nome ?? '—',
          turma_nome: data.turmas?.nome ?? '—',
          materia_name: data.materias?.nome ?? '—',
          materia_nome: data.materias?.nome ?? '—',
        }
        setAtividadeSelecionada(formatado)
        setDetalhesOpen(true)
      }
    }
    abrirAtividadePorId()
  }, [searchParams])

  // Contexto de Saúde
  const { selectedSecretaria, escolas } = useSchoolStore()
  const secNome = selectedSecretaria?.nome || selectedEscola?.secretariaNome || (selectedEscola?.secretarias as any)?.nome || ''
  const isSaude = /sa[uú]de/i.test(secNome) || selectedEscola?.tipo === 'SAUDE' || selectedEscola?.tipo === 'UNIDADE_SAUDE'

  // Buscar atividades do banco
  const fetchAtividades = async () => {
    setLoading(true)

    if (isSaude) {
      // Atividades pedagógicas de diário são exclusivas da Educação
      setAtividades([])
      calcularKpis([])
      setLoading(false)
      return
    }

    const supabase = createClient()

    let query = (supabase as any)
      .from('atividades_secretaria')
      .select('*, funcionarios!professor_id(nome), turmas(nome), materias(nome)')
      .order('created_at', { ascending: false })

    // Filtros de nível de acesso
    if (!isGlobalAdmin) {
      if (escolaAtivaId) {
        query = query.eq('escola_id', escolaAtivaId)
      }
      // Filtra por professor apenas se ele for estritamente professor (sem privilégios de diretoria/secretaria)
      if (isProfessor && !isSecretario && !isDiretoria && funcionario?.id) {
        query = query.eq('professor_id', funcionario.id)
      }
    }

    try {
      const { data, error } = await query
      if (error) throw error

      const formatado = (data ?? []).map((at: any) => ({
        ...at,
        professor_nome: at.funcionarios?.nome ?? '—',
        turma_nome: at.turmas?.nome ?? '—',
        materia_name: at.materias?.nome ?? '—',
        materia_nome: at.materias?.nome ?? '—',
      }))

      setAtividades(formatado)
      calcularKpis(formatado)
    } catch (err) {
      console.error('Erro ao carregar atividades:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calcular KPIs no cliente para maior flexibilidade
  const calcularKpis = async (lista: any[]) => {
    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

    const totalMes = lista.filter((at) => new Date(at.created_at) >= inicioMes).length
    const pendentesImpressao = lista.filter((at) => ['recebida', 'em_impressao'].includes(at.status)).length
    const concluidas = lista.filter((at) => at.status === 'entregue_professor').length

    if (lista.length === 0) {
      setKpis({
        totalMes,
        pendentesImpressao,
        concluidas,
        tempoMedioImpressao: '—',
        tempoMedioEntrega: '—',
      })
      return
    }

    // Evitar erro silencioso HTTP 414 (Request-URI Too Large) limitando a 100 atividades mais recentes
    const listaLimitada = lista.slice(0, 100)
    const atividadeIds = listaLimitada.map((at) => at.id)

    // Calcular tempo médio a partir do histórico
    const supabase = createClient()
    const { data: historicos } = await (supabase as any)
      .from('atividades_secretaria_historico')
      .select('atividade_id, status_novo, alterado_em')
      .in('atividade_id', atividadeIds)
      .order('alterado_em', { ascending: true })

    if (!historicos || (historicos as any[]).length === 0) {
      setKpis({ totalMes, pendentesImpressao, concluidas, tempoMedioImpressao: '—', tempoMedioEntrega: '—' })
      return
    }

    // Mapear tempos por atividade_id
    const tempos: Record<string, { criada: Date; impressa?: Date; entregue?: Date }> = {}
    
    lista.forEach((at) => {
      tempos[at.id] = { criada: new Date(at.created_at) }
    });

    (historicos as any[]).forEach((h: any) => {
      if (!tempos[h.atividade_id]) return
      if (h.status_novo === 'impressa') {
        tempos[h.atividade_id].impressa = new Date(h.alterado_em)
      }
      if (h.status_novo === 'entregue_professor') {
        tempos[h.atividade_id].entregue = new Date(h.alterado_em)
      }
    })

    let somaImpressao = 0
    let contImpressao = 0
    let somaEntrega = 0
    let contEntrega = 0

    Object.values(tempos).forEach((t) => {
      if (t.impressa) {
        somaImpressao += t.impressa.getTime() - t.criada.getTime()
        contImpressao++
      }
      if (t.impressa && t.entregue) {
        somaEntrega += t.entregue.getTime() - t.impressa.getTime()
        contEntrega++
      }
    })

    const formatarTempo = (ms: number) => {
      const horas = Math.floor(ms / (1000 * 60 * 60))
      if (horas < 24) return `${horas}h`
      const dias = Math.floor(horas / 24)
      const horasResto = horas % 24
      return horasResto > 0 ? `${dias}d ${horasResto}h` : `${dias}d`
    }

    setKpis({
      totalMes,
      pendentesImpressao,
      concluidas,
      tempoMedioImpressao: contImpressao > 0 ? formatarTempo(somaImpressao / contImpressao) : '—',
      tempoMedioEntrega: contEntrega > 0 ? formatarTempo(somaEntrega / contEntrega) : '—',
    })
  }

  useEffect(() => {
    fetchAtividades()
  }, [escolaAtivaId, funcionario?.id])

  // Filtragem dos dados exibidos
  const atividadesFiltradas = useMemo(() => {
    return atividades.filter((at) => {
      // 1. Busca por título ou professor
      const matchBusca =
        at.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
        at.professor_nome?.toLowerCase().includes(busca.toLowerCase())

      // 2. Filtro Trimestre
      const matchTrimestre =
        filtroTrimestre === 'all' || String(at.trimestre) === filtroTrimestre

      // 3. Filtro Status (se não estiver filtrado pela Tab)
      const matchStatus =
        filtroStatus === 'all' || at.status === filtroStatus

      // 4. Filtro por Aba Ativa
      let matchTab = true
      if (activeTab === 'recebidas_impressao') {
        matchTab = ['recebida', 'em_impressao'].includes(at.status)
      } else if (activeTab === 'impressas_entregues') {
        matchTab = ['impressa', 'entregue_professor'].includes(at.status)
      } else if (activeTab === 'minhas_atividades') {
        matchTab = at.professor_id === funcionario?.id
      }

      return matchBusca && matchTrimestre && matchStatus && matchTab
    })
  }, [atividades, busca, filtroTrimestre, filtroStatus, activeTab, funcionario?.id])

  const abrirDetalhes = (at: any) => {
    setAtividadeSelecionada(at)
    setDetalhesOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-[#3ea6ff]" />
              Central de Atividades
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Gestão, controle de impressão e entrega de atividades avaliativas.
          </p>
        </div>

        {isProfessor && (
          <Button
            onClick={() => setNovaAtividadeOpen(true)}
            className="bg-[#3ea6ff] hover:bg-[#0090ff] text-black font-bold gap-2 shrink-0 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Nova Atividade
          </Button>
        )}
      </div>

      {/* ── BANNER DE ALERTA DE PRAZO (5 DIAS RESTANTES COM PONTUAÇÃO INCOMPLETA) ── */}
      {pendenciasPrazo.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-600 dark:text-amber-400 space-y-2 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Atenção: Trimestre com Pontuação Incompleta a 5 Dias do Encerramento</span>
          </div>
          <div className="text-xs space-y-1.5 pl-6">
            {pendenciasPrazo.map((p: any, idx: number) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-500/15 pt-1.5 first:border-0 first:pt-0">
                <span>
                  <strong>{p.unidade}º Trimestre</strong> — Turma <strong>{p.turma_nome}</strong> ({p.materia_nome}): Pontuação atual de <strong>{p.total_pontos} / 10.0 pts</strong> ({p.total_atividades} atividades).
                  {isDiretoria && <span className="ml-1 text-muted-foreground">(Prof. {p.professor_nome})</span>}
                </span>
                <span className="font-semibold bg-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                  Faltam {p.dias_restantes} dia(s) para o prazo ({p.data_limite})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs GERENCIAIS (Diretoria, Admin e Root) ── */}
      {isDiretoria && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICardMini label="Enviadas (Mês)" value={kpis.totalMes} icon={TrendingUp} color="blue" />
          <KPICardMini label="Aguardando Impressão" value={kpis.pendentesImpressao} icon={Clock} color="amber" />
          <KPICardMini label="Concluídas" value={kpis.concluidas} icon={CheckCircle2} color="emerald" />
          <KPICardMini label="Tempo Médio Impressão" value={kpis.tempoMedioImpressao} icon={Clock} color="violet" />
          <KPICardMini label="Tempo Médio Entrega" value={kpis.tempoMedioEntrega} icon={Clock} color="rose" />
        </div>
      )}

      {/* ── SELETOR DE TURMAS E PLANEJAMENTO DOS 3 TRIMESTRES ── */}
      {isProfessor && turmasDocente.length > 0 && (
        <div className="bg-card border border-borderCustom rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderCustom pb-3.5">
            <div>
              <h3 className="text-sm font-bold text-foreground">Planejamento de Atividades por Turma</h3>
              <p className="text-xs text-muted-foreground">
                Selecione uma turma para visualizar e compor as atividades dos 3 trimestres (até 10 por unidade, somando 10 pts).
              </p>
            </div>

            {/* Chips de Turmas */}
            <div className="flex flex-wrap gap-1.5">
              {turmasDocente.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTurmaSelecionadaId(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    turmaSelecionadaId === t.id
                      ? 'bg-[#3ea6ff] text-black font-bold'
                      : 'bg-muted text-muted-foreground hover:text-foreground border border-borderCustom'
                  }`}
                >
                  {t.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Cards dos 3 Trimestres para a Turma Selecionada */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((unid) => {
              const ativsUnid = atividades.filter(
                (a) =>
                  a.turma_id === turmaSelecionadaId &&
                  Number(a.trimestre) === unid &&
                  (isProfessor && !isDiretoria ? a.professor_id === funcionario?.id : true)
              )
              const somaPontos = ativsUnid.reduce(
                (acc, curr) => acc + (Number(curr.pontos_maximos) || 0),
                0
              )
              const atingiu10 = somaPontos >= 10.0

              return (
                <div
                  key={unid}
                  className="rounded-xl border border-borderCustom bg-muted/20 p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-foreground">{unid}º Trimestre</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          atingiu10
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {somaPontos.toFixed(1)} / 10.0 pts
                      </Badge>
                    </div>

                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${atingiu10 ? 'bg-emerald-500' : 'bg-[#3ea6ff]'}`}
                        style={{ width: `${Math.min(100, (somaPontos / 10) * 100)}%` }}
                      />
                    </div>

                    {/* Lista de Atividades do Trimestre */}
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                      {ativsUnid.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic py-2 text-center">
                          Nenhuma atividade cadastrada.
                        </p>
                      ) : (
                        ativsUnid.map((at) => (
                          <div
                            key={at.id}
                            onClick={() => abrirDetalhes(at)}
                            className="bg-card hover:bg-muted/60 border border-borderCustom rounded-lg p-2 text-xs flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="truncate pr-2">
                              <p className="font-semibold text-foreground truncate">{at.titulo}</p>
                              <p className="text-[10.5px] text-muted-foreground truncate">
                                {at.data_aplicacao
                                  ? new Date(at.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR')
                                  : '—'}
                              </p>
                            </div>
                            <span className="font-bold text-[#3ea6ff] shrink-0">
                              {Number(at.pontos_maximos || 2.5).toFixed(1)} pts
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ativsUnid.length >= 10 || somaPontos >= 10.0}
                    onClick={() => {
                      setInitialNovaAtiv({
                        turmaId: turmaSelecionadaId,
                        trimestre: String(unid),
                      })
                      setNovaAtividadeOpen(true)
                    }}
                    className="w-full text-xs font-bold border-borderCustom hover:bg-muted/80 gap-1.5 h-8 mt-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {ativsUnid.length >= 10
                      ? 'Limite Atingido (10)'
                      : somaPontos >= 10.0
                      ? 'Total Completo (10 pts)'
                      : `+ Nova Atividade (${unid}º Tri)`}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── ABAS DE NAVEGAÇÃO ── */}
      <div className="flex border-b border-borderCustom overflow-x-auto select-none gap-2">
        {isProfessor && (
          <TabButton
            active={activeTab === 'minhas_atividades'}
            onClick={() => {
              setActiveTab('minhas_atividades')
              setFiltroStatus('all')
            }}
            label="Minhas Atividades"
          />
        )}

        {isSecretario && (
          <>
            <TabButton
              active={activeTab === 'recebidas_impressao'}
              onClick={() => setActiveTab('recebidas_impressao')}
              label="Recebidas & Em Impressão"
            />
            <TabButton
              active={activeTab === 'impressas_entregues'}
              onClick={() => setActiveTab('impressas_entregues')}
              label="Impressas & Entregues"
            />
            <TabButton
              active={activeTab === 'historico'}
              onClick={() => {
                setActiveTab('historico')
                setFiltroStatus('all')
              }}
              label="Histórico Completo"
            />
          </>
        )}

        {isDiretoria && (
          <>
            <TabButton
              active={activeTab === 'visao_geral'}
              onClick={() => {
                setActiveTab('visao_geral')
                setFiltroStatus('all')
              }}
              label="Visão Geral"
            />
            <TabButton
              active={activeTab === 'historico'}
              onClick={() => {
                setActiveTab('historico')
                setFiltroStatus('all')
              }}
              label="Histórico Completo"
            />
          </>
        )}
      </div>

      {/* ── FILTROS ── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título ou professor..."
            className="pl-9 bg-input border-borderCustom text-foreground placeholder:text-muted-foreground focus-visible:ring-highlight"
          />
        </div>

        <div className="flex gap-3">
          {/* Trimestre */}
          <Select value={filtroTrimestre} onValueChange={(v) => setFiltroTrimestre(v || 'all')}>
            <SelectTrigger className="w-[160px] bg-input border-borderCustom text-foreground focus:ring-highlight">
              <SelectValue placeholder="Trimestre" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-borderCustom text-popover-foreground">
              <SelectItem value="all">Todos Trimestres</SelectItem>
              <SelectItem value="1">1º Trimestre</SelectItem>
              <SelectItem value="2">2º Trimestre</SelectItem>
              <SelectItem value="3">3º Trimestre</SelectItem>
            </SelectContent>
          </Select>

          {/* Status (oculto quando abas já pré-filtram status) */}
          {activeTab !== 'recebidas_impressao' && activeTab !== 'impressas_entregues' && (
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v || 'all')}>
              <SelectTrigger className="w-[160px] bg-input border-borderCustom text-foreground focus:ring-highlight">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-borderCustom text-popover-foreground">
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="recebida">Recebida</SelectItem>
                <SelectItem value="em_impressao">Em Impressão</SelectItem>
                <SelectItem value="impressa">Impressa</SelectItem>
                <SelectItem value="entregue_professor">Entregue</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* ── TABELA DE DADOS ── */}
      <Card className="bg-card border-borderCustom overflow-hidden rounded-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
            <span>Buscando atividades...</span>
          </div>
        ) : activitiesListEmpty(atividadesFiltradas) ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <ClipboardList className="w-16 h-16 text-slate-300 dark:text-zinc-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Nenhuma atividade encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">Experimente ajustar os filtros ou pesquisar outro termo.</p>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/60 border-b border-borderCustom">
              <TableRow className="border-b border-borderCustom hover:bg-transparent">
                <TableHead className="text-muted-foreground font-semibold h-12">Atividade</TableHead>
                <TableHead className="text-muted-foreground font-semibold h-12">Professor</TableHead>
                <TableHead className="text-muted-foreground font-semibold h-12">Turma / Matéria</TableHead>
                <TableHead className="text-muted-foreground font-semibold h-12">Data Aplicação</TableHead>
                <TableHead className="text-muted-foreground font-semibold h-12">Trimestre</TableHead>
                <TableHead className="text-muted-foreground font-semibold h-12">Status</TableHead>
                <TableHead className="text-muted-foreground font-semibold h-12 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atividadesFiltradas.map((at) => {
                const sInfo = STATUS_CONFIG[at.status as StatusAtividade] ?? {
                  label: at.status,
                  class: 'bg-slate-500/10 text-slate-700 border-slate-500/25 dark:bg-zinc-500/20 dark:text-zinc-400 dark:border-zinc-500/30',
                }
                return (
                  <TableRow
                    key={at.id}
                    onClick={() => abrirDetalhes(at)}
                    className="border-b border-borderCustom/60 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="font-semibold text-foreground h-14">
                      {at.titulo}
                    </TableCell>
                    <TableCell className="text-foreground/85">
                      {at.professor_nome}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="text-sm">{at.turma_nome}</div>
                      <div className="text-xs text-muted-foreground/80">{at.materia_name}</div>
                    </TableCell>
                    <TableCell className="text-foreground/85">
                      {at.data_aplicacao
                        ? new Date(at.data_aplicacao + 'T00:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {at.trimestre ? `${at.trimestre}º Trim` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sInfo.class}>
                        {sInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {at.arquivo_url && (
                          <a href={at.arquivo_url} target="_blank" rel="noopener noreferrer">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                              title="Visualizar arquivo"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ── MODAIS ── */}
      {novaAtividadeOpen && (
        <ModalNovaAtividade
          open={novaAtividadeOpen}
          onOpenChange={(open) => {
            setNovaAtividadeOpen(open)
            if (!open) setInitialNovaAtiv({})
          }}
          initialTurmaId={initialNovaAtiv.turmaId}
          initialMateriaId={initialNovaAtiv.materiaId}
          initialTrimestre={initialNovaAtiv.trimestre}
          onSuccess={() => {
            fetchAtividades()
          }}
        />
      )}

      {detalhesOpen && (
        <ModalDetalhesAtividade
          open={detalhesOpen}
          onOpenChange={setDetalhesOpen}
          atividade={atividadeSelecionada}
          onStatusChange={fetchAtividades}
        />
      )}
    </div>
  )
}

// ── COMPONENTES AUXILIARES INTERNOS ─────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-3 text-sm font-semibold transition-all duration-200 border-b-2 outline-none cursor-pointer whitespace-nowrap',
        active
          ? 'border-highlight text-highlight'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-borderCustom'
      )}
    >
      {label}
    </button>
  )
}

function KPICardMini({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: any
  color: 'blue' | 'amber' | 'emerald' | 'violet' | 'rose'
}) {
  const colors = {
    blue:    { bg: 'bg-blue-50 dark:bg-[#1b253b]', text: 'text-blue-600 dark:text-[#3ea6ff]', border: 'border-blue-200 dark:border-[#3ea6ff]/20' },
    amber:   { bg: 'bg-amber-50 dark:bg-[#2c1a0e]', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20' },
    emerald: { bg: 'bg-emerald-50 dark:bg-[#0d1f18]', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20' },
    violet:  { bg: 'bg-violet-50 dark:bg-[#1e1b2e]', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20' },
    rose:    { bg: 'bg-rose-50 dark:bg-[#1f0d0d]', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/20' },
  }
  const c = colors[color]

  return (
    <Card className="bg-surface-1 border-borderCustom rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border', c.bg, c.border)}>
        <Icon className={cn('w-4 h-4', c.text)} />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider leading-tight">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5 tabular-nums leading-none">{value}</p>
      </div>
    </Card>
  )
}

function activitiesListEmpty(arr: any[]) {
  return !arr || arr.length === 0
}

export default function AvaliacoesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
        <span>Carregando central de atividades...</span>
      </div>
    }>
      <AvaliacoesContent />
    </Suspense>
  )
}
