'use client'

import { useState, useEffect } from 'react'
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
  HelpCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function DesempenhoPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [metricsSummary, setMetricsSummary] = useState<any[]>([])
  const [routeMetrics, setRouteMetrics] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [rawMetricsForAnalysis, setRawMetricsForAnalysis] = useState<any[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Carregar resumo das métricas (de views agregadas)
      const { data: summaryData, error: summaryError } = await supabase
        .from('performance_metrics_summary')
        .select('*')
      if (summaryError) throw summaryError
      setMetricsSummary(summaryData || [])

      // 2. Carregar carregamento médio por rota
      const { data: routeData, error: routeError } = await supabase
        .from('performance_metrics_by_route')
        .select('*')
        .order('avg_value', { ascending: false })
      if (routeError) throw routeError
      setRouteMetrics(routeData || [])

      // 3. Carregar logs de medições mais recentes (últimas 100)
      const { data: logsData, error: logsError } = await supabase
        .from('performance_metrics')
        .select('*, funcionarios(nome, email)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (logsError) throw logsError
      setRecentLogs(logsData || [])

      // 4. Carregar as últimas 500 linhas para análise de hardware/conexão dinâmica no cliente
      const { data: rawData, error: rawError } = await supabase
        .from('performance_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (rawError) throw rawError
      setRawMetricsForAnalysis(rawData || [])
      
    } catch (err: any) {
      console.error('Erro ao buscar dados de desempenho:', err)
      toast.error('Erro ao atualizar painel de desempenho: ' + (err.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCleanup = async () => {
    if (!confirm('Deseja realmente limpar as métricas mais antigas que 30 dias?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase.rpc('cleanup_performance_metrics')
      if (error) throw error
      toast.success('Métricas antigas limpas com sucesso!')
      await loadData()
    } catch (err: any) {
      toast.error('Falha ao limpar histórico: ' + (err.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  // Estatísticas agregadas localmente a partir das últimas 500 medições
  const getConnectionStats = () => {
    const stats: Record<string, { total: number; sum: number; count: number }> = {}
    rawMetricsForAnalysis.forEach((m) => {
      if (m.metric_name !== 'ROUTE_CHANGE_MS') return
      const type = m.connection_type ?? 'Desconhecida'
      if (!stats[type]) stats[type] = { total: 0, sum: 0, count: 0 }
      stats[type].sum += Number(m.metric_value)
      stats[type].count += 1
    })

    return Object.entries(stats).map(([type, s]) => ({
      type,
      avg: Math.round(s.sum / s.count),
      count: s.count
    })).sort((a, b) => b.avg - a.avg)
  }

  const getMemoryStats = () => {
    const stats: Record<string, { sum: number; count: number }> = {}
    rawMetricsForAnalysis.forEach((m) => {
      if (m.metric_name !== 'ROUTE_CHANGE_MS') return
      const ram = m.device_memory ? `${m.device_memory} GB` : 'Desconhecida'
      if (!stats[ram]) stats[ram] = { sum: 0, count: 0 }
      stats[ram].sum += Number(m.metric_value)
      stats[ram].count += 1
    })

    return Object.entries(stats).map(([ram, s]) => ({
      ram,
      avg: Math.round(s.sum / s.count),
      count: s.count
    })).sort((a, b) => b.avg - a.avg)
  }

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

  const formatMetricValue = (name: string, value: number) => {
    if (name === 'CLS') return value.toFixed(3) // Cumulative Layout Shift não tem unidade
    if (value >= 1000 && name !== 'ROUTE_CHANGE_MS') return `${(value / 1000).toFixed(2)}s`
    return `${Math.round(value)}ms`
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

  // Resumo rápido dos KPIs principais
  const routeChangeVal = metricsSummary.find(m => m.metric_name === 'ROUTE_CHANGE_MS')?.avg_value ?? 0
  const lcpVal = metricsSummary.find(m => m.metric_name === 'LCP')?.avg_value ?? 0
  const ttfbVal = metricsSummary.find(m => m.metric_name === 'TTFB')?.avg_value ?? 0
  const totalSamples = metricsSummary.reduce((acc, curr) => acc + Number(curr.sample_count), 0)

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#232328]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gauge className="w-6 h-6 text-violet-500" /> Painel de Desempenho Global
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Diagnóstico e monitoramento de velocidade e gargalos de processamento.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="bg-[#121214] border-[#27272a] text-white hover:bg-[#202024]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button 
            variant="outline"
            onClick={handleCleanup}
            disabled={loading}
            className="bg-[#2a0808] border-[#ef4444]/30 text-[#f87171] hover:bg-[#450a0a]"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Antigos
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <Card className="bg-[#121214] border-[#232326] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-semibold">Carregamento de Telas (Médio)</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {routeChangeVal > 0 ? formatMetricValue('ROUTE_CHANGE_MS', routeChangeVal) : 'Sem dados'}
              {routeChangeVal > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded ${routeChangeVal < 300 ? 'bg-emerald-500/10 text-emerald-400' : routeChangeVal < 1000 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {routeChangeVal < 300 ? 'Rápido' : routeChangeVal < 1000 ? 'Médio' : 'Lento'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Transição SPA média entre abas e módulos.</p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card className="bg-[#121214] border-[#232326] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-semibold">Maior Pintura (LCP Médio)</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {lcpVal > 0 ? formatMetricValue('LCP', lcpVal) : 'Sem dados'}
              {lcpVal > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded ${lcpVal < 2500 ? 'bg-emerald-500/10 text-emerald-400' : lcpVal < 4000 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {lcpVal < 2500 ? 'Bom' : lcpVal < 4000 ? 'Regular' : 'Ruim'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Tempo para exibir o maior elemento visual.</p>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card className="bg-[#121214] border-[#232326] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-semibold">Latência do Banco (TTFB)</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {ttfbVal > 0 ? formatMetricValue('TTFB', ttfbVal) : 'Sem dados'}
              {ttfbVal > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded ${ttfbVal < 800 ? 'bg-emerald-500/10 text-emerald-400' : ttfbVal < 1800 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {ttfbVal < 800 ? 'Rápido' : ttfbVal < 1800 ? 'Médio' : 'Lento'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Tempo de resposta da API / Primeira Resposta.</p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card className="bg-[#121214] border-[#232326] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase font-semibold">Total de Medições</CardDescription>
            <CardTitle className="text-2xl font-bold flex items-baseline gap-2">
              {totalSamples > 0 ? totalSamples.toLocaleString() : '0'}
              <span className="text-xs bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded">
                Amostras
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Logs gerados nos navegadores dos usuários.</p>
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
          <p className="text-xs text-slate-400">Telas que demoram mais para renderizar no cliente (ordenadas da mais lenta para a mais rápida).</p>
          
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
                {routeMetrics.map((r, i) => (
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

                {routeMetrics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      Nenhum registro de rota encontrado.
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
          <p className="text-xs text-slate-400">Verificação do impacto da rede e da memória RAM no carregamento das páginas.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bloco Conexão */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-sky-400" /> Por Tipo de Rede
              </h4>
              <div className="rounded-xl border border-[#232326] bg-[#17171a] p-3 space-y-2 text-xs">
                {getConnectionStats().map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-[#232326]/30 last:border-0">
                    <span className="text-slate-400 uppercase font-semibold">{c.type}</span>
                    <span className={`font-bold ${c.avg > 1000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {c.avg}ms <span className="text-[10px] text-slate-500 font-normal">({c.count}x)</span>
                    </span>
                  </div>
                ))}
                {getConnectionStats().length === 0 && (
                  <p className="text-slate-500 text-center py-4">Sem amostras de rede.</p>
                )}
              </div>
            </div>

            {/* Bloco Memória */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-300 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-emerald-400" /> Por Memória RAM
              </h4>
              <div className="rounded-xl border border-[#232326] bg-[#17171a] p-3 space-y-2 text-xs">
                {getMemoryStats().map((m, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-[#232326]/30 last:border-0">
                    <span className="text-slate-400">{m.ram}</span>
                    <span className={`font-bold ${m.avg > 1000 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {m.avg}ms <span className="text-[10px] text-slate-500 font-normal">({m.count}x)</span>
                    </span>
                  </div>
                ))}
                {getMemoryStats().length === 0 && (
                  <p className="text-slate-500 text-center py-4">Sem amostras de RAM.</p>
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

      {/* Bottom: Tabela de Logs Recentes */}
      <div className="bg-[#121214] border border-[#232326] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-white text-lg">Histórico de Medições Recentes</h3>
        </div>
        <p className="text-xs text-slate-400">Auditoria das últimas 100 métricas capturadas em tempo real nos navegadores.</p>

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
                    Nenhum log de desempenho encontrado. Navegue no sistema para gerar logs!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
