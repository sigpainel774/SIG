'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Activity, RefreshCw, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export default function AdminLogsPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filterEntity, setFilterEntity] = useState('ALL')

  const loadLogs = async () => {
    setLoading(true)
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filterEntity !== 'ALL') {
      query = query.eq('entity', filterEntity)
    }

    const { data, error } = await query
    if (data) setLogs(data)
    if (error) console.error(error)
    setLoading(false)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-500" /> Trilha de Auditoria Global
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Histórico completo de alterações de dados no sistema.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={filterEntity} 
            onChange={(e) => setFilterEntity(e.target.value)}
            className="bg-[#121212] border border-[#3f3f46] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
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
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Data</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Ação / Módulo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Usuário Responsável</TableHead>
              <TableHead className="text-[#ccc] font-semibold text-center">Inspecionar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                <TableCell className="text-[#aaa] whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <Badge variant="outline" className={`text-xs font-semibold ${getActionColor(log.action)}`}>
                      {log.action}
                    </Badge>
                    <span className="text-sm text-gray-300 uppercase">{log.entity}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-300">{log.user_name || 'Sistema'}</span>
                    <span className="text-xs text-gray-500">{log.user_email || '-'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Dialog>
                    <DialogTrigger>
                      <div className="text-[#3ea6ff] hover:bg-[#3ea6ff]/10 inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 py-2 cursor-pointer transition-colors">
                        <Eye className="w-4 h-4 mr-1.5" /> Diff
                      </div>
                    </DialogTrigger>
                    <DialogContent className="bg-[#121214] border-[#27272a] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                          Inspecionar Auditoria: <Badge variant="outline">{log.action}</Badge>
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl">
                            <h4 className="text-rose-400 font-bold mb-2 text-sm">Dados Anteriores</h4>
                            <pre className="text-xs text-gray-300 overflow-x-auto">
                              {JSON.stringify(log.old_data || {}, null, 2)}
                            </pre>
                          </div>
                          <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl">
                            <h4 className="text-emerald-400 font-bold mb-2 text-sm">Dados Novos</h4>
                            <pre className="text-xs text-gray-300 overflow-x-auto">
                              {JSON.stringify(log.new_data || {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
            
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-[#aaa]">
                  Nenhum log de auditoria encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
