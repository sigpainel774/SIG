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
  AlertTriangle,
  Compass,
  Footprints,
  Activity,
  Layers,
  FileCode2,
  Tag
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

  const [activeTab, setActiveTab] = useState<'chamados' | 'logs'>('logs')

  // Estados dos Chamados (Bug Reports)
  const [reports, setReports] = useState<BugReport[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
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
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [buscaLogs, setBuscaLogs] = useState('')
  const [filtroStatusLogs, setFiltroStatusLogs] = useState<string>('TODOS')
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null)
  const [modalLogOpen, setModalLogOpen] = useState(false)
  const [logDetailTab, setLogDetailTab] = useState<'resumo' | 'trilha' | 'raw'>('resumo')

  const getAuthHeaders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      return headers
    } catch {
      return { 'Content-Type': 'application/json' }
    }
  }

  const loadData = async () => {
    setBuscando(true)
    const headers = await getAuthHeaders()
    if (activeTab === 'chamados') {
      setLoadingReports(true)
      try {
        const res = await fetch('/api/admin/reports?type=chamados&limit=100', { headers })
        const json = await res.json()
        if (res.ok && json.data) {
          setReports(json.data as BugReport[])
        } else {
          toast.error(json.error || 'Erro ao carregar relatos')
        }
      } catch (err) {
        console.warn('Erro ao carregar reports do banco:', err)
      } finally {
        setLoadingReports(false)
      }
    } else {
      setLoadingLogs(true)
      try {
        const res = await fetch('/api/admin/reports?type=logs&limit=100', { headers })
        const json = await res.json()
        if (res.ok && json.data) {
          setLogs(json.data as SystemLog[])
        } else {
          toast.error(json.error || 'Erro ao carregar logs automáticos')
        }
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
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          type: 'chamado',
          id,
          status: novoStatus,
          resposta_root: resposta !== undefined ? resposta : undefined
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao atualizar chamado')

      setReports(prev => prev.map(r => r.id === id ? { ...r, status: novoStatus, resposta_root: resposta !== undefined ? resposta : r.resposta_root } : r))
      if (novoStatus === 'resolvido') toast.success('Não conformidade marcada como resolvida!')
      else toast.info(`Status alterado para ${novoStatus}`)

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
      const headers = await getAuthHeaders()
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          type: 'log',
          id,
          resolved: !currentlyResolved
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao atualizar log')
      
      setLogs(prev => prev.map(l => l.id === id ? { ...l, resolved: !currentlyResolved } : l))
      toast.success(currentlyResolved ? 'Log reaberto.' : 'Log marcado como resolvido.')
    } catch (err: any) {
      toast.error(err.message || 'Falha ao atualizar log.')
    }
  }

  const logsFiltrados = logs.filter(log => {
    const termo = buscaLogs.toLowerCase()
    const msg = (log.message || '').toLowerCase()
    const ctx = (log.context || '').toLowerCase()
    const usr = (log.metadata?.usuario?.nome || '').toLowerCase()
    const car = (log.metadata?.usuario?.cargo || '').toLowerCase()
    const act = (log.metadata?.acao_usuario || '').toLowerCase()
    const sess = (log.metadata?.session_id || '').toLowerCase()

    const matchBusca = !termo || msg.includes(termo) || ctx.includes(termo) || usr.includes(termo) || car.includes(termo) || act.includes(termo) || sess.includes(termo)
    const matchStatus = 
      filtroStatusLogs === 'TODOS' ? true :
      filtroStatusLogs === 'RESOLVIDOS' ? log.resolved :
      !log.resolved

    return matchBusca && matchStatus
  })

  const getLogIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
      case 'error': return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
      default: return <Info className="w-5 h-5 text-sky-500 shrink-0" />
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-rose-500 dark:text-rose-400" />
            Não Conformidades & Saúde do Sistema
            <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider uppercase">
              AUDITORIA
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoramento de erros automáticos, falhas em tarefas de usuários e relatos de não conformidades por sessão.
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
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'logs' 
            ? 'border-rose-500 text-rose-600 dark:text-rose-400' 
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-borderCustom'
          }`}
        >
          <Terminal className="w-4 h-4" /> Logs Automáticos (Sessão & Erros)
        </button>
        <button
          onClick={() => setActiveTab('chamados')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'chamados' 
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-borderCustom'
          }`}
        >
          <Bug className="w-4 h-4" /> Relatos Manuais & Sugestões
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: LOGS AUTOMÁTICOS (ERROS POR SESSÃO)                                */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Barra de Filtros */}
          <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
              <Input
                placeholder="Buscar por mensagem, rota, usuário, cargo ou ID de sessão..."
                value={buscaLogs}
                onChange={e => setBuscaLogs(e.target.value)}
                className="bg-input border-borderCustom pl-9 h-11 rounded-xl text-xs"
              />
            </div>
            <select
              value={filtroStatusLogs}
              onChange={e => setFiltroStatusLogs(e.target.value)}
              className="bg-input border border-borderCustom h-11 rounded-xl px-3 text-xs focus:outline-none text-foreground"
            >
              <option value="TODOS">Todos os Logs</option>
              <option value="PENDENTES">Pendentes (Não Resolvidos)</option>
              <option value="RESOLVIDOS">Resolvidos</option>
            </select>
          </div>

          <div className="space-y-3">
            {loadingLogs ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-rose-500 mb-2" />
                <p className="text-xs">Carregando logs automáticos de não conformidade...</p>
              </div>
            ) : logsFiltrados.length === 0 ? (
              <div className="bg-card border border-dashed border-borderCustom rounded-2xl p-12 text-center text-muted-foreground space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500" />
                <h3 className="font-bold text-foreground">Nenhuma não conformidade encontrada</h3>
                <p className="text-xs">Todos os fluxos e tarefas de usuários estão operando perfeitamente.</p>
              </div>
            ) : (
              logsFiltrados.map(log => {
                const usuario = log.metadata?.usuario
                const trilha = log.metadata?.trilha_navegacao_recente ?? []
                const acao = log.metadata?.acao_usuario || log.context || 'Tarefa no sistema'
                const sessionId = log.metadata?.session_id

                return (
                  <div 
                    key={log.id} 
                    className={`bg-card border ${log.resolved ? 'border-borderCustom/50 opacity-70' : 'border-rose-500/30'} rounded-2xl p-5 shadow-sm space-y-3 transition-all hover:border-rose-500/50`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="mt-1">{getLogIcon(log.severity)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold">
                              {log.context || 'app'}
                            </span>
                            {log.error_code && (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 font-mono text-[10px]">
                                Erro {log.error_code}
                              </Badge>
                            )}
                            {sessionId && (
                              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded border border-borderCustom">
                                Sessão: {sessionId}
                              </span>
                            )}
                            {log.resolved ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold">
                                RESOLVIDO
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/30 font-bold animate-pulse">
                                NÃO CONFORMIDADE ATIVA
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-sm md:text-base mt-2 text-foreground break-words">
                            {log.message}
                          </h3>

                          {/* O que o usuário estava tentando fazer */}
                          <div className="mt-2 text-xs bg-muted/60 p-2.5 rounded-xl border border-borderCustom space-y-1">
                            <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
                              <Activity className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="text-muted-foreground">Tentativa de ação:</span>
                              <span className="font-semibold text-foreground">{acao}</span>
                            </div>
                            {usuario ? (
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-1 border-t border-borderCustom/40">
                                <span className="flex items-center gap-1 font-bold text-foreground">
                                  <User className="w-3.5 h-3.5 text-primary" /> {usuario.nome}
                                </span>
                                {usuario.cargo && <span className="text-foreground/80">• {usuario.cargo}</span>}
                                {usuario.email && usuario.email !== 'N/A' && <span className="text-muted-foreground">• {usuario.email}</span>}
                                {usuario.escola && <span className="text-muted-foreground">• {usuario.escola}</span>}
                              </div>
                            ) : log.user_id ? (
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-1 border-t border-borderCustom/40">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <User className="w-3.5 h-3.5 text-primary" /> ID Usuário: <code className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{log.user_id}</code>
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap pt-1 border-t border-borderCustom/40">
                                <span className="flex items-center gap-1 text-muted-foreground italic">
                                  <User className="w-3.5 h-3.5" /> Sessão Anônima / Não Autenticada
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Mini Trilha de Navegação Recente */}
                          {trilha.length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                              <Footprints className="w-3 h-3 text-amber-500 shrink-0" />
                              <span className="font-medium">Trilha da sessão:</span>
                              {trilha.slice(-3).map((t: any, idx: number) => (
                                <span key={idx} className="font-mono bg-background border border-borderCustom px-1.5 py-0.5 rounded text-[10px]">
                                  {t.pathname}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                        <div>{new Date(log.created_at).toLocaleDateString('pt-BR')}</div>
                        <div className="font-mono">{new Date(log.created_at).toLocaleTimeString('pt-BR')}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2 border-t border-borderCustom">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="bg-muted border-borderCustom gap-1.5 text-xs h-8 rounded-xl"
                        onClick={() => {
                          setSelectedLog(log)
                          setLogDetailTab('resumo')
                          setModalLogOpen(true)
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-500" /> Ver Trilha & Metadados
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={`text-xs h-8 rounded-xl ${log.resolved ? "border-borderCustom text-muted-foreground" : "bg-emerald-600/20 text-emerald-500 border-emerald-500/40 hover:bg-emerald-600/30"}`}
                        onClick={() => handleResolveLog(log.id, log.resolved)}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> {log.resolved ? 'Reabrir' : 'Marcar Resolvido'}
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: RELATOS MANUAIS & SUGESTÕES                                        */}
      {/* ========================================================================= */}
      {activeTab === 'chamados' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3.5" />
              <Input
                placeholder="Buscar relatos e não conformidades manuais..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="bg-input border-borderCustom pl-9 h-11 rounded-xl text-xs"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="bg-input border border-borderCustom h-11 rounded-xl px-3 text-xs focus:outline-none text-foreground"
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
                Nenhum relato manual registrado.
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
                      className="bg-muted border-borderCustom gap-1.5 text-xs h-8 rounded-xl"
                      onClick={() => {
                        setSelectedReport(report)
                        setRespostaInput(report.resposta_root || '')
                        setModalReportOpen(true)
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" /> Detalhes / Responder
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal Reporte Manual */}
      {selectedReport && modalReportOpen && (
        <StandardDialog
          open={modalReportOpen}
          onOpenChange={setModalReportOpen}
          title={`Não Conformidade Manual — ${selectedReport.titulo}`}
          maxWidth="sm:max-w-xl"
          footer={
            <div className="pt-2 flex flex-wrap gap-2 justify-end w-full border-t border-borderCustom">
              <Button type="button" variant="outline" onClick={() => setModalReportOpen(false)} className="rounded-xl text-xs h-9">Fechar</Button>
              <Button disabled={salvandoStatus} onClick={() => handleUpdateReportStatus(selectedReport.id, 'em_analise', respostaInput)} className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs h-9">Em Análise</Button>
              <Button disabled={salvandoStatus} onClick={() => handleUpdateReportStatus(selectedReport.id, 'resolvido', respostaInput)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9">Resolver</Button>
            </div>
          }
        >
          <div className="space-y-4 py-2">
            <div className="bg-muted/60 p-3 rounded-xl border border-borderCustom text-xs space-y-1">
              <p><strong>Autor:</strong> {selectedReport.autor_nome} ({selectedReport.autor_email})</p>
              <p><strong>Descrição:</strong> {selectedReport.descricao}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1">Resposta / Resolução (Opcional)</label>
              <Textarea
                value={respostaInput}
                onChange={e => setRespostaInput(e.target.value)}
                placeholder="Descreva a solução ou orientação..."
                className="bg-input border-borderCustom min-h-[90px] text-xs"
              />
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Modal Detalhado de Não Conformidade / Log Automático */}
      {selectedLog && modalLogOpen && (
        <StandardDialog
          open={modalLogOpen}
          onOpenChange={setModalLogOpen}
          title="Detalhes da Não Conformidade"
          maxWidth="sm:max-w-3xl"
          footer={
            <div className="flex justify-end gap-2 w-full pt-2 border-t border-borderCustom">
              <Button 
                variant="outline" 
                onClick={() => setModalLogOpen(false)}
                className="text-xs rounded-xl h-9"
              >
                Fechar
              </Button>
              <Button 
                className={`text-xs rounded-xl h-9 ${selectedLog.resolved ? "bg-muted text-muted-foreground" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                onClick={() => {
                  handleResolveLog(selectedLog.id, selectedLog.resolved)
                  setModalLogOpen(false)
                }}
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                {selectedLog.resolved ? 'Reabrir Não Conformidade' : 'Marcar como Resolvido'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-1">
            {/* Sub-abas do Modal */}
            <div className="flex gap-2 border-b border-borderCustom pb-1">
              <button
                type="button"
                onClick={() => setLogDetailTab('resumo')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  logDetailTab === 'resumo' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Resumo da Ação
              </button>
              <button
                type="button"
                onClick={() => setLogDetailTab('trilha')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  logDetailTab === 'trilha' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Trilha de Navegação ({selectedLog.metadata?.trilha_navegacao_recente?.length ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setLogDetailTab('raw')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  logDetailTab === 'raw' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                JSON Raw
              </button>
            </div>

            {/* ABA 1: RESUMO DA AÇÃO */}
            {logDetailTab === 'resumo' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-500">Mensagem de Erro do Toast</span>
                  <p className="font-bold text-foreground text-sm">{selectedLog.message}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/50 border border-borderCustom rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">O que tentava fazer</span>
                    <p className="font-semibold text-foreground">
                      {selectedLog.metadata?.acao_usuario || selectedLog.context || 'Operação no sistema'}
                    </p>
                  </div>

                  <div className="p-3 bg-muted/50 border border-borderCustom rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Rota / Contexto</span>
                    <p className="font-mono text-foreground">{selectedLog.context || '/'}</p>
                  </div>

                  <div className="p-3 bg-muted/50 border border-borderCustom rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Usuário Responsável</span>
                    <p className="font-bold text-foreground">
                      {selectedLog.metadata?.usuario?.nome || (selectedLog.user_id ? `ID: ${selectedLog.user_id}` : 'Sessão Anônima')}
                    </p>
                    {selectedLog.metadata?.usuario?.cargo && (
                      <p className="text-[11px] text-muted-foreground font-medium">{selectedLog.metadata.usuario.cargo}</p>
                    )}
                    {selectedLog.metadata?.usuario?.email && selectedLog.metadata.usuario.email !== 'N/A' && (
                      <p className="text-[11px] text-muted-foreground font-mono">{selectedLog.metadata.usuario.email}</p>
                    )}
                    {selectedLog.metadata?.usuario?.escola && (
                      <p className="text-[11px] text-primary/80 font-medium">Escola: {selectedLog.metadata.usuario.escola}</p>
                    )}
                  </div>

                  <div className="p-3 bg-muted/50 border border-borderCustom rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Sessão & Dispositivo</span>
                    <p className="font-mono text-[11px] text-foreground">
                      Sessão: {selectedLog.metadata?.session_id || 'N/A'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {selectedLog.metadata?.user_agent || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: TRILHA DE NAVEGAÇÃO */}
            {logDetailTab === 'trilha' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Páginas acessadas pelo usuário antes da ocorrência do erro:
                </p>
                {(!selectedLog.metadata?.trilha_navegacao_recente || selectedLog.metadata.trilha_navegacao_recente.length === 0) ? (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-borderCustom">
                    Nenhuma trilha prévia gravada nesta sessão.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedLog.metadata.trilha_navegacao_recente.map((item: any, idx: number) => (
                      <div key={idx} className="p-2.5 bg-muted/50 border border-borderCustom rounded-xl flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-foreground">{item.pathname}</span>
                            {item.title && <span className="text-[11px] text-muted-foreground block truncate">{item.title}</span>}
                          </div>
                        </div>
                        {item.timestamp && (
                          <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                            {new Date(item.timestamp).toLocaleTimeString('pt-BR')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA 3: JSON COMPLETO */}
            {logDetailTab === 'raw' && (
              <div className="bg-muted/60 p-3 rounded-xl border border-borderCustom font-mono text-[11px] overflow-auto max-h-[50vh]">
                <pre className="text-sky-400 whitespace-pre-wrap break-words">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </StandardDialog>
      )}
    </div>
  )
}
