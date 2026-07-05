'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { 
  Bug, 
  Sparkles, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  MessageSquare,
  User,
  School,
  Calendar,
  ShieldCheck,
  Check,
  X,
  Eye,
  Send,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'

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

const mockReports: BugReport[] = [
  {
    id: 'rep-001',
    tipo: 'bug',
    titulo: 'Erro ao gerar relatório PDF no Diário de Classe',
    descricao: 'Ao clicar no botão "Imprimir Diário em PDF" na turma do 9º Ano A, o sistema apresenta tela branca com erro no console.',
    autor_nome: 'Carlos Lima',
    autor_email: 'carlos.lima@escola.br',
    escola: 'Colégio Dr Eraldo Tinoco',
    status: 'pendente',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'rep-002',
    tipo: 'sugestao',
    titulo: 'Adicionar filtro por ano letivo no módulo de matrículas',
    descricao: 'Seria muito útil para a coordenação poder filtrar matrículas de anos anteriores sem precisar pesquisar aluno por aluno.',
    autor_nome: 'Ana Souza',
    autor_email: 'ana.souza@escola.br',
    escola: 'Escola Modelo',
    status: 'pendente',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'rep-003',
    tipo: 'bug',
    titulo: 'Botão de encerramento de turma não responde no iOS/Safari',
    descricao: 'Professores usando iPad não estão conseguindo salvar o fechamento do 2º bimestre no formulário mobile.',
    autor_nome: 'Marina Alves',
    autor_email: 'marina.alves@escola.br',
    escola: 'Rede Municipal Sapeaçu',
    status: 'em_analise',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'rep-004',
    tipo: 'bug',
    titulo: 'Falha na impressão de boletins individuais',
    descricao: 'As notas do componente curricular de Matemática estão sobrepondo as notas de História no cabeçalho impresso.',
    autor_nome: 'Roberto Santos',
    autor_email: 'roberto.santos@escola.br',
    escola: 'E.M. Cecília Meireles',
    status: 'resolvido',
    resposta_root: 'Correção de CSS aplicada e implantada na versão 2.4.1.',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
  {
    id: 'rep-005',
    tipo: 'sugestao',
    titulo: 'Alteração na ordem das disciplinas do boletim impresso',
    descricao: 'Solicitamos reordenar para colocar Português antes de Matemática na folha oficial.',
    autor_nome: 'Fernanda Costa',
    autor_email: 'fernanda.costa@escola.br',
    escola: 'E.M. Sapeaçu',
    status: 'rejeitado',
    resposta_root: 'Mantida a ordem padrão conforme diretriz da Secretaria de Educação.',
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
]

export default function AdminReportsPage() {
  const supabase = createClient()

  const [reports, setReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [buscando, setBuscando] = useState(false)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')

  // Modal Detalhes & Resposta
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [respostaInput, setRespostaInput] = useState('')
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  const loadReports = async () => {
    setLoading(true)
    setBuscando(true)

    let supabaseData: BugReport[] = []

    try {
      const { data, error } = await (supabase.from as any)('bug_reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        supabaseData = data as unknown as BugReport[]
      }
    } catch (err) {
      console.warn('Erro ao buscar do Supabase, usando fallback local:', err)
    }

    // Carregar do localStorage se houver
    let localData: BugReport[] = []
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sig_bug_reports')
      if (stored) {
        try {
          localData = JSON.parse(stored)
        } catch (e) {
          console.error(e)
        }
      }
    }

    // Combinar Supabase + LocalStorage + Mock Data (evitando duplicatas por ID)
    const combinedMap = new Map<string, BugReport>()

    // Mock data primeiro
    mockReports.forEach(item => combinedMap.set(item.id, item))
    // Supabase data em seguida
    supabaseData.forEach(item => combinedMap.set(item.id, item))
    // Local data por último (sobrescreve se mais recente)
    localData.forEach(item => combinedMap.set(item.id, item))

    const finalArray = Array.from(combinedMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setReports(finalArray)
    setLoading(false)
    setBuscando(false)
  }

  useEffect(() => {
    loadReports()
  }, [])

  // Atualizar status no Supabase + state + localStorage
  const handleUpdateStatus = async (
    id: string, 
    novoStatus: 'pendente' | 'em_analise' | 'resolvido' | 'rejeitado',
    resposta?: string
  ) => {
    setSalvandoStatus(true)

    // Atualizar no Supabase
    try {
      await (supabase.from as any)('bug_reports')
        .update({ 
          status: novoStatus,
          resposta_root: resposta !== undefined ? resposta : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
    } catch (err) {
      console.warn('Supabase update bypass:', err)
    }

    // Atualizar estado local
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: novoStatus,
          resposta_root: resposta !== undefined ? resposta : r.resposta_root
        }
      }
      return r
    }))

    // Atualizar localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sig_bug_reports')
      let list: BugReport[] = stored ? JSON.parse(stored) : []
      const index = list.findIndex(r => r.id === id)
      if (index >= 0) {
        list[index].status = novoStatus
        if (resposta !== undefined) list[index].resposta_root = resposta
      } else {
        const itemToUpdate = reports.find(r => r.id === id)
        if (itemToUpdate) {
          list.unshift({ ...itemToUpdate, status: novoStatus, resposta_root: resposta })
        }
      }
      localStorage.setItem('sig_bug_reports', JSON.stringify(list))
    }

    setSalvandoStatus(false)

    if (novoStatus === 'resolvido') {
      toast.success('Reporte marcado como RESOLVIDO com sucesso!')
    } else if (novoStatus === 'rejeitado') {
      toast.info('Reporte marcado como REJEITADO.')
    } else if (novoStatus === 'em_analise') {
      toast.info('Reporte movido para EM ANÁLISE.')
    }

    if (modalOpen && selectedReport?.id === id) {
      setSelectedReport(prev => prev ? { ...prev, status: novoStatus, resposta_root: resposta !== undefined ? resposta : prev.resposta_root } : null)
      setModalOpen(false)
    }
  }

  const handleOpenDetailModal = (report: BugReport) => {
    setSelectedReport(report)
    setRespostaInput(report.resposta_root || '')
    setModalOpen(true)
  }

  // Filtrar reports
  const reportsFiltrados = reports.filter(item => {
    const matchBusca = 
      item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      item.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      item.autor_nome.toLowerCase().includes(busca.toLowerCase()) ||
      item.autor_email.toLowerCase().includes(busca.toLowerCase()) ||
      (item.escola && item.escola.toLowerCase().includes(busca.toLowerCase()))

    const matchStatus = filtroStatus === 'TODOS' || item.status === filtroStatus
    const matchTipo = filtroTipo === 'TODOS' || item.tipo === filtroTipo

    return matchBusca && matchStatus && matchTipo
  })

  // Estatísticas
  const totalReports = reports.length
  const totalPendentes = reports.filter(r => r.status === 'pendente').length
  const totalEmAnalise = reports.filter(r => r.status === 'em_analise').length
  const totalResolvidos = reports.filter(r => r.status === 'resolvido').length
  const totalRejeitados = reports.filter(r => r.status === 'rejeitado').length

  const getStatusBadge = (status: BugReport['status']) => {
    switch (status) {
      case 'pendente':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pendente
          </Badge>
        )
      case 'em_analise':
        return (
          <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Em Análise
          </Badge>
        )
      case 'resolvido':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolvido
          </Badge>
        )
      case 'rejeitado':
        return (
          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejeitado
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232328]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Bug className="w-8 h-8 text-rose-500" />
            Central de Reports & Feedbacks
            <span className="bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/50 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider uppercase">
              ROOT
            </span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Canal exclusivo para o SuperAdmin receber, analisar e marcar reports de bugs ou sugestões enviadas pelos usuários.
          </p>
        </div>

        <Button
          onClick={loadReports}
          disabled={buscando}
          className="bg-[#18181b] border border-[#3f3f46] text-white hover:bg-[#27272a] gap-2 shadow-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${buscando ? 'animate-spin' : ''}`} />
          <span>Atualizar Reports</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Total Reports</p>
            <p className="text-2xl font-bold text-white mt-1">{totalReports}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bug className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Pendentes</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{totalPendentes}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">Em Análise</p>
            <p className="text-2xl font-bold text-sky-400 mt-1">{totalEmAnalise}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Resolvidos</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{totalResolvidos}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4 shadow-md flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Rejeitados</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{totalRejeitados}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#121214] border border-[#232326] rounded-2xl p-4 shadow-md space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
            <Input
              type="text"
              placeholder="Buscar por título, usuário ou escola..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="bg-[#18181b] border-[#3f3f46] text-white pl-9 placeholder:text-zinc-500 h-11 rounded-xl focus:ring-[#0090ff] focus:border-[#0090ff]"
            />
          </div>

          {/* Filtro Status */}
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="w-full bg-[#18181b] border border-[#3f3f46] text-white h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff]"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="pendente">Pendentes</option>
            <option value="em_analise">Em Análise</option>
            <option value="resolvido">Resolvidos</option>
            <option value="rejeitado">Rejeitados</option>
          </select>

          {/* Filtro Tipo */}
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="w-full bg-[#18181b] border border-[#3f3f46] text-white h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff]"
          >
            <option value="TODOS">Todos os Tipos</option>
            <option value="bug">Erro / Bug</option>
            <option value="sugestao">Sugestão</option>
          </select>

          {/* Limpar Filtros */}
          <button
            type="button"
            onClick={() => {
              setBusca('')
              setFiltroStatus('TODOS')
              setFiltroTipo('TODOS')
            }}
            className="h-11 px-4 bg-[#27272a] hover:bg-[#3f3f46] text-white border border-[#3f3f46] rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Limpar Filtros</span>
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-[#121214] border border-[#232326] rounded-2xl p-12 text-center text-zinc-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0090ff]" />
            <p>Carregando reports de erros e sugestões...</p>
          </div>
        ) : reportsFiltrados.length === 0 ? (
          <div className="bg-[#121214] border border-dashed border-[#3f3f46] rounded-2xl p-12 text-center text-zinc-400">
            Nenhum report encontrado para os filtros selecionados.
          </div>
        ) : (
          reportsFiltrados.map(report => {
            const isBug = report.tipo === 'bug'
            return (
              <div
                key={report.id}
                className="bg-[#121214] border border-[#232326] hover:border-[#3f3f46] rounded-2xl p-5 shadow-md transition-all space-y-4"
              >
                {/* Header do Card */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {/* Badge Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isBug 
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500' 
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    }`}>
                      {isBug ? <Bug className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge 
                          variant="outline"
                          className={isBug ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}
                        >
                          {isBug ? 'BUG / ERRO' : 'SUGESTÃO'}
                        </Badge>
                        {getStatusBadge(report.status)}
                      </div>

                      <h3 className="text-base font-bold text-white mt-1.5 leading-snug">
                        {report.titulo}
                      </h3>
                    </div>
                  </div>

                  {/* Date & Quick Actions */}
                  <div className="flex items-center gap-2 self-start shrink-0">
                    <span className="text-xs text-zinc-500 flex items-center gap-1 mr-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(report.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                {/* Descrição */}
                <p className="text-sm text-zinc-300 bg-[#17171a] p-3.5 rounded-xl border border-[#232326] leading-relaxed">
                  {report.descricao}
                </p>

                {/* Resposta do Root (se houver) */}
                {report.resposta_root && (
                  <div className="bg-[#1e1b4b]/40 border border-[#4338ca]/30 rounded-xl p-3.5 text-xs text-indigo-200 space-y-1">
                    <span className="font-bold flex items-center gap-1.5 text-indigo-400 uppercase tracking-wider text-[10px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Resposta da Administração ROOT:
                    </span>
                    <p className="text-zinc-200 text-sm leading-relaxed">
                      {report.resposta_root}
                    </p>
                  </div>
                )}

                {/* Footer do Card: Autor Info & Botões de Ação ROOT */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#232328]">
                  {/* Informações do Solicitante */}
                  <div className="flex items-center gap-4 text-xs text-zinc-400 flex-wrap">
                    <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                      <User className="w-3.5 h-3.5 text-sky-400" />
                      {report.autor_nome} ({report.autor_email})
                    </span>
                    {report.escola && (
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <School className="w-3.5 h-3.5 text-purple-400" />
                        {report.escola}
                      </span>
                    )}
                  </div>

                  {/* Ações ROOT */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenDetailModal(report)}
                      className="px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-white border border-[#3f3f46] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detalhes / Responder</span>
                    </button>

                    {report.status !== 'resolvido' && (
                      <button
                        type="button"
                        disabled={salvandoStatus}
                        onClick={() => handleUpdateStatus(report.id, 'resolvido')}
                        className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Marcar Resolvido</span>
                      </button>
                    )}

                    {report.status !== 'rejeitado' && (
                      <button
                        type="button"
                        disabled={salvandoStatus}
                        onClick={() => handleUpdateStatus(report.id, 'rejeitado')}
                        className="px-3 py-1.5 bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Marcar Rejeitado</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Detalhes & Responder Reporte */}
      {selectedReport && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-xl bg-[#121214] border-[#27272a] text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
                {selectedReport.tipo === 'bug' ? (
                  <Bug className="w-5 h-5 text-rose-500" />
                ) : (
                  <Sparkles className="w-5 h-5 text-amber-400" />
                )}
                Gerenciar Reporte ROOT
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                <div>
                  <h4 className="font-bold text-white text-base leading-snug">
                    {selectedReport.titulo}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Por: {selectedReport.autor_nome} — {selectedReport.escola}
                  </p>
                </div>
                <div>{getStatusBadge(selectedReport.status)}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Descrição do Usuário
                </label>
                <div className="bg-[#17171a] p-3.5 rounded-xl border border-[#27272a] text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {selectedReport.descricao}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Resposta / Resolução do Administrador (Opcional)
                </label>
                <Textarea
                  value={respostaInput}
                  onChange={e => setRespostaInput(e.target.value)}
                  placeholder="Escreva uma observação ou detalhes da solução para este reporte..."
                  className="bg-[#17171a] border-[#3f3f46] text-white focus:ring-[#0090ff] focus:border-[#0090ff] min-h-[90px] rounded-xl text-sm"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end border-t border-[#27272a]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="bg-[#18181b] border-[#3f3f46] text-white hover:bg-[#27272a]"
                >
                  Fechar
                </Button>

                <Button
                  type="button"
                  disabled={salvandoStatus}
                  onClick={() => handleUpdateStatus(selectedReport.id, 'em_analise', respostaInput)}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1.5"
                >
                  <AlertCircle className="w-4 h-4" />
                  Em Análise
                </Button>

                <Button
                  type="button"
                  disabled={salvandoStatus}
                  onClick={() => handleUpdateStatus(selectedReport.id, 'rejeitado', respostaInput)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
                >
                  <X className="w-4 h-4" />
                  Marcar Rejeitado
                </Button>

                <Button
                  type="button"
                  disabled={salvandoStatus}
                  onClick={() => handleUpdateStatus(selectedReport.id, 'resolvido', respostaInput)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Marcar Resolvido
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
