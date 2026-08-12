'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  PenTool, 
  Search, 
  Printer, 
  History,
  UserX,
  GraduationCap,
  Users,
  ShieldAlert
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { 
  restoreAction, 
  purgeAction, 
  purgeFuncionarioDesligadoAction, 
  purgeAlunoArquivadoAction 
} from './actions'
import { cn } from '@/lib/utils'
import { PrintRelatorioAssinaturas } from '@/components/print/print-relatorio-assinaturas'
import { useLocalSearch } from '@/hooks/useLocalSearch'

export default function AdminLixeiraPage() {
  const router = useRouter()
  const { funcionario } = useAuthStore()
  const supabase = createClient()
  
  // Mounted & Tab Refs for Race Condition Protection
  const isMounted = useRef(true)
  const activeTabRef = useRef<'trash' | 'signatures' | 'inactives'>('trash')

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Main Tab State
  const [activeTab, setActiveTab] = useState<'trash' | 'signatures' | 'inactives'>('trash')
  
  // Update ref when state changes
  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  // Sub-tab State for Inactives (Desligados & Arquivados)
  const [inactiveSubTab, setInactiveSubTab] = useState<'funcionarios' | 'alunos'>('funcionarios')

  // Search State
  const [searchTerm, setSearchTerm] = useState('')

  // Trash Bin States
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Signature History States
  const [sessionTimestamp] = useState(() => Date.now())
  const [sigLogs, setSigLogs] = useState<any[]>([])
  const [sigLogsLoading, setSigLogsLoading] = useState(false)
  const [sigFilter, setSigFilter] = useState<'ALL' | 'RESP' | 'FUNC'>('ALL')
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [isPrintOpen, setIsPrintOpen] = useState(false)

  // Inactive Purge States (Funcionários Desligados / Alunos Arquivados)
  const [funcionariosDesligados, setFuncionariosDesligados] = useState<any[]>([])
  const [alunosArquivados, setAlunosArquivados] = useState<any[]>([])
  const [inactivesLoading, setInactivesLoading] = useState(false)

  // Purge Confirmation Dialog State
  const [confirmPurgeModal, setConfirmPurgeModal] = useState<{
    type: 'trash' | 'funcionario' | 'aluno'
    item: any
  } | null>(null)
  const [isPurging, setIsPurging] = useState(false)

  /* ── 1. Carregar Lixeira Ativa ────────────────────────────────────────── */
  const loadTrash = async () => {
    if (!isMounted.current) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('trash_bin')
        .select('id, table_name, record_id, record_summary, deleted_by_id, deleted_by_name, deleted_by_email, deleted_at, status, resolution_note')
        .in('status', ['PENDING', 'deleted'])
        .order('deleted_at', { ascending: false })
        .limit(100)

      if (error) throw error
      if (isMounted.current && activeTabRef.current === 'trash') {
        setItems(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar lixeira:', error)
      toast.error('Erro ao carregar itens da lixeira.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  /* ── 2. Carregar Histórico de Assinaturas ────────────────────────────── */
  const loadSignatureLogs = async () => {
    if (!isMounted.current) return
    setSigLogsLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, entity, entity_id, action, created_at, user_name, ip_address, new_data, old_data')
        .in('entity', ['alunos_assinatura_responsavel', 'alunos_assinatura_funcionario'])
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      if (isMounted.current && activeTabRef.current === 'signatures') {
        setSigLogs(data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de assinaturas:', error)
      toast.error('Erro ao carregar auditoria de assinaturas.')
    } finally {
      if (isMounted.current) setSigLogsLoading(false)
    }
  }

  /* ── 3. Carregar Inativos (Desligados & Arquivados) ──────────────────── */
  const loadInactives = async () => {
    if (!isMounted.current) return
    setInactivesLoading(true)
    try {
      if (inactiveSubTab === 'funcionarios') {
        const { data, error } = await supabase
          .from('funcionarios')
          .select('id, nome, email, cpf, cargo, status, deleted_at, created_at')
          .or('status.eq.desligado,status.eq.Desligado,status.eq.DESLIGADO,deleted_at.not.is.null')
          .order('created_at', { ascending: false })

        if (error) throw error
        if (isMounted.current && activeTabRef.current === 'inactives') {
          setFuncionariosDesligados(data || [])
        }
      } else {
        // Busca tabela arquivados
        const { data: arqData, error: arqErr } = await supabase
          .from('arquivados')
          .select('id, tipo, tabela_origem, referencia_id, motivo, created_at, status, payload_completo, escola_origem_id, escolas(nome)')
          .neq('status', 'EXCLUIDO')
          .or('tipo.eq.ALUNO,tipo.eq.ALUNO_TRANSFERIDO,tabela_origem.eq.alunos')
          .order('created_at', { ascending: false })

        if (arqErr) console.error('Erro ao carregar arquivados:', arqErr)

        // Busca alunos com deleted_at
        const { data: softData, error: softErr } = await supabase
          .from('alunos')
          .select('id, nome, cpf, numero_matricula, deleted_at, created_at, escola_id, escolas(nome)')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false })

        if (softErr) console.error('Erro ao carregar alunos excluídos:', softErr)

        const mapAlunos: Record<string, any> = {}

        if (softData) {
          for (const sa of softData) {
            const esc = sa.escolas as any
            mapAlunos[sa.id] = {
              id: sa.id,
              aluno_id: sa.id,
              arquivado_id: null,
              nome: sa.nome ?? 'Sem nome',
              cpf_matricula: sa.cpf ?? sa.numero_matricula ?? 'Não informado',
              escola_nome: esc?.nome ?? 'Rede Municipal',
              motivo: 'Exclusão lógica (Soft delete)',
              data_arquivamento: sa.deleted_at ?? sa.created_at,
              status: 'DESATIVADO'
            }
          }
        }

        if (arqData) {
          for (const arq of arqData) {
            const refId = arq.referencia_id ?? arq.id
            const payload = (arq.payload_completo ?? {}) as Record<string, any>
            const esc = arq.escolas as any
            mapAlunos[refId] = {
              id: arq.id,
              aluno_id: refId,
              arquivado_id: arq.id,
              nome: payload.nome ?? mapAlunos[refId]?.nome ?? 'Sem nome',
              cpf_matricula: payload.cpf ?? payload.numero_matricula ?? mapAlunos[refId]?.cpf_matricula ?? 'Não informado',
              escola_nome: esc?.nome ?? mapAlunos[refId]?.escola_nome ?? 'Rede Municipal',
              motivo: arq.motivo ?? 'Arquivamento histórico',
              data_arquivamento: arq.created_at,
              status: arq.status ?? 'ARQUIVADO'
            }
          }
        }

        const merged = Object.values(mapAlunos).sort(
          (a, b) => new Date(b.data_arquivamento).getTime() - new Date(a.data_arquivamento).getTime()
        )

        if (isMounted.current && activeTabRef.current === 'inactives') {
          setAlunosArquivados(merged)
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar inativos:', err)
      toast.error('Erro ao buscar lista de inativos.')
    } finally {
      if (isMounted.current) setInactivesLoading(false)
    }
  }

  /* ── Sync Tab Triggers ────────────────────────────────────────────────── */
  useEffect(() => {
    if (activeTab === 'trash') {
      loadTrash()
    } else if (activeTab === 'signatures') {
      loadSignatureLogs()
    } else if (activeTab === 'inactives') {
      loadInactives()
    }
  }, [activeTab, inactiveSubTab])

  /* ── Ações do Usuário (Restauração e Expurgo) ────────────────────────── */
  const handleRestore = async (item: any) => {
    if (!confirm('Deseja realmente restaurar este registro?')) return
    const performedBy = { id: funcionario?.id, name: funcionario?.nome, email: funcionario?.email }
    
    const { success } = await restoreAction(item.id, item.table_name, item.record_id, performedBy)
    if (success) {
      toast.success('Registro restaurado com sucesso!')
      loadTrash()
    } else {
      toast.error('Erro ao restaurar registro.')
    }
  }

  const executePurge = async () => {
    if (!confirmPurgeModal) return
    setIsPurging(true)
    const { type, item } = confirmPurgeModal
    const performedBy = { id: funcionario?.id, name: funcionario?.nome, email: funcionario?.email }

    try {
      if (type === 'trash') {
        const { success } = await purgeAction(item.id, item.table_name, item.record_id, performedBy)
        if (success) {
          toast.success('Registro expurgado definitivamente!')
          loadTrash()
        } else {
          toast.error('Erro ao expurgar registro da lixeira.')
        }
      } else if (type === 'funcionario') {
        const res = await purgeFuncionarioDesligadoAction(item.id, performedBy)
        if (res.success) {
          toast.success(`Funcionário ${item.nome} expurgado com sucesso!`)
          loadInactives()
        } else {
          toast.error(`Erro ao expurgar funcionário: ${res.error}`)
        }
      } else if (type === 'aluno') {
        const res = await purgeAlunoArquivadoAction({
          alunoId: item.aluno_id,
          arquivadoId: item.arquivado_id,
          performedBy
        })
        if (res.success) {
          toast.success(`Aluno ${item.nome} expurgado definitivamente!`)
          loadInactives()
        } else {
          toast.error(`Erro ao expurgar aluno: ${res.error}`)
        }
      }
    } catch (err: any) {
      toast.error('Falha inesperada durante a exclusão.')
    } finally {
      setIsPurging(false)
      setConfirmPurgeModal(null)
    }
  }

  /* ── Filtros de Busca ─────────────────────────────────────────────────── */
  const trashFiltrados = useLocalSearch(items, searchTerm, (item, term) => {
    return [item.table_name, item.record_summary, item.deleted_by_name, item.deleted_by_email].some(val =>
      (val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
    )
  })

  const funcionariosFiltrados = useLocalSearch(funcionariosDesligados, searchTerm, (func, term) => {
    return [func.nome, func.email, func.cargo, func.cpf, func.status].some(val =>
      (val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
    )
  })

  const alunosFiltrados = useLocalSearch(alunosArquivados, searchTerm, (aluno, term) => {
    return [aluno.nome, aluno.cpf_matricula, aluno.escola_nome, aluno.motivo].some(val =>
      (val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
    )
  })

  // Grouped Signature Logs Setup
  const filteredSigLogs = useMemo(() => {
    return sigLogs.filter((log) => {
      const searchLower = searchTerm.toLowerCase()
      const studentName = log.new_data?.student_name || log.old_data?.student_name || ''
      const userName = log.user_name || ''
      const ip = log.ip_address || ''
      const device = log.new_data?.user_agent || log.old_data?.user_agent || ''
      
      const matchesSearch = 
        studentName.toLowerCase().includes(searchLower) ||
        userName.toLowerCase().includes(searchLower) ||
        ip.toLowerCase().includes(searchLower) ||
        device.toLowerCase().includes(searchLower)
        
      if (sigFilter === 'ALL') return matchesSearch
      if (sigFilter === 'RESP') return matchesSearch && log.entity === 'alunos_assinatura_responsavel'
      if (sigFilter === 'FUNC') return matchesSearch && log.entity === 'alunos_assinatura_funcionario'
      
      return matchesSearch
    })
  }, [sigLogs, searchTerm, sigFilter])

  const groupedStudents = useMemo(() => {
    const studentsMap: Record<string, any> = {}
    const sortedLogs = [...sigLogs].reverse()

    for (const log of sortedLogs) {
      const studentId = log.entity_id
      if (!studentId) continue

      const studentName = log.new_data?.student_name || log.old_data?.student_name || 'Desconhecido'
      const sigUrl = log.new_data?.url || log.old_data?.url || null
      const isResp = log.entity === 'alunos_assinatura_responsavel'

      if (!studentsMap[studentId]) {
        studentsMap[studentId] = {
          studentId,
          studentName,
          logs: [],
          lastUpdate: log.created_at,
          hasResp: false,
          hasFunc: false,
          respUrl: null,
          funcUrl: null
        }
      }

      const entry = studentsMap[studentId]
      entry.logs.unshift(log)
      entry.lastUpdate = log.created_at

      if (isResp) {
        entry.hasResp = log.action !== 'DELETE'
        entry.respUrl = log.action !== 'DELETE' ? sigUrl : null
      } else {
        entry.hasFunc = log.action !== 'DELETE'
        entry.funcUrl = log.action !== 'DELETE' ? sigUrl : null
      }
    }

    return Object.values(studentsMap).sort((a, b) => 
      new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime()
    )
  }, [sigLogs])

  const filteredStudents = useMemo(() => {
    return groupedStudents.filter((student) => {
      const searchLower = searchTerm.toLowerCase()
      const matchesStudent = 
        student.studentName.toLowerCase().includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower)
        
      const matchesLog = student.logs.some((log: any) => {
        const userName = log.user_name || ''
        const ip = log.ip_address || ''
        const device = log.new_data?.user_agent || log.old_data?.user_agent || ''
        return (
          userName.toLowerCase().includes(searchLower) ||
          ip.toLowerCase().includes(searchLower) ||
          device.toLowerCase().includes(searchLower)
        )
      })
      
      const matchesSearch = matchesStudent || matchesLog
      if (sigFilter === 'ALL') return matchesSearch
      if (sigFilter === 'RESP') return matchesSearch && student.hasResp
      if (sigFilter === 'FUNC') return matchesSearch && student.hasFunc
      return matchesSearch
    })
  }, [groupedStudents, searchTerm, sigFilter])

  const formatUserAgent = (ua: string | null | undefined) => {
    if (!ua) return 'Dispositivo desconhecido'
    const lower = ua.toLowerCase()
    
    let device = 'Desktop'
    if (lower.includes('android')) device = 'Celular (Android)'
    else if (lower.includes('iphone')) device = 'Celular (iPhone)'
    else if (lower.includes('ipad')) device = 'Tablet (iPad)'
    
    let browser = 'Navegador'
    if (lower.includes('firefox')) browser = 'Firefox'
    else if (lower.includes('chrome')) browser = 'Chrome'
    else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari'
    else if (lower.includes('edge')) browser = 'Edge'
    
    return `${device} — ${browser}`
  }

  /* ── Definição de Colunas das Tabelas ─────────────────────────────────── */
  const trashColumns: TableColumn<any>[] = [
    {
      header: 'Tabela',
      accessor: (item) => (
        <Badge variant="outline" className="text-xs font-semibold bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-500/10 dark:text-zinc-400 dark:border-slate-500/20 uppercase">
          {item.table_name}
        </Badge>
      )
    },
    {
      header: 'Registro',
      accessor: (item) => <span className="text-foreground font-medium">{item.record_summary}</span>
    },
    {
      header: 'Excluído por',
      accessor: (item) => (
        <div className="flex flex-col">
          <span className="text-sm text-foreground font-semibold">{item.deleted_by_name ?? 'Sistema'}</span>
          <span className="text-xs text-muted-foreground">{item.deleted_by_email ?? '-'}</span>
        </div>
      )
    },
    {
      header: 'Data da Exclusão',
      accessor: (item) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {item.deleted_at ? new Date(item.deleted_at).toLocaleString('pt-BR') : '-'}
        </span>
      )
    },
    {
      header: 'Ações ROOT',
      className: 'text-right',
      headClassName: 'text-right',
      accessor: (item) => (
        <div className="space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRestore(item)}
            className="border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-500/20 dark:text-emerald-400 dark:bg-transparent dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 rounded-xl h-8 text-xs font-semibold cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Restaurar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmPurgeModal({ type: 'trash', item })}
            className="border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-500/20 dark:text-rose-400 dark:bg-transparent dark:hover:bg-rose-500/10 dark:hover:text-rose-300 rounded-xl h-8 text-xs font-semibold cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Expurgar
          </Button>
        </div>
      )
    }
  ]

  const funcionariosColumns: TableColumn<any>[] = [
    {
      header: 'Funcionário / Cargo',
      accessor: (func) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground uppercase">{func.nome}</span>
          <span className="text-xs text-muted-foreground">{func.cargo ?? 'Sem cargo definido'}</span>
        </div>
      )
    },
    {
      header: 'E-mail',
      accessor: (func) => <span className="text-foreground/80 text-sm">{func.email ?? '-'}</span>
    },
    {
      header: 'CPF',
      accessor: (func) => <span className="text-muted-foreground text-sm font-mono">{func.cpf ?? '-'}</span>
    },
    {
      header: 'Status',
      accessor: (func) => (
        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 text-xs font-semibold uppercase">
          {func.status ?? 'DESLIGADO'}
        </Badge>
      )
    },
    {
      header: 'Data de Desligamento',
      accessor: (func) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {func.deleted_at 
            ? new Date(func.deleted_at).toLocaleString('pt-BR') 
            : (func.created_at ? new Date(func.created_at).toLocaleDateString('pt-BR') : '-')}
        </span>
      )
    },
    {
      header: 'Ações ROOT',
      className: 'text-right',
      headClassName: 'text-right',
      accessor: (func) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmPurgeModal({ type: 'funcionario', item: func })}
          className="border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-500/20 dark:text-rose-400 dark:bg-transparent dark:hover:bg-rose-500/10 dark:hover:text-rose-300 rounded-xl h-8 text-xs font-semibold cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Expurgar Definitivo
        </Button>
      )
    }
  ]

  const alunosColumns: TableColumn<any>[] = [
    {
      header: 'Aluno',
      accessor: (aluno) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground uppercase">{aluno.nome}</span>
          <span className="text-[10px] text-muted-foreground font-mono">ID: {aluno.aluno_id}</span>
        </div>
      )
    },
    {
      header: 'CPF / Matrícula',
      accessor: (aluno) => <span className="text-foreground/80 text-sm font-mono">{aluno.cpf_matricula}</span>
    },
    {
      header: 'Escola de Origem',
      accessor: (aluno) => <span className="text-muted-foreground text-sm">{aluno.escola_nome}</span>
    },
    {
      header: 'Motivo',
      accessor: (aluno) => <span className="text-muted-foreground text-sm max-w-[200px] truncate block">{aluno.motivo}</span>
    },
    {
      header: 'Data Arquivamento',
      accessor: (aluno) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {aluno.data_arquivamento ? new Date(aluno.data_arquivamento).toLocaleDateString('pt-BR') : '-'}
        </span>
      )
    },
    {
      header: 'Ações ROOT',
      className: 'text-right',
      headClassName: 'text-right',
      accessor: (aluno) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmPurgeModal({ type: 'aluno', item: aluno })}
          className="border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:border-rose-500/20 dark:text-rose-400 dark:bg-transparent dark:hover:bg-rose-500/10 dark:hover:text-rose-300 rounded-xl h-8 text-xs font-semibold cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Expurgar Definitivo
        </Button>
      )
    }
  ]

  const signatureColumns: TableColumn<any>[] = [
    {
      header: 'Aluno / ID',
      accessor: (student) => (
        <div>
          <div className="font-semibold text-foreground">{student.studentName}</div>
          <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{student.studentId}</div>
        </div>
      )
    },
    {
      header: 'Assinatura Responsável',
      className: 'text-center',
      headClassName: 'text-center',
      accessor: (student) => student.respUrl ? (
        <div className="inline-block border border-border rounded-lg bg-card p-1 select-none pointer-events-none shadow-sm">
          <img 
            src={`${student.respUrl}${student.respUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`} 
            alt="Assinatura Responsável" 
            className="max-h-7 max-w-[80px] object-contain"
          />
        </div>
      ) : (
        <Badge variant="outline" className="text-muted-foreground border-border bg-muted text-xs font-semibold px-2.5 py-0.5">
          Pendente
        </Badge>
      )
    },
    {
      header: 'Assinatura Funcionário',
      className: 'text-center',
      headClassName: 'text-center',
      accessor: (student) => student.funcUrl ? (
        <div className="inline-block border border-border rounded-lg bg-card p-1 select-none pointer-events-none shadow-sm">
          <img 
            src={`${student.funcUrl}${student.funcUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`} 
            alt="Assinatura Funcionário" 
            className="max-h-7 max-w-[80px] object-contain"
          />
        </div>
      ) : (
        <Badge variant="outline" className="text-muted-foreground border-border bg-muted text-xs font-semibold px-2.5 py-0.5">
          Pendente
        </Badge>
      )
    },
    {
      header: 'Última Atividade',
      accessor: (student) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {student.lastUpdate ? new Date(student.lastUpdate).toLocaleString('pt-BR') : '-'}
        </span>
      )
    },
    {
      header: 'Ações',
      className: 'text-right',
      headClassName: 'text-right',
      accessor: (student) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedStudent(student)}
          className="hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl h-8 w-8 flex items-center justify-center p-0 cursor-pointer inline-flex"
          title="Ver Histórico Completo"
        >
          <History className="w-4 h-4 text-sky-600 dark:text-[#3ea6ff]" />
        </Button>
      )
    }
  ]

  const handleRefresh = () => {
    if (activeTab === 'trash') loadTrash()
    else if (activeTab === 'signatures') loadSignatureLogs()
    else if (activeTab === 'inactives') loadInactives()
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" />
            <span>Lixeira Global & Expurgo</span>
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {activeTab === 'trash' && 'Registros apagados e pendentes de restauração ou expurgo.'}
            {activeTab === 'signatures' && 'Histórico de alteração e coleta de assinaturas digitais da rede.'}
            {activeTab === 'inactives' && 'Expurgo definitivo de funcionários desligados e alunos arquivados (cadastros de teste).'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {activeTab === 'trash' && (
            <Button 
              variant="outline"
              onClick={() => router.push('/admin/lixeira/relatorio')}
              className="bg-card border-borderCustom hover:bg-muted text-foreground/80 hover:text-foreground rounded-xl h-10 px-4 text-xs font-semibold"
            >
              <FileText className="w-4 h-4 mr-2" /> Relatório de Exclusões
            </Button>
          )}

          {activeTab === 'signatures' && (
            <Button 
              variant="outline"
              onClick={() => setIsPrintOpen(true)}
              disabled={filteredSigLogs.length === 0}
              className="bg-card border-borderCustom hover:bg-muted text-foreground/80 hover:text-foreground rounded-xl h-10 px-4 text-xs font-semibold"
            >
              <Printer className="w-4 h-4 mr-2 text-[#3ea6ff]" /> Imprimir Relatório
            </Button>
          )}
          
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={loading || sigLogsLoading || inactivesLoading}
            className="bg-card border-borderCustom text-foreground hover:bg-muted rounded-xl h-10 w-10 flex items-center justify-center p-0"
            title="Atualizar Dados"
          >
            <RefreshCw className={cn("w-4 h-4", (loading || sigLogsLoading || inactivesLoading) ? "animate-spin" : "")} />
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-borderCustom gap-2">
        <button
          onClick={() => setActiveTab('trash')}
          className={cn(
            "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'trash'
              ? "border-sky-600 text-sky-600 dark:border-[#3ea6ff] dark:text-[#3ea6ff]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Trash2 className="w-4.5 h-4.5" />
          Lixeira Ativa
        </button>

        <button
          onClick={() => setActiveTab('inactives')}
          className={cn(
            "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'inactives'
              ? "border-rose-600 text-rose-700 dark:text-rose-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <UserX className="w-4.5 h-4.5" />
          Expurgar Inativos (Desligados / Arquivados)
        </button>

        <button
          onClick={() => setActiveTab('signatures')}
          className={cn(
            "px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'signatures'
              ? "border-sky-600 text-sky-600 dark:border-[#3ea6ff] dark:text-[#3ea6ff]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <PenTool className="w-4.5 h-4.5" />
          Histórico de Assinaturas
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={
            activeTab === 'trash' 
              ? "Buscar por tabela, resumo ou usuário..." 
              : activeTab === 'inactives'
                ? (inactiveSubTab === 'funcionarios' ? "Buscar funcionário por nome, CPF, e-mail..." : "Buscar aluno por nome, CPF, escola...")
                : "Buscar por aluno, assinante, IP ou dispositivo..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-input border-borderCustom pl-10 text-foreground rounded-xl focus-visible:ring-highlight h-10 text-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* Main Content Render */}
      {activeTab === 'trash' && (
        <StandardTable
          data={trashFiltrados}
          columns={trashColumns}
          keyExtractor={(item) => item.id}
          loading={loading}
          emptyMessage="Nenhum registro pendente na lixeira."
        />
      )}

      {activeTab === 'inactives' && (
        <div className="space-y-4">
          {/* Sub-tab Selector */}
          <div className="flex items-center gap-2 bg-muted/60 p-1.5 rounded-2xl border border-borderCustom w-fit">
            <button
              onClick={() => setInactiveSubTab('funcionarios')}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                inactiveSubTab === 'funcionarios'
                  ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              Funcionários Desligados ({funcionariosDesligados.length})
            </button>

            <button
              onClick={() => setInactiveSubTab('alunos')}
              className={cn(
                "px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer",
                inactiveSubTab === 'alunos'
                  ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <GraduationCap className="w-4 h-4" />
              Alunos Arquivados ({alunosArquivados.length})
            </button>
          </div>

          {inactiveSubTab === 'funcionarios' ? (
            <StandardTable
              data={funcionariosFiltrados}
              columns={funcionariosColumns}
              keyExtractor={(func) => func.id}
              loading={inactivesLoading}
              emptyMessage="Nenhum funcionário desligado encontrado."
            />
          ) : (
            <StandardTable
              data={alunosFiltrados}
              columns={alunosColumns}
              keyExtractor={(aluno) => aluno.id}
              loading={inactivesLoading}
              emptyMessage="Nenhum aluno arquivado encontrado."
            />
          )}
        </div>
      )}

      {activeTab === 'signatures' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <select
              value={sigFilter}
              onChange={(e: any) => setSigFilter(e.target.value)}
              className="bg-input border border-borderCustom text-foreground rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-highlight h-10 w-full md:w-56"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="RESP">Apenas Responsável</option>
              <option value="FUNC">Apenas Funcionário</option>
            </select>
          </div>

          <StandardTable
            data={filteredStudents}
            columns={signatureColumns}
            keyExtractor={(student) => student.studentId}
            loading={sigLogsLoading}
            emptyMessage="Nenhum registro de assinatura encontrado."
          />
        </div>
      )}

      {/* Report Modal */}
      {isPrintOpen && (
        <PrintRelatorioAssinaturas 
          logs={filteredSigLogs} 
          onClose={() => setIsPrintOpen(false)} 
        />
      )}

      {/* Signature Timeline Modal */}
      {selectedStudent && (
        <StandardDialog
          open={!!selectedStudent}
          onOpenChange={() => setSelectedStudent(null)}
          title="Histórico de Assinaturas do Aluno"
          description="Linha do tempo de todas as coletas, atualizações e exclusões registradas."
          maxWidth="sm:max-w-2xl"
          footer={
            <div className="flex justify-end w-full pt-3.5 border-t border-borderCustom">
              <Button
                onClick={() => setSelectedStudent(null)}
                className="bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl h-10 px-5 cursor-pointer text-xs"
              >
                Fechar Histórico
              </Button>
            </div>
          }
        >
          <div className="space-y-4 pt-4 text-sm max-h-[55vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4 bg-muted/60 p-3.5 rounded-xl border border-borderCustom">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Aluno Auditado</span>
                <span className="font-semibold text-foreground">{selectedStudent.studentName}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">ID do Aluno (UUID)</span>
                <span className="font-mono text-xs text-muted-foreground">{selectedStudent.studentId}</span>
              </div>
            </div>

            <div className="relative pl-4 space-y-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-0.5 before:bg-borderCustom">
              {selectedStudent.logs.map((log: any) => {
                const sigUrl = log.new_data?.url || log.old_data?.url
                const isResp = log.entity === 'alunos_assinatura_responsavel'
                const isDelete = log.action === 'DELETE'
                
                return (
                  <div key={log.id} className="relative pl-5 space-y-2">
                    <span className={cn(
                      "absolute -left-[15px] top-1.5 w-2.5 h-2.5 rounded-full border border-background",
                      isDelete ? "bg-rose-500 animate-pulse" : "bg-emerald-500"
                    )} />
                    
                    <div className="bg-muted/60 border border-borderCustom p-4 rounded-xl space-y-3 shadow-inner">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borderCustom pb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-bold border-none px-2 py-0.5 rounded-md uppercase",
                            isResp ? "bg-sky-50 text-sky-700 dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          )}>
                            {isResp ? 'Responsável' : 'Funcionário'}
                          </Badge>
                          <span className={cn(
                            "text-xs font-bold uppercase",
                            isDelete ? "text-rose-600 dark:text-rose-500" : "text-emerald-600 dark:text-emerald-500"
                          )}>
                            {isDelete ? 'Exclusão' : 'Atualização'}
                          </span>
                        </div>
                        
                        <span className="text-muted-foreground text-xs">
                          {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5">Assinante / Operador</span>
                          <span className="text-foreground font-medium block">{log.user_name || '-'}</span>
                          {log.user_email && <span className="text-muted-foreground block">{log.user_email}</span>}
                        </div>
                        
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-0.5 font-mono">Conexão & IP</span>
                          <span className="text-foreground font-mono block">{log.ip_address || 'IP não registrado'}</span>
                          <span className="text-muted-foreground block leading-tight mt-0.5 text-[10px]">
                            {formatUserAgent(log.new_data?.user_agent || log.old_data?.user_agent)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-borderCustom">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Assinatura no Registro</span>
                        {sigUrl && !isDelete ? (
                          <div className="inline-block border border-border rounded-lg bg-card p-2 select-none pointer-events-none shadow-md">
                            <img 
                              src={`${sigUrl}${sigUrl.includes('?') ? '&' : '?'}t=${sessionTimestamp}`}
                              alt="Assinatura Auditada" 
                              className="max-h-12 w-auto object-contain"
                            />
                          </div>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-500 italic text-xs font-semibold">Assinatura Excluída</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </StandardDialog>
      )}

      {/* Confirmation Dialog for Purging */}
      {confirmPurgeModal && (
        <StandardDialog
          open={!!confirmPurgeModal}
          onOpenChange={(open) => !open && !isPurging && setConfirmPurgeModal(null)}
          title="Confirmar Expurgo Definitivo"
          description="Esta ação é permanente e irreversível."
          maxWidth="sm:max-w-lg"
          footer={
            <div className="flex justify-end gap-2 w-full pt-3.5 border-t border-borderCustom">
              <Button
                disabled={isPurging}
                onClick={() => setConfirmPurgeModal(null)}
                variant="outline"
                className="border-borderCustom text-foreground/80 hover:bg-muted rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </Button>

              <Button
                disabled={isPurging}
                onClick={executePurge}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl h-10 px-5 text-xs shadow-md cursor-pointer"
              >
                {isPurging ? 'Expurgando...' : 'Confirmar Expurgo'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4 pt-2">
            <div className="bg-rose-50 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200 space-y-1">
                <span className="font-bold text-rose-700 dark:text-rose-400 block text-sm">AVISO DE EXCLUSÃO DEFINITIVA</span>
                <p>
                  A exclusão expurgará permanentemente o cadastro selecionado do banco de dados do município. 
                  Esta operação não poderá ser desfeita.
                </p>
              </div>
            </div>

            <div className="bg-surface-2 p-3.5 rounded-xl border border-borderCustom text-xs space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Registro Selecionado</span>
              
              {confirmPurgeModal.type === 'trash' && (
                <div>
                  <span className="font-bold text-foreground block">{confirmPurgeModal.item.record_summary}</span>
                  <span className="text-muted-foreground block">Tabela: {confirmPurgeModal.item.table_name}</span>
                </div>
              )}

              {confirmPurgeModal.type === 'funcionario' && (
                <div>
                  <span className="font-bold text-foreground block">{confirmPurgeModal.item.nome}</span>
                  <span className="text-muted-foreground block">Cargo: {confirmPurgeModal.item.cargo ?? 'Não informado'}</span>
                  <span className="text-muted-foreground block">E-mail: {confirmPurgeModal.item.email ?? '-'}</span>
                </div>
              )}

              {confirmPurgeModal.type === 'aluno' && (
                <div>
                  <span className="font-bold text-foreground block">{confirmPurgeModal.item.nome}</span>
                  <span className="text-muted-foreground block">CPF / Matrícula: {confirmPurgeModal.item.cpf_matricula}</span>
                  <span className="text-muted-foreground block">Escola: {confirmPurgeModal.item.escola_nome}</span>
                </div>
              )}
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  )
}
