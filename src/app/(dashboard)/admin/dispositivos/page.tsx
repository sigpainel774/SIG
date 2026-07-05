'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { MonitorSmartphone, Plus, Edit, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function AdminDispositivosPage() {
  const supabase = createClient()
  const [dispositivos, setDispositivos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadDispositivos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dispositivos')
      .select('*, escolas(nome), funcionarios(nome)')
      .order('created_at', { ascending: false })

    if (data) setDispositivos(data)
    setLoading(false)
  }

  useEffect(() => {
    loadDispositivos()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MonitorSmartphone className="w-6 h-6 text-sky-500" /> Dispositivos
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gestão de tablets e celulares da rede.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadDispositivos}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-sky-600 text-white hover:bg-sky-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Dispositivo
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Identificação</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Tipo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Alocação</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispositivos.map((disp) => (
              <TableRow key={disp.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell>
                  <div className="font-medium text-white">{disp.nome}</div>
                  <div className="text-xs text-[#aaa]">{disp.identificador}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs bg-slate-500/20 text-slate-300 border-slate-500/30">
                    {disp.tipo}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-white">{disp.escolas?.nome || disp.funcionarios?.nome || 'Não alocado'}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${
                    disp.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 
                    disp.status === 'MANUTENÇÃO' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                    'bg-rose-500/20 text-rose-500 border-rose-500/30'
                  }`}>
                    {disp.status || 'ATIVO'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-[#aaa] hover:text-white">
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {dispositivos.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhum dispositivo encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
