'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useSchoolStore } from '@/store/useSchoolStore'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { SchoolSelector } from '@/components/SchoolSelector'
import { 
  Activity, 
  Search, 
  Filter, 
  ArrowLeft, 
  UserCheck, 
  GraduationCap, 
  FileText, 
  Eye, 
  Edit3, 
  PlusCircle, 
  Clock,
  Printer
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AuditLogItem {
  id: string
  created_at: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | string
  entity: string
  entity_id: string
  tenant_id?: string | null
  user_id: string | null
  user_name: string | null
  user_email: string | null
  user_cargo: string | null
  old_data: any
  new_data: any
}

export default function CentralAtividadesPage() {
  const searchParams = useSearchParams()
  const urlLogId = searchParams.get('log_id')
  const urlEscolaId = searchParams.get('escola_id')

  const { selectedEscola, loadEscolas } = useSchoolStore()
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroAcao, setFiltroAcao] = useState<string>('todas')
  const [filtroEntidade, setFiltroEntidade] = useState<string>('todas')
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('7dias')

  useEffect(() => {
    loadEscolas()
  }, [loadEscolas])

  const targetEscolaId = selectedEscola?.id || urlEscolaId || null

  const fetchLogs = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    // SALVAGUARDA DE SEGURANÇA MULTI-TENANT: Filtrar estritamente por Escola ativa
    if (targetEscolaId) {
      query = query.eq('tenant_id', targetEscolaId)
    }

    // Aplicar filtro de período
    const agora = new Date()
    if (filtroPeriodo === 'hoje') {
      const inicioHoje = new Date(agora.setHours(0, 0, 0, 0)).toISOString()
      query = query.gte('created_at', inicioHoje)
    } else if (filtroPeriodo === '7dias') {
      const ha7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', ha7Dias)
    } else if (filtroPeriodo === '30dias') {
      const ha30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', ha30Dias)
    }

    // Aplicar filtro de Ação
    if (filtroAcao !== 'todas') {
      query = query.eq('action', filtroAcao)
    }

    // Aplicar filtro de Entidade
    if (filtroEntidade !== 'todas') {
      query = query.eq('entity', filtroEntidade)
    }

    try {
      const { data, error } = await query
      if (error) throw error
      setLogs((data as AuditLogItem[]) ?? [])
    } catch (err) {
      console.error('Erro ao carregar Central de Atividades:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filtroPeriodo, filtroAcao, filtroEntidade, targetEscolaId])

  // Filtragem local por texto de busca + SALVAGUARDA ESTRITA DE ESCOLA
  const logsFiltrados = logs.filter((log) => {
    // Salvaguarda adicional no cliente
    if (targetEscolaId) {
      const logEscolaId = log.tenant_id || log.new_data?.escola_id || log.old_data?.escola_id
      if (logEscolaId && logEscolaId !== targetEscolaId) {
        return false
      }
    }

    if (!busca) return true
    const termo = busca.toLowerCase()
    const nomeUsuario = (log.user_name ?? '').toLowerCase()
    const emailUsuario = (log.user_email ?? '').toLowerCase()
    const cargoUsuario = (log.user_cargo ?? '').toLowerCase()
    const entidade = (log.entity ?? '').toLowerCase()
    const detalheOld = JSON.stringify(log.old_data ?? {}).toLowerCase()
    const detalheNew = JSON.stringify(log.new_data ?? {}).toLowerCase()

    return (
      nomeUsuario.includes(termo) ||
      emailUsuario.includes(termo) ||
      cargoUsuario.includes(termo) ||
      entidade.includes(termo) ||
      detalheOld.includes(termo) ||
      detalheNew.includes(termo)
    )
  })

  // Renderizador de Ícone por Ação
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <PlusCircle className="w-3.5 h-3.5" /> Cadastro / Matrícula
          </span>
        )
      case 'UPDATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Edit3 className="w-3.5 h-3.5" /> Edição de Ficha
          </span>
        )
      case 'READ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
            <Eye className="w-3.5 h-3.5" /> Visualização de Ficha
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-300 border border-zinc-500/20">
            <Activity className="w-3.5 h-3.5" /> {action}
          </span>
        )
    }
  }

  // Colunas da Tabela
  const columns: TableColumn<AuditLogItem>[] = [
    {
      header: 'Data / Hora',
      accessor: (log) => (
        <div className="flex flex-col text-xs text-foreground font-medium">
          <span>{new Date(log.created_at).toLocaleDateString('pt-BR')}</span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      header: 'Usuário (Executor)',
      accessor: (log) => (
        <div className="flex flex-col text-xs">
          <span className="font-semibold text-foreground">{log.user_name ?? 'Sistema'}</span>
          <span className="text-[11px] text-muted-foreground">{log.user_cargo ?? log.user_email ?? 'Secretaria'}</span>
        </div>
      ),
    },
    {
      header: 'Tipo de Atividade',
      accessor: (log) => getActionBadge(log.action),
    },
    {
      header: 'Módulo / Entidade',
      accessor: (log) => (
        <span className="text-xs font-mono font-medium text-foreground bg-muted/50 px-2 py-1 rounded-md border border-border">
          {log.entity === 'alunos' ? '🎓 Aluno' : log.entity === 'funcionarios' ? '👤 Funcionário' : log.entity}
        </span>
      ),
    },
    {
      header: 'Detalhes do Registro',
      accessor: (log) => {
        const nomeAlvo = log.new_data?.nome ?? log.old_data?.nome ?? log.entity_id
        return (
          <div className="flex flex-col text-xs max-w-[280px]">
            <span className="font-medium text-foreground truncate">{nomeAlvo}</span>
            {log.new_data?.observacao && (
              <span className="text-[11px] text-muted-foreground truncate">{log.new_data.observacao}</span>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3.5">
          <Link href="/relatorios">
            <Button variant="outline" className="bg-secondary hover:bg-hoverCustom border-border text-foreground gap-2 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-sky-400" />
              Central de Atividades da Escola
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trilha de auditoria e acompanhamento de matrículas, edições e acessos a fichas na unidade escolar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 no-print">
          <SchoolSelector />
          <Button
            onClick={() => window.print()}
            className="bg-secondary hover:bg-hoverCustom text-foreground border border-border rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimir Relatório
          </Button>
        </div>
      </div>

      {/* Banner de Isolamento e Contexto de Escola */}
      <div className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <div className={`w-3 h-3 rounded-full ${selectedEscola ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span>
            {selectedEscola ? (
              <>Exibindo atividades <strong>exclusivas</strong> da unidade: <strong className="text-foreground">{selectedEscola.nome}</strong></>
            ) : (
              <>Visão Macro da Rede — Exibindo histórico global (Selecione uma escola no topo para isolar os dados)</>
            )}
          </span>
        </div>
        <span className="text-muted-foreground font-medium">Filtro de Segurança Multi-tenant Ativo</span>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome do secretário, aluno ou detalhes..."
              className="w-full bg-surface-1 border border-border text-foreground text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Select Filtro de Ação */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
              className="bg-surface-1 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="todas">Todas as Ações</option>
              <option value="CREATE">Matrículas / Cadastros</option>
              <option value="UPDATE">Edições de Fichas</option>
              <option value="READ">Visualizações de Fichas</option>
            </select>

            {/* Select Entidade */}
            <select
              value={filtroEntidade}
              onChange={(e) => setFiltroEntidade(e.target.value)}
              className="bg-surface-1 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="todas">Todos os Módulos</option>
              <option value="alunos">Alunos</option>
              <option value="funcionarios">Funcionários</option>
            </select>

            {/* Select Período */}
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="bg-surface-1 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="todos">Todo o Histórico</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Atividades */}
      <StandardTable
        data={logsFiltrados}
        columns={columns}
        loading={loading}
        loadingMessage="Buscando trilha de atividades..."
        emptyMessage="Nenhuma atividade registrada no período selecionado."
        rowClassName={(log) =>
          log.id === urlLogId
            ? 'bg-sky-500/10 border-l-4 border-l-sky-400 font-medium animate-pulse'
            : ''
        }
      />
    </div>
  )
}
