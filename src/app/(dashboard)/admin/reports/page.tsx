'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { 
  Bug, 
  Sparkles, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  User,
  School,
  Calendar,
  ShieldCheck,
  Check,
  X,
  Eye,
  Loader2,
  Terminal,
  Info,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { StandardDialog } from '@/components/ui/standard-dialog'

export interface BugReport {
  id: string
  tipo: 'bug' | 'sugestao'
  titulo: string
  descricao: string
  autor_nome: string
  autor_email: string
  escola?: string
  status: 'pendente' | 'em_analise' | 'resolvido' | 'rejeitado'
  resposta_root?: string
  created_at: string
}

export interface SystemLog {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  context: string
  message: string
  error_code: string | null
  user_id: string | null
  metadata: any
  resolved: boolean
  created_at: string
}

export default function AdminReportsPage() {
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'chamados' | 'logs'>('chamados')

  // Estados dos Chamados (Bug Reports)
  const [reports, setReports] = useState<BugReport[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [buscando, setBuscando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')

  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null)
  const [modalReportOpen, setModalReportOpen] = useState(false)
  const [respostaInput, setRespostaInput] = useState('')
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  // Estados dos Logs do Sistema
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null)
  const [modalLogOpen, setModalLogOpen] = useState(false)

  const loadData = async () => {
    setBuscando(true)
    if (activeTab === 'chamados') {
      setLoadingReports(true)
      try {
        const { data, error } = await (supabase.from as any)('bug_reports')
          .select('id, tipo, titulo, descricao, autor_nome, autor_email, escola, resposta_root, status, created_at')
          .order('created_at', { ascending: false })

        if (data && !error) setReports(data as BugReport[])
      } catch (err) {
        console.warn('Erro ao carregar reports do banco:', err)
      } finally {
        setLoadingReports(false)
      }
    } else {
      setLoadingLogs(true)
      try {
        const { data, error } = await (supabase.from as any)('system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100) // Trazemos os últimos 100 por performance

        if (data && !error) setLogs(data as SystemLog[])
      } catch (err) {
        console.warn('Erro ao carregar system logs:', err)
      } finally {
        setLoadingLogs(false)
      }
    }
    setBuscando(false)
  }

  useEffect(() => {
    loadData()
  }, [activeTab])

  // ============================
  // LÓGICA DE CHAMADOS
  // ============================
  const handleUpdateReportStatus = async (
    id: string, 
    novoStatus: 'pendente' | 'em_analise' | 'resolvido' | 'rejeitado',
    resposta?: string
  ) => {
    setSalvandoStatus(true)
    try {
      const { error } = await (supabase.from as any)('bug_reports')
        .update({ 
          status: novoStatus,
          resposta_root: resposta !== undefined ? resposta : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      setReports(prev => prev.map(r => r.id === id ? { ...r, status: novoStatus, resposta_root: resposta !== undefined ? resposta : r.resposta_root } : r))
      if (novoStatus === 'resolvido') toast.success('Reporte resolvido!')
      else toast.info(`Reporte alterado para ${novoStatus}`)

      if (modalReportOpen && selectedReport?.id === id) setModalReportOpen(false)
    } catch (err: any) {
      toast.error('Erro ao atualizar: ' + err.message)
    } finally {
      setSalvandoStatus(false)
    }
  }

  const reportsFiltrados = reports.filter(item => {
    const matchBusca = 
      item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      item.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      item.autor_nome.toLowerCase().includes(busca.toLowerCase())
    const matchStatus = filtroStatus === 'TODOS' || item.status === filtroStatus
    const matchTipo = filtroTipo === 'TODOS' || item.tipo === filtroTipo
    return matchBusca && matchStatus && matchTipo
  })

  // ============================
  // LÓGICA DE LOGS DE SISTEMA
  // ============================
  const handleResolveLog = async (id: string, currentlyResolved: boolean) => {
    try {
      const { error } = await (supabase.from as any)('system_logs')
        .update({ resolved: !currentlyResolved })
        .eq('id', id)
      
      if (error) throw error
      
      setLogs(prev => prev.map(l => l.id === id ? { ...l, resolved: !currentlyResolved } : l))
      toast.success(currentlyResolved ? 'Log reaberto.' : 'Log marcado como resolvido.')
    } catch (err) {
      toast.error('Falha ao atualizar log.')
    }
  }

  const getLogIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-rose-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-400" />
      default: return <Info className="w-5 h-5 text-sky-400" />
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-500" />
            Central de Saúde do Sistema
            <span className="bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/50 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider uppercase">
              ROOT
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie chamados de usuários e monitore erros automáticos (logs) do sistema.
          </p>
        </div>

        <Button
          onClick={loadData}
          disabled={buscando}
          className="bg-card border border-borderCustom text-foreground hover:bg-muted gap-2 shadow-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${buscando ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </Button>
      </div>

      {/* Tabs Customizadas */}
      <div className="flex gap-2 border-b border-borderCustom">
        <button
          onClick={() => setActiveTab('chamados')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'chamados' 
            ? 'border-indigo-500 text-indigo-400' 
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-borderCustom'
          }`}
        >
          <Bug className="w-4 h-4" /> Chamados e Sugestões
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'logs' 
            ? 'border-rose-500 text-rose-400' 
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-borderCustom'
          }`}
        >
          <Terminal className="w-4 h-4" /> Logs Automáticos (Erros)
        </button>
      </div>

      {activeTab === 'chamados' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
              <Input
                placeholder="Buscar chamados..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="bg-input border-borderCustom pl-9 h-11 rounded-xl"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="bg-input border border-borderCustom h-11 rounded-xl px-3 text-sm focus:outline-none"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="pendente">Pendentes</option>
              <option value="resolvido">Resolvidos</option>
            </select>
          </div>

          <div className="space-y-3">
            {loadingReports ? (
              <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>
            ) : reportsFiltrados.length === 0 ? (
              <div className="bg-card border border-dashed border-borderCustom rounded-2xl p-12 text-center text-muted-foreground">
                Nenhum chamado encontrado.
              </div>
            ) : (
              reportsFiltrados.map(report => (
                <div key={report.id} className="bg-card border border-borderCustom rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className={report.tipo === 'bug' ? 'text-rose-400 border-rose-500/30' : 'text-amber-400 border-amber-500/30'}>
                          {report.tipo.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="border-borderCustom">{report.status.toUpperCase()}</Badge>
                      </div>
                      <h3 className="font-bold text-base mt-2">{report.titulo}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(report.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm bg-muted/60 p-3.5 rounded-xl border border-borderCustom">{report.descricao}</p>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-borderCustom">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> {report.autor_nome}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-muted border-borderCustom gap-1.5"
                      onClick={() => {
                        setSelectedReport(report)
                        setRespostaInput(report.resposta_root || '')
                        setModalReportOpen(true)
                      }}
                    >
                      <Eye className="w-4 h-4" /> Detalhes / Responder
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-3">
            {loadingLogs ? (
              <div className="p-12 text-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-500" /></div>
            ) : logs.length === 0 ? (
              <div className="bg-card border border-dashed border-borderCustom rounded-2xl p-12 text-center text-muted-foreground">
                Nenhum log automático registrado ainda. Ótimo sinal!
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className={`bg-card border ${log.resolved ? 'border-borderCustom/50 opacity-70' : 'border-rose-500/30'} rounded-2xl p-5 shadow-sm space-y-3 transition-opacity`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getLogIcon(log.severity)}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-borderCustom text-muted-foreground font-mono">{log.context}</Badge>
                          {log.error_code && <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 font-mono">Erro {log.error_code}</Badge>}
                          {log.resolved && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">RESOLVIDO</Badge>}
                        </div>
                        <h3 className="font-bold text-sm md:text-base mt-2 text-foreground/90">{log.message}</h3>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right shrink-0">
                      <div>{new Date(log.created_at).toLocaleDateString('pt-BR')}</div>
                      <div>{new Date(log.created_at).toLocaleTimeString('pt-BR')}</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2 border-t border-borderCustom">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-muted border-borderCustom gap-1.5"
                      onClick={() => {
                        setSelectedLog(log)
                        setModalLogOpen(true)
                      }}
                    >
                      <Terminal className="w-4 h-4" /> Ver Metadata
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={log.resolved ? "border-borderCustom text-muted-foreground" : "bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30"}
                      onClick={() => handleResolveLog(log.id, log.resolved)}
                    >
                      <Check className="w-4 h-4 mr-1.5" /> {log.resolved ? 'Reabrir Log' : 'Marcar Resolvido'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Reporte Original */}
      {selectedReport && modalReportOpen && (
        <StandardDialog
          open={modalReportOpen}
          onOpenChange={setModalReportOpen}
          title={`Chamado — ${selectedReport.titulo}`}
          maxWidth="sm:max-w-xl"
          footer={
            <div className="pt-2 flex flex-wrap gap-2 justify-end w-full border-t border-borderCustom">
              <Button type="button" variant="outline" onClick={() => setModalReportOpen(false)}>Fechar</Button>
              <Button disabled={salvandoStatus} onClick={() => handleUpdateReportStatus(selectedReport.id, 'em_analise', respostaInput)} className="bg-sky-600 hover:bg-sky-700 text-white">Em Análise</Button>
              <Button disabled={salvandoStatus} onClick={() => handleUpdateReportStatus(selectedReport.id, 'resolvido', respostaInput)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Resolver</Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="bg-muted/60 p-3 rounded-xl border border-borderCustom text-sm">
              <p><strong>Por:</strong> {selectedReport.autor_nome}</p>
              <p><strong>Descrição:</strong> {selectedReport.descricao}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Resposta / Resolução (Opcional)</label>
              <Textarea
                value={respostaInput}
                onChange={e => setRespostaInput(e.target.value)}
                placeholder="Resposta..."
                className="bg-input border-borderCustom min-h-[90px]"
              />
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal Log Automático */}
      {selectedLog && modalLogOpen && (
        <StandardDialog
          open={modalLogOpen}
          onOpenChange={setModalLogOpen}
          title="Detalhes do Log de Sistema"
          maxWidth="sm:max-w-3xl"
        >
          <div className="space-y-4 py-2">
            <div className="bg-muted/60 p-4 rounded-xl border border-borderCustom text-sm font-mono overflow-auto max-h-[60vh]">
              <div className="mb-4 space-y-1">
                <p><span className="text-muted-foreground">ID:</span> {selectedLog.id}</p>
                <p><span className="text-muted-foreground">Contexto:</span> {selectedLog.context}</p>
                <p><span className="text-muted-foreground">Mensagem:</span> {selectedLog.message}</p>
                <p><span className="text-muted-foreground">User ID:</span> {selectedLog.user_id || 'Não Autenticado'}</p>
              </div>
              <div className="pt-3 border-t border-borderCustom/50">
                <p className="text-muted-foreground mb-2">METADATA (JSON):</p>
                <pre className="text-xs text-sky-300 whitespace-pre-wrap break-words">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  )
}
