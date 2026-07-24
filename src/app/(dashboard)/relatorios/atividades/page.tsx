'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  Eye, 
  Edit3, 
  PlusCircle, 
  Clock,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface AuditLogItem {
  id: string
  created_at: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'PURGE' | 'RESTORE' | string
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

const ITEMS_PER_PAGE = 20

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

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState<number>(1)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  useEffect(() => {
    loadEscolas()
  }, [loadEscolas])

  const targetEscolaId = selectedEscola?.id || urlEscolaId || null

  const fetchLogs = async () => {
    if (isMounted.current) setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('audit_logs')
      .select('id, entity, entity_id, action, created_at, user_id, user_name, user_email, user_cargo, old_data, new_data, tenant_id, ip_address')
      .order('created_at', { ascending: false })
      .limit(1000)

    // Filtrar estritamente por Escola ativa quando selecionada
    if (targetEscolaId) {
      query = query.eq('tenant_id', targetEscolaId)
    }

    // Aplicar filtro de período (a partir das 00:00:00 do dia correspondente)
    if (filtroPeriodo === 'hoje') {
      const inicioHoje = new Date()
      inicioHoje.setHours(0, 0, 0, 0)
      query = query.gte('created_at', inicioHoje.toISOString())
    } else if (filtroPeriodo === '7dias') {
      const ha7Dias = new Date()
      ha7Dias.setDate(ha7Dias.getDate() - 7)
      ha7Dias.setHours(0, 0, 0, 0)
      query = query.gte('created_at', ha7Dias.toISOString())
    } else if (filtroPeriodo === '30dias') {
      const ha30Dias = new Date()
      ha30Dias.setDate(ha30Dias.getDate() - 30)
      ha30Dias.setHours(0, 0, 0, 0)
      query = query.gte('created_at', ha30Dias.toISOString())
    }

    // Aplicar filtro de Ação
    if (filtroAcao !== 'todas') {
      query = query.eq('action', filtroAcao)
    }

    // Aplicar filtro de Entidade (usando ilike prefix para abranger alunos, alunos_anexos, etc.)
    if (filtroEntidade !== 'todas') {
      query = query.ilike('entity', `${filtroEntidade}%`)
    }

    try {
      const { data, error } = await query
      if (error) throw error
      if (isMounted.current) {
        setLogs((data as AuditLogItem[]) ?? [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar Central de Atividades:', err)
      toast.error('Erro ao carregar histórico de atividades: ' + (err.message || 'Falha de conexão'))
      if (isMounted.current) setLogs([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filtroPeriodo, filtroAcao, filtroEntidade, targetEscolaId])

  // Resetar para a primeira página ao alterar qualquer filtro
  useEffect(() => {
    setPaginaAtual(1)
  }, [busca, filtroAcao, filtroEntidade, filtroPeriodo, targetEscolaId])

  // Filtragem local por texto de busca + salvaguarda no cliente
  const logsFiltrados = useMemo(() => {
    return logs.filter((log) => {
      if (targetEscolaId) {
        const logEscolaId = log.tenant_id || log.new_data?.escola_id || log.old_data?.escola_id
        if (logEscolaId && logEscolaId !== targetEscolaId) {
          return false
        }
      }

      if (!busca.trim()) return true
      const termo = busca.toLowerCase().trim()
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
  }, [logs, busca, targetEscolaId])

  // Cálculos de Paginação
  const totalItens = logsFiltrados.length
  const totalPaginas = Math.ceil(totalItens / ITEMS_PER_PAGE) || 1

  const logsPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITEMS_PER_PAGE
    return logsFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE)
  }, [logsFiltrados, paginaAtual])

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
      case 'DELETE':
      case 'PURGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Trash2 className="w-3.5 h-3.5" /> Exclusão / Arquivamento
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
          {log.entity.startsWith('alunos') ? '🎓 Aluno' : log.entity.startsWith('funcionarios') ? '👤 Funcionário' : log.entity}
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
              <option value="DELETE">Exclusões / Arquivamentos</option>
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

      {/* Tabela de Atividades Paginada */}
      <div className="space-y-3">
        <StandardTable
          data={logsPaginados}
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

        {/* Barra de Controles de Paginação */}
        {!loading && totalItens > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground no-print">
            <div>
              Exibindo <strong className="text-foreground">{(paginaAtual - 1) * ITEMS_PER_PAGE + 1}</strong> a <strong className="text-foreground">{Math.min(paginaAtual * ITEMS_PER_PAGE, totalItens)}</strong> de <strong className="text-foreground">{totalItens}</strong> atividades registradas
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual <= 1}
                className="bg-surface-1 border-border text-foreground hover:bg-hoverCustom rounded-lg h-8 px-3 gap-1 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </Button>

              <span className="px-2 font-medium text-foreground">
                Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual >= totalPaginas}
                className="bg-surface-1 border-border text-foreground hover:bg-hoverCustom rounded-lg h-8 px-3 gap-1 cursor-pointer disabled:opacity-40"
              >
                Próximo <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


