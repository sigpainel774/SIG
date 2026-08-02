'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Building2, Plus, Edit, Trash2, RefreshCw, Search, Briefcase, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalSecretaria } from '@/components/modals/modal-secretaria'
import { ModalCargosSecretaria } from '@/components/modals/modal-cargos-secretaria'
import { ModalDetalhesSecretaria } from '@/components/modals/modal-detalhes-secretaria'
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

  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false)
  const [secretariaForDetalhes, setSecretariaForDetalhes] = useState<any | null>(null)

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
      .select('id, nome, logo_url, ativo, created_at, escolas:escolas(id)')
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

  const handleEditarSecretaria = (sec: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSecretariaToEdit(sec)
    setModalOpen(true)
  }

  const handleGerenciarCargos = (sec: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSecretariaForCargos(sec)
    setModalCargosOpen(true)
  }

  const handleAbrirDetalhes = (sec: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setSecretariaForDetalhes(sec)
    setModalDetalhesOpen(true)
  }

  const handleExcluirSecretaria = async (sec: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
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
        <div 
          onClick={() => handleAbrirDetalhes(sec)}
          className="w-10 h-10 rounded-md border border-[#27272a] bg-[#121214] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer"
        >
          {sec.logo_url ? (
            <img src={sec.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
          ) : (
            <Building2 className="w-5 h-5 text-sky-400" />
          )}
        </div>
      )
    },
    {
      header: 'Secretaria Mantenedora',
      accessor: (sec) => {
        const isEducacao = /educa/i.test(sec.nome)
        return (
          <div 
            onClick={() => handleAbrirDetalhes(sec)}
            className="cursor-pointer group"
          >
            <div className="font-bold text-white group-hover:text-sky-400 transition-colors flex items-center gap-2">
              {sec.nome}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {isEducacao ? 'Secretaria de Ensino (Escolas)' : 'Secretaria Administrativa'}
            </p>
          </div>
        )
      }
    },
    {
      header: 'Unidades',
      accessor: (sec) => {
        const qtd = Array.isArray(sec.escolas) ? sec.escolas.length : 0
        const isEducacao = /educa/i.test(sec.nome)
        return (
          <Badge 
            variant="outline" 
            onClick={() => handleAbrirDetalhes(sec)}
            className="bg-sky-500/10 text-sky-300 border-sky-500/30 text-xs cursor-pointer hover:bg-sky-500/20"
          >
            {qtd} {qtd === 1 ? (isEducacao ? 'Escola' : 'Unidade') : (isEducacao ? 'Escolas' : 'Unidades')}
          </Badge>
        )
      }
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
      headClassName: 'text-right w-44',
      className: 'text-right',
      accessor: (sec) => (
        <div className="flex justify-end items-center gap-1.5">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => handleAbrirDetalhes(sec, e)}
            className="h-8 px-2.5 text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30 font-semibold gap-1 rounded-lg cursor-pointer"
            title="Abrir Modal com Unidades"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Unidades</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => handleGerenciarCargos(sec, e)}
            className="h-8 w-8 p-0 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg"
            title="Cargos da Secretaria"
          >
            <Briefcase className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => handleEditarSecretaria(sec, e)}
            className="h-8 w-8 p-0 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg"
            title="Editar Secretaria"
          >
            <Edit className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => handleExcluirSecretaria(sec, e)}
            className="h-8 w-8 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg"
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
            <Building2 className="w-6 h-6 text-sky-500" /> Secretarias Municipais
          </h2>
          <p className="text-[#aaa] text-sm mt-1">
            Gestão dos órgãos mantenedores das unidades escolares e administrativas da Rede Municipal.
          </p>
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
          <Button onClick={handleNovaSecretaria} className="bg-sky-600 text-white hover:bg-sky-700 font-semibold gap-1.5">
            <Plus className="w-4 h-4" /> Nova Secretaria
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

      {/* Modal de Detalhes e Unidades da Secretaria */}
      {modalDetalhesOpen && (
        <ModalDetalhesSecretaria
          open={modalDetalhesOpen}
          onOpenChange={setModalDetalhesOpen}
          secretaria={secretariaForDetalhes}
          onUpdate={loadSecretarias}
        />
      )}
    </div>
  )
}
