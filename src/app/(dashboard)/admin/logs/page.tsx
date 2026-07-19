'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Activity, RefreshCw, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'

function LogDiffButton({ log }: { log: any }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-[#3ea6ff] hover:bg-[#3ea6ff]/10 h-8 font-medium cursor-pointer"
      >
        <Eye className="w-4 h-4 mr-1.5" /> Diff
      </Button>

      {open && (
        <StandardDialog
          open={open}
          onOpenChange={setOpen}
          title={`Inspecionar Auditoria — ${log.action ?? 'N/A'}`}
          maxWidth="sm:max-w-2xl"
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl">
                <h4 className="text-rose-400 font-bold mb-2 text-sm">Dados Anteriores</h4>
                <pre className="text-xs text-gray-300 overflow-x-auto max-h-[300px] scrollbar-thin">
                  {JSON.stringify(log.old_data || {}, null, 2)}
                </pre>
              </div>
              <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl">
                <h4 className="text-emerald-400 font-bold mb-2 text-sm">Dados Novos</h4>
                <pre className="text-xs text-gray-300 overflow-x-auto max-h-[300px] scrollbar-thin">
                  {JSON.stringify(log.new_data || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </StandardDialog>
      )}
    </>
  )
}

export default function AdminLogsPage() {
  const supabase = createClient()
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

  const loadLogs = async () => {
    if (isMounted.current) setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
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
      case 'CREATE': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
      case 'UPDATE': return 'bg-sky-500/20 text-sky-500 border-sky-500/30'
      case 'DELETE': return 'bg-rose-500/20 text-rose-500 border-rose-500/30'
      case 'RESTORE': return 'bg-purple-500/20 text-purple-500 border-purple-500/30'
      case 'PURGE': return 'bg-red-600/20 text-red-600 border-red-600/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const columns: TableColumn<any>[] = [
    {
      header: 'Data',
      accessor: (log) => (
        <span className="text-[#aaa] whitespace-nowrap">
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
          <span className="text-sm text-gray-300 uppercase">{log.entity ?? 'Geral'}</span>
        </div>
      )
    },
    {
      header: 'Usuário Responsável',
      accessor: (log) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-300 font-medium">{log.user_name ?? 'Sistema / Automático'}</span>
          <span className="text-xs text-gray-500">{log.user_email ?? '-'}</span>
        </div>
      )
    },
    {
      header: 'Inspecionar',
      headClassName: 'text-center',
      className: 'text-center',
      accessor: (log) => <LogDiffButton log={log} />
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
              className="bg-[#121212] border border-[#3f3f46] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="ALL">Todos os Módulos</option>
              <option value="alunos">Alunos</option>
              <option value="funcionarios">Funcionários</option>
              <option value="turmas">Turmas</option>
            </select>

            <Button 
              variant="outline"
              onClick={loadLogs}
              disabled={loading}
              className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a] h-10"
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

