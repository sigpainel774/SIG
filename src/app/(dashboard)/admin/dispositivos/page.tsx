'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import {
  MonitorSmartphone,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Building2,
  User,
  ChevronDown,
  Zap,
  Radio,
  Sparkles,
  AlertTriangle,
  Loader2,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { ModalDispositivo } from '@/components/modals/modal-dispositivo'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useLocalSearch } from '@/hooks/useLocalSearch'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { executeWithToast } from '@/lib/action-handler'
import { usePwaUpdateWatcher } from '@/hooks/usePwaUpdateWatcher'

export default function AdminDispositivosPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()
  const { currentVersion, lastUpdatedAt, updatedByName } = usePwaUpdateWatcher()

  const [dispositivos, setDispositivos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('TODOS')
  const [filterTipo, setFilterTipo] = useState('TODOS')

  const [modalOpen, setModalOpen] = useState(false)
  const [dispositivoToEdit, setDispositivoToEdit] = useState<any | null>(null)

  // PWA Remote Update Dialog state
  const [pwaDialogOpen, setPwaDialogOpen] = useState(false)
  const [pwaNextVersion, setPwaNextVersion] = useState('')
  const [pwaCustomMessage, setPwaCustomMessage] = useState('')
  const [pwaStaggerSeconds, setPwaStaggerSeconds] = useState(60)
  const [pwaSubmitting, setPwaSubmitting] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const loadDispositivos = async () => {
    if (isMounted.current) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('dispositivos')
        .select('id, nome, tipo, identificador, status, ultima_conexao, escola_id, funcionario_id, created_at, escolas(nome), funcionarios(nome)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (isMounted.current) {
        setDispositivos(data || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar dispositivos:', err)
      toast.error('Erro ao carregar dispositivos: ' + (err.message || 'Erro de conexão'))
      if (isMounted.current) setDispositivos([])
    } finally {
      if (isMounted.current) setLoading(false)
    }
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

    await executeWithToast({
      action: () => softDeleteToTrash({
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
      }),
      setLoading,
      successMessage: 'Dispositivo enviado para a Lixeira Global!',
      errorMessage: 'Erro ao excluir dispositivo',
      onSuccess: () => {
        loadDispositivos()
      }
    })
  }

  const changeStatus = async (id: string, novoStatus: string) => {
    await executeWithToast({
      action: async () => await supabase
        .from('dispositivos')
        .update({ status: novoStatus })
        .eq('id', id),
      setLoading,
      successMessage: 'Status atualizado com sucesso!',
      errorMessage: 'Erro ao alterar status',
      onSuccess: () => {
        loadDispositivos()
      }
    })
  }

  // Open PWA Update modal
  const handleOpenPwaDialog = () => {
    // Calculo automático da próxima versão ex: v11 -> v12
    const currentNum = parseInt(currentVersion.replace(/\D/g, ''), 10)
    const nextVer = isNaN(currentNum) ? 'v12' : `v${currentNum + 1}`

    setPwaNextVersion(nextVer)
    setPwaCustomMessage('Uma nova versão do SIG foi disponibilizada. O sistema será atualizado automaticamente em instantes.')
    setPwaStaggerSeconds(60)
    setPwaDialogOpen(true)
  }

  // Submit PWA Update
  const handleSubmitPwaUpdate = async () => {
    if (!pwaNextVersion.trim()) {
      toast.error('Informe o código da nova versão (ex: v12)')
      return
    }

    setPwaSubmitting(true)
    try {
      const res = await fetch('/api/admin/pwa-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: pwaNextVersion.trim(),
          message: pwaCustomMessage.trim(),
          staggerSeconds: pwaStaggerSeconds
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao disparar atualização')
      }

      toast.success(`Comando enviado! Versão ${data.version} disponibilizada para a rede.`)
      setPwaDialogOpen(false)
    } catch (err: any) {
      console.error('Erro ao enviar PWA update:', err)
      toast.error(err.message || 'Falha ao comunicar com o servidor')
    } finally {
      setPwaSubmitting(false)
    }
  }

  // KPIs
  const totalDispositivos = dispositivos.length
  const totalAtivos = dispositivos.filter(d => d.status === 'ATIVO').length
  const totalManutencao = dispositivos.filter(d => d.status === 'MANUTENÇÃO').length
  const totalBloqueados = dispositivos.filter(d => d.status === 'BLOQUEADO').length

  const dispositivosBuscados = useLocalSearch(dispositivos, searchTerm, (d, term) => {
    const normalize = (val: any) => String(val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalize(d.nome).includes(term) ||
      normalize(d.identificador).includes(term) ||
      normalize(d.escolas?.nome).includes(term) ||
      normalize(d.funcionarios?.nome).includes(term);
  })

  const dispositivosFiltrados = useMemo(() => {
    return dispositivosBuscados.filter(d => {
      const matchStatus = filterStatus === 'TODOS' || d.status === filterStatus
      const matchTipo = filterTipo === 'TODOS' || d.tipo === filterTipo
      
      return matchStatus && matchTipo
    })
  }, [dispositivosBuscados, filterStatus, filterTipo])

  const columns: TableColumn<any>[] = [
    {
      header: 'Dispositivo',
      accessor: (disp) => (
        <div>
          <div className="font-medium text-white">{disp.nome}</div>
          {disp.identificador && <div className="text-xs text-[#aaa] mt-0.5">{disp.identificador}</div>}
        </div>
      )
    },
    {
      header: 'Tipo',
      accessor: (disp) => (
        <Badge variant="outline" className={`text-xs ${
          disp.tipo === 'TOTEM' ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 
          disp.tipo === 'TABLET' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 
          'bg-slate-500/20 text-slate-300 border-slate-500/30'
        }`}>
          {disp.tipo}
        </Badge>
      )
    },
    {
      header: 'Alocação',
      accessor: (disp) => disp.escola_id && disp.escolas ? (
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
      )
    },
    {
      header: 'Visto por Último',
      accessor: (disp) => (
        <span className="text-[#aaa] text-sm">
          {disp.ultima_conexao 
            ? new Date(disp.ultima_conexao).toLocaleString('pt-BR') 
            : 'Nunca conectou'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: (disp) => (
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
      )
    },
    {
      header: 'Ações',
      className: 'text-right',
      headClassName: 'text-right',
      accessor: (disp) => (
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
      )
    }
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Dispositivos"
        description="Gestão de tablets, totens, celulares e controle de atualização PWA da rede."
        icon={MonitorSmartphone}
        iconVariant="primary"
        backHref="/admin"
        actions={
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              onClick={loadDispositivos}
              disabled={loading}
              className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a] h-10"
              title="Recarregar dispositivos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleNovoDispositivo} className="bg-sky-600 text-white hover:bg-sky-700 h-10">
              <Plus className="w-4 h-4 mr-2" /> Novo Dispositivo
            </Button>
          </div>
        }
      />

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

      {/* ── CARD DESTACADO: CONTROLE REMOTO PWA ── */}
      <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-sky-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Controle Remoto de Atualização PWA
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-mono text-xs">
                  {currentVersion}
                </Badge>
              </h2>
            </div>
            <p className="text-xs text-[#aaa] leading-relaxed max-w-2xl">
              Transmita um comando de atualização em tempo real via Supabase Realtime para todos os dispositivos e navegadores conectados na rede. Dispositivos offline verão o aviso ao conectar no início do turno.
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#777] pt-1">
              <span>
                Último envio: <strong className="text-[#ccc]">{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString('pt-BR') : 'Nenhuma atualização recente'}</strong>
              </span>
              {updatedByName && (
                <span>
                  Disparado por: <strong className="text-[#ccc]">{updatedByName}</strong>
                </span>
              )}
            </div>
          </div>

          <Button
            onClick={handleOpenPwaDialog}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start md:self-center"
          >
            <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
            <span>Forçar Atualização na Rede</span>
          </Button>
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

      <StandardTable
        data={dispositivosFiltrados}
        columns={columns}
        keyExtractor={(disp) => disp.id}
        loading={loading}
        emptyMessage="Nenhum dispositivo encontrado."
      />

      {/* Modal Criar / Editar Dispositivo */}
      {modalOpen && (
        <ModalDispositivo
          open={modalOpen}
          onOpenChange={setModalOpen}
          dispositivoToEdit={dispositivoToEdit}
          onSuccess={loadDispositivos}
        />
      )}

      {/* ── DIALOG DE CONFIRMAÇÃO DE ATUALIZAÇÃO PWA ── */}
      <StandardDialog
        open={pwaDialogOpen}
        onOpenChange={setPwaDialogOpen}
        title="Forçar Atualização da Instalação PWA"
        description="Esta ação enviará uma instrução de recarregamento e limpeza de cache para toda a rede."
        maxWidth="sm:max-w-[550px]"
        footer={
          <div className="flex items-center justify-end gap-3 w-full pt-2">
            <Button
              variant="ghost"
              onClick={() => setPwaDialogOpen(false)}
              disabled={pwaSubmitting}
              className="text-[#aaa] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitPwaUpdate}
              disabled={pwaSubmitting}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-2"
            >
              {pwaSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transmitindo...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Transmitir para Toda a Rede</span>
                </>
              )}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-sm text-white">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-200">
              <strong className="font-semibold block text-amber-400">Atenção para Ações em Rede</strong>
              <p>
                Todos os usuários com o PWA aberto verão a mensagem de atualização com contagem regressiva e recarregamento automático. Dispositivos offline serão forçados a atualizar no início do turno ao conectar.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#ccc]">Identificador da Nova Versão</label>
            <Input
              value={pwaNextVersion}
              onChange={(e) => setPwaNextVersion(e.target.value)}
              placeholder="Ex: v12"
              className="bg-[#18181a] border-[#3f3f46] text-white font-mono"
            />
            <p className="text-[11px] text-[#777]">Versão atual cadastrada: <code className="text-amber-400">{currentVersion}</code></p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#ccc]">Estratégia de Distribuição de Carga (Jitter)</label>
            <select
              value={pwaStaggerSeconds}
              onChange={(e) => setPwaStaggerSeconds(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-md bg-[#18181a] border border-[#3f3f46] text-white text-xs outline-none"
            >
              <option value={60}>🌊 Onda Suave — Distribuir em 1 min (Recomendado para 500+ dispositivos)</option>
              <option value={180}>🌊 Onda Estendida — Distribuir em 3 min (Evita picos em horário de entrada)</option>
              <option value={0}>⚡ Imediata — Sem atraso (Apenas para emergências/poucos dispositivos)</option>
            </select>
            <p className="text-[11px] text-[#777]">Evita travamentos e picos de acessos simultâneos na Vercel/Supabase.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#ccc]">Mensagem Exibida ao Usuário</label>
            <Textarea
              value={pwaCustomMessage}
              onChange={(e) => setPwaCustomMessage(e.target.value)}
              rows={3}
              placeholder="Digite a mensagem..."
              className="bg-[#18181a] border-[#3f3f46] text-white text-xs leading-relaxed"
            />
          </div>
        </div>
      </StandardDialog>
    </div>
  )
}
