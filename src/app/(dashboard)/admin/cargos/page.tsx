'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Briefcase, Plus, Edit, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function AdminCargosPage() {
  const supabase = createClient()
  const [cargos, setCargos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadCargos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .order('nivel', { ascending: true })

    if (data) setCargos(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCargos()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-amber-500" /> Cargos e Funções
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gerenciamento da hierarquia de cargos e níveis.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadCargos}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-amber-600 text-white hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Cargo
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Cargo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Nível</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Salário Base</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargos.map((cargo) => (
              <TableRow key={cargo.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell className="font-medium text-white">{cargo.nome}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Nível {cargo.nivel}
                  </Badge>
                </TableCell>
                <TableCell className="text-[#aaa]">
                  {cargo.salario_base ? `R$ ${cargo.salario_base}` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${cargo.ativo !== false ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>
                    {cargo.ativo !== false ? 'ATIVO' : 'INATIVO'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-[#aaa] hover:text-white">
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {cargos.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhum cargo encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
