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
  FlaskConical,
  LogIn,
  Clock,
} from 'lucide-react'

import { ModalSessionTimeout } from '@/components/modals/modal-session-timeout'

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
        title: 'Defesa & Segurança',
        subtitle: 'WAF, ataques e bloqueios',
        icon: ShieldAlert,
        iconColor: 'text-rose-600 dark:text-rose-400',
        path: '/admin/defesa',
      },
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
    entrarComoSuperadmin,
    encerrarSimulacao,
  } = usePermissionSimulationStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [loadingControles, setLoadingControles] = useState(true)

  // Estados dos Controles Globais
  const [permitirMensagensGlobais, setPermitirMensagensGlobais] = useState<boolean>(true)
  const [updatingMensagens, setUpdatingMensagens] = useState(false)

  // Estados granulares de bloqueio de edição de funcionários
  type BloqueioEscopo = 'desativado' | 'rede' | 'secretarias' | 'escolas'
  const [bloqueioEscopo, setBloqueioEscopo] = useState<BloqueioEscopo>('desativado')
  const [bloqueioSecretariasSel, setBloqueioSecretariasSel] = useState<string[]>([])
  const [bloqueioEscolasSel, setBloqueioEscolasSel] = useState<string[]>([])
  const [secretariasOptions, setSecretariasOptions] = useState<{ id: string; nome: string }[]>([])
  const [escolasOptions, setEscolasOptions] = useState<{ id: string; nome: string }[]>([])
  const [savingBloqueio, setSavingBloqueio] = useState(false)
  const [searchSecretaria, setSearchSecretaria] = useState('')
  const [searchEscola, setSearchEscola] = useState('')

  // Estados do Controle de Tempo de Sessões (Logoff por Horário)
  const [isSessionTimeoutModalOpen, setIsSessionTimeoutModalOpen] = useState(false)
  const [sessionRulesSummary, setSessionRulesSummary] = useState<{ total: number; active: number }>({
    total: 0,
    active: 0,
  })

  // Estados do Ambiente de Simulação Isolado (Escolas de Teste)
  const [testEscolas, setTestEscolas] = useState<any[]>([])
  const [testUsers, setTestUsers] = useState<any[]>([])
  const [loadingTestEnv, setLoadingTestEnv] = useState<boolean>(false)
  const [selectedTestUserPerSchool, setSelectedTestUserPerSchool] = useState<Record<string, string>>({})
  const [searchTestUserPerSchool, setSearchTestUserPerSchool] = useState<Record<string, string>>({})

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

        // 2. Carrega config granular de bloqueio de edição de funcionários
        const { data: redeData } = await supabase
          .from('configuracoes_rede')
          .select('bloquear_edicao_funcionarios_rede, bloquear_por_secretarias, bloquear_por_escolas')
          .limit(1)
          .single()

        if (redeData) {
          const redeInteira = redeData.bloquear_edicao_funcionarios_rede ?? false
          const porSecretarias = (redeData.bloquear_por_secretarias as string[] | null) ?? []
          const porEscolas = (redeData.bloquear_por_escolas as string[] | null) ?? []

          if (redeInteira) {
            setBloqueioEscopo('rede')
          } else if (porSecretarias.length > 0 && porEscolas.length > 0) {
            // Cumulativo com ambos preenchidos: heurística = prioriza secretarias na UI
            setBloqueioEscopo('secretarias')
            setBloqueioSecretariasSel(porSecretarias)
            setBloqueioEscolasSel(porEscolas)
          } else if (porSecretarias.length > 0) {
            setBloqueioEscopo('secretarias')
            setBloqueioSecretariasSel(porSecretarias)
          } else if (porEscolas.length > 0) {
            setBloqueioEscopo('escolas')
            setBloqueioEscolasSel(porEscolas)
          } else {
            setBloqueioEscopo('desativado')
          }
        }

        // 3. Carrega listas de secretarias e escolas para o seletor
        const [secRes, escRes] = await Promise.all([
          supabase.from('secretarias').select('id, nome').eq('ativo', true).order('nome'),
          supabase.from('escolas').select('id, nome').is('deleted_at', null).or('is_teste.is.null,is_teste.eq.false').order('nome'),
        ])
        if (secRes.data) setSecretariasOptions(secRes.data as { id: string; nome: string }[])
        if (escRes.data) setEscolasOptions(escRes.data as { id: string; nome: string }[])

        // 4. Carrega lista de funcionários para o Simulador de Permissões
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

        // 4. Carrega escolas de teste isoladas e contas vinculadas
        setLoadingTestEnv(true)
        const { data: tEscolas } = await supabase
          .from('escolas')
          .select('id, nome, codigo, is_teste')
          .eq('is_teste', true)
          .is('deleted_at', null)
          .order('nome', { ascending: true })

        if (tEscolas) {
          setTestEscolas(tEscolas)
          const tIds = tEscolas.map((e: any) => e.id)
          if (tIds.length > 0) {
            const { data: tVinculos } = await supabase
              .from('vinculos_funcionarios')
              .select('funcionario_id, escola_id, funcionario:funcionario_id(id, nome, cargo, email)')
              .in('escola_id', tIds)
              .eq('ativo', true)

            if (tVinculos) {
              const formattedTUsers = tVinculos
                .map((v: any) => ({
                  ...(v.funcionario || {}),
                  escola_id: v.escola_id,
                }))
                .filter((u: any) => u && u.id)
              setTestUsers(formattedTUsers)
            }
          }
        }

        // 5. Carrega resumo de regras de tempo de sessão
        const { data: sRules } = await supabase
          .from('session_timeout_rules')
          .select('id, ativo')

        if (sRules) {
          const total = sRules.length
          const active = sRules.filter((r) => r.ativo).length
          setSessionRulesSummary({ total, active })
        }
      } catch (err) {
        console.error('Erro ao carregar controles globais:', err)
      } finally {
        setLoadingControles(false)
        setLoadingFuncionariosList(false)
        setLoadingTestEnv(false)
      }
    }

    loadControlesGlobais()
  }, [funcionario?.id, supabase])

  const refreshSessionRulesSummary = async () => {
    try {
      const { data: sRules } = await supabase
        .from('session_timeout_rules')
        .select('id, ativo')

      if (sRules) {
        const total = sRules.length
        const active = sRules.filter((r) => r.ativo).length
        setSessionRulesSummary({ total, active })
      }
    } catch (err) {
      console.error('Erro ao atualizar resumo de regras:', err)
    }
  }

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

  const handleSalvarBloqueioGranular = async () => {
    setSavingBloqueio(true)

    const isRedeInteira = bloqueioEscopo === 'rede'
    const secretariasFinal = bloqueioEscopo === 'secretarias' || (bloqueioEscopo === 'escolas' && bloqueioSecretariasSel.length > 0)
      ? bloqueioSecretariasSel
      : []
    const escolasFinal = bloqueioEscopo === 'escolas' || (bloqueioEscopo === 'secretarias' && bloqueioEscolasSel.length > 0)
      ? bloqueioEscolasSel
      : []

    try {
      const { data: config } = await supabase
        .from('configuracoes_rede')
        .select('id')
        .limit(1)
        .single()

      const payload = {
        bloquear_edicao_funcionarios_rede: isRedeInteira,
        bloquear_por_secretarias: isRedeInteira ? [] : secretariasFinal,
        bloquear_por_escolas: isRedeInteira ? [] : escolasFinal,
      }

      if (config?.id) {
        const { error } = await supabase
          .from('configuracoes_rede')
          .update(payload)
          .eq('id', config.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('configuracoes_rede')
          .insert({ ...payload, secretario_educacao: 'MARCUS ALANO CORREIA OLIVEIRA' })
        if (error) throw error
      }

      const msgs: Record<BloqueioEscopo, string> = {
        desativado: 'Bloqueio DESATIVADO: edição de funcionários liberada conforme regras ABAC normais.',
        rede: 'Bloqueio ATIVADO para toda a rede: edição bloqueada para usuários abaixo de Nível 1.',
        secretarias: `Bloqueio por secretaria ATIVADO: ${secretariasFinal.length} secretaria(s) bloqueada(s)${escolasFinal.length > 0 ? ` + ${escolasFinal.length} escola(s) adicionais` : ''}.`,
        escolas: `Bloqueio por escola ATIVADO: ${escolasFinal.length} escola(s) bloqueada(s)${secretariasFinal.length > 0 ? ` + ${secretariasFinal.length} secretaria(s) adicionais` : ''}.`,
      }
      toast.success(msgs[bloqueioEscopo])
    } catch (err: unknown) {
      console.error('Erro ao salvar configuração de bloqueio:', err)
      toast.error('Erro ao salvar parâmetro global da rede.')
    } finally {
      setSavingBloqueio(false)
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

  // Handler para entrar na escola de teste diretamente como Superadmin
  const handleEntrarEscolaComoSuper = async (escola: any) => {
    const success = await entrarComoSuperadmin(escola.id, supabase)
    if (success) {
      toast.success(
        `Acesso Superadmin ativado na "${escola.nome}"! Modo de edição e poderes de Nível 1 liberados.`
      )
      window.location.href = '/home'
    } else {
      toast.error('Falha ao acessar unidade de teste como Superadmin.')
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

  const userEmail = funcionario?.email ?? 'seu@email.com'

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

            {/* Card 2: Bloqueio Granular de Edição de Funcionários */}
            <div className="bg-card border border-border p-4 rounded-xl flex flex-col gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Bloquear Edição de Funcionários (&lt; Nível 1)
                </span>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Impede alterações em fichas por usuários abaixo de Nível 1. Escolha o escopo do bloqueio.
                </p>
              </div>

              {/* Radio group de escopo */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {([
                  { value: 'desativado', label: 'Desativado' },
                  { value: 'rede', label: 'Toda a Rede' },
                  { value: 'secretarias', label: 'Por Secretaria' },
                  { value: 'escolas', label: 'Por Escola' },
                ] as { value: BloqueioEscopo; label: string }[]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBloqueioEscopo(opt.value)}
                    className={cn(
                      'text-[11px] font-semibold px-2 py-1.5 rounded-lg border transition-colors text-left',
                      bloqueioEscopo === opt.value
                        ? opt.value === 'desativado'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-400'
                        : 'bg-background border-border text-muted-foreground hover:border-foreground/30'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Seletor de Secretarias */}
              {(bloqueioEscopo === 'secretarias' || (bloqueioEscopo === 'escolas' && bloqueioSecretariasSel.length > 0)) && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Secretarias bloqueadas {bloqueioEscopo === 'escolas' ? '(adicionais)' : ''}
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar secretaria…"
                    value={searchSecretaria}
                    onChange={(e) => setSearchSecretaria(e.target.value)}
                    className="w-full text-[11px] bg-background border border-border rounded-lg px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="max-h-32 overflow-y-auto space-y-0.5 pr-0.5">
                    {secretariasOptions
                      .filter((s) => s.nome.toLowerCase().includes(searchSecretaria.toLowerCase()))
                      .map((sec) => (
                        <label key={sec.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bloqueioSecretariasSel.includes(sec.id)}
                            onChange={(e) => {
                              setBloqueioSecretariasSel(prev =>
                                e.target.checked ? [...prev, sec.id] : prev.filter(id => id !== sec.id)
                              )
                            }}
                            className="accent-rose-500 w-3.5 h-3.5 shrink-0"
                          />
                          <span className="text-[11px] text-foreground truncate">{sec.nome}</span>
                        </label>
                      ))
                    }
                    {secretariasOptions.filter((s) => s.nome.toLowerCase().includes(searchSecretaria.toLowerCase())).length === 0 && (
                      <p className="text-[11px] text-muted-foreground px-2 py-1">Nenhuma secretaria encontrada.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Seletor de Escolas */}
              {(bloqueioEscopo === 'escolas' || (bloqueioEscopo === 'secretarias' && bloqueioEscolasSel.length > 0)) && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Escolas bloqueadas {bloqueioEscopo === 'secretarias' ? '(adicionais)' : ''}
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar escola…"
                    value={searchEscola}
                    onChange={(e) => setSearchEscola(e.target.value)}
                    className="w-full text-[11px] bg-background border border-border rounded-lg px-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5">
                    {escolasOptions
                      .filter((e) => e.nome.toLowerCase().includes(searchEscola.toLowerCase()))
                      .map((esc) => (
                        <label key={esc.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={bloqueioEscolasSel.includes(esc.id)}
                            onChange={(e) => {
                              setBloqueioEscolasSel(prev =>
                                e.target.checked ? [...prev, esc.id] : prev.filter(id => id !== esc.id)
                              )
                            }}
                            className="accent-rose-500 w-3.5 h-3.5 shrink-0"
                          />
                          <span className="text-[11px] text-foreground truncate">{esc.nome}</span>
                        </label>
                      ))
                    }
                    {escolasOptions.filter((e) => e.nome.toLowerCase().includes(searchEscola.toLowerCase())).length === 0 && (
                      <p className="text-[11px] text-muted-foreground px-2 py-1">Nenhuma escola encontrada.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Rodapé com status e botão salvar */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                <span className={cn(
                  'text-[11px] font-bold uppercase tracking-wider',
                  bloqueioEscopo === 'desativado' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )}>
                  {bloqueioEscopo === 'desativado' && 'Liberado'}
                  {bloqueioEscopo === 'rede' && 'Toda a rede bloqueada'}
                  {bloqueioEscopo === 'secretarias' && `${bloqueioSecretariasSel.length} sec. bloqueada(s)`}
                  {bloqueioEscopo === 'escolas' && `${bloqueioEscolasSel.length} escola(s) bloqueada(s)`}
                </span>
                <button
                  type="button"
                  onClick={handleSalvarBloqueioGranular}
                  disabled={savingBloqueio}
                  className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50 shrink-0"
                >
                  {savingBloqueio ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Salvar
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

            {/* Controle 4: Tempo de Sessões (Logoff por Horário) */}
            <div className="bg-card border border-amber-500/30 dark:border-amber-500/40 p-4 rounded-xl flex flex-col justify-between gap-3 bg-amber-500/5 dark:bg-amber-950/20">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Tempo de Sessões
                  </span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase">
                    NÍVEL 2+
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Configurar horários de logoff compulsório em postos de trabalho para evitar contas abertas em computadores da rede.
                </p>
              </div>

              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">Status da Rede:</span>
                  <span
                    className={cn(
                      'text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                      sessionRulesSummary.active > 0
                        ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
                        : 'bg-zinc-500/15 text-zinc-600 border-zinc-500/30 dark:text-zinc-400'
                    )}
                  >
                    {sessionRulesSummary.active > 0
                      ? `${sessionRulesSummary.active} ativa(s)`
                      : 'Desativado'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSessionTimeoutModalOpen(true)}
                  className="w-full bg-[#0067c0] hover:bg-[#005aab] dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-bold text-xs py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Gerenciar Regras</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Seção Ambiente de Simulação Isolado (Escolas de Teste) ── */}
      <div className="bg-card border border-amber-500/30 dark:border-amber-500/40 rounded-2xl p-5 shadow-sm relative overflow-hidden bg-amber-500/5 dark:bg-amber-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Ambiente de Simulação Isolado (Escolas de Teste)
                <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-md">
                  ISOLADO DA REDE
                </span>
              </h2>
              <p className="text-xs text-muted-foreground font-normal">
                As unidades "Teste 1" e "Teste 2" estão isoladas das listas e relatórios oficiais. Simule contas nestas unidades para realizar lançamentos e testes com segurança.
              </p>
            </div>
          </div>
        </div>

        {loadingTestEnv ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            Carregando ambiente de teste...
          </div>
        ) : testEscolas.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">Nenhuma escola de teste encontrada.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testEscolas.map((escola) => {
              const usersOfEscola = testUsers.filter((u) => u.escola_id === escola.id)
              const searchTerm = (searchTestUserPerSchool[escola.id] || '').toLowerCase().trim()
              const filteredUsers = usersOfEscola.filter((u) => {
                if (!searchTerm) return true
                return (
                  u.nome?.toLowerCase().includes(searchTerm) ||
                  u.cargo?.toLowerCase().includes(searchTerm) ||
                  u.email?.toLowerCase().includes(searchTerm)
                )
              })
              const selectedTestUserId =
                selectedTestUserPerSchool[escola.id] &&
                filteredUsers.some((u) => u.id === selectedTestUserPerSchool[escola.id])
                  ? selectedTestUserPerSchool[escola.id]
                  : filteredUsers[0]?.id || ''

              return (
                <div key={escola.id} className="bg-background border border-borderCustom p-4 rounded-xl space-y-3 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-bold text-sm text-foreground">{escola.nome}</span>
                      <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                        CÓD: {escola.codigo || '-'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEntrarEscolaComoSuper(escola)}
                      disabled={isLoadingSimulation}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition-all shadow-sm disabled:opacity-50 cursor-pointer active:scale-95 border border-emerald-500/50"
                      title={`Entrar na ${escola.nome} com sua conta Superadmin / Nível 1`}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Entrar</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Simular Contas da Unidade
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-borderCustom">
                        {usersOfEscola.length} {usersOfEscola.length === 1 ? 'conta' : 'contas'}
                      </span>
                    </div>

                    {usersOfEscola.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-1">Sem contas de teste diretamente vinculadas a esta unidade.</p>
                    ) : (
                      <div className="space-y-2">
                        {/* Campo de Busca por Contas da Unidade de Teste */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Buscar conta por nome, cargo ou e-mail..."
                            value={searchTestUserPerSchool[escola.id] || ''}
                            onChange={(e) =>
                              setSearchTestUserPerSchool((prev) => ({
                                ...prev,
                                [escola.id]: e.target.value,
                              }))
                            }
                            className="w-full bg-card border border-borderCustom text-foreground text-xs rounded-lg pl-8 pr-7 py-1.5 focus:ring-amber-500 focus:border-amber-500 font-medium placeholder:text-muted-foreground/70"
                          />
                          {searchTestUserPerSchool[escola.id] && (
                            <button
                              type="button"
                              onClick={() =>
                                setSearchTestUserPerSchool((prev) => ({
                                  ...prev,
                                  [escola.id]: '',
                                }))
                              }
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                              title="Limpar busca"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Select com Contas Filtradas */}
                        <select
                          value={selectedTestUserId}
                          onChange={(e) =>
                            setSelectedTestUserPerSchool((prev) => ({
                              ...prev,
                              [escola.id]: e.target.value,
                            }))
                          }
                          disabled={isLoadingSimulation}
                          className="w-full bg-card border border-borderCustom text-foreground text-xs rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 font-medium truncate"
                        >
                          {filteredUsers.length === 0 ? (
                            <option value="">Nenhuma conta encontrada com o termo</option>
                          ) : (
                            filteredUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nome} ({u.cargo || 'Servidor'}) — {u.email}
                              </option>
                            ))
                          )}
                        </select>

                        {/* Botão de Simular */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!selectedTestUserId) {
                              toast.error('Selecione uma conta para simular.')
                              return
                            }
                            const target = usersOfEscola.find((u) => u.id === selectedTestUserId)
                            const success = await iniciarSimulacao(selectedTestUserId, supabase)
                            if (success) {
                              toast.success(
                                `Modo simulação ativado para "${target?.nome ?? 'Servidor'}" na escola ${escola.nome}!`
                              )
                              window.location.href = '/home'
                            } else {
                              toast.error('Falha ao iniciar simulação para esta conta.')
                            }
                          }}
                          disabled={isLoadingSimulation || filteredUsers.length === 0 || !selectedTestUserId}
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                          title={
                            selectedTestUserId
                              ? `Simular conta selecionada na ${escola.nome}`
                              : 'Selecione uma conta para simular'
                          }
                        >
                          {isLoadingSimulation ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>{isLoadingSimulation ? 'Iniciando...' : 'Simular Conta Selecionada'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
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

      {/* Modal de Gerenciamento de Regras de Tempo de Sessões */}
      <ModalSessionTimeout
        open={isSessionTimeoutModalOpen}
        onOpenChange={setIsSessionTimeoutModalOpen}
        onRulesChanged={refreshSessionRulesSummary}
      />
    </div>
  )
}

