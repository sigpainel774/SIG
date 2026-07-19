'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Briefcase, Plus, Edit, Trash2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalCargo } from '@/components/modals/modal-cargo'
import { toast } from 'sonner'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'

import { useLocalSearch } from '@/hooks/useLocalSearch'
import { executeWithToast } from '@/lib/action-handler'

export default function AdminCargosPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [cargos, setCargos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [cargoToEdit, setCargoToEdit] = useState<any | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadCargos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .is('deleted_at', null)
      .order('nivel', { ascending: true })

    if (!isMounted.current) return

    if (error) {
      console.error('Erro ao carregar cargos:', error)
      toast.error('Erro ao carregar lista de cargos.')
    } else if (data) {
      setCargos(data)
    }
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

    await executeWithToast({
      action: () => softDeleteToTrash({
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
      }),
      setLoading,
      successMessage: 'Cargo enviado para a Lixeira Global!',
      errorMessage: 'Erro ao excluir cargo',
      onSuccess: () => {
        loadCargos()
      }
    })
  }

  const cargosFiltrados = useLocalSearch(cargos, searchTerm, ['nome', 'descricao'])

  const columns: TableColumn<any>[] = [
    {
      header: 'Cargo',
      accessor: (cargo) => (
        <div>
          <div className="font-medium text-white">{cargo.nome}</div>
          {cargo.descricao && <div className="text-xs text-[#aaa] mt-0.5">{cargo.descricao}</div>}
        </div>
      )
    },
    {
      header: 'Nível',
      accessor: (cargo) => (
        <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
          Nível {cargo.nivel}
        </Badge>
      )
    },
    {
      header: 'Salário Base',
      accessor: (cargo) => (
        <span className="text-[#aaa]">
          {cargo.salario_base !== null && cargo.salario_base !== undefined
            ? `R$ ${Number(cargo.salario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : '-'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (cargo) => (
        <Badge variant="outline" className={`text-xs ${cargo.ativo !== false ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>
          {cargo.ativo !== false ? 'ATIVO' : 'INATIVO'}
        </Badge>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-24',
      className: 'text-right',
      accessor: (cargo) => (
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
      )
    }
  ]

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
      <StandardTable
        data={cargosFiltrados}
        columns={columns}
        keyExtractor={(cargo) => cargo.id}
        loading={loading}
        loadingMessage="Carregando lista de cargos..."
        emptyMessage="Nenhum cargo encontrado."
        className="border-[#3f3f46]"
      />

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
