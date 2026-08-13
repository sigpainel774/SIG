'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { usePermissionSimulationStore } from '@/store/usePermissionSimulationStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import {
  ShieldCheck,
  RefreshCw,
  LogOut,
  Loader2,
  User,
  Building2,
  UserCheck,
  KeyRound,
  Briefcase,
  Activity,
  FileSearch,
  Trash2,
  MonitorSmartphone,
  Database,
  BarChart3,
  SlidersHorizontal,
  UserPlus,
  ScanLine,
  Bell,
  Flag,
  AlertTriangle,
  Bus,
  ArchiveRestore,
  Gauge,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Users,
  LucideIcon,
  HardDrive,
  ShieldAlert,
  Play,
  StopCircle,
  Search,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'

/* ─────────────────────────── types ─────────────────────────── */

interface ShortcutItem {
  title: string
  subtitle: string
  icon: LucideIcon
  iconColor: string
  path: string
}

interface AdminGroup {
  id: string
  label: string
  icon: LucideIcon
  headerColor: string
  badgeColor: string
  items: ShortcutItem[]
}

interface FuncionarioOption {
  id: string
  nome: string
  cargo: string | null
  email: string
}

/* ─────────────────────────── data ──────────────────────────── */

const adminGroups: AdminGroup[] = [
  {
    id: 'rede',
    label: 'Rede Municipal',
    icon: Building2,
    headerColor: 'text-sky-600 dark:text-sky-400',
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
    items: [
      {
        title: 'Secretarias',
        subtitle: 'Gerenciar secretarias',
        icon: Building2,
        iconColor: 'text-sky-600 dark:text-sky-300',
        path: '/admin/secretarias',
      },
      {
        title: 'Escolas & Unidades',
        subtitle: 'Todas as unidades',
        icon: Building2,
        iconColor: 'text-sky-600 dark:text-sky-400',
        path: '/admin/escolas',
      },
    ],
  },
  {
    id: 'pessoal',
    label: 'Pessoal & Acessos',
    icon: Users,
    headerColor: 'text-emerald-600 dark:text-emerald-400',
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    items: [
      {
        title: 'Funcionários',
        subtitle: 'Contas de login',
        icon: UserCheck,
        iconColor: 'text-sky-600 dark:text-sky-400',
        path: '/funcionarios',
      },
      {
        title: 'Acessos',
        subtitle: 'Níveis e permissões',
        icon: KeyRound,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        path: '/admin/acessos',
      },
      {
        title: 'Cargos',
        subtitle: 'Cargos e funções',
        icon: Briefcase,
        iconColor: 'text-amber-600 dark:text-amber-400',
        path: '/admin/cargos',
      },
      {
        title: 'Solicitações',
        subtitle: 'Lotação e escalas',
        icon: UserPlus,
        iconColor: 'text-amber-600 dark:text-amber-400',
        path: '/admin/solicitacoes',
      },
    ],
  },
  {
    id: 'monitoramento',
    label: 'Monitoramento',
    icon: Activity,
    headerColor: 'text-purple-600 dark:text-purple-400',
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
    items: [
      {
        title: 'Logs de Auditoria',
        subtitle: 'Histórico e ficha de auditoria',
        icon: Activity,
        iconColor: 'text-purple-600 dark:text-purple-400',
        path: '/admin/logs',
      },
      {
        title: 'Desempenho',
        subtitle: 'Métricas e gargalos',
        icon: Gauge,
        iconColor: 'text-violet-600 dark:text-violet-400',
        path: '/admin/desempenho',
      },
      {
        title: 'Indicadores',
        subtitle: 'Prazos e pendências',
        icon: TrendingUp,
        iconColor: 'text-purple-600 dark:text-purple-400',
        path: '/admin/indicadores',
      },
    ],
  },
  {
    id: 'dados',
    label: 'Dados & Arquivo',
    icon: Database,
    headerColor: 'text-slate-600 dark:text-slate-300',
    badgeColor: 'bg-slate-500/10 text-slate-700 border-slate-500/25 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
    items: [
      {
        title: 'Lixeira Global',
        subtitle: 'Restaurar deletados',
        icon: Trash2,
        iconColor: 'text-rose-500',
        path: '/admin/lixeira',
      },
      {
        title: 'Arquivados',
        subtitle: 'Fora da rede / Arquivo morto',
        icon: ArchiveRestore,
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        path: '/admin/arquivados',
      },
      {
        title: 'Banco de Dados',
        subtitle: 'Tabelas e encerramento',
        icon: Database,
        iconColor: 'text-slate-600 dark:text-slate-300',
        path: '/admin/banco',
      },
      {
        title: 'Armazenamento',
        subtitle: 'Detalhes do disco',
        icon: HardDrive,
        iconColor: 'text-sky-600 dark:text-sky-400',
        path: '/admin/armazenamento',
      },
    ],
  },
  {
    id: 'operacoes',
    label: 'Operações',
    icon: ScanLine,
    headerColor: 'text-cyan-600 dark:text-cyan-400',
    badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/25 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30',
    items: [
      {
        title: 'Controle de Rondas',
        subtitle: 'Escalas e rotas',
        icon: ScanLine,
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        path: '/admin/rondas',
      },
      {
        title: 'Notificações',
        subtitle: 'Avisos da rede',
        icon: Bell,
        iconColor: 'text-rose-500',
        path: '/historico-notificacoes',
      },
      {
        title: 'Ocorrências',
        subtitle: 'Histórico disciplinar',
        icon: AlertTriangle,
        iconColor: 'text-amber-600 dark:text-amber-400',
        path: '/ocorrencias',
      },
      {
        title: 'Reports de Bugs',
        subtitle: 'Feedbacks de erros',
        icon: Flag,
        iconColor: 'text-slate-600 dark:text-slate-300',
        path: '/admin/reports',
      },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: SlidersHorizontal,
    headerColor: 'text-sky-600 dark:text-sky-300',
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
    items: [
      {
        title: 'Relatórios',
        subtitle: 'Gráficos e estatísticas',
        icon: BarChart3,
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        path: '/relatorios',
      },
      {
        title: 'Configurações',
        subtitle: 'Parâmetros do sistema',
        icon: SlidersHorizontal,
        iconColor: 'text-sky-600 dark:text-sky-400',
        path: '/configuracoes',
      },
      {
        title: 'Dispositivos',
        subtitle: 'Dispositivos & PWA',
        icon: MonitorSmartphone,
        iconColor: 'text-sky-600 dark:text-sky-400',
        path: '/admin/dispositivos',
      },
    ],
  },
]

/* ─────────────────────────── component ─────────────────────── */

export default function AdminHubPage() {
  const router = useRouter()
  const supabase = createClient()
  const { funcionario, logout } = useAuthStore()

  // Store da Simulação de Permissões
  const {
    isSimulating,
    isLoadingSimulation,
    simulatedFuncionario,
    iniciarSimulacao,
    encerrarSimulacao,
  } = usePermissionSimulationStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loadingControles, setLoadingControles] = useState(true)

  // Estados dos Controles Globais
  const [permitirMensagensGlobais, setPermitirMensagensGlobais] = useState<boolean>(true)
  const [bloquearEdicaoFuncionariosRede, setBloquearEdicaoFuncionariosRede] = useState<boolean>(false)
  const [updatingMensagens, setUpdatingMensagens] = useState(false)
  const [updatingEdicao, setUpdatingEdicao] = useState(false)

  // Estados do Simulador de Permissões
  const [funcionariosOptions, setFuncionariosOptions] = useState<FuncionarioOption[]>([])
  const [selectedFuncId, setSelectedFuncId] = useState<string>('')
  const [searchFuncionarioTerm, setSearchFuncionarioTerm] = useState<string>('')
  const [loadingFuncionariosList, setLoadingFuncionariosList] = useState(false)

  // Filtrar opções de funcionários com base no campo de busca
  const funcionariosFiltrados = funcionariosOptions.filter((f) => {
    if (!searchFuncionarioTerm.trim()) return true
    const term = searchFuncionarioTerm.toLowerCase()
    return (
      f.nome.toLowerCase().includes(term) ||
      (f.cargo && f.cargo.toLowerCase().includes(term)) ||
      (f.email && f.email.toLowerCase().includes(term))
    )
  })

  // Garantir que um item válido permaneça selecionado ao filtrar
  useEffect(() => {
    if (funcionariosFiltrados.length > 0) {
      const exists = funcionariosFiltrados.some((f) => f.id === selectedFuncId)
      if (!exists) {
        setSelectedFuncId(funcionariosFiltrados[0].id)
      }
    }
  }, [searchFuncionarioTerm, funcionariosFiltrados, selectedFuncId])


  // All groups expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(adminGroups.map((g) => g.id))
  )

  // Carregar estados iniciais dos toggles e lista de funcionários
  React.useEffect(() => {
    async function loadControlesGlobais() {
      try {
        setLoadingControles(true)

        // 1. Carrega visibilidade de mensagens do usuário logado
        if (funcionario?.id) {
          const { data: funcData } = await supabase
            .from('funcionarios')
            .select('permitir_mensagens_globais')
            .eq('id', funcionario.id)
            .single()

          if (funcData) {
            setPermitirMensagensGlobais(funcData.permitir_mensagens_globais ?? true)
          }
        }

        // 2. Carrega trava de edição de funcionários na rede
        const { data: redeData } = await supabase
          .from('configuracoes_rede')
          .select('bloquear_edicao_funcionarios_rede')
          .limit(1)
          .single()

        if (redeData) {
          setBloquearEdicaoFuncionariosRede(redeData.bloquear_edicao_funcionarios_rede ?? false)
        }

        // 3. Carrega lista de funcionários para o simulador
        setLoadingFuncionariosList(true)
        const { data: funcs } = await supabase
          .from('funcionarios')
          .select('id, nome, cargo, email')
          .eq('status', 'ativo')
          .order('nome', { ascending: true })

        if (funcs) {
          setFuncionariosOptions(funcs)
          if (funcs.length > 0) {
            setSelectedFuncId(funcs[0].id)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar controles globais:', err)
      } finally {
        setLoadingControles(false)
        setLoadingFuncionariosList(false)
      }
    }

    loadControlesGlobais()
  }, [funcionario?.id, supabase])

  // Handlers para os Toggles
  const handleToggleMensagens = async () => {
    if (!funcionario?.id) return
    const newValue = !permitirMensagensGlobais
    setUpdatingMensagens(true)

    try {
      const { error } = await supabase
        .from('funcionarios')
        .update({ permitir_mensagens_globais: newValue })
        .eq('id', funcionario.id)

      if (error) throw error

      setPermitirMensagensGlobais(newValue)
      toast.success(
        newValue
          ? 'Visibilidade no chat ativada: qualquer usuário pode te localizar no chat interno.'
          : 'Visibilidade no chat restrita: apenas quem já possui conversa aberta conseguirá te enviar mensagens.'
      )
    } catch (err: unknown) {
      console.error('Erro ao atualizar permissão de mensagens:', err)
      toast.error('Erro ao atualizar preferência de chat.')
    } finally {
      setUpdatingMensagens(false)
    }
  }

  const handleToggleBloqueioEdicao = async () => {
    const newValue = !bloquearEdicaoFuncionariosRede
    setUpdatingEdicao(true)

    try {
      const { data: config } = await supabase
        .from('configuracoes_rede')
        .select('id')
        .limit(1)
        .single()

      if (config?.id) {
        const { error } = await supabase
          .from('configuracoes_rede')
          .update({ bloquear_edicao_funcionarios_rede: newValue })
          .eq('id', config.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('configuracoes_rede').insert({
          bloquear_edicao_funcionarios_rede: newValue,
          secretario_educacao: 'MARCUS ALANO CORREIA OLIVEIRA',
        })
        if (error) throw error
      }

      setBloquearEdicaoFuncionariosRede(newValue)
      toast.success(
        newValue
          ? 'Restrição ATIVADA: Edição de ficha de funcionários bloqueada para usuários com nível abaixo de 1.'
          : 'Restrição DESATIVADA: Edição de ficha de funcionários liberada conforme regras ABAC normais.'
      )
    } catch (err: unknown) {
      console.error('Erro ao atualizar trava de edição de funcionários:', err)
      toast.error('Erro ao salvar parâmetro global da rede.')
    } finally {
      setUpdatingEdicao(false)
    }
  }

  // Handler para iniciar simulação
  const handleStartSimulation = async () => {
    if (!selectedFuncId) {
      toast.error('Selecione um funcionário para simular.')
      return
    }

    const targetFunc = funcionariosOptions.find((f) => f.id === selectedFuncId)
    const success = await iniciarSimulacao(selectedFuncId, supabase)

    if (success) {
      toast.success(
        `Modo simulação ativado! Navegando com a experiência de "${targetFunc?.nome ?? 'Servidor'}".`
      )
      window.location.href = '/home'
    } else {
      toast.error('Falha ao carregar dados do usuário para simulação.')
    }
  }

  // Handler para encerrar simulação
  const handleStopSimulation = () => {
    encerrarSimulacao()
    toast.success('Simulação encerrada. Privilégios ROOT restaurados!')
    window.location.href = '/admin'
  }

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    toast.success('Sessão encerrada com sucesso!')
    await logout(supabase)
  }

  const handleRefreshCache = () => {
    toast.success('Cache do sistema atualizado com sucesso!')
    router.refresh()
  }

  const userEmail = funcionario?.email ?? 'adm@super.com'

  return (
    <div className="space-y-6 select-none -mt-3">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-borderCustom pb-4">
        {/* Title + ROOT badge */}
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-foreground stroke-[2.2]" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            Sapeaçu — Administração do Sistema
            <span className="bg-violet-500/10 text-violet-700 border border-violet-500/25 dark:bg-[#7c3aed]/20 dark:text-[#a78bfa] dark:border-[#7c3aed]/50 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider uppercase">
              ROOT
            </span>
          </h1>
        </div>

        {/* User Status & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-card px-3 py-1.5 rounded-xl border border-borderCustom shadow-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>
              Logado como: <strong className="text-foreground">{userEmail}</strong>
            </span>
          </div>

          <button
            onClick={handleRefreshCache}
            className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 dark:bg-[#052e16]/70 dark:border-[#166534] dark:hover:bg-[#052e16] dark:text-[#4ade80] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar Cache</span>
          </button>

          <ThemeSwitcher buttonClassName="bg-card border border-border hover:bg-muted text-foreground" />

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 dark:bg-[#450a0a]/70 dark:border-[#991b1b] dark:hover:bg-[#7f1d1d] dark:hover:text-white dark:text-[#f87171] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
          </button>
        </div>
      </div>

      {/* ── Seção Controles Globais ── */}
      <div className="bg-card border border-borderCustom rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4 border-b border-borderCustom pb-3">
          <div className="p-2 rounded-xl bg-[#0067c0]/10 text-[#0067c0] dark:bg-amber-500/15 dark:text-amber-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              Controles Globais do Sistema
              <span className="bg-[#0067c0]/10 text-[#0067c0] border border-[#0067c0]/25 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-md">
                Parâmetros ROOT
              </span>
            </h2>
            <p className="text-xs text-muted-foreground font-normal">
              Gerencie visibilidade no sistema de comunicações, travas globais de permissões e simulador de perfis da rede municipal.
            </p>
          </div>
        </div>

        {loadingControles ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            Carregando controles globais...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Toggle 1: Chat Interno */}
            <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Visibilidade no Chat Interno
                </span>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Quando ativo, qualquer usuário te encontra na busca do chat. Desativado, apenas conversas existentes continuam.
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {permitirMensagensGlobais ? 'Público' : 'Restrito'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleMensagens}
                  disabled={updatingMensagens}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50',
                    permitirMensagensGlobais ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      permitirMensagensGlobais ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Toggle 2: Bloqueio de Edição de Funcionários */}
            <div className="bg-card border border-border p-4 rounded-xl flex flex-col justify-between gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Bloquear Edição de Funcionários (&lt; Nível 1)
                </span>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Quando ativo, impede alterações em fichas de servidores por usuários com nível hierárquico abaixo de 1.
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {bloquearEdicaoFuncionariosRede ? 'Bloqueado' : 'Liberado'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleBloqueioEdicao}
                  disabled={updatingEdicao}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50',
                    bloquearEdicaoFuncionariosRede ? 'bg-rose-500' : 'bg-slate-300 dark:bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      bloquearEdicaoFuncionariosRede ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* Controle 3: Simulador de Permissões (Impersonation) */}
            <div className="bg-card border border-purple-500/30 dark:border-purple-500/40 p-4 rounded-xl flex flex-col justify-between gap-3 bg-purple-500/5 dark:bg-purple-950/20">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Simulador de Permissões
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 uppercase">
                    ABAC
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Simule a experiência, menus e visibilidade de qualquer servidor da rede sem exigir a senha dele.
                </p>
              </div>

              {isSimulating ? (
                <div className="pt-2 border-t border-purple-500/20 space-y-2">
                  <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 p-2 rounded-lg text-xs font-semibold text-purple-300">
                    <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">
                      Simulando: <strong>{simulatedFuncionario?.nome}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopSimulation}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    Encerrar Simulação
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-purple-500/20 space-y-2">
                  {/* Campo de Busca por Contas */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar conta por nome, cargo ou e-mail..."
                      value={searchFuncionarioTerm}
                      onChange={(e) => setSearchFuncionarioTerm(e.target.value)}
                      className="w-full bg-background border border-borderCustom text-foreground text-xs rounded-lg pl-8 pr-7 py-1.5 focus:ring-purple-500 focus:border-purple-500 font-medium placeholder:text-muted-foreground/70"
                    />
                    {searchFuncionarioTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchFuncionarioTerm('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                        title="Limpar busca"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <select
                    value={selectedFuncId}
                    onChange={(e) => setSelectedFuncId(e.target.value)}
                    disabled={loadingFuncionariosList || isLoadingSimulation}
                    className="w-full bg-background border border-borderCustom text-foreground text-xs rounded-lg p-2 focus:ring-purple-500 focus:border-purple-500 font-medium truncate"
                  >
                    {loadingFuncionariosList ? (
                      <option value="">Carregando funcionários...</option>
                    ) : funcionariosFiltrados.length === 0 ? (
                      <option value="">Nenhum funcionário encontrado</option>
                    ) : (
                      funcionariosFiltrados.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome} ({f.cargo || 'Sem cargo'}) — {f.email}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={handleStartSimulation}
                    disabled={!selectedFuncId || isLoadingSimulation || funcionariosFiltrados.length === 0}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isLoadingSimulation ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>{isLoadingSimulation ? 'Iniciando...' : 'Iniciar Simulação'}</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        )}
      </div>


      {/* ── Accordion Groups ── */}
      <div className="space-y-3">
        {adminGroups.map((group) => {
          const GroupIcon = group.icon
          const isOpen = expandedGroups.has(group.id)

          return (
            <div
              key={group.id}
              className="bg-card border border-borderCustom rounded-2xl shadow-sm dark:shadow-md overflow-hidden"
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <GroupIcon
                    className={cn('w-5 h-5 shrink-0', group.headerColor)}
                    strokeWidth={2}
                  />
                  <span className="text-foreground font-bold text-sm md:text-base tracking-wide">
                    {group.label}
                  </span>
                  <span
                    className={cn(
                      'hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border',
                      group.badgeColor
                    )}
                  >
                    {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                <div className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Group Body */}
              <div
                className={cn(
                  'transition-all duration-300 ease-in-out',
                  isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                )}
              >
                <div className="px-5 pb-5 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {group.items.map((item, i) => {
                      const ItemIcon = item.icon
                      return (
                        <div
                          key={i}
                          onClick={() => router.push(item.path)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && router.push(item.path)}
                          className="bg-card hover:bg-surface-2 border border-borderCustom hover:border-[#0067c0]/40 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group active:scale-[0.97] shadow-sm hover:shadow-md min-h-[110px]"
                        >
                          <div className="mb-2.5 flex items-center justify-center">
                            <ItemIcon
                              className={cn(
                                'w-8 h-8 transition-transform duration-200 group-hover:scale-110',
                                item.iconColor
                              )}
                              strokeWidth={1.8}
                            />
                          </div>
                          <h3 className="font-bold text-foreground text-[13px] leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-muted-foreground font-normal mt-0.5 leading-tight">
                            {item.subtitle}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

