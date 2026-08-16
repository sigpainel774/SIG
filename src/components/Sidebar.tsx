'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Home, 
  Pin, 
  Users, 
  GraduationCap, 
  Settings, 
  HelpCircle, 
  FileBarChart, 
  RefreshCw, 
  LogOut,
  Loader2,
  X,
  BookOpen,
  FileText,
  ClipboardList,
  AlertTriangle,
  ArrowLeftRight,
  Archive,
  UserCheck,
  FileBadge,
  Fingerprint,
  Activity,
  Stethoscope,
  Heart,
  Clock,
  UserPlus,
  FileSpreadsheet,
  MessageSquare
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSidebarStore } from '@/store/useSidebarStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useSchoolStore } from '@/store/useSchoolStore'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

import { usePermissionSimulationStore } from '@/store/usePermissionSimulationStore'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { isSimulating } = usePermissionSimulationStore()
  const { funcionario, logout, isDiretor, isChefe, vinculos, acessos, escolaAtivaId, setEscolaAtivaId, isAdminGlobalOrRoot, isRhRedeExclusivo, isContaEja } = useAuthStore()
  const isEjaMode = isContaEja()
  const isProfessor = acessos?.some(a => a.nivel === 4) || funcionario?.cargo?.toLowerCase().includes('professor')
  const isRhRedeOnly = isRhRedeExclusivo()
  const { isMobileOpen, closeMobile } = useSidebarStore()
  const { selectedEscola, selectedSecretaria } = useSchoolStore()
  const isNivel1 = !funcionario?.is_superadmin && acessos?.some(a => a.nivel === 1 && a.ativo)
  const isNivel1OrSuperior = funcionario?.is_superadmin || Boolean(acessos?.some(a => a.nivel === 1 && a.ativo))
  const temEscolaSelecionada = Boolean(selectedEscola) || isSimulating
  const isSelecaoSecretaria = isSimulating ? false : (isRhRedeOnly ? false : (isEjaMode ? false : (isNivel1 ? !selectedSecretaria : (!selectedEscola && !selectedSecretaria))))

  const vinculosAtivos = vinculos?.filter((v) => v.ativo) || []

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showSchoolWarningModal, setShowSchoolWarningModal] = useState(false)

  const secNome = selectedSecretaria?.nome || selectedEscola?.secretariaNome || selectedEscola?.secretarias?.nome || ''
  const isEMAEE = selectedEscola?.tipo === 'EMAEE' || /emaee/i.test(selectedEscola?.nome || '')
  const isEducacao = !isEMAEE && ((!selectedEscola && !selectedSecretaria) || !secNome || /educa/i.test(secNome))
  const isSaude = !isEMAEE && (!isEducacao && /sa[uú]de/i.test(secNome))

  const modulosSecretaria = selectedSecretaria?.modulos_ativos || (
    isEMAEE 
      ? ['coleta-local', 'configuracoes-basicas', 'geolocalizacao', 'funcionarios-basico', 'mural', 'pacientes', 'fila-espera', 'especialistas', 'relatorios-escola', 'arquivos', 'relatorios']
      : isEducacao
      ? ['coleta-local', 'configuracoes-basicas', 'geolocalizacao', 'funcionarios-basico', 'mural', 'alunos', 'turmas', 'matriculas', 'avaliacoes', 'ocorrencias', 'documentos', 'transferencias', 'arquivos', 'relatorios', 'central-atividades', 'lideranca']
      : isSaude
      ? ['coleta-local', 'configuracoes-basicas', 'geolocalizacao', 'funcionarios-basico', 'mural', 'atestados', 'documentos', 'relatorios', 'central-atividades', 'lideranca', 'arquivos']
      : ['coleta-local', 'configuracoes-basicas', 'geolocalizacao', 'funcionarios-basico']
  )

  const moduloPorHref: Record<string, string> = {
    '/mural': 'mural',
    '/alunos': 'alunos',
    '/turmas': 'turmas',
    '/matriculas': 'matriculas',
    '/avaliacoes': 'avaliacoes',
    '/ocorrencias': 'ocorrencias',
    '/documentos': 'documentos',
    '/transferencias': 'transferencias',
    '/arquivos': 'arquivos',
    '/relatorios/atividades': 'central-atividades',
    '/painel-chefe': 'lideranca',
    '/funcionarios': 'funcionarios-basico',
    '/atestados': 'atestados',
    '/coleta-local': 'coleta-local',
    '/configuracoes': 'configuracoes-basicas',
    '/emaee/pacientes': 'pacientes',
    '/emaee/fila-espera': 'fila-espera',
    '/emaee/vincular-profissionais': 'especialistas',
    '/emaee/solicitacoes-escola': 'relatorios-escola',
  }

  const handleLogout = async () => {
    closeMobile()
    setIsLoggingOut(true)
    toast.success('Sessão encerrada com sucesso!')
    await logout(supabase)
  }

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    
    toast.success('Sincronizando dados e verificando atualizações...')
    
    try {
      // 1. Força a verificação de novas versões do Service Worker no servidor
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.update()
        }
      }
      
      // 2. Revalida dados das rotas do Next.js App Router
      router.refresh()
    } catch (error) {
      console.error('Erro ao sincronizar dados do sistema:', error)
    }

    await new Promise(resolve => setTimeout(resolve, 600))
    closeMobile()
    setIsRefreshing(false)
  }

  const isEjaEscolaAtivo = Boolean(selectedEscola?.eja_ativo)
  const isFuncionarioModalidadeEja = (funcionario?.modalidade_ensino ?? '').toUpperCase() === 'EJA'
  const temPermissaoEjaUsuario = Boolean(acessos?.some(a => (a as any).pode_eja === true && a.ativo))
  const podeVerEjaEscola = isEjaEscolaAtivo && (isDiretor() || isFuncionarioModalidadeEja || temPermissaoEjaUsuario || Boolean(funcionario?.is_superadmin))

  type MenuItem = { href: string; label: string; icon: React.ElementType }
  type MenuGroup = { label: string | null; items: MenuItem[] }

  const menuGroups: MenuGroup[] = isEjaMode
    ? [
        {
          label: null,
          items: [
            { href: '/eja', label: 'Portal EJA', icon: Home },
          ]
        },
        {
          label: 'GESTÃO EJA',
          items: [
            { href: '/alunos', label: 'Alunos', icon: GraduationCap },
            { href: '/turmas', label: 'Turmas', icon: BookOpen },
            { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
          ]
        }
      ]
    : isRhRedeOnly
    ? [
        {
          label: null,
          items: [
            { href: '/home', label: 'Início', icon: Home },
          ]
        },
        {
          label: 'RECURSOS HUMANOS',
          items: [
            { href: '/funcionarios', label: 'Servidores da Rede', icon: Users },
          ]
        }
      ]
    : isEMAEE
    ? [
        {
          label: null,
          items: [
            { href: '/home', label: 'Início', icon: Home },
            { href: '/mural', label: 'Mural de Avisos', icon: Pin },
          ]
        },
        {
          label: 'ATENDIMENTO MULTIDISCIPLINAR',
          items: [
            { href: '/emaee/pacientes', label: 'Pastas de Alunos / Saúde', icon: Heart },
            { href: '/emaee/fila-espera', label: 'Fila de Espera & Admissão', icon: Clock },
            { href: '/emaee/vincular-profissionais', label: 'Profissionais AEE', icon: UserPlus },
            { href: '/emaee/solicitacoes-escola', label: 'Relatórios das Escolas', icon: FileSpreadsheet },
          ]
        },
        {
          label: 'EQUIPE & GESTÃO',
          items: [
            { href: '/funcionarios', label: 'Equipe de Saúde', icon: Stethoscope },
            { href: '/relatorios', label: 'Relatórios & Mapas', icon: FileBarChart },
            { href: '/arquivos', label: 'Arquivo Geral de Laudos', icon: Archive },
          ]
        }
      ]
    : isEducacao
    ? [
        {
          label: null,
          items: [
            { href: '/home', label: 'Início', icon: Home },
            { href: '/mural', label: 'Mural', icon: Pin },
          ]
        },
        {
          label: 'GESTÃO ACADÊMICA',
          items: [
            { href: '/alunos', label: 'Alunos', icon: GraduationCap },
            { href: '/turmas', label: 'Turmas', icon: BookOpen },
            { href: '/matriculas', label: 'Matrículas', icon: FileBadge },
            { href: '/avaliacoes', label: 'Avaliações', icon: ClipboardList },
            { href: '/ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
            ...(selectedEscola?.portal_comunicacoes_ativo ? [
              { href: '/turmas', label: 'Comunicações com Pais', icon: MessageSquare }
            ] : []),
          ]
        },
        ...(podeVerEjaEscola ? [
          {
            label: 'EJA',
            items: [
              { href: '/eja/alunos', label: 'Alunos', icon: GraduationCap },
              { href: '/eja/turmas', label: 'Turmas', icon: BookOpen },
              { href: '/eja/avaliacoes', label: 'Avaliações', icon: ClipboardList },
              { href: '/eja/matriculas', label: 'Matrículas', icon: FileBadge },
              { href: '/eja/ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
            ]
          }
        ] : []),
        {
          label: 'SECRETARIA',
          items: [
            { href: '/documentos', label: 'Documentos', icon: FileText },
            { href: '/transferencias', label: 'Transferências', icon: ArrowLeftRight },
            { href: '/arquivos', label: 'Arquivo', icon: Archive },
            ...(selectedEscola?.portal_pais_ativo ? [
              { href: '/responsaveis', label: 'Portal dos Pais', icon: Users }
            ] : []),
          ]
        },
        {
          label: 'GESTÃO ADMINISTRATIVA',
          items: [
            { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
            { href: '/relatorios/atividades', label: 'Central de Atividades', icon: Activity },
            { href: '/painel-chefe', label: 'Painel Liderança', icon: UserCheck },
            { href: '/funcionarios', label: 'Funcionários', icon: Users },
          ]
        },
      ]
    : isSaude
    ? [
        {
          label: null,
          items: [
            { href: '/home', label: 'Início', icon: Home },
            { href: '/mural', label: 'Mural', icon: Pin },
          ]
        },
        {
          label: 'GESTÃO DE SAÚDE & UNIDADE',
          items: [
            { href: '/funcionarios', label: 'Servidores da Saúde', icon: Users },
            { href: '/painel-chefe', label: 'Escalas & Plantões', icon: UserCheck },
            { href: '/atestados', label: 'Atestados Médicos', icon: Stethoscope },
            { href: '/documentos', label: 'Documentos Oficiais', icon: FileText },
          ]
        },
        {
          label: 'GESTÃO ADMINISTRATIVA & AUDITORIA',
          items: [
            { href: '/relatorios', label: 'Relatórios & KPIs', icon: FileBarChart },
            { href: '/relatorios/atividades', label: 'Central de Atividades', icon: Activity },
            { href: '/arquivos', label: 'Arquivo Geral', icon: Archive },
          ]
        },
      ]
    : [
        {
          label: null,
          items: [
            { href: '/home', label: 'Início', icon: Home },
            { href: '/mural', label: 'Mural', icon: Pin },
          ]
        },
        {
          label: 'GESTÃO DA UNIDADE',
          items: [
            { href: '/funcionarios', label: 'Servidores / Funcionários', icon: Users },
            { href: '/painel-chefe', label: 'Painel Liderança', icon: UserCheck },
            { href: '/documentos', label: 'Documentos', icon: FileText },
          ]
        },
        {
          label: 'GESTÃO ADMINISTRATIVA',
          items: [
            { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
            { href: '/relatorios/atividades', label: 'Central de Atividades', icon: Activity },
            { href: '/arquivos', label: 'Arquivo', icon: Archive },
          ]
        },
      ]

  const systemItems: MenuItem[] = [
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/coleta-local', label: 'Coleta Local', icon: Fingerprint },
    { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
  ]

  const getIsActive = (href: string): boolean => {
    if (href === '/eja') return pathname === '/eja'
    if (href === '/home') return pathname === '/home' || pathname === '/'
    if (href === '/configuracoes') return pathname.startsWith('/configuracoes') || pathname.startsWith('/perfil') || pathname.startsWith('/permissoes')
    if (href === '/relatorios') return pathname === '/relatorios' || (pathname.startsWith('/relatorios/') && !pathname.startsWith('/relatorios/atividades'))
    return pathname.startsWith(href)
  }

  const NavLink = ({ item }: { item: MenuItem }) => {
    const Icon = item.icon
    const isActive = getIsActive(item.href)

    const handleClick = (e: React.MouseEvent) => {
      if (item.href === '/turmas' && !escolaAtivaId) {
        e.preventDefault()
        setShowSchoolWarningModal(true)
        return
      }
      closeMobile()
    }

    return (
      <Link
        href={item.href}
        onClick={handleClick}
        prefetch={true}
        className={cn(
          "flex items-center gap-3.5 px-4 py-3 md:py-2.5 font-medium transition-all duration-200 text-base md:text-sm min-h-[48px] md:min-h-0",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-2 border-sidebar-primary rounded-r-xl rounded-l-none shadow-sm dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff] dark:border-[#3ea6ff]"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-xl"
        )}
      >
        <Icon className={cn("w-6 h-6 md:w-5 md:h-5 shrink-0", isActive ? "text-sidebar-accent-foreground dark:text-[#3ea6ff]" : "text-sidebar-foreground dark:text-sidebar-foreground/70")} />
        <span>{item.label}</span>
      </Link>
    )
  }

  const SidebarContent = () => (
    <>
      {/* Brand Header */}
      <div className="p-5 border-b border-sidebar-border/50 md:border-b-0 min-w-0 flex flex-col gap-3">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 min-w-0">
            {selectedEscola?.logo_url ? (
              <img
                src={selectedEscola.logo_url}
                alt={selectedEscola.nome}
                className="w-10 h-10 rounded-xl object-contain shrink-0 border border-sidebar-border p-1 bg-surface-1"
              />
            ) : (
              <img
                src="/img/logo-sidebar-novo.png"
                alt="Painel Escolar"
                className="w-10 h-10 object-contain shrink-0"
              />
            )}
            <h2 className="text-lg font-bold tracking-tight text-sidebar-foreground truncate">
              {selectedEscola ? selectedEscola.nome : selectedSecretaria ? selectedSecretaria.nome : 'Painel Escolar'}
            </h2>
          </div>
          <button 
            onClick={closeMobile}
            className="md:hidden p-2 text-sidebar-foreground/70 hover:text-highlight hover:bg-sidebar-accent rounded-lg transition-colors"
            title="Recolher Menu"
            aria-label="Recolher Menu"
          >
            <X className="w-5 h-5 text-sidebar-accent-foreground dark:text-[#3ea6ff]" />
          </button>
        </div>

        {/* Dropdown de Escolas para Multi-lotação */}
        {vinculosAtivos.length > 1 && (
          <div className="px-1">
            <label className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest block mb-1">
              Unidade Escolar Ativa
            </label>
            <select
              value={escolaAtivaId || ''}
              onChange={(e) => setEscolaAtivaId(e.target.value)}
              className="w-full bg-sidebar-accent/45 border border-sidebar-border/50 text-sidebar-foreground text-xs rounded-xl px-3 py-2 outline-none focus:border-sky-500 font-semibold cursor-pointer transition-all duration-200"
            >
              {vinculosAtivos.map((v) => (
                <option key={v.id} value={v.escola_id} className="bg-background text-foreground">
                  {v.escolaNome || 'Escola sem nome'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {menuGroups.map((group, groupIndex) => {
          const filteredItems = group.items.filter((item) => {
            const moduloNecessario = moduloPorHref[item.href]
            if (moduloNecessario) {
              if (item.href === '/relatorios') {
                if (!modulosSecretaria.includes('geolocalizacao') && !modulosSecretaria.includes('relatorios')) {
                  return false
                }
              } else if (!modulosSecretaria.includes(moduloNecessario)) {
                return false
              }
            } else if (item.href === '/relatorios') {
              if (!modulosSecretaria.includes('geolocalizacao') && !modulosSecretaria.includes('relatorios')) {
                return false
              }
            }

            const isAdmin = isAdminGlobalOrRoot()
            if (!isAdmin && isProfessor) {
              const permitidos = ['/home', '/mural', '/alunos', '/turmas', '/avaliacoes']
              return permitidos.includes(item.href)
            }
            if (!isAdmin && isChefe()) {
              const permitidos = ['/home', '/mural', '/painel-chefe']
              return permitidos.includes(item.href)
            }
            if (item.href === '/painel-chefe') {
              if (isNivel1OrSuperior && !temEscolaSelecionada) {
                return false
              }
              return isDiretor() || isChefe() || isAdmin
            }
            return true
          })

          if (filteredItems.length === 0) return null

          const requerSelecaoEscolaParaDetalhes = isEducacao && isNivel1OrSuperior

          if (requerSelecaoEscolaParaDetalhes) {
            if (group.label === 'GESTÃO ACADÊMICA') {
              const mainItem = filteredItems.find(i => i.href === '/alunos')
              const extraItems = filteredItems.filter(i => i.href !== '/alunos')

              return (
                <div key={groupIndex}>
                  {group.label !== null && (
                    <>
                      <hr className="border-sidebar-border/40 mx-3 my-1" />
                      <div className="px-4 pt-4 pb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/75 dark:text-sidebar-foreground/40">
                          {group.label}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="space-y-1.5">
                    {mainItem && <NavLink item={mainItem} />}
                    <AnimatePresence initial={false}>
                      {temEscolaSelecionada && extraItems.length > 0 && (
                        <motion.div
                          key="gestao-academica-extras"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: 'easeInOut' }}
                          className="overflow-hidden space-y-1.5"
                        >
                          {extraItems.map((item) => (
                            <NavLink key={item.href} item={item} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )
            }

            if (group.label === 'SECRETARIA') {
              return (
                <AnimatePresence key={groupIndex} initial={false}>
                  {temEscolaSelecionada && (
                    <motion.div
                      key="secretaria-group-animated"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <hr className="border-sidebar-border/40 mx-3 my-1" />
                      <div className="px-4 pt-4 pb-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/75 dark:text-sidebar-foreground/40">
                          {group.label}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {filteredItems.map((item) => (
                          <NavLink key={item.href} item={item} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )
            }
          }

          return (
            <div key={groupIndex}>
              {group.label !== null && (
                <>
                  <hr className="border-sidebar-border/40 mx-3 my-1" />
                  <div className="px-4 pt-4 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/75 dark:text-sidebar-foreground/40">
                      {group.label}
                    </span>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                {filteredItems.map((item) => (
                  <NavLink key={item.href} item={item} />
                ))}
              </div>
            </div>
          )
        })}

        {/* System items — separador visual sem rótulo */}
        <>
          <hr className="border-sidebar-border/40 mx-3 my-1" />
          <div className="space-y-1.5 mt-1">
            {systemItems.filter((item) => {
              const moduloNecessario = moduloPorHref[item.href]
              if (moduloNecessario && !modulosSecretaria.includes(moduloNecessario)) {
                return false
              }
              if (isProfessor || isChefe()) {
                const permitidos = ['/configuracoes', '/ajuda']
                return permitidos.includes(item.href)
              }
              return true
            }).map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </>
      </nav>

      {/* Footer Nav */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="w-full flex items-center gap-3.5 px-4 py-3 md:py-2.5 text-base md:text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-xl transition-colors text-left cursor-pointer min-h-[48px] md:min-h-0 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <RefreshCw className={cn("w-6 h-6 md:w-5 md:h-5 text-sidebar-foreground dark:text-sidebar-foreground/70", isRefreshing && "animate-spin text-highlight")} />
          <span>{isRefreshing ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
        <button 
          onClick={handleLogout} 
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3.5 px-4 py-3 md:py-2.5 text-base md:text-sm font-medium text-destructive hover:bg-destructive/20 hover:text-red-400 active:scale-[0.98] rounded-xl transition-all duration-200 text-left cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed min-h-[48px] md:min-h-0"
        >
          {isLoggingOut ? (
            <Loader2 className="w-6 h-6 md:w-5 md:h-5 text-destructive animate-spin" />
          ) : (
            <LogOut className="w-6 h-6 md:w-5 md:h-5 text-destructive" />
          )}
          <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-colors duration-200 select-none print:hidden shrink-0",
        isSelecaoSecretaria && "!hidden"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && !isSelecaoSecretaria && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200" 
            onClick={closeMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl md:hidden animate-in slide-in-from-left duration-200 select-none print:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Modal de Alerta de Seleção de Escola padronizado com StandardDialog */}
      {showSchoolWarningModal && (
        <StandardDialog
          open={showSchoolWarningModal}
          onOpenChange={setShowSchoolWarningModal}
          title="Escola Não Selecionada"
          description="Para acessar a seção de Turmas, é necessário selecionar uma escola ativa primeiro."
          maxWidth="sm:max-w-[450px]"
          footer={
            <div className="flex justify-center w-full pt-2">
              <Button
                type="button"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl h-10 px-6 cursor-pointer"
                onClick={() => setShowSchoolWarningModal(false)}
              >
                Entendido
              </Button>
            </div>
          }
        >
          <div className="flex flex-col items-center text-center py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-2">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </StandardDialog>
      )}
    </>
  )
}
