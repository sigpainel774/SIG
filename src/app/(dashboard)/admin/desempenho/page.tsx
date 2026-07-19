'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { toast } from 'sonner'

// Auxiliares para formatação de valores e cores
const getRatingColor = (rating: string) => {
  switch (rating) {
    case 'good': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'needs-improvement': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'poor': return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}

const getMetricIcon = (name: string) => {
  switch (name) {
    case 'ROUTE_CHANGE_MS': return <TrendingUp className="w-4 h-4 text-violet-400" />
    case 'LCP': return <Layers className="w-4 h-4 text-sky-400" />
    case 'FID': return <Clock className="w-4 h-4 text-emerald-400" />
    case 'TTFB': return <Wifi className="w-4 h-4 text-amber-400" />
    default: return <Gauge className="w-4 h-4 text-gray-400" />
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
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  
  // Período de análise em dias (1, 7, 30)
  const [period, setPeriod] = useState<number>(7)

  // Estatísticas agregadas da RPC
  const [dashboardStats, setDashboardStats] = useState<{
    score: number
    total_samples: number
    p95: number
    p99: number
    cpu_stats: { cpu: string; avg: number; count: number }[]
    ram_stats: { ram: string; avg: number; count: number }[]
    network_stats: { type: string; avg: number; count: number }[]
    route_metrics: { pathname: string; avg_value: number; sample_count: number }[]
  }>({
    score: 100,
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

  // Memoizar e encapsular loadData
  const loadData = useCallback(async () => {
    if (isMounted.current) setLoading(true)
    try {
      // 1. Carregar estatísticas agregadas via RPC do Supabase
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_performance_dashboard_stats',
        { period_days: period }
      )
      if (statsError) throw statsError
      
      if (statsData && isMounted.current) {
        // Garantindo que arrays nulos venham como vazios
        const parsedData = (typeof statsData === 'string' ? JSON.parse(statsData) : statsData) as any
        setDashboardStats({
          score: Number(parsedData.score ?? 100),
          total_samples: Number(parsedData.total_samples ?? 0),
          p95: Number(parsedData.p95 ?? 0),
          p99: Number(parsedData.p99 ?? 0),
          cpu_stats: parsedData.cpu_stats ?? [],
          ram_stats: parsedData.ram_stats ?? [],
          network_stats: parsedData.network_stats ?? [],
          route_metrics: parsedData.route_metrics ?? []
        })
      }

      // 2. Carregar histórico de logs recentes com paginação e seleção explícita de colunas
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

  const handleCleanup = async () => {
    const confirm = window.confirm('Deseja apagar os registros de performance anteriores a 30 dias?')
    if (!confirm) return

    if (isMounted.current) setLoading(true)
    try {
      const limitDate = new Date()
      limitDate.setDate(limitDate.getDate() - 30)

      const { error } = await supabase
        .from('performance_metrics')
        .delete()
        .lt('created_at', limitDate.toISOString())

      if (error) throw error

      toast.success('Métricas antigas limpas com sucesso!')
      loadData()
    } catch (err: any) {
      console.error('Erro ao limpar métricas antigas:', err)
      toast.error('Erro ao limpar registros: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setLoading(false)
    }
  }

  const formatMetricValue = (name: string, value: number) => {
    if (name === 'CLS') return value.toFixed(3)
    if (value >= 1000 && name !== 'ROUTE_CHANGE_MS') return `${(value / 1000).toFixed(2)}s`
    return `${Math.round(value)}ms`
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Desempenho Global"
        description="Diagnóstico e monitoramento de velocidade e gargalos de processamento."
        icon={Gauge}
        iconVariant="primary"
        backHref="/admin"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Período */}
            <div className="flex bg-[#121214] border border-[#27272a] rounded-lg p-1">
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
                      ? 'bg-violet-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <Button 
              variant="outline"
              onClick={() => loadData()}
              disabled={loading}
              className="bg-[#121214] border-[#27272a] text-white hover:bg-[#202024] h-10"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button 
              variant="outline"
              onClick={handleCleanup}
              disabled={loading}
              className="bg-[#2a0808] border-[#ef4444]/30 text-[#f87171] hover:bg-[#450a0a] h-10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Antigos
            </Button>
          </div>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#121214] border-[#232326] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-semibold">Navegação P95</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {dashboardStats.p95 > 0 ? formatMetricValue('ROUTE_CHANGE_MS', dashboardStats.p95) : 'Sem dados'}
              {dashboardStats.p95 > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded ${dashboardStats.p95 < 600 ? 'bg-emerald-500/10 text-emerald-400' : dashboardStats.p95 < 1500 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {dashboardStats.p95 < 600 ? 'Bom' : dashboardStats.p95 < 1500 ? 'Regular' : 'Ruim'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">95% das transições são mais rápidas que isso.</p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="bg-[#121214] border-[#232326] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-semibold">Navegação P99</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {dashboardStats.p99 > 0 ? formatMetricValue('ROUTE_CHANGE_MS', dashboardStats.p99) : 'Sem dados'}
              {dashboardStats.p99 > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded ${dashboardStats.p99 < 1500 ? 'bg-emerald-500/10 text-emerald-400' : dashboardStats.p99 < 3000 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {dashboardStats.p99 < 1500 ? 'Regular' : dashboardStats.p99 < 3000 ? 'Alerta' : 'Crítico'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">99% das transições são mais rápidas que isso.</p>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="bg-[#121214] border-[#232326] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-semibold">Score Geral de UX</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {dashboardStats.score}%
              <span className={`text-xs px-2 py-0.5 rounded ${dashboardStats.score >= 85 ? 'bg-emerald-500/10 text-emerald-400' : dashboardStats.score >= 70 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {dashboardStats.score >= 85 ? 'Excelente' : dashboardStats.score >= 70 ? 'Regular' : 'Ruim'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Percentual de amostras qualificadas como "Bons".</p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="bg-[#121214] border-[#232326] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-semibold">Total de Medições</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {dashboardStats.total_samples.toLocaleString()}
              <span className="text-xs bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded">
                Amostras
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Capturadas no período selecionado.</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Ranking de Gargalos por Rota */}
        <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-white text-lg">Tempo de Carregamento Médio por Rota</h3>
          </div>
          <p className="text-xs text-slate-400">Telas que demoram mais para renderizar no cliente (ordenadas por latência no período).</p>
          
          <div className="rounded-xl border border-[#232326] bg-[#17171a] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#1e1e24] border-b border-[#232326]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-slate-300 font-semibold">Rota (Tela)</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-right">Tempo Médio</TableHead>
                  <TableHead className="text-slate-300 font-semibold text-right">Amostras</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardStats.route_metrics.map((r, i) => (
                  <TableRow key={i} className="border-b border-[#232326]/50 hover:bg-[#202024]/40 transition-colors">
                    <TableCell className="font-mono text-xs text-slate-300">
                      {r.pathname}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={r.avg_value > 1000 ? 'text-rose-400' : r.avg_value > 300 ? 'text-amber-400' : 'text-emerald-400'}>
                        {formatMetricValue('ROUTE_CHANGE_MS', r.avg_value)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-400 text-xs">
                      {r.sample_count}
                    </TableCell>
                  </TableRow>
                ))}

                {dashboardStats.route_metrics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      Nenhum registro de rota encontrado neste período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right: Análise por Fatores (Hardware e Conexão) */}
        <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-white text-lg">Gargalos Externos (Hardware e Rede)</h3>
          </div>
          <p className="text-xs text-slate-400">Verificação do impacto da rede, memória RAM e núcleos de CPU no carregamento no período.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Bloco Conexão */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-sky-400" /> Por Rede
              </h4>
              <div className="rounded-xl border border-[#232326] bg-[#17171a] p-3 space-y-2 text-xs">
                {dashboardStats.network_stats.map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-[#232326]/30 last:border-0">
                    <span className="text-slate-400 uppercase font-semibold">{c.type}</span>
                    <span className={`font-bold ${c.avg > 1000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {c.avg}ms <span className="text-[10px] text-slate-500 font-normal">({c.count}x)</span>
                    </span>
                  </div>
                ))}
                {dashboardStats.network_stats.length === 0 && (
                  <p className="text-slate-500 text-center py-4">Sem dados.</p>
                )}
              </div>
            </div>

            {/* Bloco Memória */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-emerald-400" /> Por RAM
              </h4>
              <div className="rounded-xl border border-[#232326] bg-[#17171a] p-3 space-y-2 text-xs">
                {dashboardStats.ram_stats.map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-[#232326]/30 last:border-0">
                    <span className="text-slate-400">{m.ram}</span>
                    <span className={`font-bold ${m.avg > 1000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {m.avg}ms <span className="text-[10px] text-slate-500 font-normal">({m.count}x)</span>
                    </span>
                  </div>
                ))}
                {dashboardStats.ram_stats.length === 0 && (
                  <p className="text-slate-500 text-center py-4">Sem dados.</p>
                )}
              </div>
            </div>

            {/* Bloco Cores/CPU */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-violet-400" /> Por Cores CPU
              </h4>
              <div className="rounded-xl border border-[#232326] bg-[#17171a] p-3 space-y-2 text-xs">
                {dashboardStats.cpu_stats.map((cpu, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-[#232326]/30 last:border-0">
                    <span className="text-slate-400">{cpu.cpu} Cores</span>
                    <span className={`font-bold ${cpu.avg > 1000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {cpu.avg}ms <span className="text-[10px] text-slate-500 font-normal">({cpu.count}x)</span>
                    </span>
                  </div>
                ))}
                {dashboardStats.cpu_stats.length === 0 && (
                  <p className="text-slate-500 text-center py-4">Sem dados.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#1c1917]/20 border border-[#ea580c]/20 p-3.5 rounded-xl flex gap-3 text-xs text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Dica de Diagnóstico:</strong>
              Se a latência geral de rota estiver abaixo de 300ms em conexões rápidas (Wi-Fi/4G) mas aumentar muito em 3G/2G, o gargalo é o tamanho dos payloads de dados e requisições HTTP redundantes.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Tabela de Logs Recentes Paginada */}
      <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-white text-lg">Histórico de Medições Recentes</h3>
        </div>
        <p className="text-xs text-slate-400">Auditoria das métricas capturadas em tempo real nos navegadores para o período selecionado.</p>

        <div className="rounded-xl border border-[#232326] bg-[#17171a] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#1e1e24] border-b border-[#232326]">
              <TableRow className="border-none hover:bg-transparent">
                <TableHead className="text-slate-300 font-semibold">Data/Hora</TableHead>
                <TableHead className="text-slate-300 font-semibold">Usuário</TableHead>
                <TableHead className="text-slate-300 font-semibold">Rota</TableHead>
                <TableHead className="text-slate-300 font-semibold">Métrica</TableHead>
                <TableHead className="text-slate-300 font-semibold text-right">Valor</TableHead>
                <TableHead className="text-slate-300 font-semibold text-center">Status</TableHead>
                <TableHead className="text-slate-300 font-semibold">Dispositivo / Conexão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log) => (
                <TableRow key={log.id} className="border-b border-[#232326]/50 hover:bg-[#202024]/40 transition-colors">
                  <TableCell className="text-slate-400 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-slate-300 text-xs">
                    {log.funcionarios ? (
                      <div className="flex flex-col">
                        <span className="font-semibold">{log.funcionarios.nome}</span>
                        <span className="text-[10px] text-slate-500">{log.funcionarios.email}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-semibold">Não logado</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-400 max-w-[150px] truncate" title={log.pathname}>
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
                    <Badge variant="outline" className={`text-[10px] py-0.5 px-2 font-bold tracking-wide uppercase ${getRatingColor(log.rating)}`}>
                      {log.rating === 'good' ? 'Bom' : log.rating === 'needs-improvement' ? 'Regular' : 'Ruim'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400 text-[10px] whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>Rede: <strong className="text-slate-300 uppercase">{log.connection_type ?? 'N/D'}</strong></span>
                      <span>RAM: <strong className="text-slate-300">{log.device_memory ? `${log.device_memory} GB` : 'N/D'}</strong> | Cores: <strong className="text-slate-300">{log.hardware_concurrency ?? 'N/D'}</strong></span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {recentLogs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    Nenhum log de desempenho encontrado neste período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalLogsCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#232326]">
            <p className="text-xs text-slate-400">
              Mostrando <strong className="text-slate-300">{Math.min(totalLogsCount, (currentPage - 1) * pageSize + 1)}</strong> a{' '}
              <strong className="text-slate-300">{Math.min(currentPage * pageSize, totalLogsCount)}</strong> de{' '}
              <strong className="text-slate-300">{totalLogsCount}</strong> logs
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="bg-[#121214] border-[#27272a] text-white hover:bg-[#202024] disabled:opacity-50"
              >
                Anterior
              </Button>
              <span className="text-xs text-slate-300 font-medium">
                Página {currentPage} de {Math.max(1, Math.ceil(totalLogsCount / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= Math.ceil(totalLogsCount / pageSize) || loading}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="bg-[#121214] border-[#27272a] text-white hover:bg-[#202024] disabled:opacity-50"
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
