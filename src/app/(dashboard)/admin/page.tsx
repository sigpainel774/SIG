'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  RefreshCw, 
  LogOut, 
  Users, 
  Building2, 
  KeyRound, 
  LogIn, 
  AlertTriangle, 
  Briefcase, 
  Activity, 
  FileSearch, 
  Trash2, 
  Smartphone, 
  Database, 
  BarChart3, 
  Settings, 
  UserCheck, 
  Scan, 
  Bell, 
  Bug, 
  Bus, 
  ArrowRight,
  User
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('Dashboard')
  const limparSessao = useAuthStore((state) => state.limparSessao)

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      limparSessao()
      toast.success('Sessão encerrada com sucesso!')
      router.push('/login')
    } catch (error) {
      toast.error('Erro ao encerrar sessão')
    }
  }

  const handleRefreshCache = () => {
    toast.success('Cache do sistema atualizado!')
    router.refresh()
  }

  const navTabs = [
    { label: 'Dashboard', icon: BarChart3 },
    { label: 'Escolas', icon: Building2 },
    { label: 'Usuários', icon: Users },
    { label: 'Acessos', icon: KeyRound },
    { label: 'Cargos', icon: Briefcase },
    { label: 'Logs de Acesso', icon: Activity },
    { label: 'Auditoria', icon: FileSearch },
    { label: 'Lixeira Global', icon: Trash2 },
    { label: 'Dispositivos', icon: Smartphone },
  ]

  const atalhos = [
    { title: 'Escolas', subtitle: 'Gerenciar unidades', icon: Building2, color: 'text-blue-500' },
    { title: 'Usuários', subtitle: 'Contas de login', icon: Users, color: 'text-blue-400' },
    { title: 'Acessos', subtitle: 'Níveis e permissões', icon: KeyRound, color: 'text-emerald-500' },
    { title: 'Cargos', subtitle: 'Cargos e funções', icon: Briefcase, color: 'text-amber-500' },
    { title: 'Logs de Acesso', subtitle: 'Histórico de auditoria', icon: Activity, color: 'text-purple-400' },
    { title: 'Auditoria', subtitle: 'Ficha de servidores', icon: FileSearch, color: 'text-slate-300' },
    { title: 'Lixeira Global', subtitle: 'Restaurar deletados', icon: Trash2, color: 'text-rose-500' },
    { title: 'Dispositivos', subtitle: 'Dispositivos mobile', icon: Smartphone, color: 'text-cyan-400' },
    { title: 'Banco de Dados', subtitle: 'Tabelas e encerramento', icon: Database, color: 'text-slate-200' },
    { title: 'Relatórios', subtitle: 'Gráficos e estatísticas', icon: BarChart3, color: 'text-emerald-400' },
    { title: 'Configurações', subtitle: 'Parâmetros do sistema', icon: Settings, color: 'text-indigo-400' },
    { title: 'Solicitações', subtitle: 'Lotação e escalas', icon: UserCheck, color: 'text-amber-400' },
    { title: 'Controle de Rondas', subtitle: 'Escalas e rotas', icon: Scan, color: 'text-purple-500' },
    { title: 'Notificações', subtitle: 'Avisos da rede', icon: Bell, color: 'text-rose-400' },
    { title: 'Reports de Bugs', subtitle: 'Feedbacks de erros', icon: Bug, color: 'text-slate-400' },
    { title: 'Ocorrências', subtitle: 'Histórico disciplinar', icon: AlertTriangle, color: 'text-amber-500' },
    { title: 'Transporte', subtitle: 'Frota e rotas escolares', icon: Bus, color: 'text-blue-500' },
  ]

  const ultimosEventos = [
    { data: '03/07/2026 00:50', evento: 'LOGIN', tipo: 'login', usuario: 'adm@super.com' },
    { data: '03/07/2026 00:50', evento: 'LOGOUT', tipo: 'logout', usuario: 'matthewrrusk@gmail.com' },
    { data: '03/07/2026 00:46', evento: 'LOGIN', tipo: 'login', usuario: 'matthewrrusk@gmail.com' },
  ]

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6 space-y-6">
      {/* Header Root Admin */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-borderCustom">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#181818] border border-borderCustom rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Sapeaçu — Administração do Sistema
            <span className="bg-purple-600/30 text-purple-400 border border-purple-500/40 text-xs px-2.5 py-0.5 rounded-md font-mono font-semibold">
              ROOT
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-[#141414] px-3 py-1.5 rounded-lg border border-borderCustom">
            <User className="w-4 h-4" />
            <span>Logado como: <strong className="text-white">adm@super.com</strong></span>
          </div>

          <Button
            onClick={handleRefreshCache}
            variant="outline"
            className="border-emerald-600/40 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30 hover:text-emerald-300 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar Cache
          </Button>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-rose-600/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Navigation Horizontal Tabs */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-borderCustom scrollbar-none">
        {navTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.label
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.label)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/50 shadow-sm'
                  : 'text-foregroundCustom/70 hover:bg-hoverCustom hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Main Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-[#121212] border-borderCustom p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Funcionários</span>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-white">28</div>
          <p className="text-xs text-muted-foreground">Total cadastrados</p>
        </Card>

        <Card className="bg-[#121212] border-borderCustom p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Escolas</span>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-white">6</div>
          <p className="text-xs text-muted-foreground">Unidades ativas</p>
        </Card>

        <Card className="bg-[#121212] border-borderCustom p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Acessos Ativos</span>
            <KeyRound className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-white">11</div>
          <p className="text-xs text-muted-foreground">Vínculos ativos</p>
        </Card>

        <Card className="bg-[#121212] border-borderCustom p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Logins Hoje</span>
            <LogIn className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-white">4</div>
          <p className="text-xs text-muted-foreground">Sessões iniciadas</p>
        </Card>

        <Card className="bg-[#121212] border-borderCustom p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Falhas 24h</span>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold text-white">0</div>
          <p className="text-xs text-muted-foreground">Tentativas inválidas</p>
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
            <div className="bg-white rounded-xs"></div>
            <div className="bg-white rounded-xs"></div>
            <div className="bg-white rounded-xs"></div>
            <div className="bg-white rounded-xs"></div>
          </div>
          Atalhos de Acesso Rápido
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {atalhos.map((item) => {
            const Icon = item.icon
            return (
              <Card
                key={item.title}
                className="bg-[#121212] hover:bg-[#1c1c1c] border-borderCustom hover:border-purple-500/50 transition-all duration-200 cursor-pointer p-5 flex flex-col items-center justify-center text-center space-y-3 min-h-[140px] group shadow-md"
              >
                <Icon className={`w-8 h-8 ${item.color} group-hover:scale-110 transition-transform`} />
                <div>
                  <h3 className="font-semibold text-white text-sm group-hover:text-purple-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Recent Access Events */}
      <div className="space-y-4 pt-4 border-t border-borderCustom">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Últimos Eventos de Acesso
          </h2>
          <Button variant="outline" className="border-borderCustom bg-[#141414] hover:bg-hoverCustom text-xs gap-2">
            Ver Todos
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="bg-[#121212] border border-borderCustom rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-borderCustom text-xs text-muted-foreground uppercase tracking-wider bg-[#0d0d0d]">
                <th className="p-4 font-semibold">Data / Hora</th>
                <th className="p-4 font-semibold">Evento</th>
                <th className="p-4 font-semibold">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderCustom text-sm">
              {ultimosEventos.map((evento, index) => (
                <tr key={index} className="hover:bg-hoverCustom/50 transition-colors">
                  <td className="p-4 text-muted-foreground font-mono">{evento.data}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        evento.tipo === 'login'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {evento.evento}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-white">{evento.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
