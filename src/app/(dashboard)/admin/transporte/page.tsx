'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Bus, Plus, Edit, RefreshCw, CarFront, Map, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function AdminTransportePage() {
  const supabase = createClient()
  const [veiculos, setVeiculos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'veiculos' | 'rotas' | 'alunos'>('veiculos')

  const loadVeiculos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('veiculos')
      .select('*, funcionarios(nome)')
      .order('created_at', { ascending: false })

    if (data) setVeiculos(data)
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'veiculos') {
      loadVeiculos()
    }
  }, [activeTab])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bus className="w-6 h-6 text-sky-500" /> Transporte Escolar
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gestão de frotas, motoristas, rotas e alocação.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-[#121212] p-1 rounded-lg border border-[#3f3f46] flex">
            <button 
              onClick={() => setActiveTab('veiculos')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'veiculos' ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'}`}
            >
              Veículos
            </button>
            <button 
              onClick={() => setActiveTab('rotas')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'rotas' ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'}`}
            >
              Rotas
            </button>
            <button 
              onClick={() => setActiveTab('alunos')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'alunos' ? 'bg-[#3f3f46] text-white' : 'text-[#aaa] hover:text-white'}`}
            >
              Alunos
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'veiculos' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button className="bg-sky-600 text-white hover:bg-sky-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Veículo
            </Button>
          </div>
          <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
            <Table>
              <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-[#ccc] font-semibold">Veículo</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Motorista</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Capacidade</TableHead>
                  <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
                  <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {veiculos.map((v) => (
                  <TableRow key={v.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                    <TableCell>
                      <div className="font-medium text-white">{v.modelo}</div>
                      <div className="text-xs text-[#aaa]">Placa: {v.placa}</div>
                    </TableCell>
                    <TableCell className="text-white">{v.funcionarios?.nome || 'Não vinculado'}</TableCell>
                    <TableCell className="text-[#aaa]">{v.capacidade} lugares</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${v.status === 'ATIVO' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-amber-500/20 text-amber-500 border-amber-500/30'}`}>
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-[#aaa] hover:text-white">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {veiculos.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhum veículo cadastrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === 'rotas' && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#3f3f46] rounded-xl bg-[#121212]/50">
          <Map className="w-16 h-16 text-[#3f3f46] mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Mapeamento de Rotas</h3>
          <p className="text-[#aaa] text-center max-w-md">Gerencie os itinerários de cada veículo e turnos escolares.</p>
          <Button className="mt-6 bg-sky-600 text-white hover:bg-sky-700">Adicionar Rota</Button>
        </div>
      )}

      {activeTab === 'alunos' && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#3f3f46] rounded-xl bg-[#121212]/50">
          <Users className="w-16 h-16 text-[#3f3f46] mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Alunos Transportados</h3>
          <p className="text-[#aaa] text-center max-w-md">Vincule os alunos às rotas criadas para organizar as listas de embarque.</p>
        </div>
      )}
    </div>
  )
}
