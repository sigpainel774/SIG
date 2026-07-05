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
      .select('*')
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/lixeira')}
            className="h-10 text-[#aaa] hover:bg-[#2f2f33] hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-purple-500" /> Relatório de Exclusões
            </h2>
            <p className="text-[#aaa] text-sm mt-1">Auditoria de registros restaurados ou expurgados.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#121212] border border-[#3f3f46] text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">Todas Ações</option>
            <option value="RESTORED">Apenas Restaurados</option>
            <option value="PURGED">Apenas Expurgados</option>
          </select>

          <Button 
            variant="outline"
            onClick={loadRelatorio}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#121212] border border-[#3f3f46] p-5 rounded-xl flex flex-col">
          <span className="text-[#aaa] text-sm font-semibold uppercase tracking-wider mb-2">Total Resolvido</span>
          <span className="text-3xl font-bold text-white">{items.length}</span>
        </div>
        <div className="bg-[#121212] border border-emerald-500/30 p-5 rounded-xl flex flex-col">
          <span className="text-emerald-500 text-sm font-semibold uppercase tracking-wider mb-2">Restaurados</span>
          <span className="text-3xl font-bold text-emerald-400">
            {items.filter(i => i.status === 'RESTORED').length}
          </span>
        </div>
        <div className="bg-[#121212] border border-rose-500/30 p-5 rounded-xl flex flex-col">
          <span className="text-rose-500 text-sm font-semibold uppercase tracking-wider mb-2">Expurgados</span>
          <span className="text-3xl font-bold text-rose-400">
            {items.filter(i => i.status === 'PURGED').length}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Tabela</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Registro</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Resolvido por</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Data Resolução</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                <TableCell>
                  <Badge variant="outline" className={`text-xs font-semibold ${item.status === 'RESTORED' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>
                    {item.status === 'RESTORED' ? 'RESTAURADO' : 'EXPURGADO'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-300 uppercase">{item.table_name}</span>
                </TableCell>
                <TableCell className="text-white font-medium">{item.record_summary}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-300">{item.resolved_by_name}</span>
                    <span className="text-xs text-gray-500">{item.resolved_by_email || '-'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[#aaa] whitespace-nowrap">
                  {new Date(item.resolved_at).toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
            
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[#aaa]">
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
