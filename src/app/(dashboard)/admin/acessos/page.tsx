'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { KeyRound, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AdminAcessosPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filterEvent, setFilterEvent] = useState('ALL')

  const loadAccessLogs = async () => {
    setLoading(true)
    let query = supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (filterEvent !== 'ALL') {
      query = query.eq('evento', filterEvent)
    }

    const { data, error } = await query
    if (data) setLogs(data)
    if (error) console.error(error)
    setLoading(false)
  }

  useEffect(() => {
    loadAccessLogs()
  }, [filterEvent])

  const getEventColor = (evento: string) => {
    switch (evento) {
      case 'LOGIN': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
      case 'LOGOUT': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'LOGIN_FAILED': return 'bg-rose-500/20 text-rose-500 border-rose-500/30'
      default: return 'bg-sky-500/20 text-sky-500 border-sky-500/30'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-purple-500" /> Logs de Acesso
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Histórico de autenticação e sessões dos usuários.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={filterEvent} 
            onChange={(e) => setFilterEvent(e.target.value)}
            className="bg-[#121212] border border-[#3f3f46] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">Todos os Eventos</option>
            <option value="LOGIN">Logins Bem Sucedidos</option>
            <option value="LOGIN_FAILED">Falhas de Login</option>
            <option value="LOGOUT">Logouts</option>
          </select>

          <Button 
            variant="outline"
            onClick={loadAccessLogs}
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
              <TableHead className="text-[#ccc] font-semibold">Evento</TableHead>
              <TableHead className="text-[#ccc] font-semibold">E-mail</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Endereço IP</TableHead>
              <TableHead className="text-[#ccc] font-semibold">User Agent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                <TableCell className="text-[#aaa] whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs font-semibold ${getEventColor(log.evento)}`}>
                    {log.evento}
                  </Badge>
                </TableCell>
                <TableCell className="text-white font-medium">{log.email || '-'}</TableCell>
                <TableCell className="text-[#aaa]">{log.ip_address || 'Desconhecido'}</TableCell>
                <TableCell className="text-[#aaa] text-xs max-w-[200px] truncate" title={log.user_agent}>
                  {log.user_agent || 'Desconhecido'}
                </TableCell>
              </TableRow>
            ))}
            
            {logs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[#aaa]">
                  Nenhum log de acesso encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
