'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { ScanLine, Plus, Edit, RefreshCw, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function AdminRondasPage() {
  const supabase = createClient()
  const [rotas, setRotas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'rotas' | 'registros'>('rotas')

  const loadRotas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('rotas_ronda')
      .select('*, escolas(nome), funcionarios(nome)')
      .order('created_at', { ascending: false })

    if (data) setRotas(data)
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'rotas') {
      loadRotas()
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScanLine className="w-6 h-6 text-cyan-500" /> Controle de Rondas
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Definição de escalas e mapeamento de perímetro.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-[#121212] p-1 rounded-lg border border-[#3f3f46] flex">
            <button 
              onClick={() => setActiveTab('rotas')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'rotas' ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'}`}
            >
              Rotas
            </button>
            <button 
              onClick={() => setActiveTab('registros')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'registros' ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'}`}
            >
              Registros
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'rotas' ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-cyan-600 text-white hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" /> Nova Rota
            </Button>
          </div>
          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Nome da Rota</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Local/Vigia</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Turno</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rotas.map((rota) => (
                  <TableRow key={rota.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableCell className="font-medium text-white">{rota.nome}</TableCell>
                    <TableCell>
                      <div className="text-sm text-white">{rota.escolas?.nome || 'Escola não vinculada'}</div>
                      <div className="text-xs text-[#aaa]">{rota.funcionarios?.nome || 'Sem vigia padrão'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs bg-slate-500/20 text-slate-300 border-slate-500/30">
                        {rota.turno}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${rota.ativo !== false ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>
                        {rota.ativo !== false ? 'ATIVO' : 'INATIVO'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-[#aaa] hover:text-white">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rotas.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhuma rota cadastrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#3f3f46] rounded-xl bg-[#121212]/50">
          <MapPin className="w-16 h-16 text-[#3f3f46] mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Registros de Ronda</h3>
          <p className="text-[#aaa] text-center max-w-md">Os logs de check-in de ronda por GPS aparecerão aqui após iniciadas as atividades.</p>
        </div>
      )}
    </div>
  )
}
