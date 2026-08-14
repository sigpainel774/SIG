'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Building2, Plus, Edit, Trash2, RefreshCw, Search, Paperclip, UserCheck, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import dynamic from 'next/dynamic'
import { ImportDataActions } from '@/components/admin/ImportDataActions'

// Imports dinâmicos de modais sob demanda
const ModalEscola = dynamic(() => import('@/components/modals/modal-escola').then(m => m.ModalEscola), { ssr: false })
const ModalConfigAnexosEscola = dynamic(() => import('@/components/modals/modal-config-anexos-escola').then(m => m.ModalConfigAnexosEscola), { ssr: false })
const ModalConfigSecretario = dynamic(() => import('@/components/modals/modal-config-secretario').then(m => m.ModalConfigSecretario), { ssr: false })
const ModalGerenciarFilaImpressao = dynamic(() => import('@/components/modals/modal-gerenciar-fila-impressao').then(m => m.ModalGerenciarFilaImpressao), { ssr: false })
const ModalContasPaisEscola = dynamic(() => import('@/components/modals/modal-contas-pais-escola').then(m => m.ModalContasPaisEscola), { ssr: false })

import { toast } from 'sonner'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { Users } from 'lucide-react'

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
  const [filaImpressaoOpen, setFilaImpressaoOpen] = useState(false)

  const [escolaParaPais, setEscolaParaPais] = useState<any | null>(null)
  const [contasPaisOpen, setContasPaisOpen] = useState(false)

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
      .select('id, codigo, nome, logo_url, endereco, telefone, inep, tipo, ativo, diretor_id, modulos_ativos, secretaria_id, is_teste, anexos_padrao, portal_pais_ativo, created_at, secretarias:secretaria_id(id, nome)')
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (!isMounted.current) return

    if (error) {
      console.error('Erro ao carregar escolas:', error)
      toast.error('Erro ao carregar lista de escolas.')
    } else if (data) {
      // Filtra exclusivamente escolas/unidades pertencentes à Secretaria de Educação
      const escolasEducacao = (data || []).filter((e: any) => {
        const secNome = e.secretarias?.nome || ''
        const isSaude = /sa[uú]de/i.test(secNome) || /posto de sa[uú]de|usf/i.test(e.nome)
        if (isSaude) return false
        if (secNome) return /educa/i.test(secNome)
        return true
      })
      setEscolas(escolasEducacao)
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
      className: 'text-purple-600 dark:text-purple-400 font-mono font-bold w-24',
      accessor: (escola) => escola.codigo !== undefined && escola.codigo !== null ? String(escola.codigo).padStart(2, '0') : '-'
    },
    {
      header: 'Nome da Escola',
      accessor: (escola) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{escola.nome}</span>
          {escola.is_teste && (
            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 font-semibold px-1.5 py-0.5">
              TESTE
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'INEP',
      accessor: (escola) => <span className="text-muted-foreground font-mono text-xs">{escola.inep ?? '-'}</span>
    },
    {
      header: 'Tipo',
      accessor: (escola) => (
        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700/50">
          {escola.tipo ?? 'MUNICIPAL'}
        </Badge>
      )
    },
    {
      header: 'Status',
      accessor: (escola) => (
        <Badge variant="outline" className={`text-xs ${
          escola.ativo !== false 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' 
            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
        }`}>
          {escola.ativo !== false ? 'ATIVO' : 'INATIVO'}
        </Badge>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-44',
      className: 'text-right',
      accessor: (escola) => (
        <div className="flex justify-end gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setEscolaParaPais(escola)
              setContasPaisOpen(true)
            }}
            className={escola.portal_pais_ativo ? "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}
            title={escola.portal_pais_ativo ? "Portal dos Pais HABILITADO (Gerenciar)" : "Habilitar Portal dos Pais"}
          >
            <Users className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setEscolaParaAnexos(escola)
              setConfigAnexosOpen(true)
            }}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-500/10"
            title="Configurar Anexos Padrão"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleEditarEscola(escola)}
            className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleExcluirEscola(escola)}
            className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" /> Escolas da Rede
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Cadastro, edição e gerenciamento de todas as unidades escolares da Secretaria de Educação.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline"
            onClick={() => setFilaImpressaoOpen(true)}
            className="bg-card border-border text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-muted font-semibold text-xs rounded-xl h-9"
            title="Gerenciar e Excluir Atividades na Fila de Impressão"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" /> Fila de Impressão
          </Button>

          {/* Botões Reutilizáveis de Importação */}
          <ImportDataActions onSuccess={loadEscolas} />

          <Button 
            variant="outline"
            onClick={() => setConfigSecretarioOpen(true)}
            className="bg-card border-border text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-muted font-semibold text-xs rounded-xl h-9"
            title="Configurar Titular da Secretaria de Educação"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1.5 text-purple-600 dark:text-purple-400" /> Secretário de Educação
          </Button>
          <Button 
            variant="outline"
            onClick={loadEscolas}
            disabled={loading}
            className="bg-card border-border text-foreground hover:bg-muted h-9"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleNovaEscola} className="bg-purple-600 text-white hover:bg-purple-700 h-9 font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Nova Escola
          </Button>
        </div>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 bg-card border border-border p-3 rounded-xl max-w-md shadow-xs">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar escola por nome ou INEP..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-foreground focus-visible:ring-0 placeholder:text-muted-foreground h-7 text-sm"
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
        className="border-border"
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

      {/* Modal de Gerenciamento da Fila de Impressão */}
      {filaImpressaoOpen && (
        <ModalGerenciarFilaImpressao
          open={filaImpressaoOpen}
          onOpenChange={setFilaImpressaoOpen}
        />
      )}

      {/* Modal de Contas dos Pais (Ativação por Escola) */}
      {contasPaisOpen && escolaParaPais && (
        <ModalContasPaisEscola
          escola={escolaParaPais}
          open={contasPaisOpen}
          onClose={() => {
            setContasPaisOpen(false)
            setEscolaParaPais(null)
          }}
          onTogglePortal={(novoEstado) => {
            setEscolas(prev => prev.map(e => 
              e.id === escolaParaPais.id ? { ...e, portal_pais_ativo: novoEstado } : e
            ))
          }}
        />
      )}
    </div>
  )
}

