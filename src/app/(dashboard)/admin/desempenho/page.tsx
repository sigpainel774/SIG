'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { 
  Gauge, 
  RefreshCw, 
  Trash2, 
  TrendingUp, 
  Wifi, 
  Cpu, 
  FileText, 
  Layers, 
  Monitor, 
  AlertCircle,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StandardTable } from '@/components/ui/table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from 'sonner'

// Auxiliares para formatação de valores e cores com suporte estrito a tema claro/escuro
const getRatingBadge = (rating: string) => {
  switch (rating) {
    case 'good':
      return {
        label: 'Bom',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
      }
    case 'needs-improvement':
      return {
        label: 'Regular',
        className: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
      }
    case 'poor':
      return {
        label: 'Ruim',
        className: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
      }
    default:
      return {
        label: rating || 'N/D',
        className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
      }
  }
}

const getMetricIcon = (name: string) => {
  switch (name) {
    case 'ROUTE_CHANGE_MS': return <TrendingUp className="w-4 h-4 text-primary" />
    case 'LCP': return <Layers className="w-4 h-4 text-primary" />
    case 'FID': return <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    case 'TTFB': return <Wifi className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    default: return <Gauge className="w-4 h-4 text-slate-500 dark:text-slate-400" />
  }
}

const getMetricLabel = (name: string) => {
  switch (name) {
    case 'ROUTE_CHANGE_MS': return 'Navegação entre Telas'
    case 'TTFB': return 'Tempo até o 1º Byte (TTFB)'
    case 'FCP': return 'Primeira Pintura (FCP)'
    case 'LCP': return 'Maior Pintura (LCP)'
    case 'FID': return 'Atraso de Entrada (FID)'
    case 'INP': return 'Interação para Próxima Pintura'
    case 'CLS': return 'Deslocamento de Layout (CLS)'
    default: return name
  }
}

export default function DesempenhoPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(false)
  const [clearing, setClearing] = useState(false)
  
  // Período de análise em dias (1, 7, 30)
  const [period, setPeriod] = useState<number>(7)

  // Estatísticas agregadas da RPC
  const [dashboardStats, setDashboardStats] = useState<{
    score: number | null
    total_samples: number
    p95: number
    p99: number
    cpu_stats: { cpu: string; avg: number; count: number }[]
    ram_stats: { ram: string; avg: number; count: number }[]
    network_stats: { type: string; avg: number; count: number }[]
    route_metrics: { pathname: string; avg_value: number; p50?: number; p75?: number; p95?: number; sample_count: number }[]
  }>({
    score: null,
    total_samples: 0,
    p95: 0,
    p99: 0,
    cpu_stats: [],
    ram_stats: [],
    network_stats: [],
    route_metrics: []
  })

  // Estado dos logs recentes paginados
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize] = useState<number>(20)
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Carregar dados com tratamento defensivo e cancelamento
  const loadData = useCallback(async () => {
    if (isMounted.current) setLoading(true)
    try {
      // 1. Carregar estatísticas agregadas via RPC do Supabase
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_performance_dashboard_stats',
        { period_days: period }
      )
      
      if (!statsError && statsData && isMounted.current) {
        const parsedData = (typeof statsData === 'string' ? JSON.parse(statsData) : statsData) as any
        setDashboardStats({
          score: parsedData.score !== null && parsedData.score !== undefined ? Number(parsedData.score) : null,
          total_samples: Number(parsedData.total_samples ?? 0),
          p95: Number(parsedData.p95 ?? 0),
          p99: Number(parsedData.p99 ?? 0),
          cpu_stats: parsedData.cpu_stats ?? [],
          ram_stats: parsedData.ram_stats ?? [],
          network_stats: parsedData.network_stats ?? [],
          route_metrics: parsedData.route_metrics ?? []
        })
      }

      // 2. Carregar histórico de logs recentes com seleção explícita de colunas
      const limitDate = new Date()
      limitDate.setDate(limitDate.getDate() - period)

      const fromRange = (currentPage - 1) * pageSize
      const toRange = currentPage * pageSize - 1

      const { data: logsData, count: totalCount, error: logsError } = await supabase
        .from('performance_metrics')
        .select('id, created_at, pathname, metric_name, metric_value, rating, connection_type, device_memory, hardware_concurrency, funcionarios(nome, email)', { count: 'exact' })
        .gte('created_at', limitDate.toISOString())
        .order('created_at', { ascending: false })
        .range(fromRange, toRange)

      if (logsError) throw logsError
      if (isMounted.current) {
        setRecentLogs(logsData || [])
        setTotalLogsCount(totalCount || 0)
      }
    } catch (err: any) {
      console.error('Erro ao carregar métricas de desempenho:', err)
      toast.error('Erro ao carregar estatísticas: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setRecentLogs([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [period, currentPage, pageSize, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Limpeza de métricas executada no SERVIDOR (Route Handler)
  const handleCleanup = async () => {
    const confirm = window.confirm('Deseja expurgar do servidor os registros de performance anteriores a 30 dias?')
    if (!confirm) return

    if (isMounted.current) setClearing(true)
    try {
      const res = await fetch('/api/admin/desempenho/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao executar limpeza')

      toast.success(data.message || 'Expurgo de métricas antigas concluído com sucesso!')
      loadData()
    } catch (err: any) {
      console.error('Erro ao executar expurgo no servidor:', err)
      toast.error('Erro na limpeza: ' + (err.message || 'Erro de rede'))
    } finally {
      if (isMounted.current) setClearing(false)
    }
  }

  const formatMetricValue = (name: string, value: number) => {
    if (name === 'CLS') return value.toFixed(3)
    if (value >= 1000 && name !== 'ROUTE_CHANGE_MS') return `${(value / 1000).toFixed(2)}s`
    return `${Math.round(value)}ms`
  }

  // Avaliação da precisão estatística da amostra
  const isSampleReliable = dashboardStats.total_samples >= 30

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Desempenho Global"
        description="Diagnóstico e telemetria de velocidade com filtragem anti-ruído de abas em segundo plano e dados calibrados."
        icon={Gauge}
        iconVariant="primary"
        backHref="/admin"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Período */}
            <div className="flex bg-muted border border-border rounded-lg p-1">
              {[
                { label: '24 Horas', value: 1 },
                { label: '7 Dias', value: 7 },
                { label: '30 Dias', value: 30 }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setPeriod(opt.value)
                    setCurrentPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    period === opt.value
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Button 
              variant="outline"
              onClick={() => loadData()}
              disabled={loading || clearing}
              className="bg-card border-border text-foreground hover:bg-muted h-10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button 
              variant="outline"
              onClick={handleCleanup}
              disabled={loading || clearing}
              className="bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 h-10"
            >
              <Trash2 className={`w-4 h-4 mr-2 ${clearing ? 'animate-spin' : ''}`} />
              {clearing ? 'Expurgando...' : 'Limpar Antigos'}
            </Button>
          </div>
        }
      />

      {/* Banner de Garantia de Qualidade e Acurácia */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 font-semibold shrink-0" />
          <div>
            <strong className="text-foreground font-semibold block">Proteção Anti-Contaminação Ativa:</strong>
            Filtro de acurácia exclui congelamento em segundo plano, cliques espúrios (&lt;15ms) e anomalias (&gt;20s).
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge 
            variant="outline"
            className={
              isSampleReliable
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 gap-1.5'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 gap-1.5'
            }
          >
            {isSampleReliable ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Amostragem Alta ({dashboardStats.total_samples} coletas)
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                Amostragem Baixa ({dashboardStats.total_samples}/30)
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 - P95 */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-semibold">Navegação P95</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {dashboardStats.p95 > 0 ? formatMetricValue('ROUTE_CHANGE_MS', dashboardStats.p95) : 'Sem dados'}
              {dashboardStats.p95 > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  dashboardStats.p95 < 600 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' 
                    : dashboardStats.p95 < 1500 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                }`}>
                  {dashboardStats.p95 < 600 ? 'Bom' : dashboardStats.p95 < 1500 ? 'Regular' : 'Ruim'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">95% das transições válidas ocorrem abaixo desta marca.</p>
          </CardContent>
        </Card>

        {/* KPI 2 - P99 */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-semibold">Navegação P99</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {dashboardStats.p99 > 0 ? formatMetricValue('ROUTE_CHANGE_MS', dashboardStats.p99) : 'Sem dados'}
              {dashboardStats.p99 > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  dashboardStats.p99 < 1500 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' 
                    : dashboardStats.p99 < 3000 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                }`}>
                  {dashboardStats.p99 < 1500 ? 'Regular' : dashboardStats.p99 < 3000 ? 'Alerta' : 'Crítico'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Pior cenário controlado para 99% dos acessos reais.</p>
          </CardContent>
        </Card>

        {/* KPI 3 - Score */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-semibold">Índice de Fluidez (Score)</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {dashboardStats.score !== null ? `${dashboardStats.score}%` : 'Sem dados'}
              {dashboardStats.score !== null ? (
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  dashboardStats.score >= 85 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' 
                    : dashboardStats.score >= 70 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                }`}>
                  {dashboardStats.score >= 85 ? 'Excelente' : dashboardStats.score >= 70 ? 'Regular' : 'Ruim'}
                </span>
              ) : (
                <span className="text-xs bg-muted text-foreground border border-border px-2 py-0.5 rounded">
                  Aguardando
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {!isSampleReliable ? 'Amostragem em formação (< 30)' : 'Proporção de transições instantâneas (<300ms).'}
            </p>
          </CardContent>
        </Card>

        {/* KPI 4 - Amostras */}
        <Card className="bg-card border-border text-foreground">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground text-xs uppercase font-semibold">Amostras Verificadas</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {dashboardStats.total_samples.toLocaleString()}
              <span className="text-xs bg-muted text-foreground border border-border px-2 py-0.5 rounded font-normal">
                Transições
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Coletadas no período com filtro de consistência.</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ranking de Gargalos por Rota com Percentis */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-lg">Tempo de Renderização por Rota</h3>
          </div>
          <p className="text-xs text-muted-foreground">Telas ordenadas por latência crítica no cliente com percentis P50, P75 e P95.</p>
          
          <StandardTable
            data={dashboardStats.route_metrics}
            columns={[
              {
                header: 'Rota (Tela)',
                className: 'font-mono text-xs text-foreground max-w-[180px] truncate',
                accessor: (r) => r.pathname
              },
              {
                header: 'P50',
                headClassName: 'text-right',
                className: 'text-right font-mono text-xs text-muted-foreground',
                accessor: (r) => `${r.p50 ?? Math.round(r.avg_value)}ms`
              },
              {
                header: 'P95',
                headClassName: 'text-right',
                className: 'text-right font-mono text-xs font-bold',
                accessor: (r) => {
                  const val = r.p95 ?? r.avg_value
                  return (
                    <span className={val > 1000 ? 'text-rose-700 dark:text-rose-400 font-semibold' : val > 400 ? 'text-amber-700 dark:text-amber-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400 font-semibold'}>
                      {`${Math.round(val)}ms`}
                    </span>
                  )
                }
              },
              {
                header: 'Média',
                headClassName: 'text-right',
                className: 'text-right font-mono text-xs text-muted-foreground',
                accessor: (r) => formatMetricValue('ROUTE_CHANGE_MS', r.avg_value)
              },
              {
                header: 'Amostras',
                headClassName: 'text-right',
                className: 'text-right text-muted-foreground text-xs',
                accessor: (r) => r.sample_count
              }
            ]}
            keyExtractor={(r, i) => `${r.pathname}-${i}`}
            loading={loading}
            emptyMessage="Nenhum registro de rota encontrado neste período."
          />
        </div>

        {/* Right: Análise por Fatores (Hardware e Conexão) */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-lg">Gargalos Externos (Hardware e Rede)</h3>
          </div>
          <p className="text-xs text-muted-foreground">Avaliação de impacto do perfil do cliente (rede móvel, memória RAM e núcleos de CPU).</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Bloco Conexão */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-primary" /> Por Rede
              </h4>
              <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2 text-xs">
                {dashboardStats.network_stats.map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground uppercase font-semibold">{c.type}</span>
                    <span className={`font-bold ${c.avg > 1000 ? 'text-rose-700 dark:text-rose-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400 font-semibold'}`}>
                      {c.avg}ms <span className="text-[10px] text-muted-foreground font-normal">({c.count}x)</span>
                    </span>
                  </div>
                ))}
                {dashboardStats.network_stats.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Sem dados.</p>
                )}
              </div>
            </div>

            {/* Bloco Memória */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Por RAM
              </h4>
              <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2 text-xs">
                {dashboardStats.ram_stats.map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{m.ram}</span>
                    <span className={`font-bold ${m.avg > 1000 ? 'text-rose-700 dark:text-rose-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400 font-semibold'}`}>
                      {m.avg}ms <span className="text-[10px] text-muted-foreground font-normal">({m.count}x)</span>
                    </span>
                  </div>
                ))}
                {dashboardStats.ram_stats.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Sem dados.</p>
                )}
              </div>
            </div>

            {/* Bloco Cores/CPU */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary" /> Por CPU
              </h4>
              <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-2 text-xs">
                {dashboardStats.cpu_stats.map((cpu, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{cpu.cpu} Cores</span>
                    <span className={`font-bold ${cpu.avg > 1000 ? 'text-rose-700 dark:text-rose-400 font-semibold' : 'text-emerald-700 dark:text-emerald-400 font-semibold'}`}>
                      {cpu.avg}ms <span className="text-[10px] text-muted-foreground font-normal">({cpu.count}x)</span>
                    </span>
                  </div>
                ))}
                {dashboardStats.cpu_stats.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">Sem dados.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-3.5 rounded-xl flex gap-3 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 font-semibold shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground block mb-0.5">Critério de Diagnóstico:</strong>
              Se a latência P95 estiver baixa em Wi-Fi/4G mas alta em 3G/2G, o gargalo é o tamanho dos payloads de dados e rotas com requisições redundantes.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Tabela de Logs Recentes Paginada */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-lg">Histórico de Medições Recentes</h3>
        </div>
        <p className="text-xs text-muted-foreground">Auditoria das métricas capturadas em tempo real nos navegadores para o período selecionado.</p>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/60 border-b border-border">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-foreground font-semibold">Data/Hora</TableHead>
                <TableHead className="text-foreground font-semibold">Usuário</TableHead>
                <TableHead className="text-foreground font-semibold">Rota</TableHead>
                <TableHead className="text-foreground font-semibold">Métrica</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Valor</TableHead>
                <TableHead className="text-foreground font-semibold text-center">Status</TableHead>
                <TableHead className="text-foreground font-semibold">Dispositivo / Conexão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log) => {
                const badgeInfo = getRatingBadge(log.rating)
                return (
                  <TableRow key={log.id} className="border-b border-border/60 hover:bg-muted/50 transition-colors">
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-foreground text-xs">
                      {log.funcionarios ? (
                        <div className="flex flex-col">
                          <span className="font-semibold">{log.funcionarios.nome}</span>
                          <span className="text-[10px] text-muted-foreground">{log.funcionarios.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-semibold">Não logado</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-foreground max-w-[180px] truncate" title={log.pathname}>
                      {log.pathname}
                    </TableCell>
                    <TableCell className="text-xs font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {getMetricIcon(log.metric_name)}
                        <span>{getMetricLabel(log.metric_name)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs">
                      {formatMetricValue(log.metric_name, Number(log.metric_value))}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`text-[10px] py-0.5 px-2 font-bold tracking-wide uppercase ${badgeInfo.className}`}>
                        {badgeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[10px] whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>Rede: <strong className="text-foreground uppercase">{log.connection_type ?? 'N/D'}</strong></span>
                        <span>RAM: <strong className="text-foreground">{log.device_memory ? `${log.device_memory} GB` : 'N/D'}</strong> | Cores: <strong className="text-foreground">{log.hardware_concurrency ?? 'N/D'}</strong></span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {recentLogs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum log de desempenho encontrado neste período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalLogsCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Mostrando <strong className="text-foreground">{Math.min(totalLogsCount, (currentPage - 1) * pageSize + 1)}</strong> a{' '}
              <strong className="text-foreground">{Math.min(currentPage * pageSize, totalLogsCount)}</strong> de{' '}
              <strong className="text-foreground">{totalLogsCount}</strong> logs
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="bg-card border-border text-foreground hover:bg-muted disabled:opacity-50"
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground font-medium">
                Página {currentPage} de {Math.max(1, Math.ceil(totalLogsCount / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(totalLogsCount / pageSize) || loading}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="bg-card border-border text-foreground hover:bg-muted disabled:opacity-50"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
