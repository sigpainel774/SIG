'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Building2, Plus, Edit, Trash2, RefreshCw, Search, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalEscola } from '@/components/modals/modal-escola'
import { ModalConfigAnexosEscola } from '@/components/modals/modal-config-anexos-escola'
import { toast } from 'sonner'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'

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

    setLoading(true)
    const { success, error } = await softDeleteToTrash({
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
    })

    if (!success) {
      toast.error(`Erro ao excluir escola: ${(error as any)?.message || 'Erro desconhecido'}`)
    } else {
      toast.success('Escola enviada para a Lixeira Global!')
      loadEscolas()
    }
    setLoading(false)
  }

  const escolasFiltradas = escolas.filter(e => 
    e.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.inep?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold w-24">Código</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Nome da Escola</TableHead>
              <TableHead className="text-[#ccc] font-semibold">INEP</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Tipo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {escolasFiltradas.map((escola) => (
              <TableRow key={escola.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell className="text-purple-400 font-mono font-bold">{escola.codigo !== undefined && escola.codigo !== null ? String(escola.codigo).padStart(2, '0') : '-'}</TableCell>
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
                </TableCell>
              </TableRow>
            ))}
            {escolasFiltradas.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#aaa]">Nenhuma escola encontrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Criar / Editar */}
      <ModalEscola
        open={modalOpen}
        onOpenChange={setModalOpen}
        escolaToEdit={escolaToEdit}
        onSuccess={loadEscolas}
      />

      {/* Modal de Configurar Anexos Padrão */}
      {escolaParaAnexos && (
        <ModalConfigAnexosEscola
          open={configAnexosOpen}
          onOpenChange={setConfigAnexosOpen}
          escola={escolaParaAnexos}
          onSuccess={loadEscolas}
        />
      )}
    </div>
  )
}
