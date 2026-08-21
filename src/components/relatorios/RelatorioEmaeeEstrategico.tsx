'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Heart,
  Users,
  Activity,
  Printer,
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
  HelpCircle
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
import { PrintRelatorioEmaeeEstrategico, RelatorioEmaeePrintPayload } from '@/components/print/print-relatorio-emaee-estrategico'

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
  '#10b981', // Verde esmeralda (Dislexia)
  '#06b6d4', // Ciano (Disgrafia)
  '#ec4899', // Rosa (TOD)
  '#f97316', // Laranja (Ansiedade)
  '#a855f7', // Violeta (Superdotação)
  '#64748b', // Cinza azulado (Deficiências)
  '#14b8a6', // Teal
]

const PALETTE_ESPECIALIDADES = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'
]

export default function RelatorioEmaeeEstrategico({ selectedEscola }: RelatorioEmaeeProps) {
  const [anoLetivo, setAnoLetivo] = useState<number>(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'epidemiologia' | 'especialidades' | 'origem' | 'logistica'>('epidemiologia')
  const [data, setData] = useState<RelatorioEmaeePrintPayload | null>(null)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

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

  useEffect(() => {
    isMountedRef.current = true
    fetchRelatorio()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchRelatorio])

  // Preparação dos dados para os Gráficos de Epidemiologia
  const epidemiologiaChartData = React.useMemo(() => {
    if (!data?.epidemiologia) return []
    const ep = data.epidemiologia
    const base = ep.total_base || 1

    return [
      { name: 'TEA', label: 'Transtorno do Espectro Autista', count: ep.tea, pct: Number(((ep.tea / base) * 100).toFixed(1)) },
      { name: 'TDAH', label: 'Déficit de Atenção / Hiperatividade', count: ep.tdah, pct: Number(((ep.tdah / base) * 100).toFixed(1)) },
      { name: 'Def. Intelectual', label: 'Deficiência Intelectual', count: ep.def_intelectual, pct: Number(((ep.def_intelectual / base) * 100).toFixed(1)) },
      { name: 'Dislexia', label: 'Dislexia', count: ep.dislexia, pct: Number(((ep.dislexia / base) * 100).toFixed(1)) },
      { name: 'Disgrafia', label: 'Disgrafia / Disortografia', count: ep.disgrafia, pct: Number(((ep.disgrafia / base) * 100).toFixed(1)) },
      { name: 'TOD', label: 'Transtorno Opositivo Desafiador', count: ep.tod, pct: Number(((ep.tod / base) * 100).toFixed(1)) },
      { name: 'Ansiedade', label: 'Transtornos de Ansiedade', count: ep.ansiedade, pct: Number(((ep.ansiedade / base) * 100).toFixed(1)) },
      { name: 'Altas Habilidades', label: 'Superdotação / Altas Habilidades', count: ep.superdotacao, pct: Number(((ep.superdotacao / base) * 100).toFixed(1)) },
      { name: 'Def. Visual', label: 'Baixa Visão / Cegueira', count: ep.def_visual, pct: Number(((ep.def_visual / base) * 100).toFixed(1)) },
      { name: 'Def. Auditiva', label: 'Surdez / Auditiva', count: ep.def_auditiva, pct: Number(((ep.def_auditiva / base) * 100).toFixed(1)) },
      { name: 'Def. Física', label: 'Deficiência Física / Motora', count: ep.def_fisica, pct: Number(((ep.def_fisica / base) * 100).toFixed(1)) },
      { name: 'Def. Múltipla', label: 'Deficiência Múltipla', count: ep.def_multipla, pct: Number(((ep.def_multipla / base) * 100).toFixed(1)) },
      { name: 'Outros', label: 'Outros Transtornos / Investigação', count: ep.outros, pct: Number(((ep.outros / base) * 100).toFixed(1)) },
    ].filter((item) => item.count > 0)
  }, [data])

  // Gráfico de Especialidades
  const especialidadesChartData = React.useMemo(() => {
    if (!data?.especialidades) return []
    return data.especialidades.map((esp) => ({
      name: esp.especialidade,
      atendimentos: esp.total_atendimentos,
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
                <option value={2026} className="bg-popover text-popover-foreground">Ano Letivo 2026</option>
                <option value={2025} className="bg-popover text-popover-foreground">Ano Letivo 2025</option>
                <option value={2024} className="bg-popover text-popover-foreground">Ano Letivo 2024</option>
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

            {/* Botão Imprimir A4 */}
            <Button
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl gap-2 h-9 shadow"
            >
              <Printer className="w-4 h-4" />
              Visualizar & Imprimir (A4)
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

              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={epidemiologiaChartData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 70, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" stroke="#71717a" fontSize={11} />
                    <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={11} width={80} />
                    <Tooltip
                      formatter={(value: any, name: any, item: any) => [`${value} casos (${item.payload.pct}%)`, 'Total']}
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                      {epidemiologiaChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PALETTE_EPIDEMIOLOGIA[index % PALETTE_EPIDEMIOLOGIA.length]} />
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
                <h3 className="text-base font-bold text-foreground border-b border-border pb-3 mb-3">
                  Quadro Sintético Censo AEE
                </h3>
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {epidemiologiaChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-secondary/40 border border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PALETTE_EPIDEMIOLOGIA[idx % PALETTE_EPIDEMIOLOGIA.length] }}
                        />
                        <span className="text-foreground font-medium truncate max-w-[150px]">{item.label}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-foreground">{item.count}</span>
                        <span className="text-muted-foreground text-[10px] ml-1.5">({item.pct}%)</span>
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
                Sessões Clínicas Realizadas ({anoLetivo})
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
                      <Bar dataKey="atendimentos" name="Sessões" fill="#6366f1" radius={[6, 6, 0, 0]}>
                        {especialidadesChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PALETTE_ESPECIALIDADES[index % PALETTE_ESPECIALIDADES.length]} />
                        ))}
                      </Bar>
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
                      <th className="pb-2 text-center">Sessões</th>
                      <th className="pb-2 text-center">Profissionais</th>
                      <th className="pb-2 text-center">Pacientes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {data.especialidades.map((esp, idx) => (
                      <tr key={idx} className="hover:bg-hoverCustom/40">
                        <td className="py-2.5 font-medium text-foreground">{esp.especialidade}</td>
                        <td className="py-2.5 text-center font-bold text-primary">{esp.total_atendimentos}</td>
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

      {/* Modal de Impressão A4 */}
      {isPrintModalOpen && data && (
        <PrintRelatorioEmaeeEstrategico
          data={data}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  )
}
