'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Activity, RefreshCw, Eye, AlertCircle, Plus, Minus, Edit3, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'

interface AuditDetailLog {
  id: string
  action: string
  entity: string
  entity_id: string
  user_name: string
  user_email: string
  user_cargo: string
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  created_at: string
}

function LogDiffButton({ logId, action }: { logId: string; action: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<AuditDetailLog | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = async () => {
    setOpen(true)
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/logs/detail?id=${logId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar detalhes')
      setDetail(data.log)
    } catch (err: any) {
      console.error('Erro ao buscar diff de auditoria:', err)
      setError(err.message || 'Falha de conexão ao carregar detalhe')
    } finally {
      setLoading(false)
    }
  }

  // Mitigar ES-5: Algoritmo de Diff defensivo que trata old_data e new_data nulos sem lançar exceções
  const diffResult = useMemo(() => {
    if (!detail) return { added: [], removed: [], changed: [], unchanged: [] }

    const oldObj = (detail.old_data && typeof detail.old_data === 'object') ? detail.old_data : {}
    const newObj = (detail.new_data && typeof detail.new_data === 'object') ? detail.new_data : {}

    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]))

    const added: { key: string; val: any }[] = []
    const removed: { key: string; val: any }[] = []
    const changed: { key: string; oldVal: any; newVal: any }[] = []
    const unchanged: { key: string; val: any }[] = []

    for (const key of allKeys) {
      const inOld = Object.prototype.hasOwnProperty.call(oldObj, key)
      const inNew = Object.prototype.hasOwnProperty.call(newObj, key)

      if (!inOld && inNew) {
        added.push({ key, val: newObj[key] })
      } else if (inOld && !inNew) {
        removed.push({ key, val: oldObj[key] })
      } else {
        const strOld = JSON.stringify(oldObj[key])
        const strNew = JSON.stringify(newObj[key])
        if (strOld !== strNew) {
          changed.push({ key, oldVal: oldObj[key], newVal: newObj[key] })
        } else {
          unchanged.push({ key, val: oldObj[key] })
        }
      }
    }

    return { added, removed, changed, unchanged }
  }, [detail])

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        className="text-sky-600 hover:bg-sky-500/10 dark:text-[#3ea6ff] dark:hover:bg-[#3ea6ff]/10 h-8 font-medium cursor-pointer"
      >
        <Eye className="w-4 h-4 mr-1.5" /> Diff
      </Button>

      {open && (
        <StandardDialog
          open={open}
          onOpenChange={setOpen}
          title={`Inspecionar Auditoria — ${action}`}
          maxWidth="sm:max-w-3xl"
        >
          {loading && (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400 mx-auto" />
              <p className="text-sm text-muted-foreground">Carregando detalhes e aplicando regras de segurança PII...</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400 p-4 rounded-xl text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && detail && (
            <div className="space-y-5 py-2">
              {/* Header do Log */}
              <div className="bg-surface-2 border border-borderCustom p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground font-medium">Módulo/Entidade:</span>{' '}
                  <strong className="text-foreground uppercase font-bold">{detail.entity}</strong> <span className="text-muted-foreground">({detail.entity_id})</span>
                </div>
                <div>
                  <span className="text-muted-foreground font-medium">Responsável:</span>{' '}
                  <strong className="text-foreground font-bold">{detail.user_name ?? 'Sistema'}</strong> <span className="text-muted-foreground">({detail.user_email ?? 'N/D'})</span>
                </div>
              </div>

              {/* Aviso de Mascaramento PII */}
              <div className="bg-purple-50 border border-purple-200 text-purple-900 dark:bg-purple-950/20 dark:border-purple-800/30 dark:text-purple-300 p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium">
                <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>Campos sensíveis (CPF, RG, tokens, senhas) são mascarados automaticamente pelo backend antes de exibir o diff.</span>
              </div>

              {/* Resumo visual do Diff */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 py-2.5 rounded-lg shadow-xs">
                  {diffResult.added.length} Adicionado(s)
                </div>
                <div className="bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400 py-2.5 rounded-lg shadow-xs">
                  {diffResult.changed.length} Alterado(s)
                </div>
                <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 py-2.5 rounded-lg shadow-xs">
                  {diffResult.removed.length} Removido(s)
                </div>
              </div>

              {/* Lista Detalhada do Diff */}
              <div className="bg-card border border-borderCustom rounded-xl p-4 space-y-3 max-h-[350px] overflow-y-auto scrollbar-thin">
                {/* Alterados */}
                {diffResult.changed.map(({ key, oldVal, newVal }) => (
                  <div key={key} className="bg-surface-2 border border-amber-300 dark:border-amber-500/20 p-3 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-amber-800 dark:text-amber-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> {key}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">Alterado</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      <div className="bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30 p-2 rounded overflow-x-auto">
                        <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-sans font-semibold">Anterior:</span>
                        {typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? 'null')}
                      </div>
                      <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30 p-2 rounded overflow-x-auto">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-sans font-semibold">Novo:</span>
                        {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? 'null')}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Adicionados */}
                {diffResult.added.map(({ key, val }) => (
                  <div key={key} className="bg-surface-2 border border-emerald-300 dark:border-emerald-500/20 p-3 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {key}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">Adicionado</Badge>
                    </div>
                    <div className="font-mono text-[11px] bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/30 p-2 rounded overflow-x-auto">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'null')}
                    </div>
                  </div>
                ))}

                {/* Removidos */}
                {diffResult.removed.map(({ key, val }) => (
                  <div key={key} className="bg-surface-2 border border-rose-300 dark:border-rose-500/20 p-3 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-rose-800 dark:text-rose-400 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Minus className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> {key}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30">Removido</Badge>
                    </div>
                    <div className="font-mono text-[11px] bg-rose-50 text-rose-900 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/30 p-2 rounded overflow-x-auto">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'null')}
                    </div>
                  </div>
                ))}

                {diffResult.added.length === 0 && diffResult.changed.length === 0 && diffResult.removed.length === 0 && (
                  <p className="text-center py-6 text-muted-foreground text-xs">Nenhuma alteração de campo registrada neste evento.</p>
                )}
              </div>
            </div>
          )}
        </StandardDialog>
      )}
    </>
  )
}

export default function AdminLogsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filterEntity, setFilterEntity] = useState('ALL')

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Mitigar ES-6: Buscar apenas colunas resumidas na listagem inicial
  const loadLogs = async () => {
    if (isMounted.current) setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('id, created_at, action, entity, entity_id, user_name, user_email, user_cargo')
        .order('created_at', { ascending: false })
        .limit(100)

      if (filterEntity !== 'ALL') {
        query = query.eq('entity', filterEntity)
      }

      const { data, error } = await query
      if (error) throw error

      if (isMounted.current) {
        setLogs(data || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar logs de auditoria:', err)
      toast.error('Erro ao buscar logs de auditoria: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setLogs([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [filterEntity])

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
      case 'UPDATE': return 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30'
      case 'DELETE': return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
      case 'RESTORE': return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30'
      case 'PURGE': return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-red-600/20 dark:text-red-400 dark:border-red-600/30'
      default: return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30'
    }
  }

  const columns: TableColumn<any>[] = [
    {
      header: 'Data',
      accessor: (log) => (
        <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
          {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '-'}
        </span>
      )
    },
    {
      header: 'Ação / Módulo',
      accessor: (log) => (
        <div className="flex flex-col gap-1 items-start">
          <Badge variant="outline" className={`text-xs font-semibold ${getActionColor(log.action)}`}>
            {log.action ?? 'N/A'}
          </Badge>
          <span className="text-xs text-foreground font-bold uppercase">{log.entity ?? 'Geral'}</span>
        </div>
      )
    },
    {
      header: 'Usuário Responsável',
      accessor: (log) => (
        <div className="flex flex-col">
          <span className="text-sm text-foreground font-semibold">{log.user_name ?? 'Sistema / Automático'}</span>
          <span className="text-xs text-muted-foreground">{log.user_email ?? '-'}</span>
        </div>
      )
    },
    {
      header: 'Inspecionar',
      headClassName: 'text-center',
      className: 'text-center',
      accessor: (log) => <LogDiffButton logId={log.id} action={log.action ?? 'N/A'} />
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trilha de Auditoria Global"
        description="Histórico completo de alterações de dados no sistema."
        icon={Activity}
        iconVariant="primary"
        backHref="/admin"
        actions={
          <div className="flex items-center gap-3">
            <select 
              value={filterEntity} 
              onChange={(e) => setFilterEntity(e.target.value)}
              className="bg-input-bg border border-borderCustom text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="ALL">Todos os Módulos</option>
              <option value="alunos">Alunos</option>
              <option value="funcionarios">Funcionários</option>
              <option value="turmas">Turmas</option>
              <option value="performance_metrics">Telemetria/Desempenho</option>
            </select>

            <Button 
              variant="outline"
              onClick={loadLogs}
              disabled={loading}
              className="bg-surface-2 border-borderCustom text-foreground hover:bg-hoverCustom h-10"
              title="Recarregar logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <StandardTable
        data={logs}
        columns={columns}
        keyExtractor={(log) => log.id}
        loading={loading}
        loadingMessage="Carregando logs de auditoria..."
        emptyMessage="Nenhum log de auditoria encontrado."
      />
    </div>
  )
}
