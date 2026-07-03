'use client'

import { useRouter } from 'next/navigation'
import { 
  LayoutGrid,
  Building2, 
  Users, 
  KeyRound, 
  Briefcase, 
  Activity, 
  FileSearch, 
  Trash2, 
  MonitorSmartphone, 
  Database, 
  BarChart3, 
  SlidersHorizontal, 
  UserCheck, 
  ScanLine, 
  Bell, 
  Flag, 
  AlertTriangle, 
  Bus 
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
      icon: Users,
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
      iconColor: 'text-red-500',
      path: '/admin/lixeira',
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
      iconColor: 'text-slate-400',
      path: '/configuracoes',
    },
    {
      title: 'Solicitações',
      subtitle: 'Lotação e escalas',
      icon: UserCheck,
      iconColor: 'text-amber-400',
      path: '/admin/solicitacoes',
    },
    // Row 3
    {
      title: 'Controle de Rondas',
      subtitle: 'Escalas e rotas',
      icon: ScanLine,
      iconColor: 'text-fuchsia-400',
      path: '/admin/rondas',
    },
    {
      title: 'Notificações',
      subtitle: 'Avisos da rede',
      icon: Bell,
      iconColor: 'text-red-500',
      path: '/historico-notificacoes',
    },
    {
      title: 'Reports de Bugs',
      subtitle: 'Feedbacks de erros',
      icon: Flag,
      iconColor: 'text-slate-200',
      path: '/ajuda',
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

  return (
    <div className="space-y-6 select-none p-1 sm:p-2">
      {/* Title */}
      <div className="flex items-center gap-2.5">
        <LayoutGrid className="w-5 h-5 text-white" />
        <h1 className="text-lg font-bold text-white tracking-wide">
          Atalhos de Acesso Rápido
        </h1>
      </div>

      {/* Shortcuts Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {shortcuts.map((item, i) => {
          const Icon = item.icon
          return (
            <div
              key={i}
              onClick={() => router.push(item.path)}
              className="bg-[#141416] hover:bg-[#1c1c20] border border-[#26262a] hover:border-white/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group active:scale-[0.98] shadow-sm"
            >
              <div className="mb-3 flex items-center justify-center">
                <Icon className={`w-8 h-8 ${item.iconColor} transition-transform duration-200 group-hover:scale-110`} strokeWidth={1.8} />
              </div>
              <h2 className="font-bold text-white text-base leading-snug">
                {item.title}
              </h2>
              <p className="text-xs text-[#8e8e93] font-normal mt-1 leading-tight">
                {item.subtitle}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
