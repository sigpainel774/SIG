'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Building2, Plus, Edit, Trash2, RefreshCw, Search, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalSecretaria } from '@/components/modals/modal-secretaria'
import { ModalCargosSecretaria } from '@/components/modals/modal-cargos-secretaria'
import { toast } from 'sonner'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { useLocalSearch } from '@/hooks/useLocalSearch'
import { executeWithToast } from '@/lib/action-handler'

export default function AdminSecretariasPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [secretarias, setSecretarias] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [secretariaToEdit, setSecretariaToEdit] = useState<any | null>(null)

  const [modalCargosOpen, setModalCargosOpen] = useState(false)
  const [secretariaForCargos, setSecretariaForCargos] = useState<any | null>(null)

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadSecretarias = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('secretarias')
      .select('id, nome, logo_url, ativo, created_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (!isMounted.current) return

    if (error) {
      console.error('Erro ao carregar secretarias:', error)
      toast.error('Erro ao carregar lista de secretarias.')
    } else if (data) {
      setSecretarias(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSecretarias()
  }, [])

  const handleNovaSecretaria = () => {
    setSecretariaToEdit(null)
    setModalOpen(true)
  }

  const handleEditarSecretaria = (sec: any) => {
    setSecretariaToEdit(sec)
    setModalOpen(true)
  }

  const handleGerenciarCargos = (sec: any) => {
    setSecretariaForCargos(sec)
    setModalCargosOpen(true)
  }

  const handleExcluirSecretaria = async (sec: any) => {
    const confirm = window.confirm(`Deseja realmente mover a secretaria "${sec.nome}" para a Lixeira Global?`)
    if (!confirm) return

    await executeWithToast({
      action: () => softDeleteToTrash({
        supabase,
        tableName: 'secretarias',
        recordId: sec.id,
        recordSummary: sec.nome,
        recordPayload: sec,
        performedBy: {
          id: funcionario?.id ?? null,
          name: funcionario?.nome || 'Administrador',
          email: funcionario?.email || 'admin@super.com'
        }
      }),
      setLoading,
      successMessage: 'Secretaria enviada para a Lixeira Global!',
      errorMessage: 'Erro ao excluir secretaria',
      onSuccess: () => {
        loadSecretarias()
      }
    })
  }

  const secretariasFiltradas = useLocalSearch(secretarias, searchTerm, ['nome'])

  const columns: TableColumn<any>[] = [
    {
      header: 'Logo',
      className: 'w-16',
      accessor: (sec) => (
        <div className="w-10 h-10 rounded-md border border-[#27272a] bg-[#121214] flex items-center justify-center overflow-hidden shrink-0">
          {sec.logo_url ? (
            <img src={sec.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <Building2 className="w-5 h-5 text-slate-600" />
          )}
        </div>
      )
    },
    {
      header: 'Secretaria',
      accessor: (sec) => (
        <div className="font-bold text-white">{sec.nome}</div>
      )
    },
    {
      header: 'Data de Criação',
      accessor: (sec) => (
        <span className="text-[#aaa] text-sm">
          {sec.created_at ? new Date(sec.created_at).toLocaleDateString('pt-BR') : '-'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (sec) => (
        <Badge variant="outline" className={`text-xs ${sec.ativo !== false ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>
          {sec.ativo !== false ? 'ATIVA' : 'INATIVA'}
        </Badge>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-24',
      className: 'text-right',
      accessor: (sec) => (
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleGerenciarCargos(sec)}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            title="Cargos da Secretaria"
          >
            <Briefcase className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEditarSecretaria(sec)}
            className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
            title="Editar Secretaria"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleExcluirSecretaria(sec)}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            title="Excluir Secretaria (Lixeira)"
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
            <Building2 className="w-6 h-6 text-sky-500" /> Secretarias
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gerenciamento dos órgãos mantenedores das escolas.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadSecretarias}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleNovaSecretaria} className="bg-sky-600 text-white hover:bg-sky-700">
            <Plus className="w-4 h-4 mr-2" /> Nova Secretaria
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 bg-[#121214] border border-[#27272a] p-3 rounded-xl max-w-md">
        <Search className="w-4 h-4 text-[#aaa]" />
        <Input 
          placeholder="Buscar secretaria por nome..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-[#aaa] h-7 text-sm"
        />
      </div>

      {/* Tabela */}
      <StandardTable
        data={secretariasFiltradas}
        columns={columns}
        keyExtractor={(sec) => sec.id}
        loading={loading}
        loadingMessage="Carregando lista de secretarias..."
        emptyMessage="Nenhuma secretaria encontrada."
        className="border-[#3f3f46]"
      />

      {/* Modal Criar / Editar Secretaria */}
      <ModalSecretaria
        open={modalOpen}
        onOpenChange={setModalOpen}
        secretariaToEdit={secretariaToEdit}
        onSuccess={loadSecretarias}
      />

      {/* Modal Gerenciar Cargos da Secretaria */}
      {modalCargosOpen && (
        <ModalCargosSecretaria
          open={modalCargosOpen}
          onOpenChange={setModalCargosOpen}
          secretariaId={secretariaForCargos?.id}
          secretariaNome={secretariaForCargos?.nome}
        />
      )}
    </div>
  )
}
