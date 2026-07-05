'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { Trash2, RefreshCw, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { restoreAction, purgeAction } from './actions'

export default function AdminLixeiraPage() {
  const router = useRouter()
  const { funcionario } = useAuthStore()
  const supabase = createClient()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadTrash = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('trash_bin')
      .select('*')
      .eq('status', 'PENDING')
      .order('deleted_at', { ascending: false })

    if (data) setItems(data)
    if (error) console.error(error)
    setLoading(false)
  }

  useEffect(() => {
    loadTrash()
  }, [])

  const handleRestore = async (item: any) => {
    if (!confirm('Deseja realmente restaurar este registro?')) return
    const performedBy = { id: funcionario?.id, name: funcionario?.nome, email: funcionario?.email }
    
    const { success, error } = await restoreAction(item.id, item.table_name, item.record_id, performedBy)
    if (success) {
      toast.success('Registro restaurado com sucesso!')
      loadTrash()
    } else {
      toast.error('Erro ao restaurar registro.')
    }
  }

  const handlePurge = async (item: any) => {
    if (!confirm('ATENÇÃO: A exclusão permanente não pode ser desfeita. Deseja prosseguir?')) return
    const performedBy = { id: funcionario?.id, name: funcionario?.nome, email: funcionario?.email }
    
    const { success, error } = await purgeAction(item.id, item.table_name, item.record_id, performedBy)
    if (success) {
      toast.success('Registro expurgado definitivamente!')
      loadTrash()
    } else {
      toast.error('Erro ao expurgar registro.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" /> Lixeira Global
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Registros apagados e pendentes de restauração ou expurgo.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => router.push('/admin/lixeira/relatorio')}
            className="bg-transparent border-[#3f3f46] text-[#aaa] hover:text-white"
          >
            <FileText className="w-4 h-4 mr-2" /> Relatório de Exclusões
          </Button>
          <Button 
            variant="outline"
            onClick={loadTrash}
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
              <TableHead className="text-[#ccc] font-semibold">Tabela</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Registro</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Excluído por</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Data da Exclusão</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações ROOT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
                <TableCell>
                  <Badge variant="outline" className="text-xs font-semibold bg-gray-500/20 text-gray-300 border-gray-500/30 uppercase">
                    {item.table_name}
                  </Badge>
                </TableCell>
                <TableCell className="text-white font-medium">{item.record_summary}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-300">{item.deleted_by_name}</span>
                    <span className="text-xs text-gray-500">{item.deleted_by_email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-[#aaa] whitespace-nowrap">
                  {new Date(item.deleted_at).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(item)}
                    className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePurge(item)}
                    className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1.5" />
                    Expurgar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-[#aaa]">
                  Nenhum registro pendente na lixeira.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
