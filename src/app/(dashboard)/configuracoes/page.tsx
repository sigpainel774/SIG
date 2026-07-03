'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  ShieldCheck, 
  Settings, 
  Sun, 
  Moon, 
  Monitor,
  Lock, 
  Save, 
  ChevronDown, 
  Info, 
  Search, 
  X, 
  BookOpen, 
  GraduationCap, 
  KeyRound, 
  Pin, 
  School, 
  Users,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const modulesList = [
  { label: 'Mural', icon: Pin, enabled: true },
  { label: 'Turmas', icon: BookOpen, enabled: true },
  { label: 'Funcionários', icon: Users, enabled: false },
  { label: 'Matrículas', icon: KeyRound, enabled: true },
  { label: 'Alunos', icon: GraduationCap, enabled: true },
  { label: 'Ocorrências', icon: ShieldCheck, enabled: true },
]

const initialPermissions = [
  { name: 'Ana Souza', email: 'ana@escola.br', level: 'Nível 2 - Diretor', school: 'Escola Modelo', status: 'Ativo' },
  { name: 'Carlos Lima', email: 'carlos@escola.br', level: 'Nível 4 - Professor', school: 'Colégio Dr Eraldo Tinoco', status: 'Ativo' },
  { name: 'Marina Alves', email: 'marina@escola.br', level: 'Nível 5 - Chefe de Equipe', school: 'Global', status: 'Ativo' },
]

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'perfil' | 'permissoes'>('perfil')
  const [showPassword, setShowPassword] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [modules, setModules] = useState(modulesList)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleModule = (index: number) => {
    setModules(prev => prev.map((m, i) => i === index ? { ...m, enabled: !m.enabled } : m))
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foregroundCustom flex items-center gap-3">
          <Settings className="h-8 w-8 text-highlight" />
          Configurações do Sistema
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil pessoal, preferências de tema e permissões de acesso ao sistema.
        </p>
      </div>

      {/* Grid Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setActiveTab('perfil')}
          className={cn(
            "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
            activeTab === 'perfil'
              ? "bg-card border-highlight ring-1 ring-highlight/50"
              : "bg-card border-borderCustom hover:bg-hoverCustom"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl",
            activeTab === 'perfil' ? "bg-highlight/10 text-highlight" : "bg-muted text-muted-foreground"
          )}>
            <User className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foregroundCustom text-base">Meu Perfil & Aparência</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Ficha funcional, alterar senha e tema do sistema</p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('permissoes')}
          className={cn(
            "flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm",
            activeTab === 'permissoes'
              ? "bg-card border-highlight ring-1 ring-highlight/50"
              : "bg-card border-borderCustom hover:bg-hoverCustom"
          )}
        >
          <div className={cn(
            "p-3 rounded-xl",
            activeTab === 'permissoes' ? "bg-highlight/10 text-highlight" : "bg-muted text-muted-foreground"
          )}>
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-foregroundCustom text-base">Permissões de Acesso</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Gestão de níveis, escolas e módulos por funcionário</p>
          </div>
        </button>
      </div>

      {/* Main Content Sections */}
      {activeTab === 'perfil' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Card: Aparência e Tema */}
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <Sun className="h-5 w-5 text-highlight" />
              Personalização de Tema
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-medium text-foregroundCustom">Tema do Sistema & Menu Lateral</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha como deseja visualizar a interface e o menu lateral do painel.
                </p>
              </div>
              
              {mounted && (
                <div className="flex items-center space-x-2 rounded-lg border border-borderCustom bg-input p-1">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      theme === 'light'
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:bg-hoverCustom hover:text-foregroundCustom"
                    )}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Claro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      theme === 'dark'
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:bg-hoverCustom hover:text-foregroundCustom"
                    )}
                  >
                    <Moon className="h-4 w-4 text-blue-400" />
                    <span>Escuro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={cn(
                      "flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      theme === 'system'
                        ? "bg-background text-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:bg-hoverCustom hover:text-foregroundCustom"
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Sistema</span>
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Card: Dados da Ficha Funcional */}
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <User className="h-5 w-5 text-highlight" />
              Dados da Ficha Funcional
            </h2>
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-input text-foregroundCustom border border-borderCustom">
                <User className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <ProfileField label="Nome Completo" value="Usuário do Sistema" strong />
                <ProfileField label="E-mail" value="usuario@sapeacu.gov.br" />
                <ProfileField label="Cargo" value="Servidor" badge />
                <ProfileField label="Telefone" value="(75) 99999-0000" />
              </div>
            </div>
          </Card>

          {/* Alert Recomendação de Segurança */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-800 dark:text-blue-100 flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
            <div>
              <h3 className="font-semibold text-sm">Recomendações de Segurança</h3>
              <p className="text-xs leading-5 mt-1 text-muted-foreground">
                Se este é seu primeiro acesso usando uma senha padrão fornecida pela secretaria, crie uma senha forte e pessoal.
              </p>
            </div>
          </div>

          {/* Card: Alterar Senha */}
          <Card className="border-borderCustom bg-card p-6">
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className={cn(
                "flex w-full items-center justify-between gap-3 text-left text-lg font-semibold text-foregroundCustom cursor-pointer",
                showPassword ? 'border-b border-borderCustom pb-4' : ''
              )}
            >
              <span className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-highlight" />
                Alterar Senha de Acesso
              </span>
              <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", showPassword ? 'rotate-180' : '')} />
            </button>

            {showPassword && (
              <div className="mt-5 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-muted-foreground">Senha Atual</label>
                  <Input type="password" placeholder="Digite sua senha atual" className="bg-input" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">Nova Senha</label>
                    <Input type="password" placeholder="Mínimo 6 caracteres" className="bg-input" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-muted-foreground">Confirmar Nova Senha</label>
                    <Input type="password" placeholder="Digite a nova senha novamente" className="bg-input" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button className="bg-highlight text-background hover:bg-highlight/90 font-medium">
                    <Save className="mr-2 h-4 w-4" />
                    Atualizar Senha
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'permissoes' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Card: Atribuir acesso */}
          <Card className="border-borderCustom bg-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-borderCustom pb-4 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-foregroundCustom flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-highlight" />
                  Atribuir Nível & Módulos
                </h2>
                <p className="text-xs text-muted-foreground">Defina o nível de acesso e módulos liberados por usuário</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-borderCustom bg-hoverCustom text-foregroundCustom">
                  <Users className="mr-2 h-4 w-4" />
                  Por Funcionário
                </Button>
                <Button variant="outline" size="sm" className="border-borderCustom bg-card text-muted-foreground">
                  <School className="mr-2 h-4 w-4" />
                  Por Escola
                </Button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Funcionário</label>
                <Input placeholder="Digite para pesquisar funcionário..." className="bg-input" />
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Escola / Órgão</label>
                <select className="h-10 w-full rounded-md border border-borderCustom bg-input px-3 text-sm text-foregroundCustom outline-none">
                  <option>Escola Modelo</option>
                  <option>Colégio Dr Eraldo Tinoco</option>
                  <option>Global</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Nível de Acesso</label>
                <select className="h-10 w-full rounded-md border border-borderCustom bg-input px-3 text-sm text-foregroundCustom outline-none">
                  <option>Nível 2 - Diretor</option>
                  <option>Nível 3 - Coordenador</option>
                  <option>Nível 4 - Professor</option>
                  <option>Nível 5 - Chefe de Equipe</option>
                  <option>Nível 6 - Operacional</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-medium text-foregroundCustom">Módulos Liberados</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((module, idx) => {
                  const Icon = module.icon
                  return (
                    <button
                      key={module.label}
                      type="button"
                      onClick={() => toggleModule(idx)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3.5 transition-all text-left cursor-pointer",
                        module.enabled
                          ? "border-highlight/50 bg-highlight/5 text-foregroundCustom"
                          : "border-borderCustom bg-input text-muted-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-5 w-5", module.enabled ? "text-highlight" : "text-muted-foreground")} />
                        <span className="text-sm font-medium">{module.label}</span>
                      </div>
                      <span className={cn(
                        "h-5 w-9 rounded-full p-0.5 transition-colors",
                        module.enabled ? "bg-highlight" : "bg-muted"
                      )}>
                        <span className={cn(
                          "block h-4 w-4 rounded-full bg-white transition-transform",
                          module.enabled ? "translate-x-4" : ""
                        )} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button className="bg-highlight text-background hover:bg-highlight/90 font-medium">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Salvar Permissões
              </Button>
            </div>
          </Card>

          {/* Card: Lista de Permissões */}
          <Card className="border-borderCustom bg-card p-6">
            <h3 className="text-base font-semibold text-foregroundCustom mb-4">Funcionários com Permissões Ativas</h3>
            <div className="mb-5 flex flex-wrap gap-3">
              <div className="relative min-w-[240px] flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar funcionário por nome ou email..." className="bg-input pl-9" />
              </div>
              <select className="h-10 rounded-md border border-borderCustom bg-input px-3 text-sm text-foregroundCustom outline-none">
                <option>Todos os Níveis</option>
                <option>Nível 2 - Diretor</option>
                <option>Nível 3 - Coordenador</option>
                <option>Nível 4 - Professor</option>
              </select>
              <Button variant="outline" className="border-borderCustom bg-hoverCustom">
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-borderCustom text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-3">Funcionário</th>
                    <th className="p-3">Nível</th>
                    <th className="p-3">Escola</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderCustom">
                  {initialPermissions.map((permission) => (
                    <tr key={permission.email} className="hover:bg-hoverCustom transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-foregroundCustom">{permission.name}</p>
                        <p className="text-xs text-muted-foreground">{permission.email}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">{permission.level}</td>
                      <td className="p-3 text-muted-foreground">{permission.school}</td>
                      <td className="p-3">
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500 border border-emerald-500/20">
                          {permission.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" className="text-highlight hover:bg-highlight/10 hover:text-highlight">
                          Gerenciar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function ProfileField({ label, value, strong, badge }: { label: string; value: string; strong?: boolean; badge?: boolean }) {
  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {badge ? (
        <span className="inline-flex rounded-md bg-input px-2.5 py-1 text-xs font-medium text-foregroundCustom border border-borderCustom">
          {value}
        </span>
      ) : (
        <span className={strong ? 'text-base font-semibold text-foregroundCustom' : 'text-sm text-foregroundCustom'}>
          {value}
        </span>
      )}
    </div>
  )
}
