'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Building2, Plus, Edit, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function AdminEscolasPage() {
  const supabase = createClient()
  const [escolas, setEscolas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadEscolas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('escolas')
      .select('*')
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (data) setEscolas(data)
    setLoading(false)
  }

  useEffect(() => {
    loadEscolas()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-500" /> Escolas da Rede
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Cadastro e listagem de todas as unidades escolares.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadEscolas}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-purple-600 text-white hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Nova Escola
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Nome da Escola</TableHead>
              <TableHead className="text-[#ccc] font-semibold">INEP</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Tipo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {escolas.map((escola) => (
              <TableRow key={escola.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell className="font-medium text-white">{escola.nome}</TableCell>
                <TableCell className="text-[#aaa]">{escola.inep || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs bg-gray-500/20 text-gray-300 border-gray-500/30">
                    {escola.tipo || 'MUNICIPAL'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${escola.ativo !== false ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>
                    {escola.ativo !== false ? 'ATIVO' : 'INATIVO'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-[#aaa] hover:text-white">
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {escolas.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhuma escola encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
