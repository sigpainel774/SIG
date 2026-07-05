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
  LayoutGrid,
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
  ArchiveRestore
} from 'lucide-react'

interface QuickShortcut {
  title: string
  subtitle: string
  icon: React.ElementType
  iconColor: string
  path: string
}

export default function AdminHubPage() {
  const router = useRouter()
  const supabase = createClient()
  const { funcionario, limparSessao } = useAuthStore()

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      limparSessao()
      toast.success('Sessão encerrada com sucesso!')
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error('Erro ao encerrar sessão')
      setIsLoggingOut(false)
    }
  }

  const handleRefreshCache = () => {
    toast.success('Cache do sistema atualizado com sucesso!')
    router.refresh()
  }

  const shortcuts: QuickShortcut[] = [
    // Row 1
    {
      title: 'Escolas',
      subtitle: 'Gerenciar unidades',
      icon: Building2,
      iconColor: 'text-sky-400',
      path: '/admin/escolas',
    },
    {
      title: 'Usuários',
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
      path: '/permissoes',
    },
    {
      title: 'Cargos',
      subtitle: 'Cargos e funções',
      icon: Briefcase,
      iconColor: 'text-amber-400',
      path: '/admin/cargos',
    },
    {
      title: 'Logs de Acesso',
      subtitle: 'Histórico de auditoria',
      icon: Activity,
      iconColor: 'text-purple-400',
      path: '/admin/logs',
    },
    {
      title: 'Auditoria',
      subtitle: 'Ficha de servidores',
      icon: FileSearch,
      iconColor: 'text-slate-200',
      path: '/admin/logs',
    },
    // Row 2
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
      iconColor: 'text-indigo-500',
      path: '/admin/arquivados',
    },
    {
      title: 'Dispositivos',
      subtitle: 'Dispositivos mobile',
      icon: MonitorSmartphone,
      iconColor: 'text-sky-400',
      path: '/admin/dispositivos',
    },
    {
      title: 'Banco de Dados',
      subtitle: 'Tabelas e encerramento',
      icon: Database,
      iconColor: 'text-slate-200',
      path: '/admin/banco',
    },
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
      title: 'Solicitações',
      subtitle: 'Lotação e escalas',
      icon: UserPlus,
      iconColor: 'text-amber-400',
      path: '/admin/solicitacoes',
    },
    // Row 3
    {
      title: 'Controle de Rondas',
      subtitle: 'Escalas e rotas',
      icon: ScanLine,
      iconColor: 'text-cyan-400',
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
      title: 'Reports de Bugs',
      subtitle: 'Feedbacks de erros',
      icon: Flag,
      iconColor: 'text-slate-200',
      path: '/admin/reports',
    },
    {
      title: 'Ocorrências',
      subtitle: 'Histórico disciplinar',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      path: '/ocorrencias',
    },
    {
      title: 'Transporte',
      subtitle: 'Frota e rotas escolares',
      icon: Bus,
      iconColor: 'text-sky-400',
      path: '/admin/transporte',
    },
  ]

  const userEmail = funcionario?.email || 'adm@super.com'

  return (
    <div className="space-y-6 select-none -mt-3">
      {/* Top Header Bar matching user reference screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#232328] pb-4">
        {/* Title and ROOT Badge */}
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
            <span>Logado como: <strong className="text-white">{userEmail}</strong></span>
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

      {/* Shortcuts Container Box matching user reference screenshot */}
      <div className="bg-[#121214] border border-[#232326] rounded-2xl p-6 shadow-xl space-y-5">
        {/* Section Header */}
        <div className="flex items-center gap-2.5 pb-2">
          <LayoutGrid className="w-5 h-5 text-white" />
          <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
            Atalhos de Acesso Rápido
          </h2>
        </div>

        {/* 17 Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {shortcuts.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={i}
                onClick={() => router.push(item.path)}
                className="bg-[#17171a] hover:bg-[#202024] border border-[#27272a] hover:border-white/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group active:scale-[0.98] shadow-sm min-h-[140px]"
              >
                <div className="mb-3 flex items-center justify-center">
                  <Icon className={`w-9 h-9 ${item.iconColor} transition-transform duration-200 group-hover:scale-110`} strokeWidth={1.8} />
                </div>
                <h3 className="font-bold text-white text-base leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-[#8e8e93] font-normal mt-1 leading-tight">
                  {item.subtitle}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
