'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  ShieldBan,
  Activity,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Lock,
  Unlock,
  Plus,
  FileText,
  Download,
  Printer,
  Settings2,
  Server,
  Globe,
  Radio,
  Clock,
  Terminal,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { PageHeader } from '@/components/ui/page-header'
import { PrintHeader } from '@/components/print/print-header'
import { toast } from 'sonner'

interface ThreatLog {
  id: string
  tipo_ataque: string
  severidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'
  status: 'BLOQUEADO' | 'DETECTADO' | 'MITIGADO' | 'INVESTIGANDO'
  ip_origem: string
  pais: string | null
  cidade: string | null
  user_agent: string | null
  rota_alvo: string
  metodo_http: string
  payload_detectado: string | null
  headers_snapshot: Record<string, any> | null
  user_id: string | null
  email_tentativa: string | null
  detalhes_analise: Record<string, any> | null
  created_at: string
}

interface IpRule {
  id: string
  ip_address: string
  tipo_regra: 'BLOCK' | 'ALLOW' | 'WATCH'
  motivo: string
  bloqueado_ate: string | null
  criado_por_nome: string
  ativo: boolean
  total_bloqueios_executados: number
  created_at: string
}

interface SecurityMetrics {
  total24h: number
  total7d: number
  totalCriticos: number
  totalIpsBloqueados: number
  threatDistribution: Record<string, number>
  topAttackingIps: { ip: string; count: number }[]
}

const TIPO_LABELS: Record<string, { label: string; color: string }> = {
  SQL_INJECTION: { label: 'SQL Injection', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  BRUTE_FORCE: { label: 'Força Bruta', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  XSS: { label: 'XSS Attack', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  PATH_TRAVERSAL: { label: 'Path Traversal', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  SCANNER_BOT: { label: 'Scanner / Bot', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  TOKEN_TAMPERING: { label: 'Token Tampering', color: 'text-red-500 bg-red-500/10 border-red-500/20' },
  RATE_LIMIT_ABUSE: { label: 'Rate Limit Abuse', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
  PROBING: { label: 'Vulnerability Probing', color: 'text-pink-500 bg-pink-500/10 border-pink-500/20' },
}

const SEVERITY_BADGES: Record<string, { label: string; variant: string; className: string }> = {
  CRITICA: { label: 'Crítica', variant: 'destructive', className: 'bg-red-500/20 text-red-400 border-red-500/30 font-semibold' },
  ALTA: { label: 'Alta', variant: 'destructive', className: 'bg-rose-500/15 text-rose-300 border-rose-500/25' },
  MEDIA: { label: 'Média', variant: 'warning', className: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  BAIXA: { label: 'Baixa', variant: 'secondary', className: 'bg-blue-500/15 text-blue-300 border-blue-500/25' },
}

export default function SecurityDefensePage() {
  const isMounted = useRef(true)
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const [activeTab, setActiveTab] = useState<'soc' | 'logs' | 'ips' | 'reports' | 'config'>('soc')
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    total24h: 0,
    total7d: 0,
    totalCriticos: 0,
    totalIpsBloqueados: 0,
    threatDistribution: {},
    topAttackingIps: [],
  })
  const [logs, setLogs] = useState<ThreatLog[]>([])
  const [ipRules, setIpRules] = useState<IpRule[]>([])
  const [settings, setSettings] = useState<any>({
    modo_operacao: 'ATIVO',
    limite_tentativas_login: 5,
    janela_tempo_minutos: 15,
    duracao_ban_minutos: 60,
  })

  // Filtros de Logs
  const [filterTipo, setFilterTipo] = useState<string>('ALL')
  const [filterSeveridade, setFilterSeveridade] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalLogs, setTotalLogs] = useState<number>(0)

  // Modal de Detalhes Forenses
  const [selectedLog, setSelectedLog] = useState<ThreatLog | null>(null)
  const [modalDetailsOpen, setModalDetailsOpen] = useState(false)

  // Modal de Adicionar Bloqueio de IP
  const [modalAddIpOpen, setModalAddIpOpen] = useState(false)
  const [newIpAddress, setNewIpAddress] = useState('')
  const [newIpReason, setNewIpReason] = useState('')
  const [newIpType, setNewIpType] = useState<'BLOCK' | 'ALLOW'>('BLOCK')
  const [newIpDuration, setNewIpDuration] = useState<string>('60')
  const [savingIp, setSavingIp] = useState(false)

  // Relatórios
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [reportEndDate, setReportEndDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [reportTipo, setReportTipo] = useState<string>('ALL')
  const [reportLogs, setReportLogs] = useState<ThreatLog[]>([])
  const [loadingReport, setLoadingReport] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  // Carregamento principal
  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        tipo: filterTipo,
        severidade: filterSeveridade,
        search: searchQuery,
      })

      const res = await fetch(`/api/admin/defesa?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Falha ao carregar dados de segurança')

      if (isMounted.current) {
        setMetrics(data.metrics)
        setLogs(data.logs ?? [])
        setTotalLogs(data.totalLogs ?? 0)
        setTotalPages(data.totalPages ?? 1)
        setIpRules(data.ipRules ?? [])
        if (data.settings) setSettings(data.settings)
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados do WAF:', err)
      toast.error(err.message ?? 'Erro ao atualizar dados de defesa')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [page, filterTipo, filterSeveridade])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchData()
  }

  // Ações de Bloqueio/Desbloqueio de IP
  const handleBlockIpDirect = async (ip: string, reason: string) => {
    try {
      const res = await fetch('/api/admin/defesa/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: ip,
          tipo_regra: 'BLOCK',
          motivo: reason,
          duration_minutes: 1440, // 24 horas padrão
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao bloquear IP')

      toast.success(`IP ${ip} bloqueado com sucesso por 24 horas!`)
      fetchData()
      if (modalDetailsOpen) setModalDetailsOpen(false)
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao bloquear IP')
    }
  }

  const handleUnblockIp = async (ip: string, ruleId?: string) => {
    try {
      const res = await fetch(`/api/admin/defesa/block-ip?ip=${encodeURIComponent(ip)}&id=${ruleId ?? ''}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao remover regra')

      toast.success(`IP ${ip} liberado com sucesso!`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao desbloquear IP')
    }
  }

  const handleSaveNewIpRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newIpAddress || !newIpReason) {
      toast.error('Preencha o IP e a justificativa.')
      return
    }

    setSavingIp(true)
    try {
      const res = await fetch('/api/admin/defesa/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: newIpAddress.trim(),
          tipo_regra: newIpType,
          motivo: newIpReason.trim(),
          duration_minutes: newIpDuration === '0' ? null : parseInt(newIpDuration, 10),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar regra de IP')

      toast.success(`Regra para ${newIpAddress} cadastrada com sucesso!`)
      setModalAddIpOpen(false)
      setNewIpAddress('')
      setNewIpReason('')
      fetchData()
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao salvar regra de IP')
    } finally {
      setSavingIp(false)
    }
  }

  // Geração de Relatório
  const handleGenerateReport = async () => {
    setLoadingReport(true)
    try {
      const params = new URLSearchParams({
        startDate: reportStartDate,
        endDate: reportEndDate,
        tipo: reportTipo,
        format: 'json',
      })
      const res = await fetch(`/api/admin/defesa/report?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar relatório')
      setReportLogs(data.logs ?? [])
      toast.success(`Relatório gerado com ${data.logs?.length ?? 0} incidentes localizados.`)
    } catch (err: any) {
      toast.error(err.message ?? 'Falha ao gerar relatório')
    } finally {
      setLoadingReport(false)
    }
  }

  const handleDownloadCsv = () => {
    const params = new URLSearchParams({
      startDate: reportStartDate,
      endDate: reportEndDate,
      tipo: reportTipo,
      format: 'csv',
    })
    window.open(`/api/admin/defesa/report?${params.toString()}`, '_blank')
  }

  // Colunas da StandardTable de Logs
  const logColumns: TableColumn<ThreatLog>[] = [
    {
      header: 'Data / Hora',
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground text-xs">
            {new Date(item.created_at).toLocaleDateString('pt-BR')}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {new Date(item.created_at).toLocaleTimeString('pt-BR')}
          </span>
        </div>
      ),
      className: 'w-32',
    },
    {
      header: 'Severidade',
      accessor: (item) => {
        const badge = SEVERITY_BADGES[item.severidade] ?? SEVERITY_BADGES.MEDIA
        return (
          <Badge variant="outline" className={badge.className}>
            {badge.label}
          </Badge>
        )
      },
      className: 'w-24',
    },
    {
      header: 'Tipo de Ameaça',
      accessor: (item) => {
        const info = TIPO_LABELS[item.tipo_ataque] ?? { label: item.tipo_ataque, color: 'text-zinc-400 bg-zinc-500/10' }
        return (
          <Badge variant="outline" className={`${info.color} font-mono text-xs font-medium`}>
            {info.label}
          </Badge>
        )
      },
    },
    {
      header: 'Origem (IP)',
      accessor: (item) => (
        <div className="flex items-center gap-2 font-mono text-xs">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{item.ip_origem}</span>
          {item.pais && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
              {item.pais}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Rota Alvo',
      accessor: (item) => (
        <div className="max-w-[220px] truncate font-mono text-xs text-zinc-300" title={item.rota_alvo}>
          <span className="text-zinc-500 font-semibold mr-1">[{item.metodo_http}]</span>
          {item.rota_alvo}
        </div>
      ),
    },
    {
      header: 'Status WAF',
      accessor: (item) => (
        <Badge
          variant="outline"
          className={
            item.status === 'BLOQUEADO'
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }
        >
          {item.status === 'BLOQUEADO' ? '🛡️ Bloqueado' : '⚠️ Alerta'}
        </Badge>
      ),
      className: 'w-28',
    },
    {
      header: 'Ações',
      accessor: (item) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedLog(item)
              setModalDetailsOpen(true)
            }}
            className="h-7 px-2 text-xs text-sky-400 hover:bg-sky-500/10"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> Detalhes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBlockIpDirect(item.ip_origem, `Bloqueio manual pós-análise: ${item.tipo_ataque}`)}
            className="h-7 px-2 text-xs text-rose-400 hover:bg-rose-500/10"
            title="Banir IP"
          >
            <ShieldBan className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
      className: 'w-28 text-right',
    },
  ]

  // Colunas da StandardTable de Regras de IP
  const ipRuleColumns: TableColumn<IpRule>[] = [
    {
      header: 'Endereço IP',
      accessor: (item) => (
        <div className="font-mono font-medium text-xs flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-rose-400" />
          {item.ip_address}
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: (item) => (
        <Badge
          variant="outline"
          className={
            item.tipo_regra === 'BLOCK'
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
          }
        >
          {item.tipo_regra === 'BLOCK' ? '🚫 Blacklist' : '✅ Whitelist'}
        </Badge>
      ),
    },
    {
      header: 'Motivo / Justificativa',
      accessor: (item) => <span className="text-xs text-muted-foreground">{item.motivo}</span>,
    },
    {
      header: 'Expira Em',
      accessor: (item) => (
        <span className="text-xs text-zinc-400">
          {item.bloqueado_ate
            ? new Date(item.bloqueado_ate).toLocaleString('pt-BR')
            : 'Permanente'}
        </span>
      ),
    },
    {
      header: 'Criado Por',
      accessor: (item) => <span className="text-xs text-muted-foreground">{item.criado_por_nome}</span>,
    },
    {
      header: 'Ações',
      accessor: (item) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleUnblockIp(item.ip_address, item.id)}
          className="h-7 px-2 text-xs text-emerald-400 hover:bg-emerald-500/10"
        >
          <Unlock className="w-3.5 h-3.5 mr-1" /> Desbloquear
        </Button>
      ),
      className: 'w-28 text-right',
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                Central de Defesa & WAF
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs font-normal">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5 inline-block" />
                  Proteção Ativa
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Firewall de aplicação web, mitigação de invasões, detecção de injeção SQL e inteligência forense.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="rounded-xl border-border hover:bg-muted"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab('reports')}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Emitir Dossiê
          </Button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex items-center gap-1.5 border-b border-border/50 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('soc')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
            activeTab === 'soc'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Activity className="w-4 h-4" />
          Dashboard SOC
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Logs de Violação
          {totalLogs > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
              {totalLogs}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('ips')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
            activeTab === 'ips'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Lock className="w-4 h-4" />
          Blacklist de IPs ({ipRules.filter((r) => r.ativo && r.tipo_regra === 'BLOCK').length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Printer className="w-4 h-4" />
          Relatórios & Dossiês
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer ${
            activeTab === 'config'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Configurações WAF
        </button>
      </div>

      {/* ABA 1: DASHBOARD SOC */}
      {activeTab === 'soc' && (
        <div className="space-y-6">
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Ameaças Bloqueadas (24h)</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-foreground font-mono">
                {metrics.total24h}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-emerald-400">● 100% mitigados</span> em tempo real
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Total em 7 Dias</span>
                <Flame className="w-5 h-5 text-rose-400" />
              </div>
              <div className="text-3xl font-bold text-foreground font-mono">
                {metrics.total7d}
              </div>
              <p className="text-xs text-muted-foreground">Tentativas de violação interceptadas</p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Ataques Críticos</span>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-red-400 font-mono">
                {metrics.totalCriticos}
              </div>
              <p className="text-xs text-muted-foreground">SQLi e adulterações graves</p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">IPs Banidos Atualmente</span>
                <ShieldBan className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400 font-mono">
                {metrics.totalIpsBloqueados}
              </div>
              <p className="text-xs text-muted-foreground">Isolados em quarentena</p>
            </div>
          </div>

          {/* Gráficos / Distribuição de Ameaças */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribuição por Categoria */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  Distribuição por Categoria de Ataque (7 dias)
                </h3>
                <span className="text-xs text-muted-foreground">Frequência</span>
              </div>

              {Object.keys(metrics.threatDistribution).length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Nenhuma ameaça registrada nos últimos 7 dias. O perímetro está seguro.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(metrics.threatDistribution).map(([tipo, count]) => {
                    const total = Object.values(metrics.threatDistribution).reduce((a, b) => a + b, 0)
                    const percent = total > 0 ? Math.round((count / total) * 100) : 0
                    const info = TIPO_LABELS[tipo] ?? { label: tipo, color: 'text-zinc-400' }
                    return (
                      <div key={tipo} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-zinc-300">{info.label}</span>
                          <span className="text-muted-foreground font-mono">
                            {count} ({percent}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Top IPs Atacantes */}
            <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  Top Endereços IP Atacantes
                </h3>
                <span className="text-xs text-muted-foreground">Tentativas</span>
              </div>

              {metrics.topAttackingIps.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum IP hostil identificado no período.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metrics.topAttackingIps.map((item, idx) => (
                    <div
                      key={item.ip}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-zinc-500 font-bold">#{idx + 1}</span>
                        <span className="font-mono text-foreground font-semibold">{item.ip}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-300 border-rose-500/20 font-mono">
                          {item.count} infrações
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBlockIpDirect(item.ip, 'Banimento por excesso de ataques')}
                          className="h-7 px-2 text-rose-400 hover:bg-rose-500/10"
                        >
                          <ShieldBan className="w-3.5 h-3.5 mr-1" /> Banir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: LOGS DE VIOLAÇÃO */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-4 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
              <Input
                placeholder="Buscar por IP, rota ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
              <Button type="submit" size="sm" variant="outline" className="h-9 rounded-xl">
                <Search className="w-3.5 h-3.5" />
              </Button>
            </form>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={filterTipo}
                onChange={(e) => {
                  setFilterTipo(e.target.value)
                  setPage(1)
                }}
                className="h-9 text-xs px-3 rounded-xl bg-background border border-border text-foreground"
              >
                <option value="ALL">Todos os Tipos de Ataque</option>
                <option value="SQL_INJECTION">SQL Injection</option>
                <option value="BRUTE_FORCE">Força Bruta</option>
                <option value="XSS">XSS</option>
                <option value="PATH_TRAVERSAL">Path Traversal</option>
                <option value="SCANNER_BOT">Scanner / Bot</option>
                <option value="TOKEN_TAMPERING">Token Tampering</option>
                <option value="RATE_LIMIT_ABUSE">Rate Limit Abuse</option>
                <option value="PROBING">Vulnerability Probing</option>
              </select>

              <select
                value={filterSeveridade}
                onChange={(e) => {
                  setFilterSeveridade(e.target.value)
                  setPage(1)
                }}
                className="h-9 text-xs px-3 rounded-xl bg-background border border-border text-foreground"
              >
                <option value="ALL">Todas as Severidades</option>
                <option value="CRITICA">Crítica</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Média</option>
                <option value="BAIXA">Baixa</option>
              </select>
            </div>
          </div>

          {/* Tabela de Logs */}
          <StandardTable
            data={logs}
            columns={logColumns}
            loading={loading}
            emptyMessage="Nenhuma tentativa de violação encontrada com os filtros selecionados."
          />

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs text-muted-foreground">
                Página {page} de {totalPages} ({totalLogs} eventos)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 p-0 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: GESTÃO DE BLOQUEIOS & IPs */}
      {activeTab === 'ips' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Endereços IP sob bloqueio automático ou regras manuais de permissão/proibição.
            </p>
            <Button
              size="sm"
              onClick={() => setModalAddIpOpen(true)}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Adicionar Regra de IP
            </Button>
          </div>

          <StandardTable
            data={ipRules}
            columns={ipRuleColumns}
            loading={loading}
            emptyMessage="Nenhuma regra de IP cadastrada no momento."
          />
        </div>
      )}

      {/* ABA 4: RELATÓRIOS & DOSSIÊS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-400" />
              Gerador de Dossiê Oficial de Incidentes de Segurança
            </h3>
            <p className="text-xs text-muted-foreground">
              Selecione o período e os critérios para emitir um relatório consolidado com chancela oficial do SIG e da Secretaria Municipal de Educação.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Data Início</label>
                <Input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Data Fim</label>
                <Input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Categoria de Ataque</label>
                <select
                  value={reportTipo}
                  onChange={(e) => setReportTipo(e.target.value)}
                  className="h-9 w-full text-xs px-3 rounded-xl bg-background border border-border text-foreground"
                >
                  <option value="ALL">Todas as Categorias</option>
                  <option value="SQL_INJECTION">SQL Injection</option>
                  <option value="BRUTE_FORCE">Força Bruta</option>
                  <option value="XSS">XSS</option>
                  <option value="PATH_TRAVERSAL">Path Traversal</option>
                  <option value="SCANNER_BOT">Scanner / Bot</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleGenerateReport}
                disabled={loadingReport}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium"
              >
                <Search className="w-3.5 h-3.5 mr-1.5" />
                {loadingReport ? 'Gerando Dossiê...' : 'Filtrar e Consolidar'}
              </Button>
              {reportLogs.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleDownloadCsv}
                    className="rounded-xl text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.print()}
                    className="rounded-xl text-xs"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" />
                    Imprimir Dossiê Oficial
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Pré-visualização do Relatório Oficial (Formato Impressão) */}
          {reportLogs.length > 0 && (
            <div className="p-6 rounded-2xl border border-border bg-white text-black dark:bg-zinc-950 dark:text-zinc-100 shadow-md space-y-6 print-portal-container">
              <PrintHeader
                docTitulo="RELATÓRIO AUDITÁVEL DE INCIDENTES E DEFESA CIBERNÉTICA"
                docSubtitulo={`Período: ${new Date(reportStartDate).toLocaleDateString('pt-BR')} até ${new Date(reportEndDate).toLocaleDateString('pt-BR')}`}
              />

              <div className="border-t border-b py-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span><strong>Total de Incidentes Registrados:</strong> {reportLogs.length}</span>
                  <span><strong>Status de Integridade:</strong> Perímetro 100% Protegido</span>
                </div>
                <div className="flex justify-between">
                  <span><strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}</span>
                  <span><strong>Sistema:</strong> SIG WAF v2.0 (Next.js 16 / Postgres ABAC)</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider">Trilha Forense de Incidentes</h4>
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b font-bold bg-zinc-100 dark:bg-zinc-900">
                      <th className="p-2 text-left">Data/Hora</th>
                      <th className="p-2 text-left">Tipo de Ataque</th>
                      <th className="p-2 text-left">Severidade</th>
                      <th className="p-2 text-left">IP de Origem</th>
                      <th className="p-2 text-left">Rota Alvo</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportLogs.map((l) => (
                      <tr key={l.id} className="border-b">
                        <td className="p-2">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                        <td className="p-2 font-mono font-semibold">{l.tipo_ataque}</td>
                        <td className="p-2">{l.severidade}</td>
                        <td className="p-2 font-mono">{l.ip_origem}</td>
                        <td className="p-2 font-mono truncate max-w-[200px]">{l.rota_alvo}</td>
                        <td className="p-2 font-semibold">{l.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-8 text-center text-xs text-muted-foreground border-t">
                Dossiê emitido para fins de auditoria de segurança da informação da rede municipal.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 5: CONFIGURAÇÕES WAF */}
      {activeTab === 'config' && (
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-400" />
              Parâmetros Operacionais do WAF
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure o comportamento do motor de proteção contra ataques.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="font-semibold text-foreground">Modo de Operação</span>
              <p className="text-muted-foreground">
                No <strong>Modo Ativo</strong>, requisições com injeção SQL ou ataques críticos são bloqueadas imediatamente (HTTP 403). No <strong>Modo Monitoramento</strong>, apenas são gerados logs sem interromper o tráfego.
              </p>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                Modo Atual: ATIVO (Bloqueio Automático Habilitado)
              </Badge>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="font-semibold text-foreground">Proteção contra Força Bruta</span>
              <p className="text-muted-foreground">
                Limita tentativas de login com falha para no máximo <strong>5 requisições a cada 15 minutos</strong> por IP. Após isso, o IP é banido automaticamente por 60 minutos.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="font-semibold text-foreground">Whitelist da Rede Local</span>
              <p className="text-muted-foreground font-mono">
                IPs Confiáveis Isentos: 127.0.0.1, ::1, localhost
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES FORENSES DO INCIDENTE */}
      {modalDetailsOpen && selectedLog && (
        <StandardDialog
          open={modalDetailsOpen}
          onOpenChange={setModalDetailsOpen}
          title={`Dossiê Forense — Incidente #${selectedLog.id.slice(0, 8)}`}
          className="sm:max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block">Severidade</span>
                <span className="font-bold text-foreground">{selectedLog.severidade}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block">Tipo</span>
                <span className="font-bold font-mono text-rose-400">{selectedLog.tipo_ataque}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block">IP Atacante</span>
                <span className="font-bold font-mono text-foreground">{selectedLog.ip_origem}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <span className="text-muted-foreground block">Data/Hora</span>
                <span className="font-bold text-foreground">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground font-semibold">Rota Alvo & Método</label>
              <div className="p-2.5 rounded-xl bg-zinc-950 text-zinc-200 font-mono text-xs border border-border/60">
                <span className="text-amber-400 mr-2">{selectedLog.metodo_http}</span>
                {selectedLog.rota_alvo}
              </div>
            </div>

            {selectedLog.payload_detectado && (
              <div className="space-y-1">
                <label className="text-rose-400 font-semibold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" /> Payload Interceptado (Sanitizado)
                </label>
                <pre className="p-3 rounded-xl bg-zinc-950 text-rose-300 font-mono text-xs border border-rose-500/30 overflow-x-auto whitespace-pre-wrap">
                  {selectedLog.payload_detectado}
                </pre>
              </div>
            )}

            {selectedLog.user_agent && (
              <div className="space-y-1">
                <label className="text-muted-foreground font-semibold">User-Agent Identificado</label>
                <div className="p-2 rounded-xl bg-muted/30 font-mono text-[11px] text-zinc-300 break-all">
                  {selectedLog.user_agent}
                </div>
              </div>
            )}

            {selectedLog.email_tentativa && (
              <div className="space-y-1">
                <label className="text-muted-foreground font-semibold">E-mail Visado na Tentativa</label>
                <div className="p-2 rounded-xl bg-muted/30 font-mono text-xs text-foreground">
                  {selectedLog.email_tentativa}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalDetailsOpen(false)}
                className="rounded-xl"
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={() => handleBlockIpDirect(selectedLog.ip_origem, `Banimento forense: ${selectedLog.tipo_ataque}`)}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                <ShieldBan className="w-4 h-4 mr-1.5" />
                Banir IP do Atacante (24h)
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* MODAL: ADICIONAR REGRA MANUAL DE IP */}
      {modalAddIpOpen && (
        <StandardDialog
          open={modalAddIpOpen}
          onOpenChange={setModalAddIpOpen}
          title="Adicionar Regra de IP (Blacklist / Whitelist)"
          className="sm:max-w-md"
        >
          <form onSubmit={handleSaveNewIpRule} className="space-y-4 text-xs">
            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Endereço IP</label>
              <Input
                placeholder="Ex: 187.54.12.33 ou 2001:db8::1"
                value={newIpAddress}
                onChange={(e) => setNewIpAddress(e.target.value)}
                className="h-9 rounded-xl font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Tipo de Regra</label>
              <select
                value={newIpType}
                onChange={(e) => setNewIpType(e.target.value as any)}
                className="h-9 w-full rounded-xl bg-background border border-border text-foreground px-3 text-xs"
              >
                <option value="BLOCK">🚫 Blacklist (Bloquear Acesso)</option>
                <option value="ALLOW">✅ Whitelist (Permitir / Isentar)</option>
              </select>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Duração do Bloqueio</label>
              <select
                value={newIpDuration}
                onChange={(e) => setNewIpDuration(e.target.value)}
                className="h-9 w-full rounded-xl bg-background border border-border text-foreground px-3 text-xs"
              >
                <option value="60">1 Hora (60 min)</option>
                <option value="1440">24 Horas (1 dia)</option>
                <option value="10080">7 Dias (1 semana)</option>
                <option value="0">Permanente (Sem Expiração)</option>
              </select>
            </div>

            <div>
              <label className="text-muted-foreground block mb-1 font-medium">Justificativa / Motivo</label>
              <Input
                placeholder="Ex: Tentativa suspeita de injeção SQL no login"
                value={newIpReason}
                onChange={(e) => setNewIpReason(e.target.value)}
                className="h-9 rounded-xl text-xs"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAddIpOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingIp}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                {savingIp ? 'Salvando...' : 'Salvar Regra'}
              </Button>
            </div>
          </form>
        </StandardDialog>
      )}
    </div>
  )
}
