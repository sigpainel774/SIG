'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { MonitorSmartphone, Plus, Edit, Trash2, RefreshCw, Search, Building2, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ModalDispositivo } from '@/components/modals/modal-dispositivo'
import { toast } from 'sonner'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'

export default function AdminDispositivosPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [dispositivos, setDispositivos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('TODOS')
  const [filterTipo, setFilterTipo] = useState('TODOS')

  const [modalOpen, setModalOpen] = useState(false)
  const [dispositivoToEdit, setDispositivoToEdit] = useState<any | null>(null)

  const loadDispositivos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('dispositivos')
      .select('*, escolas(nome), funcionarios(nome)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar dispositivos:', error)
      toast.error('Erro ao carregar dispositivos.')
    } else if (data) {
      setDispositivos(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDispositivos()
  }, [])

  const handleNovoDispositivo = () => {
    setDispositivoToEdit(null)
    setModalOpen(true)
  }

  const handleEditarDispositivo = (dispositivo: any) => {
    setDispositivoToEdit(dispositivo)
    setModalOpen(true)
  }

  const handleExcluirDispositivo = async (dispositivo: any) => {
    const confirm = window.confirm(`Deseja realmente mover o dispositivo "${dispositivo.nome}" para a Lixeira Global?`)
    if (!confirm) return

    setLoading(true)
    const { success, error } = await softDeleteToTrash({
      supabase,
      tableName: 'dispositivos',
      recordId: dispositivo.id,
      recordSummary: dispositivo.nome,
      recordPayload: dispositivo,
      performedBy: {
        id: funcionario?.id ?? null,
        name: funcionario?.nome || 'Administrador',
        email: funcionario?.email || 'admin@super.com'
      }
    })

    if (!success) {
      toast.error(`Erro ao excluir dispositivo: ${(error as any)?.message || 'Erro desconhecido'}`)
    } else {
      toast.success('Dispositivo enviado para a Lixeira Global!')
      loadDispositivos()
    }
    setLoading(false)
  }

  const changeStatus = async (id: string, novoStatus: string) => {
    setLoading(true)
    const { error } = await supabase
      .from('dispositivos')
      .update({ status: novoStatus })
      .eq('id', id)

    if (error) {
      toast.error(`Erro ao alterar status: ${error.message}`)
    } else {
      toast.success('Status atualizado com sucesso!')
      loadDispositivos()
    }
    setLoading(false)
  }

  // KPIs
  const totalDispositivos = dispositivos.length
  const totalAtivos = dispositivos.filter(d => d.status === 'ATIVO').length
  const totalManutencao = dispositivos.filter(d => d.status === 'MANUTENÇÃO').length
  const totalBloqueados = dispositivos.filter(d => d.status === 'BLOQUEADO').length

  const dispositivosFiltrados = useMemo(() => {
    return dispositivos.filter(d => {
      const matchSearch = d.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          d.identificador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.escolas?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          d.funcionarios?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchStatus = filterStatus === 'TODOS' || d.status === filterStatus
      const matchTipo = filterTipo === 'TODOS' || d.tipo === filterTipo
      
      return matchSearch && matchStatus && matchTipo
    })
  }, [dispositivos, searchTerm, filterStatus, filterTipo])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MonitorSmartphone className="w-6 h-6 text-sky-500" /> Dispositivos
          </h2>
          <p className="text-[#aaa] text-sm mt-1">Gestão de tablets, totens e celulares da rede.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadDispositivos}
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleNovoDispositivo} className="bg-sky-600 text-white hover:bg-sky-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Dispositivo
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 flex flex-col">
          <span className="text-[#aaa] text-xs font-semibold uppercase tracking-wider mb-1">Total</span>
          <span className="text-2xl font-bold text-sky-400">{totalDispositivos}</span>
        </div>
        <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 flex flex-col">
          <span className="text-[#aaa] text-xs font-semibold uppercase tracking-wider mb-1">Ativos</span>
          <span className="text-2xl font-bold text-emerald-500">{totalAtivos}</span>
        </div>
        <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 flex flex-col">
          <span className="text-[#aaa] text-xs font-semibold uppercase tracking-wider mb-1">Manutenção</span>
          <span className="text-2xl font-bold text-amber-500">{totalManutencao}</span>
        </div>
        <div className="bg-[#121214] border border-[#27272a] rounded-xl p-4 flex flex-col">
          <span className="text-[#aaa] text-xs font-semibold uppercase tracking-wider mb-1">Bloqueados</span>
          <span className="text-2xl font-bold text-rose-500">{totalBloqueados}</span>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 bg-[#121214] border border-[#27272a] p-3 rounded-xl">
        <div className="flex items-center gap-2 bg-[#18181a] border border-[#27272a] rounded-md px-3 flex-1">
          <Search className="w-4 h-4 text-[#aaa]" />
          <Input 
            placeholder="Buscar por nome, IMEI ou alocação..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-white focus-visible:ring-0 placeholder:text-[#aaa] h-9 text-sm"
          />
        </div>
        
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="h-9 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none"
        >
          <option value="TODOS">Todos os Tipos</option>
          <option value="SMARTPHONE">Smartphone</option>
          <option value="TABLET">Tablet</option>
          <option value="TOTEM">Totem</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 rounded-md bg-[#18181a] border border-[#27272a] text-white text-sm outline-none"
        >
          <option value="TODOS">Todos os Status</option>
          <option value="ATIVO">Ativo</option>
          <option value="MANUTENÇÃO">Manutenção</option>
          <option value="BLOQUEADO">Bloqueado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-[#3f3f46] bg-[#121212] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#181818] border-b border-[#3f3f46]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="text-[#ccc] font-semibold">Dispositivo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Tipo</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Alocação</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Visto por Último</TableHead>
              <TableHead className="text-[#ccc] font-semibold">Status</TableHead>
              <TableHead className="text-right text-[#ccc] font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dispositivosFiltrados.map((disp) => (
              <TableRow key={disp.id} className="border-b border-[#2a2a2a] hover:bg-[#1a1a1a]">
                <TableCell>
                  <div className="font-medium text-white">{disp.nome}</div>
                  {disp.identificador && <div className="text-xs text-[#aaa] mt-0.5">{disp.identificador}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${
                    disp.tipo === 'TOTEM' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 
                    disp.tipo === 'TABLET' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 
                    'bg-slate-500/20 text-slate-300 border-slate-500/30'
                  }`}>
                    {disp.tipo}
                  </Badge>
                </TableCell>
                <TableCell>
                  {disp.escola_id && disp.escolas ? (
                    <div className="flex items-center gap-1.5 text-sm text-white">
                      <Building2 className="w-3.5 h-3.5 text-purple-400" />
                      {disp.escolas.nome}
                    </div>
                  ) : disp.funcionario_id && disp.funcionarios ? (
                    <div className="flex items-center gap-1.5 text-sm text-white">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      {disp.funcionarios.nome}
                    </div>
                  ) : (
                    <span className="text-sm text-[#555]">Não alocado</span>
                  )}
                </TableCell>
                <TableCell className="text-[#aaa] text-sm">
                  {disp.ultima_conexao 
                    ? new Date(disp.ultima_conexao).toLocaleString('pt-BR') 
                    : 'Nunca conectou'}
                </TableCell>
                <TableCell>
                  <div className="relative inline-block group">
                    <select
                      value={disp.status || 'ATIVO'}
                      onChange={(e) => changeStatus(disp.id, e.target.value)}
                      className={`appearance-none bg-transparent outline-none cursor-pointer pr-5 pl-2 py-1 rounded border text-xs font-semibold ${
                        disp.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20' : 
                        disp.status === 'MANUTENÇÃO' ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20' : 
                        'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      <option value="ATIVO" className="bg-[#18181a] text-emerald-500">ATIVO</option>
                      <option value="MANUTENÇÃO" className="bg-[#18181a] text-amber-500">MANUTENÇÃO</option>
                      <option value="BLOQUEADO" className="bg-[#18181a] text-rose-500">BLOQUEADO</option>
                    </select>
                    <ChevronDown className={`w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                      disp.status === 'ATIVO' ? 'text-emerald-500' : 
                      disp.status === 'MANUTENÇÃO' ? 'text-amber-500' : 
                      'text-rose-500'
                    }`} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEditarDispositivo(disp)}
                      className="text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                      title="Editar Dispositivo"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleExcluirDispositivo(disp)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                      title="Excluir Dispositivo (Lixeira)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {dispositivosFiltrados.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-[#aaa]">Nenhum dispositivo encontrado.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Criar / Editar */}
      <ModalDispositivo
        open={modalOpen}
        onOpenChange={setModalOpen}
        dispositivoToEdit={dispositivoToEdit}
        onSuccess={loadDispositivos}
      />
    </div>
  )
}
