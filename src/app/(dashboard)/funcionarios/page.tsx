'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Network,
  Printer,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { ModalFuncionario } from '@/components/modals/modal-funcionario'
import { ModalGestaoLotacoes } from '@/components/modals/modal-gestao-lotacoes'
import { createClient } from '@/lib/supabaseClient'
import { softDeleteToTrash } from '@/lib/audit/audit-agent'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'

/* ─── Tipo Funcionário ─────────────────────────────────────── */

export interface Funcionario {
  id: string
  nome: string
  email: string
  cpf?: string | null
  cargo?: string | null
  status: string
  orgao?: string | null
  data_nascimento?: string | null
  formacao?: string | null
  foto_url?: string | null
  is_superadmin?: boolean | null
}

/* ─── Helpers ────────────────────────────────────────────────── */

function getInitials(nome: string): string {
  const parts = nome.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_PALETTES: { bg: string; text: string }[] = [
  { bg: 'bg-[#1a3a5c]', text: 'text-[#60a5fa]' },
  { bg: 'bg-[#1a2e1a]', text: 'text-[#4ade80]' },
  { bg: 'bg-[#3a1a1a]', text: 'text-[#f87171]' },
  { bg: 'bg-[#2e1a3a]', text: 'text-[#c084fc]' },
  { bg: 'bg-[#3a2e1a]', text: 'text-[#fbbf24]' },
  { bg: 'bg-[#1a3a3a]', text: 'text-[#34d399]' },
]

function avatarPalette(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

/* ─── Componente Principal ────────────────────────────────────── */

export default function FuncionariosPage() {
  const supabase = createClient()
  const { funcionario: authFuncionario, acessos } = useAuthStore()
  const { isEditMode } = useEditModeStore()

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [carregando, setCarregando] = useState(true)

  /* Filtros */
  const [busca, setBusca] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  /* Modais */
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalEditando, setModalEditando] = useState<Funcionario | null>(null)
  const [modalLotacoesOpen, setModalLotacoesOpen] = useState(false)
  const [funcLotacaoInicial, setFuncLotacaoInicial] = useState<{ id: string } | null>(null)

  /* ── Carregar funcionários ───────────────────────────────── */

  const carregarFuncionarios = async () => {
    setCarregando(true)
    try {
      const isAdmin = useAuthStore.getState().isAdminGlobalOrRoot()

      let query = supabase
        .from('funcionarios')
        .select(`
          id, nome, email, cpf, cargo, status, formacao, foto_url, data_nascimento, is_superadmin,
          vinculos_funcionarios(escola_id, cargo, ativo, escolas(nome))
        `)
        .is('deleted_at', null)
        .order('nome')

      // Se não for admin global, filtra apenas pelos funcionários vinculados à escola ativa
      if (!isAdmin) {
        const escolaId = useAuthStore.getState().escolaAtivaId
        if (!escolaId) {
          setFuncionarios([])
          return
        }

        const { data: vincs } = await supabase
          .from('vinculos_funcionarios')
          .select('funcionario_id')
          .eq('escola_id', escolaId)
          .eq('ativo', true)

        const ids = (vincs ?? []).map((v: any) => v.funcionario_id as string)
        if (ids.length > 0) {
          query = query.in('id', ids) as typeof query
        } else {
          setFuncionarios([])
          return
        }
      }

      const { data, error } = await query
      if (error) throw error

      const formatados: Funcionario[] = (data ?? []).map((f: Record<string, unknown>) => {
        // Pegar o primeiro vínculo ativo como órgão principal
        const vincs = (f.vinculos_funcionarios as Array<Record<string, unknown>>) ?? []
        const vinculoAtivo = vincs.find((v) => v.ativo)
        const escola = vinculoAtivo?.escolas as { nome: string } | null

        return {
          id: f.id as string,
          nome: f.nome as string,
          email: f.email as string,
          cpf: f.cpf as string | null,
          cargo: f.cargo as string | null,
          status: (f.status as string) ?? 'ativo',
          formacao: f.formacao as string | null,
          foto_url: f.foto_url as string | null,
          data_nascimento: f.data_nascimento as string | null,
          is_superadmin: f.is_superadmin as boolean | null,
          orgao: escola?.nome ?? null,
        }
      })

      setFuncionarios(formatados)
    } catch (err) {
      console.error('Erro ao carregar funcionários:', err)
      toast.error('Erro ao carregar lista de funcionários.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarFuncionarios()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Listas para dropdowns ─────────────────────────────────── */

  const cargosUnicos = useMemo(() => {
    const set = new Set(funcionarios.map((f) => f.cargo).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [funcionarios])

  /* ── Filtro ─────────────────────────────────────────────────── */

  const funcsFiltrados = useMemo(() => {
    return funcionarios.filter((f) => {
      const matchBusca =
        f.nome.toLowerCase().includes(busca.toLowerCase()) ||
        f.email.toLowerCase().includes(busca.toLowerCase()) ||
        (f.cpf ?? '').includes(busca) ||
        (f.orgao ?? '').toLowerCase().includes(busca.toLowerCase())

      const matchCargo =
        filtroCargo === 'todos' || f.cargo === filtroCargo

      const matchStatus =
        filtroStatus === 'todos' ||
        (f.status ?? '').toLowerCase() === filtroStatus.toLowerCase()

      return matchBusca && matchCargo && matchStatus
    })
  }, [funcionarios, busca, filtroCargo, filtroStatus])

  /* ── Ações dos cards ────────────────────────────────────────── */

  const handleAbrirLotacoes = (func: Funcionario) => {
    setFuncLotacaoInicial({ id: func.id })
    setModalLotacoesOpen(true)
  }

  const handleEditar = (func: Funcionario) => {
    setModalEditando(func)
  }

  const handleExcluir = async (func: Funcionario) => {
    if (!confirm(`Deseja excluir o funcionário "${func.nome}"? Esta ação pode ser desfeita pela lixeira.`)) return

    try {
      await softDeleteToTrash({
        supabase,
        tableName: 'funcionarios',
        recordId: func.id,
        recordSummary: `${func.nome} (${func.email})`,
        recordPayload: func,
        performedBy: {
          id: authFuncionario?.id ?? null,
          name: authFuncionario?.nome ?? 'Sistema',
          email: authFuncionario?.email ?? '',
        },
      })
      toast.success(`Funcionário "${func.nome}" movido para a lixeira.`)
      await carregarFuncionarios()
    } catch (err) {
      toast.error('Erro ao excluir funcionário.')
      console.error(err)
    }
  }

  const handleImprimir = (func: Funcionario) => {
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha - ${func.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #000; }
            h1 { font-size: 20px; border-bottom: 2px solid #000; padding-bottom: 8px; }
            .field { margin: 8px 0; font-size: 14px; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Ficha do Funcionário</h1>
          <div class="field"><span class="label">Nome:</span> ${func.nome}</div>
          <div class="field"><span class="label">E-mail:</span> ${func.email}</div>
          <div class="field"><span class="label">CPF:</span> ${func.cpf ?? '—'}</div>
          <div class="field"><span class="label">Cargo:</span> ${func.cargo ?? '—'}</div>
          <div class="field"><span class="label">Status:</span> ${func.status}</div>
          <div class="field"><span class="label">Órgão:</span> ${func.orgao ?? '—'}</div>
          <div class="field"><span class="label">Nascimento:</span> ${formatarData(func.data_nascimento)}</div>
          <div class="field"><span class="label">Formação:</span> ${func.formacao ?? '—'}</div>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  const handleImprimirLista = () => {
    const linhas = funcsFiltrados
      .map(
        (f) =>
          `<tr>
            <td>${f.nome}</td>
            <td>${f.cargo ?? '—'}</td>
            <td>${f.status}</td>
            <td>${f.orgao ?? '—'}</td>
            <td>${formatarData(f.data_nascimento)}</td>
          </tr>`
      )
      .join('')

    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lista de Funcionários</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Lista de Funcionários</h1>
          <table>
            <thead>
              <tr>
                <th>Nome</th><th>Cargo</th><th>Status</th><th>Órgão</th><th>Nascimento</th>
              </tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 pb-12">
      {/* Modal Novo Funcionário */}
      <ModalFuncionario
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        onSuccess={carregarFuncionarios}
      />

      {/* Modal Editar Funcionário */}
      <ModalFuncionario
        open={!!modalEditando}
        onOpenChange={(v) => { if (!v) setModalEditando(null) }}
        funcionario={modalEditando}
        onSuccess={carregarFuncionarios}
      />

      {/* Modal Gestão de Lotações */}
      <ModalGestaoLotacoes
        open={modalLotacoesOpen}
        onOpenChange={setModalLotacoesOpen}
        funcionarioInicial={funcLotacaoInicial}
      />

      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-white tracking-tight">Funcionários</h1>
      </div>

      {/* ── Barra de ferramentas ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Busca */}
        <Input
          placeholder="Buscar funcionário por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="bg-[#1a1a1e] border-[#2e2e33] text-white placeholder:text-zinc-500 h-9 w-56 text-sm"
        />

        {/* Filtro Cargo */}
        <Select value={filtroCargo} onValueChange={(v) => setFiltroCargo(v ?? 'todos')}>
          <SelectTrigger className="bg-[#1a1a1e] border-[#2e2e33] text-white h-9 text-sm w-44">
            <SelectValue placeholder="Todos os Cargos" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
            <SelectItem value="todos">Todos os Cargos</SelectItem>
            {cargosUnicos.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro Status */}
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v ?? 'todos')}>
          <SelectTrigger className="bg-[#1a1a1e] border-[#2e2e33] text-white h-9 text-sm w-40">
            <SelectValue placeholder="Todos os Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="afastado">Afastado</SelectItem>
            <SelectItem value="desligado">Desligado</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
          </SelectContent>
        </Select>

        {/* Gestão de Lotações */}
        <Button
          onClick={() => {
            setFuncLotacaoInicial(null)
            setModalLotacoesOpen(true)
          }}
          className="bg-[#1a1a1e] hover:bg-[#252528] border border-[#2e2e33] text-white font-semibold gap-2 h-9 text-sm cursor-pointer"
          variant="outline"
        >
          <Network className="w-4 h-4 text-[#3ea6ff]" />
          Gestão de Lotações
        </Button>

        {/* Imprimir Lista */}
        <Button
          onClick={handleImprimirLista}
          className="bg-[#1a1a1e] hover:bg-[#252528] border border-[#2e2e33] text-white font-semibold gap-2 h-9 text-sm cursor-pointer"
          variant="outline"
        >
          <Printer className="w-4 h-4" />
          Imprimir Lista
        </Button>

        {/* Espaçador + Novo Funcionário */}
        {isEditMode && (
          <div className="ml-auto">
            <Button
              onClick={() => setModalNovoOpen(true)}
              className="bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold gap-2 h-9 text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Funcionário
            </Button>
          </div>
        )}
      </div>

      {/* ── Grade de Cards ─────────────────────────────────────── */}
      {carregando ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
        </div>
      ) : funcsFiltrados.length === 0 ? (
        <div className="bg-[#141416] border border-dashed border-[#3f3f46] rounded-2xl p-12 text-center text-zinc-500 text-sm">
          Nenhum funcionário encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {funcsFiltrados.map((func) => {
            const palette = avatarPalette(func.nome)
            const isAtivo = (func.status ?? '').toLowerCase() === 'ativo'

            return (
              <div
                key={func.id}
                className="bg-[#141416] border border-[#26262a] hover:border-[#3ea6ff]/40 rounded-2xl p-4 flex flex-col gap-3 transition-all shadow-md"
              >
                {/* ── Topo do card: Avatar + Nome + Badges ── */}
                <div className="flex items-start gap-3">
                  {/* Avatar circular */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0 overflow-hidden ${palette.bg} ${palette.text}`}
                  >
                    {func.foto_url ? (
                      <img
                        src={func.foto_url}
                        alt={func.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      getInitials(func.nome)
                    )}
                  </div>

                  {/* Nome + badges */}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white text-sm leading-tight truncate">
                      {func.nome}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {/* Badge Cargo */}
                      {func.cargo && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#0c2340] border border-[#1e4a7a] text-[#60a5fa] text-[10px] font-semibold tracking-wide truncate max-w-[130px]">
                          {func.cargo}
                        </span>
                      )}
                      {/* Badge Status */}
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                          isAtivo
                            ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-400'
                            : 'bg-zinc-800/60 border border-zinc-600/50 text-zinc-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isAtivo ? 'bg-emerald-400' : 'bg-zinc-500'}`}
                        />
                        {isAtivo ? 'Ativo' : func.status.charAt(0).toUpperCase() + func.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Botões de Ação ──────────────────────── */}
                <div className="flex items-center gap-2">
                  {/* M — Gestão de Lotações */}
                  {isEditMode && (
                    <button
                      onClick={() => handleAbrirLotacoes(func)}
                      title="Gestão de Lotações"
                      className="w-9 h-9 rounded-full bg-[#1a2940] hover:bg-[#1e3a5f] border border-[#1e4a7a] text-[#60a5fa] font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                    >
                      M
                    </button>
                  )}
                  {/* Imprimir ficha */}
                  <button
                    onClick={() => handleImprimir(func)}
                    title="Imprimir ficha"
                    className="w-9 h-9 rounded-full bg-[#1a1a1e] hover:bg-[#252528] border border-[#2e2e33] text-zinc-300 flex items-center justify-center transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  {/* Editar */}
                  {isEditMode && (
                    <button
                      onClick={() => handleEditar(func)}
                      title="Editar funcionário"
                      className="w-9 h-9 rounded-full bg-[#1a1a1e] hover:bg-[#252528] border border-[#2e2e33] text-zinc-300 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {/* Excluir */}
                  {isEditMode && (
                    <button
                      onClick={() => handleExcluir(func)}
                      title="Excluir funcionário"
                      className="w-9 h-9 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* ── Informações Adicionais ────────────────── */}
                <div className="space-y-1.5 border-t border-[#26262a] pt-3 text-xs text-zinc-400">
                  {func.orgao && (
                    <p>
                      <span className="font-semibold text-zinc-300">Órgão:</span>{' '}
                      {func.orgao}
                    </p>
                  )}
                  {func.data_nascimento && (
                    <p>
                      <span className="font-semibold text-zinc-300">Nascimento:</span>{' '}
                      {formatarData(func.data_nascimento)}
                    </p>
                  )}
                  {func.formacao && (
                    <p>
                      <span className="font-semibold text-zinc-300">Formação:</span>{' '}
                      {func.formacao}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
