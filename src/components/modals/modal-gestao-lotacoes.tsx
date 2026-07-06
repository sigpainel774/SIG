'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Network,
  Search,
  MapPin,
  Plus,
  ArrowRightLeft,
  X,
  Loader2,
  Building2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { logAudit } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'

/* ─── Tipos locais ─────────────────────────────────────────── */

interface Escola {
  id: string
  nome: string
}

interface Cargo {
  id: string
  nome: string
}

interface Lotacao {
  id: string
  funcionario_id: string
  escola_id: string
  cargo: string | null
  ativo: boolean
  data_inicio: string | null
  escolaNome?: string
}

interface FuncItem {
  id: string
  nome: string
  email: string
  cpf: string | null
  cargo: string | null
  foto_url: string | null
  status: string
  lotacoes: Lotacao[]
}

type TabFiltro = 'todos' | 'sem_lotacao' | 'lotados'

interface ModalGestaoLotacoesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pré-seleciona o funcionário ao abrir */
  funcionarioInicial?: { id: string } | null
}

/* ─── Helpers ────────────────────────────────────────────────── */

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  { bg: 'bg-[#1a3a5c]', text: 'text-[#60a5fa]' },
  { bg: 'bg-[#1a2e1a]', text: 'text-[#4ade80]' },
  { bg: 'bg-[#3a1a1a]', text: 'text-[#f87171]' },
  { bg: 'bg-[#2e1a3a]', text: 'text-[#c084fc]' },
  { bg: 'bg-[#3a2e1a]', text: 'text-[#fbbf24]' },
  { bg: 'bg-[#1a3a3a]', text: 'text-[#34d399]' },
]

function avatarColor(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

/* ─── Componente ─────────────────────────────────────────────── */

export function ModalGestaoLotacoes({
  open,
  onOpenChange,
  funcionarioInicial,
}: ModalGestaoLotacoesProps) {
  const supabase = createClient()
  const { funcionario: authFuncionario } = useAuthStore()

  const [funcionarios, setFuncionarios] = useState<FuncItem[]>([])
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)

  /* filtros */
  const [busca, setBusca] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [tab, setTab] = useState<TabFiltro>('todos')

  /* seleção */
  const [selecionado, setSelecionado] = useState<FuncItem | null>(null)

  /* nova lotação */
  const [novaEscola, setNovaEscola] = useState('')
  const [novoCargo, setNovoCargo] = useState('')

  /* transferência */
  const [origemId, setOrigemId] = useState('')
  const [destinoEscolaId, setDestinoEscolaId] = useState('')

  /* ── Carregamento ──────────────────────────────────────────── */

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Carregar funcionários, escolas, cargos e vínculos em paralelo
      const [funcsRes, escsRes, cargsRes, vincsRes] = await Promise.all([
        supabase
          .from('funcionarios')
          .select('id, nome, email, cpf, cargo, foto_url, status')
          .is('deleted_at', null)
          .order('nome'),
        supabase.from('escolas').select('id, nome').is('deleted_at', null).order('nome'),
        supabase.from('cargos').select('id, nome').order('nome'),
        supabase
          .from('vinculos_funcionarios')
          .select('id, funcionario_id, escola_id, cargo, ativo, data_inicio')
          .eq('ativo', true),
      ])

      const funcsData = funcsRes.data ?? []
      const escsData = escsRes.data ?? []
      const cargsData = cargsRes.data ?? []
      const vincsData = vincsRes.data ?? []

      // 2. Criar mapa de escola_id → nome para lookup rápido
      const escolaMap: Record<string, string> = {}
      escsData.forEach((e) => { escolaMap[e.id] = e.nome })

      // 3. Montar lista de funcionários com suas lotações
      const lista: FuncItem[] = funcsData.map((f) => ({
        id: f.id,
        nome: f.nome,
        email: f.email,
        cpf: f.cpf ?? null,
        cargo: f.cargo ?? null,
        foto_url: f.foto_url ?? null,
        status: f.status ?? 'ativo',
        lotacoes: vincsData
          .filter((v) => v.funcionario_id === f.id)
          .map((v) => ({
            id: v.id,
            funcionario_id: v.funcionario_id ?? '',
            escola_id: v.escola_id ?? '',
            cargo: v.cargo ?? null,
            ativo: v.ativo,
            data_inicio: v.data_inicio ?? null,
            escolaNome: v.escola_id ? (escolaMap[v.escola_id] ?? 'Escola desconhecida') : undefined,
          })),
      }))

      setFuncionarios(lista)
      setEscolas(escsData)
      setCargos(cargsData)

      // Pré-selecionar funcionário inicial
      if (funcionarioInicial) {
        const found = lista.find((f) => f.id === funcionarioInicial.id)
        if (found) setSelecionado(found)
      }
    } catch (err) {
      console.error('Erro ao carregar dados de lotações:', err)
      toast.error('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarioInicial])

  useEffect(() => {
    if (open) {
      carregar()
      setBusca('')
      setFiltroCargo('todos')
      setTab('todos')
      setNovaEscola('')
      setNovoCargo('')
      setOrigemId('')
      setDestinoEscolaId('')
      if (!funcionarioInicial) setSelecionado(null)
    }
  }, [open, carregar, funcionarioInicial])

  /* Atualizar selecionado após recarga */
  useEffect(() => {
    if (selecionado) {
      const updated = funcionarios.find((f) => f.id === selecionado.id)
      if (updated) setSelecionado(updated)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionarios])

  /* ── Filtro ─────────────────────────────────────────────────── */

  const funcsFiltrados = funcionarios.filter((f) => {
    const matchBusca =
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.email.toLowerCase().includes(busca.toLowerCase()) ||
      (f.cpf ?? '').includes(busca)
    const matchCargo = filtroCargo === 'todos' || f.cargo === filtroCargo
    const matchTab =
      tab === 'todos' ||
      (tab === 'sem_lotacao' && f.lotacoes.length === 0) ||
      (tab === 'lotados' && f.lotacoes.length > 0)
    return matchBusca && matchCargo && matchTab
  })

  /* ── Ações ─────────────────────────────────────────────────── */

  const performer = {
    id: authFuncionario?.id ?? null,
    name: authFuncionario?.nome ?? 'Sistema',
    email: authFuncionario?.email ?? '',
    cargo: authFuncionario?.cargo ?? undefined,
  }

  const handleAdicionarLotacao = async () => {
    if (!selecionado || !novaEscola) {
      toast.error('Selecione a escola de destino.')
      return
    }
    setSalvando(true)
    try {
      const escolaNome = escolas.find((e) => e.id === novaEscola)?.nome ?? novaEscola
      const { error } = await supabase.from('vinculos_funcionarios').insert({
        funcionario_id: selecionado.id,
        escola_id: novaEscola,
        cargo: novoCargo || selecionado.cargo || null,
        ativo: true,
        data_inicio: new Date().toISOString().split('T')[0],
      })
      if (error) throw error

      await logAudit({
        supabase,
        action: 'CREATE',
        entity: 'vinculos_funcionarios',
        entityId: selecionado.id,
        newData: { escola: escolaNome, cargo: novoCargo || selecionado.cargo },
        performedBy: performer,
      })

      toast.success(`Lotação adicionada em ${escolaNome}`)
      setNovaEscola('')
      setNovoCargo('')
      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao adicionar lotação: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSalvando(false)
    }
  }

  const handleMoverFuncionario = async () => {
    if (!selecionado || !origemId || !destinoEscolaId) {
      toast.error('Selecione a lotação de origem e a escola de destino.')
      return
    }
    setSalvando(true)
    try {
      const lotacaoOrigem = selecionado.lotacoes.find((l) => l.id === origemId)
      const escolaDestinoNome = escolas.find((e) => e.id === destinoEscolaId)?.nome ?? destinoEscolaId

      const { error: deactivateError } = await supabase
        .from('vinculos_funcionarios')
        .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
        .eq('id', origemId)
      if (deactivateError) throw deactivateError

      const { error: insertError } = await supabase.from('vinculos_funcionarios').insert({
        funcionario_id: selecionado.id,
        escola_id: destinoEscolaId,
        cargo: lotacaoOrigem?.cargo || selecionado.cargo || null,
        ativo: true,
        data_inicio: new Date().toISOString().split('T')[0],
      })
      if (insertError) throw insertError

      await logAudit({
        supabase,
        action: 'UPDATE',
        entity: 'vinculos_funcionarios',
        entityId: selecionado.id,
        oldData: { escola: lotacaoOrigem?.escolaNome, cargo: lotacaoOrigem?.cargo },
        newData: { escola: escolaDestinoNome, cargo: lotacaoOrigem?.cargo },
        performedBy: performer,
      })

      toast.success(`Funcionário transferido para ${escolaDestinoNome}`)
      setOrigemId('')
      setDestinoEscolaId('')
      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao transferir: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSalvando(false)
    }
  }

  const handleRemoverLotacao = async (lotacao: Lotacao) => {
    setSalvando(true)
    try {
      const { error } = await supabase
        .from('vinculos_funcionarios')
        .update({ ativo: false, data_fim: new Date().toISOString().split('T')[0] })
        .eq('id', lotacao.id)
      if (error) throw error

      await logAudit({
        supabase,
        action: 'DELETE',
        entity: 'vinculos_funcionarios',
        entityId: lotacao.id,
        oldData: { escola: lotacao.escolaNome, cargo: lotacao.cargo },
        performedBy: performer,
      })

      toast.success('Lotação removida.')
      await carregar()
    } catch (err: unknown) {
      toast.error(`Erro ao remover lotação: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSalvando(false)
    }
  }

  /* ── Render ─────────────────────────────────────────────────── */

  const tabClass = (t: TabFiltro) =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
      tab === t
        ? 'bg-[#3ea6ff] text-[#0f0f0f]'
        : 'bg-[#1e1e22] text-zinc-400 hover:text-white hover:bg-[#252528]'
    }`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full bg-[#141414] border-[#26262a] text-white p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 py-4 border-b border-[#26262a] shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Network className="w-5 h-5 text-[#3ea6ff]" />
            Gestão de Lotações
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* ── Coluna Esquerda ─────────────────────────────── */}
            <div className="w-[310px] shrink-0 border-r border-[#26262a] flex flex-col overflow-hidden">
              {/* Filtros */}
              <div className="p-4 space-y-3 border-b border-[#26262a] shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9 bg-[#1a1a1e] border-[#2e2e33] text-white placeholder:text-zinc-500 h-9 text-sm"
                  />
                </div>
                <Select
                  value={filtroCargo}
                  onValueChange={(v) => setFiltroCargo(v ?? 'todos')}
                >
                  <SelectTrigger className="bg-[#1a1a1e] border-[#2e2e33] text-white h-9 text-sm">
                    <SelectValue placeholder="Cargo (Todos)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
                    <SelectItem value="todos">Cargo (Todos)</SelectItem>
                    {cargos.map((c) => (
                      <SelectItem key={c.id} value={c.nome}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-1.5">
                  <button className={tabClass('todos')} onClick={() => setTab('todos')}>
                    Todos
                  </button>
                  <button className={tabClass('sem_lotacao')} onClick={() => setTab('sem_lotacao')}>
                    Sem Lotação
                  </button>
                  <button className={tabClass('lotados')} onClick={() => setTab('lotados')}>
                    Lotados
                  </button>
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto">
                {funcsFiltrados.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 text-sm">
                    Nenhum funcionário encontrado.
                  </div>
                ) : (
                  funcsFiltrados.map((f) => {
                    const isSelected = selecionado?.id === f.id
                    const hasLotacao = f.lotacoes.length > 0
                    const pal = avatarColor(f.nome)
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelecionado(f)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-[#1e1e22] cursor-pointer ${
                          isSelected
                            ? 'bg-[#1a2940] border-l-2 border-l-[#3ea6ff]'
                            : 'hover:bg-[#1a1a1e]'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${pal.bg} ${pal.text}`}
                        >
                          {f.foto_url ? (
                            <img src={f.foto_url} alt={f.nome} className="w-full h-full object-cover" />
                          ) : (
                            getInitials(f.nome)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{f.nome}</p>
                          <p className="text-xs text-zinc-500 truncate">{f.cpf ?? 'Sem CPF'}</p>
                        </div>
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            hasLotacao ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          title={hasLotacao ? 'Lotado' : 'Sem lotação'}
                        />
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* ── Coluna Direita ───────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              {!selecionado ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-500">
                  <User className="w-12 h-12 text-zinc-700" />
                  <p className="text-sm">Selecione um funcionário na lista</p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-center justify-between bg-[#1a1a1e] rounded-xl p-4 border border-[#26262a]">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${avatarColor(selecionado.nome).bg} ${avatarColor(selecionado.nome).text}`}
                      >
                        {selecionado.foto_url ? (
                          <img src={selecionado.foto_url} alt={selecionado.nome} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(selecionado.nome)
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white">{selecionado.nome}</p>
                        <p className="text-xs text-zinc-400">CPF: {selecionado.cpf ?? 'Não informado'}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                        selecionado.status === 'ativo'
                          ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-600/30'
                      }`}
                    >
                      {selecionado.status}
                    </span>
                  </div>

                  {/* Lotações Ativas */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5" />
                      Lotações Atuais (Ativas)
                    </div>
                    {selecionado.lotacoes.length === 0 ? (
                      <div className="bg-[#1a1a1e] border border-dashed border-[#3f3f46] rounded-xl p-4 text-center text-zinc-500 text-sm">
                        Nenhuma lotação ativa.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selecionado.lotacoes.map((lot) => (
                          <div
                            key={lot.id}
                            className="flex items-center justify-between bg-[#1a1a1e] border border-[#26262a] rounded-xl px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-semibold text-[#3ea6ff]">
                                {lot.escolaNome ?? 'Escola não encontrada'}
                              </p>
                              <p className="text-xs text-zinc-400">{lot.cargo ?? 'Cargo não definido'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                Ativa
                              </span>
                              <button
                                onClick={() => handleRemoverLotacao(lot)}
                                disabled={salvando}
                                className="w-7 h-7 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                                title="Remover lotação"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Grid: Nova Lotação + Transferência */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nova Lotação */}
                    <div className="bg-[#1a1a1e] border border-[#26262a] rounded-xl p-4 space-y-3">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-[#3ea6ff]">
                        <Plus className="w-4 h-4" />
                        Nova Lotação
                      </h4>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Escola / Órgão:</label>
                        <Select
                          value={novaEscola}
                          onValueChange={(v) => setNovaEscola(v ?? '')}
                        >
                          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9">
                            <SelectValue placeholder="Selecione uma escola..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
                            {escolas.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Cargo / Profissão:</label>
                        <Select
                          value={novoCargo}
                          onValueChange={(v) => setNovoCargo(v ?? '')}
                        >
                          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9">
                            <SelectValue placeholder="Selecione um cargo..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
                            {cargos.map((c) => (
                              <SelectItem key={c.id} value={c.nome}>
                                {c.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleAdicionarLotacao}
                        disabled={salvando || !novaEscola}
                        className="w-full bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold gap-2 h-9"
                      >
                        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Adicionar Lotação
                      </Button>
                    </div>

                    {/* Transferência */}
                    <div className="bg-[#1a1a1e] border border-[#26262a] rounded-xl p-4 space-y-3">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-rose-400">
                        <ArrowRightLeft className="w-4 h-4" />
                        Transferência
                      </h4>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Remover da Lotação (Origem):</label>
                        <Select
                          value={origemId}
                          onValueChange={(v) => setOrigemId(v ?? '')}
                        >
                          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9">
                            <SelectValue placeholder="Selecione a lotação original..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
                            {selecionado.lotacoes.map((lot) => (
                              <SelectItem key={lot.id} value={lot.id}>
                                {lot.escolaNome ?? lot.escola_id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-zinc-400">Alocar em (Destino):</label>
                        <Select
                          value={destinoEscolaId}
                          onValueChange={(v) => setDestinoEscolaId(v ?? '')}
                        >
                          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9">
                            <SelectValue placeholder="Selecione uma escola..." />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
                            {escolas.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleMoverFuncionario}
                        disabled={salvando || !origemId || !destinoEscolaId}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold gap-2 h-9"
                      >
                        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                        Mover Funcionário
                      </Button>
                    </div>
                  </div>

                  {/* Nota de auditoria */}
                  <div className="flex items-start gap-2 bg-[#1a1a1e] border border-[#26262a] rounded-xl p-3">
                    <Building2 className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-500">
                      Todas as ações de lotação são registradas no histórico funcional e na auditoria do sistema.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
