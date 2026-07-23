'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Building2, Plus, Edit, Trash2, RefreshCw, Search, Paperclip, UserCheck, FileSpreadsheet, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalEscola } from '@/components/modals/modal-escola'
import { ModalConfigAnexosEscola } from '@/components/modals/modal-config-anexos-escola'
import { ModalConfigSecretario } from '@/components/modals/modal-config-secretario'
import { ModalImportarFichasDocx } from '@/components/modals/modal-importar-fichas-docx'
import { ModalGerenciarFilaImpressao } from '@/components/modals/modal-gerenciar-fila-impressao'
import { toast } from 'sonner'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'

import { useLocalSearch } from '@/hooks/useLocalSearch'
import { executeWithToast } from '@/lib/action-handler'

export default function AdminEscolasPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [escolas, setEscolas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [escolaToEdit, setEscolaToEdit] = useState<any | null>(null)

  const [configAnexosOpen, setConfigAnexosOpen] = useState(false)
  const [escolaParaAnexos, setEscolaParaAnexos] = useState<any | null>(null)

  const [configSecretarioOpen, setConfigSecretarioOpen] = useState(false)
  const [importDocxOpen, setImportDocxOpen] = useState(false)
  const [filaImpressaoOpen, setFilaImpressaoOpen] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadEscolas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('escolas')
      .select('*')
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (!isMounted.current) return

    if (error) {
      console.error('Erro ao carregar escolas:', error)
      toast.error('Erro ao carregar lista de escolas.')
    } else if (data) {
      setEscolas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadEscolas()
  }, [])

  const handleNovaEscola = () => {
    setEscolaToEdit(null)
    setModalOpen(true)
  }

  const handleEditarEscola = (escola: any) => {
    setEscolaToEdit(escola)
    setModalOpen(true)
  }

  const handleExcluirEscola = async (escola: any) => {
    const confirm = window.confirm(`Deseja realmente mover a escola "${escola.nome}" para a Lixeira Global?`)
    if (!confirm) return

    await executeWithToast({
      action: () => softDeleteToTrash({
        supabase,
        tableName: 'escolas',
        recordId: escola.id,
        recordSummary: escola.nome,
        recordPayload: escola,
        performedBy: {
          id: funcionario?.id ?? null,
          name: funcionario?.nome || 'Administrador',
          email: funcionario?.email || 'admin@super.com'
        }
      }),
      setLoading,
      successMessage: 'Escola enviada para a Lixeira Global!',
      errorMessage: 'Erro ao excluir escola',
      onSuccess: () => {
        loadEscolas()
      }
    })
  }

  const escolasFiltradas = useLocalSearch(escolas, searchTerm, ['nome', 'inep'])

  const columns: TableColumn<any>[] = [
    {
      header: 'Código',
      className: 'text-purple-400 font-mono font-bold w-24',
      accessor: (escola) => escola.codigo !== undefined && escola.codigo !== null ? String(escola.codigo).padStart(2, '0') : '-'
    },
    {
      header: 'Nome da Escola',
      accessor: (escola) => <span className="font-medium text-white">{escola.nome}</span>
    },
    {
      header: 'INEP',
      accessor: (escola) => <span className="text-[#aaa]">{escola.inep ?? '-'}</span>
    },
    {
      header: 'Tipo',
      accessor: (escola) => (
        <Badge variant="outline" className="text-xs bg-gray-500/20 text-gray-300 border-gray-500/30">
          {escola.tipo ?? 'MUNICIPAL'}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: (escola) => (
        <Badge variant="outline" className={`text-xs ${escola.ativo !== false ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border-rose-500/30'}`}>
          {escola.ativo !== false ? 'ATIVO' : 'INATIVO'}
        </Badge>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-36',
      className: 'text-right',
      accessor: (escola) => (
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setEscolaParaAnexos(escola)
              setConfigAnexosOpen(true)
            }}
            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            title="Configurar Anexos Padrão"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEditarEscola(escola)}
            className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleExcluirEscola(escola)}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            title="Excluir (Lixeira)"
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
            <Building2 className="w-6 h-6 text-purple-500" /> Escolas da Rede
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Cadastro, edição e gerenciamento de todas as unidades escolares.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => setFilaImpressaoOpen(true)}
            className="bg-[#121214] border-[#3f3f46] text-amber-400 hover:text-amber-300 hover:bg-[#202024] font-semibold"
            title="Gerenciar e Excluir Atividades na Fila de Impressão"
          >
            <Printer className="w-4 h-4 mr-2 text-amber-400" /> Fila de Impressão
          </Button>
          <Button 
            variant="outline"
            onClick={() => setImportDocxOpen(true)}
            className="bg-[#121214] border-[#3f3f46] text-emerald-400 hover:text-emerald-300 hover:bg-[#202024] font-semibold"
            title="Importar Fichas de Alunos via arquivos DOCX"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" /> Importar Fichas (DOCX)
          </Button>
          <Button 
            variant="outline"
            onClick={() => setConfigSecretarioOpen(true)}
            className="bg-[#121214] border-[#3f3f46] text-purple-400 hover:text-purple-300 hover:bg-[#202024] font-semibold"
            title="Configurar Titular da Secretaria de Educação"
          >
            <UserCheck className="w-4 h-4 mr-2 text-purple-400" /> Secretário de Educação
          </Button>
          <Button 
            variant="outline"
            onClick={loadEscolas}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleNovaEscola} className="bg-purple-600 text-white hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Nova Escola
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 bg-[#121214] border border-[#27272a] p-3 rounded-xl max-w-md">
        <Search className="w-4 h-4 text-[#aaa]" />
        <Input 
          placeholder="Buscar escola por nome ou INEP..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-[#aaa] h-7 text-sm"
        />
      </div>

      {/* Tabela */}
      <StandardTable
        data={escolasFiltradas}
        columns={columns}
        keyExtractor={(escola) => escola.id}
        loading={loading}
        loadingMessage="Carregando escolas da rede..."
        emptyMessage="Nenhuma escola encontrada."
        className="border-[#3f3f46]"
      />

      {/* Modal de Criar / Editar */}
      {modalOpen && (
        <ModalEscola
          open={modalOpen}
          onOpenChange={setModalOpen}
          escolaToEdit={escolaToEdit}
          onSuccess={loadEscolas}
        />
      )}

      {/* Modal de Configurar Anexos Padrão */}
      {escolaParaAnexos && (
        <ModalConfigAnexosEscola
          open={configAnexosOpen}
          onOpenChange={setConfigAnexosOpen}
          escola={escolaParaAnexos}
          onSuccess={loadEscolas}
        />
      )}

      {/* Modal de Configurar Secretário de Educação */}
      {configSecretarioOpen && (
        <ModalConfigSecretario
          open={configSecretarioOpen}
          onOpenChange={setConfigSecretarioOpen}
        />
      )}

      {/* Modal de Importação de Fichas DOCX */}
      {importDocxOpen && (
        <ModalImportarFichasDocx
          open={importDocxOpen}
          onOpenChange={setImportDocxOpen}
          onSuccess={loadEscolas}
        />
      )}

      {/* Modal de Gerenciamento da Fila de Impressão */}
      {filaImpressaoOpen && (
        <ModalGerenciarFilaImpressao
          open={filaImpressaoOpen}
          onOpenChange={setFilaImpressaoOpen}
        />
      )}
    </div>
  )
}
