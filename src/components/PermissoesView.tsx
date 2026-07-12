'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import {
  Users,
  School,
  X,
  Eye,
  Search,
  ShieldCheck,
  ChevronDown,
  Check,
  Loader2,
  UserCheck,
  Building2,
  Shield,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { ModalConfirmacaoSenha } from '@/components/modals/modal-confirmacao-senha'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Escola {
  id: string
  nome: string
}

interface FuncionarioSimples {
  id: string
  nome: string
  email: string | null
}

interface RegistroPermissao {
  id: string
  nome: string
  email: string
  nivel: string
  nivelNum: number
  escola: string
  escolaId: string | null
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nivelLabel = (n: number | null | undefined): string => {
  if (n === 2) return 'Nível 2 - Diretor'
  if (n === 3) return 'Nível 3 - Coord. / Secretário'
  if (n === 4) return 'Nível 4 - Professor'
  if (n === 5) return 'Nível 5 - Chefe de Equipe'
  if (n === 6) return 'Nível 6 - Operacional'
  return 'Nível 1 - Administrador Global'
}

const nivelColor = (nivel: string) => {
  if (nivel.includes('ROOT')) return 'text-red-400 bg-red-400/10 border-red-400/30'
  if (nivel.includes('Nível 2')) return 'text-purple-400 bg-purple-400/10 border-purple-400/30'
  if (nivel.includes('Nível 3')) return 'text-blue-400 bg-blue-400/10 border-blue-400/30'
  if (nivel.includes('Nível 4')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
  if (nivel.includes('Nível 5')) return 'text-amber-400 bg-amber-400/10 border-amber-400/30'
  if (nivel.includes('Nível 6')) return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
  return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PermissoesView({ onBack }: { onBack?: () => void }) {
  const { isEditMode, setEditMode } = useEditModeStore()
  const { funcionario } = useAuthStore()
  const pathname = usePathname()
  const autocompleteRef = useRef<HTMLDivElement>(null)

  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false)
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false)
  const [modoAtribuicao, setModoAtribuicao] = useState<'funcionario' | 'escola'>('funcionario')
  const [salvando, setSalvando] = useState(false)

  // ── Dados do banco ──────────────────────────────────────────────────────────
  const [escolas, setEscolas] = useState<Escola[]>([])
  const [funcionariosAll, setFuncionariosAll] = useState<FuncionarioSimples[]>([])
  const [registros, setRegistros] = useState<RegistroPermissao[]>([])
  const [loading, setLoading] = useState(true)

  // ── Formulário de atribuição ────────────────────────────────────────────────
  const [inputFunc, setInputFunc] = useState('')
  const [funcSelecionado, setFuncSelecionado] = useState<FuncionarioSimples | null>(null)
  const [showSugestoes, setShowSugestoes] = useState(false)
  const [escolaSel, setEscolaSel] = useState('')
  const [nivelSel, setNivelSel] = useState('')

  // ── Filtros da lista ────────────────────────────────────────────────────────
  const [buscaLista, setBuscaLista] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroEscola, setFiltroEscola] = useState('')

  const isRootPanel =
    !!funcionario?.is_superadmin ||
    (typeof pathname === 'string' &&
      (pathname.startsWith('/admin') || pathname === '/root'))

  const isEditActive = isEditMode || isSuperAdminUser || isRootPanel

  // ─── Fetch inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      const supabase = createClient()
      setLoading(true)

      // 1. Escolas ativas (sem soft-delete)
      const { data: escolasData } = await supabase
        .from('escolas')
        .select('id, nome')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome')

      if (escolasData) setEscolas(escolasData)

      // 2. Todos os funcionários (para o autocomplete)
      const { data: funcsData } = await supabase
        .from('funcionarios')
        .select('id, nome, email')
        .eq('status', 'ativo')
        .order('nome')

      if (funcsData) setFuncionariosAll(funcsData)

      // 3. Registros de permissão com escola vinculada
      const { data: permData } = await supabase
        .from('funcionarios')
        .select('id, nome, email, status, is_superadmin, acessos_usuarios(nivel, escola_id, escolas(nome))')

      if (permData) {
        const formatados: RegistroPermissao[] = permData.map((f: any) => {
          const acesso = f.acessos_usuarios?.[0]
          const nivelNum: number = acesso?.nivel ?? 1
          let nomeNivel = nivelLabel(nivelNum)
          if (f.is_superadmin) nomeNivel = 'ROOT'

          const escolaNome: string = acesso?.escolas?.nome ?? 'Sem Lotação'
          const escolaId: string | null = acesso?.escola_id ?? null

          return {
            id: f.id,
            nome: f.nome,
            email: f.email ?? f.nome,
            nivel: nomeNivel,
            nivelNum,
            escola: escolaNome,
            escolaId,
            status: f.status || 'ativo',
          }
        })
        setRegistros(formatados)
      }

      setLoading(false)
    }

    fetchAll()
  }, [])

  // ─── SuperAdmin check ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isRootPanel) {
      setIsSuperAdminUser(true)
      setEditMode(true)
      return
    }
    const checkSuperAdmin = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data } = await supabase
          .from('funcionarios')
          .select('is_superadmin')
          .ilike('email', user.email)
          .maybeSingle()
        if (data?.is_superadmin) {
          setIsSuperAdminUser(true)
          setEditMode(true)
        }
      }
    }
    checkSuperAdmin()
  }, [funcionario, isRootPanel, setEditMode])

  // ─── Fechar autocomplete ao clicar fora ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowSugestoes(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Sugestões filtradas ────────────────────────────────────────────────────
  const sugestoesFiltradas = inputFunc.trim().length > 0
    ? funcionariosAll.filter(
        (f) =>
          f.nome.toLowerCase().includes(inputFunc.toLowerCase()) ||
          (f.email ?? '').toLowerCase().includes(inputFunc.toLowerCase())
      ).slice(0, 8)
    : []

  // ─── Salvar Permissão (UPSERT) ──────────────────────────────────────────────
  const handleSalvarPermissao = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isEditActive) {
      toast.warning('Ative o Modo Edição para alterar permissões.')
      setModalSenhaOpen(true)
      return
    }
    if (!funcSelecionado) {
      toast.error('Selecione um funcionário na lista de sugestões.')
      return
    }
    if (!nivelSel) {
      toast.error('Selecione o nível de acesso.')
      return
    }

    setSalvando(true)
    const supabase = createClient()
    const nivelNum = parseInt(nivelSel, 10)
    const escolaIdToSave = escolaSel || null

    // Verificar se já existe acesso para este funcionário + escola
    const { data: existente } = await supabase
      .from('acessos_usuarios')
      .select('id')
      .eq('funcionario_id', funcSelecionado.id)
      .eq('escola_id', escolaIdToSave as string)
      .maybeSingle()

    let error
    if (existente?.id) {
      // UPDATE — atualizar nível
      const { error: updateError } = await supabase
        .from('acessos_usuarios')
        .update({ nivel: nivelNum, ativo: true })
        .eq('id', existente.id)
      error = updateError
    } else {
      // INSERT — novo registro
      const { error: insertError } = await supabase
        .from('acessos_usuarios')
        .insert({
          funcionario_id: funcSelecionado.id,
          escola_id: escolaIdToSave,
          nivel: nivelNum,
          ativo: true,
        })
      error = insertError
    }

    if (error) {
      toast.error('Erro ao salvar permissão: ' + error.message)
    } else {
      toast.success(`Permissão atribuída a ${funcSelecionado.nome}!`)
      setInputFunc('')
      setFuncSelecionado(null)
      setEscolaSel('')
      setNivelSel('')

      // Recarregar lista
      const { data: permData } = await supabase
        .from('funcionarios')
        .select('id, nome, email, status, is_superadmin, acessos_usuarios(nivel, escola_id, escolas(nome))')
      if (permData) {
        const formatados: RegistroPermissao[] = (permData as any[]).map((f) => {
          const acesso = f.acessos_usuarios?.[0]
          const nivelNum2: number = acesso?.nivel ?? 1
          let nomeNivel = nivelLabel(nivelNum2)
          if (f.is_superadmin) nomeNivel = 'ROOT'
          return {
            id: f.id,
            nome: f.nome,
            email: f.email ?? f.nome,
            nivel: nomeNivel,
            nivelNum: nivelNum2,
            escola: acesso?.escolas?.nome ?? 'Sem Lotação',
            escolaId: acesso?.escola_id ?? null,
            status: f.status || 'ativo',
          }
        })
        setRegistros(formatados)
      }
    }
    setSalvando(false)
  }

  // ─── Filtros da lista ────────────────────────────────────────────────────────
  const limparFiltros = () => {
    setBuscaLista('')
    setFiltroNivel('')
    setFiltroEscola('')
  }

  const registrosFiltrados = registros.filter((item) => {
    const matchBusca =
      item.nome.toLowerCase().includes(buscaLista.toLowerCase()) ||
      item.email.toLowerCase().includes(buscaLista.toLowerCase())
    const matchNivel = !filtroNivel || item.nivel.includes(filtroNivel)
    const matchEscola = !filtroEscola || item.escola === filtroEscola
    return matchBusca && matchNivel && matchEscola
  })

  // ─── Agrupar por escola (modo Por Escola) ────────────────────────────────────
  const registrosAgrupadosPorEscola = registrosFiltrados.reduce<Record<string, RegistroPermissao[]>>(
    (acc, item) => {
      const chave = item.escola
      if (!acc[chave]) acc[chave] = []
      acc[chave].push(item)
      return acc
    },
    {}
  )

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Shield className="w-8 h-8 text-[#0090ff]" />
              Permissões
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Gerencie os níveis de acesso de cada funcionário por escola ou órgão.
            </p>
          </div>
        </div>

        {/* Botões de alternância */}
        <div className="flex items-center gap-2 bg-surface-2 border border-borderCustom rounded-xl p-1">
          <button
            type="button"
            onClick={() => setModoAtribuicao('funcionario')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
              modoAtribuicao === 'funcionario'
                ? 'bg-[#0090ff] text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Por Funcionário</span>
          </button>
          <button
            type="button"
            onClick={() => setModoAtribuicao('escola')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all cursor-pointer ${
              modoAtribuicao === 'escola'
                ? 'bg-[#0090ff] text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Por Escola</span>
          </button>
        </div>
      </div>

      {/* ── Card: Atribuir Acesso ────────────────────────────────────────────── */}
      <div className="bg-card border border-borderCustom rounded-2xl p-6 shadow-md space-y-5">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-[#0090ff]" />
          <h2 className="text-lg font-bold text-foreground">Atribuir / Atualizar Acesso</h2>
        </div>

        <form onSubmit={handleSalvarPermissao} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Campo Funcionário — Autocomplete */}
            <div className="space-y-2" ref={autocompleteRef}>
              <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
                FUNCIONÁRIO
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Digite para pesquisar..."
                  value={inputFunc}
                  onChange={(e) => {
                    setInputFunc(e.target.value)
                    setFuncSelecionado(null)
                    setShowSugestoes(true)
                  }}
                  onFocus={() => setShowSugestoes(true)}
                  className="pl-9 bg-surface-1 border-borderCustom text-foreground placeholder:text-muted-foreground h-11 rounded-xl focus:ring-[#0090ff] focus:border-[#0090ff]"
                />
                {funcSelecionado && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                )}

                {/* Dropdown de sugestões */}
                {showSugestoes && sugestoesFiltradas.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full bg-surface-1 border border-borderCustom rounded-xl shadow-xl overflow-hidden">
                    {sugestoesFiltradas.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setFuncSelecionado(f)
                          setInputFunc(f.nome)
                          setShowSugestoes(false)
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-hoverCustom transition-colors flex items-center gap-3 group"
                      >
                        <div className="w-7 h-7 rounded-full bg-[#0070f3]/20 border border-[#0070f3]/40 flex items-center justify-center text-[#0090ff] font-bold text-xs shrink-0">
                          {f.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm text-foreground font-medium truncate">{f.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{f.email ?? '—'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Campo Escola / Órgão — populado do banco */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
                ESCOLA / ÓRGÃO
              </label>
              <select
                value={escolaSel}
                onChange={(e) => setEscolaSel(e.target.value)}
                className="w-full bg-surface-1 border border-borderCustom text-foreground h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] focus:border-[#0090ff] cursor-pointer"
              >
                <option value="">Global / Todas as Escolas</option>
                {escolas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Nível de Acesso */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
                NÍVEL DE ACESSO
              </label>
              <select
                value={nivelSel}
                onChange={(e) => setNivelSel(e.target.value)}
                className="w-full bg-surface-1 border border-borderCustom text-foreground h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] focus:border-[#0090ff] cursor-pointer"
              >
                <option value="">Selecione o nível</option>
                <option value="1">Nível 1 - Administrador Global</option>
                <option value="2">Nível 2 - Diretor</option>
                <option value="3">Nível 3 - Coord. / Secretário</option>
                <option value="4">Nível 4 - Professor</option>
                <option value="5">Nível 5 - Chefe de Equipe</option>
                <option value="6">Nível 6 - Operacional Mobile</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={salvando}
            className="w-full h-12 bg-[#0090ff] hover:bg-[#0070f3] text-white font-semibold text-base rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60"
          >
            {salvando ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Salvar Permissão
              </span>
            )}
          </Button>
        </form>
      </div>

      {/* ── Card: Lista de Permissões ────────────────────────────────────────── */}
      <div className="bg-card border border-borderCustom rounded-2xl p-6 shadow-md space-y-4">

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar funcionário..."
              value={buscaLista}
              onChange={(e) => setBuscaLista(e.target.value)}
              className="pl-9 bg-surface-1 border-borderCustom text-foreground placeholder:text-muted-foreground h-11 rounded-xl focus:ring-[#0090ff] focus:border-[#0090ff]"
            />
          </div>

          {/* Filtro Nível */}
          <select
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="w-full bg-surface-1 border border-borderCustom text-foreground h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] cursor-pointer"
          >
            <option value="">Todos os Níveis</option>
            <option value="ROOT">ROOT</option>
            <option value="Nível 2">Nível 2 - Diretor</option>
            <option value="Nível 3">Nível 3 - Coord. / Secretário</option>
            <option value="Nível 4">Nível 4 - Professor</option>
            <option value="Nível 5">Nível 5 - Chefe de Equipe</option>
            <option value="Nível 6">Nível 6 - Operacional</option>
            <option value="Nível 1">Nível 1 - Administrador Global</option>
          </select>

          {/* Filtro Escola — populado do banco */}
          <select
            value={filtroEscola}
            onChange={(e) => setFiltroEscola(e.target.value)}
            className="w-full bg-surface-1 border border-borderCustom text-foreground h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] cursor-pointer"
          >
            <option value="">Todas as Escolas</option>
            <option value="Sem Lotação">Sem Lotação</option>
            {escolas.map((e) => (
              <option key={e.id} value={e.nome}>
                {e.nome}
              </option>
            ))}
          </select>

          {/* Limpar */}
          <button
            type="button"
            onClick={limparFiltros}
            className="h-11 px-4 bg-surface-2 hover:bg-hoverCustom text-foreground border border-borderCustom rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Limpar</span>
          </button>
        </div>

        {/* Contador */}
        <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
          <span>
            {registrosFiltrados.length} funcionário{registrosFiltrados.length !== 1 ? 's' : ''} encontrado{registrosFiltrados.length !== 1 ? 's' : ''}
          </span>
          {(buscaLista || filtroNivel || filtroEscola) && (
            <button onClick={limparFiltros} className="text-[#0090ff] hover:underline cursor-pointer">
              limpar filtros
            </button>
          )}
        </div>

        {/* ── Lista ─────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-zinc-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando permissões...</span>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm border border-dashed border-[#3f3f46] rounded-xl">
            Nenhum funcionário encontrado com os filtros aplicados.
          </div>
        ) : modoAtribuicao === 'funcionario' ? (
          /* ── Modo Por Funcionário ── */
          <div className="space-y-2">
            {registrosFiltrados.map((item) => (
              <FuncionarioCard
                key={item.id}
                item={item}
                isEditActive={isEditActive}
                onClickEdit={() => {
                  if (!isEditActive) {
                    toast.info('Ative o Modo Edição para gerenciar permissões.')
                    setModalSenhaOpen(true)
                  } else {
                    // preencher formulário com dados do funcionário para edição rápida
                    const func = funcionariosAll.find((f) => f.id === item.id)
                    if (func) {
                      setFuncSelecionado(func)
                      setInputFunc(func.nome)
                    }
                    const escolaEncontrada = escolas.find((e) => e.nome === item.escola)
                    setEscolaSel(escolaEncontrada?.id ?? '')
                    setNivelSel(item.nivelNum.toString())
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    toast.info(`Editando permissões de ${item.nome}`)
                  }
                }}
              />
            ))}
          </div>
        ) : (
          /* ── Modo Por Escola ── */
          <div className="space-y-6">
            {Object.entries(registrosAgrupadosPorEscola)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([escolaNome, membros]) => (
                <div key={escolaNome}>
                  {/* Header da Escola */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 bg-[#0090ff]/10 border border-[#0090ff]/20 rounded-lg px-3 py-1.5">
                      <Building2 className="w-4 h-4 text-[#0090ff] shrink-0" />
                      <span className="text-sm font-semibold text-[#0090ff]">{escolaNome}</span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-surface-3 px-2 py-0.5 rounded-full">
                      {membros.length} funcionário{membros.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-borderCustom" />
                  </div>

                  {/* Membros */}
                  <div className="space-y-2 ml-2">
                    {membros.map((item) => (
                      <FuncionarioCard
                        key={item.id}
                        item={item}
                        isEditActive={isEditActive}
                        compact
                        onClickEdit={() => {
                          if (!isEditActive) {
                            toast.info('Ative o Modo Edição para gerenciar permissões.')
                            setModalSenhaOpen(true)
                          } else {
                            const func = funcionariosAll.find((f) => f.id === item.id)
                            if (func) {
                              setFuncSelecionado(func)
                              setInputFunc(func.nome)
                            }
                            const escolaEncontrada = escolas.find((e) => e.nome === item.escola)
                            setEscolaSel(escolaEncontrada?.id ?? '')
                            setNivelSel(item.nivelNum.toString())
                            setModoAtribuicao('funcionario')
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                            toast.info(`Editando permissões de ${item.nome}`)
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal de Senha */}
      <ModalConfirmacaoSenha
        open={modalSenhaOpen}
        onOpenChange={setModalSenhaOpen}
        onSuccess={() => setEditMode(true)}
      />
    </div>
  )
}

// ─── Sub-component: Card de Funcionário ──────────────────────────────────────

interface FuncionarioCardProps {
  item: RegistroPermissao
  isEditActive: boolean
  compact?: boolean
  onClickEdit: () => void
}

function FuncionarioCard({ item, isEditActive, compact = false, onClickEdit }: FuncionarioCardProps) {
  const inicial = item.nome.charAt(0).toUpperCase()
  return (
    <div className={`bg-surface-2 border border-borderCustom hover:border-highlight/50 rounded-xl transition-colors flex items-center justify-between gap-3 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div className={`rounded-full bg-[#0070f3]/20 border border-[#0070f3]/50 flex items-center justify-center font-bold text-[#0090ff] shrink-0 ${compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-base'}`}>
          {inicial}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <h4 className={`font-bold text-foreground truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {item.nome}
          </h4>
          <p className="text-xs text-muted-foreground truncate">{item.email}</p>
        </div>
      </div>

      {/* Badges + Ação */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${nivelColor(item.nivel)}`}>
          {item.nivel}
        </span>
        {!compact && (
          <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-xs border border-borderCustom text-muted-foreground bg-surface-3 truncate max-w-[160px]">
            {item.escola}
          </span>
        )}
        <button
          type="button"
          onClick={onClickEdit}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isEditActive
              ? 'bg-[#0090ff]/10 hover:bg-[#0090ff]/20 text-[#0090ff]'
              : 'bg-surface-3 hover:bg-hoverCustom text-muted-foreground hover:text-foreground'
          }`}
          title={isEditActive ? 'Editar Permissão' : 'Visualizar'}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
