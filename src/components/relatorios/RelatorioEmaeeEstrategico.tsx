'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Heart,
  Users,
  Activity,
  RefreshCw,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  MapPin,
  FileText,
  AlertCircle,
  Stethoscope,
  BarChart2,
  PieChart as PieChartIcon,
  HelpCircle,
  CalendarCheck,
  Timer,
  AlertTriangle,
  Eye,
  FileQuestion
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts'
import { RelatorioEmaeePrintPayload } from '@/components/print/print-relatorio-emaee-estrategico'
import { ModalDetalhesInvestigacaoEmaee } from '@/components/modals/ModalDetalhesInvestigacaoEmaee'

interface RelatorioEmaeeProps {
  selectedEscola?: {
    id: string
    nome: string
    tipo?: string | null
  } | null
}

const PALETTE_EPIDEMIOLOGIA = [
  '#3b82f6', // Azul (TEA)
  '#f59e0b', // Âmbar (TDAH)
  '#8b5cf6', // Roxo (DI)
  '#ec4899', // Rosa (Epilepsia)
  '#06b6d4', // Ciano (Fala / Linguagem)
  '#10b981', // Verde esmeralda (Síndrome de Down)
  '#f97316', // Laranja (Paralisia Cerebral)
  '#14b8a6', // Teal (Dislexia)
  '#6366f1', // Indigo (Disgrafia)
  '#84cc16', // Lima (Discalculia)
  '#d946ef', // Magenta (TOD)
  '#ef4444', // Vermelho (Transtorno de Conduta)
  '#0ea5e9', // Sky (TPAC)
  '#eab308', // Amarelo (Ansiedade)
  '#a855f7', // Violeta (Superdotação)
  '#64748b', // Cinza azulado (Deficiências)
  '#f59e0b', // Âmbar (Em Investigação)
  '#94a3b8', // Cinza (Outros)
]

const PALETTE_ESPECIALIDADES = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'
]

export default function RelatorioEmaeeEstrategico({ selectedEscola }: RelatorioEmaeeProps) {
  const currentYear = new Date().getFullYear()
  const anosDisponiveis = React.useMemo(() => [currentYear + 1, currentYear, currentYear - 1, currentYear - 2, currentYear - 3], [currentYear])
  const [anoLetivo, setAnoLetivo] = useState<number>(currentYear)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'epidemiologia' | 'especialidades' | 'origem' | 'logistica' | 'atendimentos'>('epidemiologia')
  const [data, setData] = useState<RelatorioEmaeePrintPayload | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isModalInvestigacaoOpen, setIsModalInvestigacaoOpen] = useState<boolean>(false)

  // Estados para a nova aba "Atendimentos" (Carregamento sob demanda / lazy)
  const [atendimentosData, setAtendimentosData] = useState<{
    resumo: {
      total_registros: number
      realizados: number
      negativos: number
      neutros: number
      pendentes: number
      taxa_realizacao: number
    }
    por_mes: Array<{
      mes: string
      mes_num: number
      realizados: number
      negativos: number
      neutros: number
      pendentes: number
      taxa_realizacao: number | null
    }>
    por_especialidade: Array<{
      especialidade: string
      realizados: number
      negativos: number
      neutros: number
      pendentes: number
      taxa_realizacao: number | null
    }>
    fila_espera: Array<{
      especialidade: string
      total_na_fila: number
      prioridade_judicial: number
      prioridade_prioritario: number
      prioridade_normal: number
      tempo_medio_espera_dias: number
      aluno_mais_tempo_dias: number
    }>
  } | null>(null)
  const [isLoadingAtendimentos, setIsLoadingAtendimentos] = useState<boolean>(false)

  const isMountedRef = useRef<boolean>(true)

  const fetchRelatorio = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true)
      else setIsLoading(true)

      const escolaIdParam = selectedEscola?.id ? `&escolaId=${selectedEscola.id}` : ''
      const res = await fetch(`/api/relatorios/emaee-estrategico?ano=${anoLetivo}${escolaIdParam}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errorPayload = await res.json().catch(() => ({}))
        throw new Error(errorPayload.error || `Erro ${res.status} ao carregar relatório.`)
      }

      const payload: RelatorioEmaeePrintPayload = await res.json()

      if (isMountedRef.current) {
        setData(payload)
        setLastUpdated(new Date())
        if (showToast) {
          toast.success('Relatório do EMAEE atualizado com sucesso!')
        }
      }
    } catch (err: any) {
      console.error('[RelatorioEmaeeEstrategico] Erro no fetch:', err)
      if (isMountedRef.current) {
        toast.error(err.message || 'Não foi possível carregar os dados estratégicos do EMAEE.')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [anoLetivo, selectedEscola])

  const fetchAtendimentos = useCallback(async () => {
    try {
      setIsLoadingAtendimentos(true)
      const escolaIdParam = selectedEscola?.id ? `&escolaId=${selectedEscola.id}` : ''
      const res = await fetch(`/api/relatorios/emaee-atendimentos?ano=${anoLetivo}${escolaIdParam}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Erro ao carregar dados de atendimentos')
      }

      const payload = await res.json()
      if (isMountedRef.current) {
        setAtendimentosData(payload)
      }
    } catch (err: any) {
      console.error('[RelatorioEmaeeEstrategico] Erro ao carregar atendimentos:', err)
      if (isMountedRef.current) {
        toast.error(err.message || 'Erro ao carregar métricas de atendimentos.')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingAtendimentos(false)
      }
    }
  }, [anoLetivo, selectedEscola])

  useEffect(() => {
    isMountedRef.current = true
    fetchRelatorio()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchRelatorio])

  // Efeito Lazy: dispara a busca apenas quando a aba 'atendimentos' for selecionada
  useEffect(() => {
    if (activeTab === 'atendimentos') {
      fetchAtendimentos()
    }
  }, [activeTab, fetchAtendimentos])

  // Preparação dos dados para os Gráficos de Epidemiologia
  const epidemiologiaChartData = React.useMemo(() => {
    if (!data?.epidemiologia) return []
    const ep = data.epidemiologia
    const base = ep.total_base || 1

    return [
      { name: 'TEA', label: 'Transtorno do Espectro Autista', count: ep.tea || 0, pct: Number((((ep.tea || 0) / base) * 100).toFixed(1)) },
      { name: 'TDAH', label: 'Déficit de Atenção / Hiperatividade', count: ep.tdah || 0, pct: Number((((ep.tdah || 0) / base) * 100).toFixed(1)) },
      { name: 'Def. Intelectual', label: 'Deficiência Intelectual', count: ep.def_intelectual || 0, pct: Number((((ep.def_intelectual || 0) / base) * 100).toFixed(1)) },
      { name: 'Epilepsia', label: 'Epilepsia / Distúrbios Convulsivos (G40)', count: ep.epilepsia || 0, pct: Number((((ep.epilepsia || 0) / base) * 100).toFixed(1)) },
      { name: 'Linguagem/Fala', label: 'Transtornos da Fala e Linguagem (TDL / F80)', count: ep.transtorno_linguagem || 0, pct: Number((((ep.transtorno_linguagem || 0) / base) * 100).toFixed(1)) },
      { name: 'Down (T21)', label: 'Síndrome de Down (T21 / Q90)', count: ep.sindrome_down || 0, pct: Number((((ep.sindrome_down || 0) / base) * 100).toFixed(1)) },
      { name: 'Paralisia Cerebral', label: 'Paralisia Cerebral (G80)', count: ep.paralisia_cerebral || 0, pct: Number((((ep.paralisia_cerebral || 0) / base) * 100).toFixed(1)) },
      { name: 'Dislexia', label: 'Dislexia (F81.0)', count: ep.dislexia || 0, pct: Number((((ep.dislexia || 0) / base) * 100).toFixed(1)) },
      { name: 'Disgrafia', label: 'Disgrafia / Disortografia (F81.1)', count: ep.disgrafia || 0, pct: Number((((ep.disgrafia || 0) / base) * 100).toFixed(1)) },
      { name: 'Discalculia', label: 'Discalculia (F81.2)', count: ep.discalculia || 0, pct: Number((((ep.discalculia || 0) / base) * 100).toFixed(1)) },
      { name: 'TOD', label: 'Transtorno Opositivo Desafiador (F91.3)', count: ep.tod || 0, pct: Number((((ep.tod || 0) / base) * 100).toFixed(1)) },
      { name: 'Tr. Conduta', label: 'Transtorno de Conduta (F91)', count: ep.transtorno_conduta || 0, pct: Number((((ep.transtorno_conduta || 0) / base) * 100).toFixed(1)) },
      { name: 'TPAC', label: 'Transtorno Proc. Auditivo Central (H93.25)', count: ep.tpac || 0, pct: Number((((ep.tpac || 0) / base) * 100).toFixed(1)) },
      { name: 'Ansiedade', label: 'Transtornos de Ansiedade', count: ep.ansiedade || 0, pct: Number((((ep.ansiedade || 0) / base) * 100).toFixed(1)) },
      { name: 'Altas Habilidades', label: 'Superdotação / Altas Habilidades', count: ep.superdotacao || 0, pct: Number((((ep.superdotacao || 0) / base) * 100).toFixed(1)) },
      { name: 'Def. Visual', label: 'Baixa Visão / Cegueira', count: ep.def_visual || 0, pct: Number((((ep.def_visual || 0) / base) * 100).toFixed(1)) },
      { name: 'Def. Auditiva', label: 'Surdez / Deficiência Auditiva', count: ep.def_auditiva || 0, pct: Number((((ep.def_auditiva || 0) / base) * 100).toFixed(1)) },
      { name: 'Def. Física', label: 'Deficiência Física / Motora', count: ep.def_fisica || 0, pct: Number((((ep.def_fisica || 0) / base) * 100).toFixed(1)) },
      { name: 'Def. Múltipla', label: 'Deficiência Múltipla', count: ep.def_multipla || 0, pct: Number((((ep.def_multipla || 0) / base) * 100).toFixed(1)) },
      {
        name: 'Investigação',
        label: 'Em Investigação Diagnóstica (Aguardando Laudo)',
        count: ep.em_investigacao || 0,
        pct: Number((((ep.em_investigacao || 0) / base) * 100).toFixed(1)),
        isInvestigacao: true,
      },
      { name: 'Outras Condições', label: 'Outras Condições Clínicas', count: ep.outros || 0, pct: Number((((ep.outros || 0) / base) * 100).toFixed(1)) },
    ].filter((item) => item.count > 0)
  }, [data])

  // Gráfico de Especialidades
  const especialidadesChartData = React.useMemo(() => {
    if (!data?.especialidades) return []
    return data.especialidades.map((esp) => ({
      name: esp.especialidade,
      atendimentos: esp.total_atendimentos,
      fila: esp.total_fila || 0,
      profissionais: esp.total_profissionais,
      pacientes: esp.pacientes_atendidos,
    }))
  }, [data])

  if (isLoading && !data) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-card border border-border rounded-2xl p-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-card border border-border rounded-2xl" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="border border-dashed border-border rounded-2xl bg-card/50 p-12 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-bold text-foreground">Relatório Indisponível</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Não foi possível carregar os dados estratégicos do EMAEE. Verifique sua conexão e permissões.
        </p>
        <Button onClick={() => fetchRelatorio()} className="mt-4 gap-2 rounded-xl">
          <RefreshCw className="w-4 h-4" /> Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Executivo e Controles de Período / Atualização */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Heart className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground tracking-tight">
                  Relatório Executivo e Estratégico do EMAEE
                </h2>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  Inteligência & Censo AEE
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>{data.meta.escopo}</span>
                <span>•</span>
                <span className="text-slate-400">
                  Consolidado em:{' '}
                  {lastUpdated
                    ? `${lastUpdated.toLocaleDateString('pt-BR')} às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'N/D'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Ano Letivo */}
            <div className="flex items-center bg-secondary/70 border border-border rounded-xl px-3 py-1.5 gap-2 text-xs">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <select
                aria-label="Selecionar Ano Letivo"
                value={anoLetivo}
                onChange={(e) => setAnoLetivo(Number(e.target.value))}
                className="bg-transparent text-foreground font-semibold outline-none cursor-pointer"
              >
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano} className="bg-popover text-popover-foreground">
                    Ano Letivo {ano}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão Atualizar Dados Agora */}
            <Button
              variant="outline"
              onClick={() => fetchRelatorio(true)}
              disabled={isRefreshing}
              className="bg-secondary hover:bg-hoverCustom border-border text-foreground text-xs rounded-xl gap-2 h-9"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 text-muted-foreground', isRefreshing && 'animate-spin text-primary')} />
              <span>{isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}</span>
            </Button>
          </div>
        </div>

        {/* Tarja de Conformidade LGPD */}
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 px-3 flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Privacidade LGPD Garantida</strong>: Este relatório opera com agregação estrutural no banco de dados, protegendo identidades de menores e sigilo clínico individual.
            </span>
          </div>
          <span className="text-[11px] text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md">
            Auditoria Ativa
          </span>
        </div>
      </div>

      {/* 2. Grid de KPIs Centrais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Atendimentos Ativos */}
        <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500" />
          <CardContent className="p-5 pl-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atendimentos Ativos</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{data.kpis.total_ativos}</div>
            <p className="text-xs text-muted-foreground mt-1">Pacientes em acompanhamento regular</p>
          </CardContent>
        </Card>

        {/* Fila de Espera */}
        <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-500" />
          <CardContent className="p-5 pl-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fila de Espera</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{data.kpis.total_fila}</div>
            <p className="text-xs text-amber-400/90 mt-1 font-medium">
              Tempo médio: {data.kpis.tempo_medio_fila_dias} dias corridos
            </p>
          </CardContent>
        </Card>

        {/* Altas e Resolutividade */}
        <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
          <CardContent className="p-5 pl-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Altas & Concluídos</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{data.kpis.total_altas}</div>
            <p className="text-xs text-emerald-400/90 mt-1 font-medium">
              Taxa de resolutividade: {data.kpis.taxa_resolutividade}%
            </p>
          </CardContent>
        </Card>

        {/* Total Histórico */}
        <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden relative">
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-purple-500" />
          <CardContent className="p-5 pl-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Histórico Geral</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{data.kpis.total_geral}</div>
            <p className="text-xs text-muted-foreground mt-1">Prontuários registrados na base</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Navegação por Abas Analíticas */}
      <div className="flex items-center gap-1.5 bg-secondary/60 border border-border rounded-xl p-1.5 w-fit">
        <button
          onClick={() => setActiveTab('epidemiologia')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'epidemiologia'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <BarChart2 className="w-4 h-4" />
          Epidemiologia & Censo
        </button>

        <button
          onClick={() => setActiveTab('especialidades')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'especialidades'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <Stethoscope className="w-4 h-4" />
          Especialidades & RH
        </button>

        <button
          onClick={() => setActiveTab('origem')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'origem'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <Building2 className="w-4 h-4" />
          Rede Regular & Intersetorialidade
        </button>

        <button
          onClick={() => setActiveTab('logistica')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'logistica'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <MapPin className="w-4 h-4" />
          Logística & Demografia
        </button>

        <button
          onClick={() => setActiveTab('atendimentos')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
            activeTab === 'atendimentos'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <CalendarCheck className="w-4 h-4" />
          Atendimentos
        </button>
      </div>

      {/* 4. Conteúdo Dinâmico da Aba Ativa */}
      {activeTab === 'epidemiologia' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico de Barras Epidemiológico */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Distribuição de Condições de Saúde & Neurodesenvolvimento</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Total de alunos com prontuário ativo: <strong>{data.epidemiologia.total_base}</strong>
                  </p>
                </div>
              </div>

              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={epidemiologiaChartData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 80, bottom: 5 }}
                    onClick={(state: any) => {
                      if (state?.activePayload?.[0]?.payload?.isInvestigacao) {
                        setIsModalInvestigacaoOpen(true)
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} width={100} />
                    <Tooltip
                      formatter={(value: any, name: any, item: any) => [
                        `${value} casos (${item.payload.pct}%)${item.payload.isInvestigacao ? ' • Clique para ver detalhes' : ''}`,
                        'Total',
                      ]}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} className="cursor-pointer">
                      {epidemiologiaChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PALETTE_EPIDEMIOLOGIA[index % PALETTE_EPIDEMIOLOGIA.length]}
                          className={entry.isInvestigacao ? 'hover:opacity-80 transition-opacity' : ''}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[11px] text-muted-foreground mt-3 italic">
                * A soma percentual pode ultrapassar 100% devido a comorbidades associadas no diagnóstico clínico.
              </p>
            </div>

            {/* Quadro Numérico Sintético */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <h3 className="text-base font-bold text-foreground">
                    Quadro Sintético Censo AEE
                  </h3>
                  {data.epidemiologia.em_investigacao && data.epidemiologia.em_investigacao > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModalInvestigacaoOpen(true)}
                      className="h-7 px-2 text-[11px] gap-1 rounded-lg border-amber-500/30 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Ver Investigação</span>
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {epidemiologiaChartData.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-xl border text-xs transition-all',
                        item.isInvestigacao
                          ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50 cursor-pointer shadow-xs'
                          : 'bg-secondary/40 border-border/50'
                      )}
                      onClick={() => {
                        if (item.isInvestigacao) setIsModalInvestigacaoOpen(true)
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PALETTE_EPIDEMIOLOGIA[idx % PALETTE_EPIDEMIOLOGIA.length] }}
                        />
                        <span className="text-foreground font-medium truncate max-w-[140px] sm:max-w-[170px]" title={item.label}>
                          {item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.isInvestigacao && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                            <Eye className="w-2.5 h-2.5" /> Detalhes
                          </span>
                        )}
                        <div className="text-right">
                          <span className="font-bold text-foreground">{item.count}</span>
                          <span className="text-muted-foreground text-[10px] ml-1">({item.pct}%)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'especialidades' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Sessões por Especialidade */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground border-b border-border pb-3 mb-4">
                Atendimentos & Fila por Especialidade ({anoLetivo})
              </h3>
              {especialidadesChartData.length > 0 ? (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={especialidadesChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                      <YAxis stroke="#71717a" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar dataKey="atendimentos" name="Sessões / Ativos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="fila" name="Fila de Espera" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-xs italic">
                  Nenhuma evolução clínica registrada no ano letivo selecionado.
                </div>
              )}
            </div>

            {/* Tabela de Produtividade Clínica */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground border-b border-border pb-3 mb-4">
                Capacidade e Produção de Especialidades
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="pb-2">Especialidade</th>
                      <th className="pb-2 text-center">Sessões / Atend.</th>
                      <th className="pb-2 text-center">Em Fila</th>
                      <th className="pb-2 text-center">Profissionais</th>
                      <th className="pb-2 text-center">Pacientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.especialidades.map((esp, idx) => (
                      <tr key={idx} className="hover:bg-hoverCustom/40">
                        <td className="py-2.5 font-medium text-foreground">{esp.especialidade}</td>
                        <td className="py-2.5 text-center font-bold text-primary">{esp.total_atendimentos}</td>
                        <td className="py-2.5 text-center font-bold text-amber-500">
                          {esp.total_fila && esp.total_fila > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
                              {esp.total_fila}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-2.5 text-center text-muted-foreground">{esp.total_profissionais}</td>
                        <td className="py-2.5 text-center text-foreground font-semibold">{esp.pacientes_atendidos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'origem' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tabela de Escolas de Origem */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Escolas da Rede que Mais Encaminham</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Demanda de estudantes por unidade escolar regular</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-semibold">
                      <th className="pb-2">Unidade Escolar Regular</th>
                      <th className="pb-2 text-center">Total Encaminhados</th>
                      <th className="pb-2 text-center">Em Atendimento</th>
                      <th className="pb-2 text-center">Na Fila</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.origem_escolas.map((esc, idx) => (
                      <tr key={idx} className="hover:bg-hoverCustom/40">
                        <td className="py-2.5 font-medium text-foreground">{esc.escola_nome}</td>
                        <td className="py-2.5 text-center font-bold text-foreground">{esc.total_encaminhados}</td>
                        <td className="py-2.5 text-center font-semibold text-blue-400">{esc.em_atendimento}</td>
                        <td className="py-2.5 text-center font-semibold text-amber-400">{esc.na_fila}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Intersetorialidade e Pareceres Pedagógicos */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground border-b border-border pb-3 mb-4">
                  Pareceres & Intersetorialidade
                </h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Total de Solicitações das Escolas</span>
                    <div className="text-2xl font-bold text-foreground mt-1">{data.intersetorialidade.total_solicitacoes}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 uppercase font-semibold">Pareceres Emitidos / Concluídos</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{data.intersetorialidade.respondidos}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-xs text-amber-400 uppercase font-semibold">Solicitações Pendentes</span>
                    <div className="text-2xl font-bold text-amber-400 mt-1">{data.intersetorialidade.pendentes}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex justify-between items-center">
                <span>Tempo médio de resposta:</span>
                <strong className="text-foreground">{data.intersetorialidade.tempo_medio_resposta_dias} dias</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logistica' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Distribuição Territorial */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground border-b border-border pb-3 mb-4">
                Zona de Residência dos Pacientes
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-xs text-foreground font-medium">Zona Urbana</span>
                  <span className="text-sm font-bold text-primary">{data.logistica.zona_urbana} alunos</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-xs text-foreground font-medium">Zona Rural</span>
                  <span className="text-sm font-bold text-emerald-400">{data.logistica.zona_rural} alunos</span>
                </div>
              </div>
            </div>

            {/* Turno de Atendimento */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-foreground border-b border-border pb-3 mb-4">
                Turno de Acolhimento Especializado
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-xs text-foreground font-medium">Turno Matutino</span>
                  <span className="text-sm font-bold text-blue-400">{data.logistica.turno_matutino} alunos</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-secondary/40 border border-border">
                  <span className="text-xs text-foreground font-medium">Turno Vespertino</span>
                  <span className="text-sm font-bold text-amber-400">{data.logistica.turno_vespertino} alunos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'atendimentos' && (
        <div className="space-y-6">
          {isLoadingAtendimentos && !atendimentosData ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-card border border-border rounded-2xl" />
                ))}
              </div>
              <div className="h-80 bg-card border border-border rounded-2xl" />
              <div className="h-64 bg-card border border-border rounded-2xl" />
            </div>
          ) : !atendimentosData ? (
            <div className="border border-dashed border-border rounded-2xl bg-card/50 p-12 text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-bold text-foreground">Dados de Atendimentos Indisponíveis</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Não foi possível carregar os registros de atendimento e fila para o ano de {anoLetivo}.
              </p>
              <Button onClick={() => fetchAtendimentos()} className="mt-4 gap-2 rounded-xl">
                <RefreshCw className="w-4 h-4" /> Tentar Novamente
              </Button>
            </div>
          ) : (
            <>
              {/* Seção 1: Indicadores de Qualidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Taxa de Realização */}
                <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden relative">
                  <div className={cn(
                    "absolute top-0 left-0 bottom-0 w-1.5",
                    atendimentosData.resumo.taxa_realizacao >= 85
                      ? "bg-emerald-500"
                      : atendimentosData.resumo.taxa_realizacao >= 70
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  )} />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Taxa de Realização
                      </span>
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        atendimentosData.resumo.taxa_realizacao >= 85
                          ? "bg-emerald-500/10 text-emerald-400"
                          : atendimentosData.resumo.taxa_realizacao >= 70
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      )}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-foreground mt-2">
                      {atendimentosData.resumo.taxa_realizacao}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Índice de comparecimento efetivo
                    </p>
                  </CardContent>
                </Card>

                {/* Sessões Realizadas */}
                <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-500" />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Sessões Realizadas
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-500 mt-2">
                      {atendimentosData.resumo.realizados}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Com presença ou atividade concluída
                    </p>
                  </CardContent>
                </Card>

                {/* Não Realizados / Faltas */}
                <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-rose-500" />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Faltas / Não Realizados
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-rose-500 mt-2">
                      {atendimentosData.resumo.negativos}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ausência justificada ou falta escolar
                    </p>
                  </CardContent>
                </Card>

                {/* Pendências / Aguardando Registro */}
                <Card className="bg-card border-border rounded-2xl shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500" />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Aguardando Registro
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-amber-500 mt-2">
                      {atendimentosData.resumo.pendentes}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sessões a preencher pelo profissional
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Seção 2: Gráfico Mensal e Qualidade por Especialidade */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico Mensal de Atendimentos */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        Evolução Mensal de Atendimentos ({anoLetivo})
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Volume comparativo de sessões realizadas vs. faltas
                      </p>
                    </div>
                  </div>

                  {atendimentosData.por_mes.length > 0 ? (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={atendimentosData.por_mes}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="mes" stroke="#a1a1aa" fontSize={11} />
                          <YAxis stroke="#71717a" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#18181b',
                              borderColor: '#27272a',
                              borderRadius: '12px',
                              color: '#fff',
                            }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                          <Bar dataKey="realizados" name="Realizados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="negativos" name="Não Realizados" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="pendentes" name="Pendentes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-xs text-muted-foreground italic">
                      Nenhum registro de atendimento com data no período selecionado.
                    </div>
                  )}
                </div>

                {/* Qualidade e Eficiência por Especialidade */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
                  <div className="border-b border-border pb-3 mb-4">
                    <h3 className="text-base font-bold text-foreground">
                      Qualidade por Especialidade
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Taxa de comparecimento e sessões por especialidade
                    </p>
                  </div>

                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold sticky top-0 bg-card z-10">
                          <th className="pb-2">Especialidade</th>
                          <th className="pb-2 text-center">Realizados</th>
                          <th className="pb-2 text-center">Faltas</th>
                          <th className="pb-2 text-center">Taxa de Sucesso</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {atendimentosData.por_especialidade.length > 0 ? (
                          atendimentosData.por_especialidade.map((esp, idx) => (
                            <tr key={idx} className="hover:bg-hoverCustom/40">
                              <td className="py-2.5 font-medium text-foreground">{esp.especialidade}</td>
                              <td className="py-2.5 text-center font-bold text-blue-500">{esp.realizados}</td>
                              <td className="py-2.5 text-center font-semibold text-rose-500">{esp.negativos}</td>
                              <td className="py-2.5 text-center">
                                {esp.taxa_realizacao !== null ? (
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[11px] font-bold border",
                                    esp.taxa_realizacao >= 85
                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                      : esp.taxa_realizacao >= 70
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                      : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                  )}>
                                    {esp.taxa_realizacao}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-muted-foreground italic">
                              Sem registros de atendimentos para as especialidades no ano letivo selecionado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Seção 3: Fila de Espera das Especialidades (com Destaque e Tempo) */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">
                        Fila de Espera por Especialidade
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] font-bold">
                        Priorização Clínica
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Classificação ordenada pelas especialidades com mais alunos necessitando de atendimento e tempo decorrido
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      Demanda Crítica (Top 3)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      Demanda Regular
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground font-semibold">
                        <th className="pb-2.5">Especialidade</th>
                        <th className="pb-2.5 text-center">Alunos na Fila</th>
                        <th className="pb-2.5 text-center">Judicial</th>
                        <th className="pb-2.5 text-center">Prioritário</th>
                        <th className="pb-2.5 text-center">Tempo Médio de Espera</th>
                        <th className="pb-2.5 text-center">Maior Tempo na Fila</th>
                        <th className="pb-2.5 text-center">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {atendimentosData.fila_espera.length > 0 ? (
                        atendimentosData.fila_espera.map((item, idx) => {
                          const isTopDemanda = idx < 3 && item.total_na_fila > 0
                          const alertaTempoCritico = item.aluno_mais_tempo_dias >= 90
                          return (
                            <tr
                              key={idx}
                              className={cn(
                                "hover:bg-hoverCustom/40 transition-colors",
                                isTopDemanda && "bg-rose-500/[0.03] dark:bg-rose-950/10"
                              )}
                            >
                              {/* Especialidade com badge de ranking */}
                              <td className="py-3 font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold shrink-0",
                                    isTopDemanda
                                      ? "bg-rose-500/20 text-rose-500 border border-rose-500/30"
                                      : "bg-secondary text-muted-foreground border border-border"
                                  )}>
                                    {idx + 1}
                                  </span>
                                  <span className={cn(isTopDemanda && "font-bold text-rose-600 dark:text-rose-400")}>
                                    {item.especialidade}
                                  </span>
                                </div>
                              </td>

                              {/* Alunos na Fila */}
                              <td className="py-3 text-center">
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-xs font-extrabold border",
                                  item.total_na_fila >= 10
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                    : item.total_na_fila >= 5
                                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                    : "bg-secondary text-foreground border-border"
                                )}>
                                  {item.total_na_fila} aluno{item.total_na_fila !== 1 ? 's' : ''}
                                </span>
                              </td>

                              {/* Prioridade Judicial */}
                              <td className="py-3 text-center">
                                {item.prioridade_judicial > 0 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold text-[11px]">
                                    {item.prioridade_judicial}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">0</span>
                                )}
                              </td>

                              {/* Prioridade Prioritário */}
                              <td className="py-3 text-center">
                                {item.prioridade_prioritario > 0 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[11px]">
                                    {item.prioridade_prioritario}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">0</span>
                                )}
                              </td>

                              {/* Tempo Médio */}
                              <td className="py-3 text-center font-semibold text-foreground">
                                <div className="flex items-center justify-center gap-1">
                                  <Timer className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>{item.tempo_medio_espera_dias} dias</span>
                                </div>
                              </td>

                              {/* Maior Tempo na Fila */}
                              <td className="py-3 text-center">
                                <span className={cn(
                                  "text-xs font-semibold",
                                  alertaTempoCritico ? "text-rose-500 font-bold" : "text-muted-foreground"
                                )}>
                                  {item.aluno_mais_tempo_dias} dias
                                </span>
                              </td>

                              {/* Situação */}
                              <td className="py-3 text-center">
                                {isTopDemanda ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    Mais Necessitada
                                  </span>
                                ) : item.total_na_fila > 0 ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
                                    Em Espera
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    Sem Fila
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                            Nenhum aluno em fila de espera para as especialidades no momento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal de Detalhes da Investigação Diagnóstica */}
      <ModalDetalhesInvestigacaoEmaee
        open={isModalInvestigacaoOpen}
        onOpenChange={setIsModalInvestigacaoOpen}
        casos={data?.casos_investigacao || []}
        anoLetivo={anoLetivo}
      />
    </div>
  )
}
