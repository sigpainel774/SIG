'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Briefcase, Plus, Edit, Trash2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalCargo } from '@/components/modals/modal-cargo'
import { toast } from 'sonner'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'

export default function AdminCargosPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [cargos, setCargos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [cargoToEdit, setCargoToEdit] = useState<any | null>(null)

  const loadCargos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .is('deleted_at', null)
      .order('nivel', { ascending: true })

    if (data) setCargos(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCargos()
  }, [])

  const handleNovoCargo = () => {
    setCargoToEdit(null)
    setModalOpen(true)
  }

  const handleEditarCargo = (cargo: any) => {
    setCargoToEdit(cargo)
    setModalOpen(true)
  }

  const handleExcluirCargo = async (cargo: any) => {
    const confirm = window.confirm(`Deseja realmente mover o cargo "${cargo.nome}" para a Lixeira Global?`)
    if (!confirm) return

    setLoading(true)
    const { success, error } = await softDeleteToTrash({
      supabase,
      tableName: 'cargos',
      recordId: cargo.id,
      recordSummary: cargo.nome,
      recordPayload: cargo,
      performedBy: {
        id: funcionario?.id ?? null,
        name: funcionario?.nome || 'Administrador',
        email: funcionario?.email || 'admin@super.com'
      }
    })

    if (!success) {
      toast.error(`Erro ao excluir cargo: ${(error as any)?.message || 'Erro desconhecido'}`)
    } else {
      toast.success('Cargo enviado para a Lixeira Global!')
      loadCargos()
    }
    setLoading(false)
  }

  const cargosFiltrados = cargos.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-amber-500" /> Cargos e Funções
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gerenciamento da hierarquia de cargos e níveis salariais.</p>
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
          <Button onClick={handleNovoCargo} className="bg-amber-600 text-white hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Cargo
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 bg-[#121214] border border-[#27272a] p-3 rounded-xl max-w-md">
        <Search className="w-4 h-4 text-[#aaa]" />
        <Input 
          placeholder="Buscar cargo por nome ou descrição..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-[#aaa] h-7 text-sm"
        />
      </div>

      {/* Tabela */}
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
            {cargosFiltrados.map((cargo) => (
              <TableRow key={cargo.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell>
                  <div className="font-medium text-white">{cargo.nome}</div>
                  {cargo.descricao && <div className="text-xs text-[#aaa] mt-0.5">{cargo.descricao}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Nível {cargo.nivel}
                  </Badge>
                </TableCell>
                <TableCell className="text-[#aaa]">
                  {cargo.salario_base ? `R$ ${Number(cargo.salario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${cargo.ativo !== false ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>
                    {cargo.ativo !== false ? 'ATIVO' : 'INATIVO'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEditarCargo(cargo)}
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                      title="Editar Cargo"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleExcluirCargo(cargo)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      title="Excluir Cargo (Lixeira)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {cargosFiltrados.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhum cargo encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Criar / Editar Cargo */}
      <ModalCargo
        open={modalOpen}
        onOpenChange={setModalOpen}
        cargoToEdit={cargoToEdit}
        onSuccess={loadCargos}
      />
    </div>
  )
}
