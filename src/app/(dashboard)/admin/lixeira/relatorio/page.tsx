'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { FileText, ArrowLeft, RefreshCw, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AdminLixeiraRelatorioPage() {
  const router = useRouter()
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('ALL')

  const loadRelatorio = async () => {
    setLoading(true)
    let query = supabase
      .from('trash_bin')
      .select('id, record_summary, table_name, record_id, deleted_by_name, deleted_by_email, deleted_at, status, resolution_note')
      .neq('status', 'PENDING')
      .order('resolved_at', { ascending: false })

    if (filter !== 'ALL') {
      query = query.eq('status', filter)
    }

    const { data, error } = await query

    if (data) setItems(data)
    if (error) console.error(error)
    setLoading(false)
  }

  useEffect(() => {
    loadRelatorio()
  }, [filter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-borderCustom">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/lixeira')}
            className="h-10 text-muted-foreground hover:bg-hoverCustom hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-500" /> Relatório de Exclusões
            </h2>
            <p className="text-muted-foreground text-sm mt-1">Auditoria de registros restaurados ou expurgados.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-input-bg border border-borderCustom text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            <option value="ALL">Todas Ações</option>
            <option value="RESTORED">Apenas Restaurados</option>
            <option value="PURGED">Apenas Expurgados</option>
          </select>

          <Button 
            variant="outline"
            onClick={loadRelatorio}
            disabled={loading}
            className="bg-surface-2 border-borderCustom text-foreground hover:bg-hoverCustom"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-borderCustom p-5 rounded-xl flex flex-col">
          <span className="text-muted-foreground text-sm font-semibold uppercase tracking-wider mb-2">Total Resolvido</span>
          <span className="text-3xl font-bold text-foreground">{items.length}</span>
        </div>
        <div className="bg-card border border-emerald-300 dark:border-emerald-500/30 p-5 rounded-xl flex flex-col">
          <span className="text-emerald-600 dark:text-emerald-500 text-sm font-semibold uppercase tracking-wider mb-2">Restaurados</span>
          <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {items.filter(i => i.status === 'RESTORED').length}
          </span>
        </div>
        <div className="bg-card border border-rose-300 dark:border-rose-500/30 p-5 rounded-xl flex flex-col">
          <span className="text-rose-600 dark:text-rose-500 text-sm font-semibold uppercase tracking-wider mb-2">Expurgados</span>
          <span className="text-3xl font-bold text-rose-600 dark:text-rose-400">
            {items.filter(i => i.status === 'PURGED').length}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-borderCustom bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-surface-2 border-b border-borderCustom">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Tabela</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Registro</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Resolvido por</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Data Resolução</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-b border-borderCustom hover:bg-hoverCustom transition-colors">
                <TableCell>
                  <Badge variant="outline" className={`text-xs font-semibold ${item.status === 'RESTORED' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500 border-emerald-300 dark:border-emerald-500/30' : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-500 border-rose-300 dark:border-rose-500/30'}`}>
                    {item.status === 'RESTORED' ? 'RESTAURADO' : 'EXPURGADO'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-foreground uppercase">{item.table_name}</span>
                </TableCell>
                <TableCell className="text-foreground font-medium">{item.record_summary}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">{item.resolved_by_name}</span>
                    <span className="text-xs text-muted-foreground">{item.resolved_by_email || '-'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {new Date(item.resolved_at).toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
            
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Nenhum registro encontrado no relatório.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
