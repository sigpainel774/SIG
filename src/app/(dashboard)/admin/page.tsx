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
  User,
  Plus,
  Lock,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { ModalReport } from '@/components/modals/modal-report'

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('Dashboard')
  const limparSessao = useAuthStore((state) => state.limparSessao)
  const [reportOpen, setReportOpen] = useState(false)

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
    { title: 'Escolas', subtitle: 'Gerenciar unidades', icon: Building2, color: 'text-blue-500', tab: 'Escolas' },
    { title: 'Usuários', subtitle: 'Contas de login', icon: Users, color: 'text-blue-400', tab: 'Usuários' },
    { title: 'Acessos', subtitle: 'Níveis e permissões', icon: KeyRound, color: 'text-emerald-500', tab: 'Acessos' },
    { title: 'Cargos', subtitle: 'Cargos e funções', icon: Briefcase, color: 'text-amber-500', tab: 'Cargos' },
    { title: 'Logs de Acesso', subtitle: 'Histórico de auditoria', icon: Activity, color: 'text-purple-400', tab: 'Logs de Acesso' },
    { title: 'Auditoria', subtitle: 'Ficha de servidores', icon: FileSearch, color: 'text-slate-300', tab: 'Auditoria' },
    { title: 'Lixeira Global', subtitle: 'Restaurar deletados', icon: Trash2, color: 'text-rose-500', tab: 'Lixeira Global' },
    { title: 'Dispositivos', subtitle: 'Dispositivos mobile', icon: Smartphone, color: 'text-cyan-400', tab: 'Dispositivos' },
    { title: 'Relatórios', subtitle: 'Gráficos e estatísticas', icon: BarChart3, color: 'text-emerald-400', href: '/relatorios' },
    { title: 'Solicitações', subtitle: 'Lotação e escalas', icon: UserCheck, color: 'text-amber-400', href: '/painel-chefe' },
    { title: 'Reports de Bugs', subtitle: 'Feedbacks de erros', icon: Bug, color: 'text-slate-400', isReport: true },
    { title: 'Ocorrências', subtitle: 'Histórico disciplinar', icon: AlertTriangle, color: 'text-amber-500', href: '/ocorrencias' },
  ]

  const ultimosEventos = [
    { data: '03/07/2026 00:50', evento: 'LOGIN', tipo: 'login', usuario: 'adm@super.com' },
    { data: '03/07/2026 00:50', evento: 'LOGOUT', tipo: 'logout', usuario: 'matthewrrusk@gmail.com' },
    { data: '03/07/2026 00:46', evento: 'LOGIN', tipo: 'login', usuario: 'matthewrrusk@gmail.com' },
  ]

  const mockEscolas = [
    { id: '1', nome: 'Colégio Dr Eraldo Tinoco', codigo: 'ESC01', status: 'Ativo' },
    { id: '2', nome: 'Colégio Moisés Alves', codigo: 'ESC02', status: 'Ativo' },
    { id: '3', nome: 'Escola Castelo Branco', codigo: 'ESC03', status: 'Ativo' },
    { id: '4', nome: 'Escola Frei Urbano', codigo: 'ESC04', status: 'Ativo' },
    { id: '5', nome: 'Escola Jovino Souza Lima', codigo: 'ESC05', status: 'Ativo' },
    { id: '6', nome: 'Escolhinha PIU-PIU', codigo: 'ESC06', status: 'Ativo' },
  ]

  const handleAtalhoClick = (item: any) => {
    if (item.tab) {
      setActiveTab(item.tab)
    } else if (item.href) {
      router.push(item.href)
    } else if (item.isReport) {
      setReportOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white p-6 space-y-6">
      <ModalReport open={reportOpen} onOpenChange={setReportOpen} />

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

      {/* TAB: DASHBOARD */}
      {activeTab === 'Dashboard' && (
        <div className="space-y-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {atalhos.map((item) => {
                const Icon = item.icon
                return (
                  <Card
                    key={item.title}
                    onClick={() => handleAtalhoClick(item)}
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
              <Button onClick={() => setActiveTab('Logs de Acesso')} variant="outline" className="border-borderCustom bg-[#141414] hover:bg-hoverCustom text-xs gap-2">
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
      )}

      {/* TAB: ESCOLAS */}
      {activeTab === 'Escolas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-500" /> Gestão de Escolas Cadastradas
            </h2>
            <Button onClick={() => toast.info('Modal de nova escola')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2">
              <Plus className="w-4 h-4" /> Nova Escola
            </Button>
          </div>
          <div className="bg-[#121212] border border-borderCustom rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-borderCustom text-xs text-muted-foreground uppercase tracking-wider bg-[#0d0d0d]">
                  <th className="p-4">Código</th>
                  <th className="p-4">Nome da Escola</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCustom text-sm">
                {mockEscolas.map((escola) => (
                  <tr key={escola.id} className="hover:bg-hoverCustom">
                    <td className="p-4 font-mono text-muted-foreground">{escola.codigo}</td>
                    <td className="p-4 font-semibold text-white">{escola.nome}</td>
                    <td className="p-4"><span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold">{escola.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: USUARIOS & ACESSOS */}
      {(activeTab === 'Usuários' || activeTab === 'Acessos') && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-500" /> Gerenciamento de Contas & Níveis de Acesso
            </h2>
            <Button onClick={() => router.push('/permissoes')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
              Matriz de Permissões
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Para marcar uma conta como Super Admin Master, utilize a chave do banco ou a tela de Permissões.</p>
        </div>
      )}

      {/* TAB: LOGS / AUDITORIA */}
      {(activeTab === 'Logs de Acesso' || activeTab === 'Auditoria') && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> Registro de Logs e Auditoria Global
          </h2>
          <div className="bg-[#121212] border border-borderCustom rounded-2xl p-4">
            <p className="text-sm text-muted-foreground">Exibindo histórico completo de logs de login/logout do sistema.</p>
          </div>
        </div>
      )}
    </div>
  )
}
