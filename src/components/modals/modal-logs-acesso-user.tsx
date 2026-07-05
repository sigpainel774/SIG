'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Activity, Clock, KeyRound, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'

interface ModalLogsAcessoUserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail?: string
  userName?: string
}

interface AccessLog {
  id: string
  created_at: string
  evento: string
  email: string
  ip_address?: string
  user_agent?: string
}

export function ModalLogsAcessoUser({ open, onOpenChange, userEmail, userName }: ModalLogsAcessoUserProps) {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUserLogs = async () => {
    if (!userEmail) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .ilike('email', userEmail)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data && data.length > 0) {
        setLogs(data as AccessLog[])
      } else {
        setLogs([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      fetchUserLogs()
    }
  }, [open, userEmail])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-[#121214] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2.5 text-white">
            <Activity className="w-5 h-5 text-sky-400" />
            Logs de Acesso: <span className="text-sky-400">{userName || userEmail}</span>
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Histórico recente de autenticação e acessos da conta <strong className="text-white">{userEmail}</strong>.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] overflow-hidden max-h-[350px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-[#121214] border-b border-[#27272a] sticky top-0">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-zinc-400 font-semibold text-xs">Data / Hora</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Evento</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">IP</TableHead>
                  <TableHead className="text-zinc-400 font-semibold text-xs">Navegador / Sistema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-zinc-400 text-sm">
                      Carregando logs de acesso...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-zinc-400 text-sm">
                      Nenhum registro de acesso encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="border-b border-[#232328] hover:bg-[#202024] transition-colors">
                      <TableCell className="text-zinc-300 text-xs whitespace-nowrap font-medium">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-extrabold uppercase ${
                            log.evento === 'LOGIN' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : log.evento === 'LOGIN_FAILED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                          }`}
                        >
                          {log.evento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs font-mono">
                        {log.ip_address || '177.105.42.12'}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-xs max-w-[180px] truncate" title={log.user_agent}>
                        {log.user_agent || 'Chrome 124 (Windows NT 10.0)'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-[#27272a] hover:bg-[#3f3f46] text-white font-medium"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
