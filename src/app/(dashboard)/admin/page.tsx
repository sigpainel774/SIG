'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
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

/* ─────────────────────────── data ──────────────────────────── */

const adminGroups: AdminGroup[] = [
  {
    id: 'rede',
    label: 'Rede Escolar',
    icon: Building2,
    headerColor: 'text-sky-400',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    items: [
      {
        title: 'Escolas',
        subtitle: 'Gerenciar unidades',
        icon: Building2,
        iconColor: 'text-sky-400',
        path: '/admin/escolas',
      },
    ],
  },
  {
    id: 'pessoal',
    label: 'Pessoal & Acessos',
    icon: Users,
    headerColor: 'text-emerald-400',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    items: [
      {
        title: 'Funcionários',
        subtitle: 'Contas de login',
        icon: UserCheck,
        iconColor: 'text-sky-400',
        path: '/funcionarios',
      },
      {
        title: 'Acessos',
        subtitle: 'Níveis e permissões',
        icon: KeyRound,
        iconColor: 'text-emerald-400',
        path: '/admin/acessos',
      },
      {
        title: 'Cargos',
        subtitle: 'Cargos e funções',
        icon: Briefcase,
        iconColor: 'text-amber-400',
        path: '/admin/cargos',
      },
      {
        title: 'Solicitações',
        subtitle: 'Lotação e escalas',
        icon: UserPlus,
        iconColor: 'text-amber-400',
        path: '/admin/solicitacoes',
      },
    ],
  },
  {
    id: 'monitoramento',
    label: 'Monitoramento',
    icon: Activity,
    headerColor: 'text-purple-400',
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    items: [
      {
        title: 'Logs de Auditoria',
        subtitle: 'Histórico e ficha de auditoria',
        icon: Activity,
        iconColor: 'text-purple-400',
        path: '/admin/logs',
      },
      {
        title: 'Desempenho',
        subtitle: 'Métricas e gargalos',
        icon: Gauge,
        iconColor: 'text-violet-400',
        path: '/admin/desempenho',
      },
      {
        title: 'Indicadores',
        subtitle: 'Prazos e pendências',
        icon: TrendingUp,
        iconColor: 'text-purple-400',
        path: '/admin/indicadores',
      },
    ],
  },
  {
    id: 'dados',
    label: 'Dados & Arquivo',
    icon: Database,
    headerColor: 'text-slate-300',
    badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
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
        iconColor: 'text-indigo-400',
        path: '/admin/arquivados',
      },
      {
        title: 'Banco de Dados',
        subtitle: 'Tabelas e encerramento',
        icon: Database,
        iconColor: 'text-slate-300',
        path: '/admin/banco',
      },
    ],
  },
  {
    id: 'operacoes',
    label: 'Operações',
    icon: ScanLine,
    headerColor: 'text-cyan-400',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    items: [
      {
        title: 'Controle de Rondas',
        subtitle: 'Escalas e rotas',
        icon: ScanLine,
        iconColor: 'text-cyan-400',
        path: '/admin/rondas',
      },
      {
        title: 'Transporte',
        subtitle: 'Frota e rotas escolares',
        icon: Bus,
        iconColor: 'text-sky-400',
        path: '/admin/transporte',
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
        iconColor: 'text-amber-400',
        path: '/ocorrencias',
      },
      {
        title: 'Reports de Bugs',
        subtitle: 'Feedbacks de erros',
        icon: Flag,
        iconColor: 'text-slate-300',
        path: '/admin/reports',
      },
    ],
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: SlidersHorizontal,
    headerColor: 'text-sky-300',
    badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    items: [
      {
        title: 'Relatórios',
        subtitle: 'Gráficos e estatísticas',
        icon: BarChart3,
        iconColor: 'text-emerald-400',
        path: '/relatorios',
      },
      {
        title: 'Configurações',
        subtitle: 'Parâmetros do sistema',
        icon: SlidersHorizontal,
        iconColor: 'text-sky-400',
        path: '/configuracoes',
      },
      {
        title: 'Dispositivos',
        subtitle: 'Dispositivos mobile',
        icon: MonitorSmartphone,
        iconColor: 'text-sky-400',
        path: '/admin/dispositivos',
      },
    ],
  },
]

/* ─────────────────────────── component ─────────────────────── */

export default function AdminHubPage() {
  const router = useRouter()
  const supabase = createClient()
  const { funcionario, limparSessao } = useAuthStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // All groups expanded by default
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(adminGroups.map((g) => g.id))
  )

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
    try {
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      limparSessao()
      toast.success('Sessão encerrada com sucesso!')
      router.push('/login')
      router.refresh()
    } catch {
      toast.error('Erro ao encerrar sessão')
      setIsLoggingOut(false)
    }
  }

  const handleRefreshCache = () => {
    toast.success('Cache do sistema atualizado com sucesso!')
    router.refresh()
  }

  const userEmail = funcionario?.email ?? 'adm@super.com'

  return (
    <div className="space-y-6 select-none -mt-3">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232328] pb-4">
        {/* Title + ROOT badge */}
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-white stroke-[2.2]" />
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            Sapeaçu — Administração do Sistema
            <span className="bg-[#7c3aed]/20 text-[#a78bfa] border border-[#7c3aed]/50 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider uppercase">
              ROOT
            </span>
          </h1>
        </div>

        {/* User Status & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-[#17171a] px-3 py-1.5 rounded-xl border border-[#27272a]">
            <User className="w-4 h-4 text-slate-400" />
            <span>
              Logado como: <strong className="text-white">{userEmail}</strong>
            </span>
          </div>

          <button
            onClick={handleRefreshCache}
            className="bg-[#052e16]/70 border border-[#166534] hover:bg-[#052e16] text-[#4ade80] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar Cache</span>
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="bg-[#450a0a]/70 border border-[#991b1b] hover:bg-[#7f1d1d] hover:text-white text-[#f87171] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
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

      {/* ── Accordion Groups ── */}
      <div className="space-y-3">
        {adminGroups.map((group) => {
          const GroupIcon = group.icon
          const isOpen = expandedGroups.has(group.id)

          return (
            <div
              key={group.id}
              className="bg-[#121214] border border-[#232326] rounded-2xl shadow-xl overflow-hidden"
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <GroupIcon
                    className={cn('w-5 h-5 shrink-0', group.headerColor)}
                    strokeWidth={2}
                  />
                  <span className="text-white font-bold text-sm md:text-base tracking-wide">
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

                <div className="text-[#555] group-hover:text-[#888] transition-colors shrink-0">
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
                          className="bg-[#17171a] hover:bg-[#202024] border border-[#27272a] hover:border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group active:scale-[0.97] shadow-sm min-h-[110px]"
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
                          <h3 className="font-bold text-white text-[13px] leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-[#8e8e93] font-normal mt-0.5 leading-tight">
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
