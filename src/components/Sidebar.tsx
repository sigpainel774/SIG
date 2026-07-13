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
  Fingerprint
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSidebarStore } from '@/store/useSidebarStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { useSchoolStore } from '@/store/useSchoolStore'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { funcionario, limparSessao, isDiretor, vinculos, acessos, escolaAtivaId, setEscolaAtivaId } = useAuthStore()
  const isProfessor = acessos?.some(a => a.nivel === 4 || a.nivel === 5) || funcionario?.cargo?.toLowerCase().includes('professor')
  const { isMobileOpen, closeMobile } = useSidebarStore()
  const { selectedEscola } = useSchoolStore()

  const vinculosAtivos = vinculos?.filter((v) => v.ativo) || []

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleLogout = async () => {
    try {
      closeMobile()
      setIsLoggingOut(true)
      await supabase.auth.signOut()
      limparSessao()
      toast.success('Sessão encerrada com sucesso!')
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error('Erro ao encerrar sessão')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    
    toast.success('Atualizando e limpando cache...')
    
    try {
      // 1. Limpa o Cache Storage da API de Caches do navegador (onde o PWA guarda arquivos)
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        )
      }
      
      // 2. Força a verificação de novas versões do Service Worker no servidor
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.update()
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar cache do sistema:', error)
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
    
    closeMobile()
    
    // 3. Recarrega a página forçando o navegador a descartar o cache HTTP
    window.location.reload()
  }

  type MenuItem = { href: string; label: string; icon: React.ElementType }
  type MenuGroup = { label: string | null; items: MenuItem[] }

  const menuGroups: MenuGroup[] = [
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
      ]
    },
    {
      label: 'SECRETARIA',
      items: [
        { href: '/documentos', label: 'Documentos', icon: FileText },
        { href: '/transferencias', label: 'Transferências', icon: ArrowLeftRight },
        { href: '/arquivos', label: 'Arquivo', icon: Archive },
      ]
    },
    {
      label: 'GESTÃO',
      items: [
        { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
        { href: '/painel-chefe', label: 'Painel Liderança', icon: UserCheck },
        { href: '/funcionarios', label: 'Funcionários', icon: Users },
      ]
    },
  ]

  const systemItems: MenuItem[] = [
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/coleta-local', label: 'Coleta Local', icon: Fingerprint },
    { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
  ]

  const getIsActive = (href: string): boolean => {
    if (href === '/configuracoes') return pathname === '/configuracoes' || pathname === '/perfil' || pathname === '/permissoes'
    if (href === '/avaliacoes') return pathname.startsWith('/avaliacoes')
    if (href === '/transferencias') return pathname.startsWith('/transferencias')
    if (href === '/turmas') return pathname === '/turmas'
    if (href === '/matriculas') return pathname === '/matriculas'
    if (href === '/ocorrencias') return pathname === '/ocorrencias'
    if (href === '/arquivos') return pathname === '/arquivos'
    if (href === '/documentos') return pathname === '/documentos'
    if (href === '/painel-chefe') return pathname === '/painel-chefe'
    return pathname === href
  }

  const NavLink = ({ item }: { item: MenuItem }) => {
    const Icon = item.icon
    const isActive = getIsActive(item.href)
    return (
      <Link
        href={item.href}
        onClick={closeMobile}
        prefetch={true}
        className={cn(
          "flex items-center gap-3.5 px-4 py-3 md:py-2.5 font-medium transition-all duration-200 text-base md:text-sm min-h-[48px] md:min-h-0",
          isActive
            ? "bg-[#185FA5]/8 text-[#185FA5] font-semibold border-l-2 border-[#185FA5] rounded-r-xl rounded-l-none shadow-sm dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff] dark:border-[#3ea6ff]"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-xl"
        )}
      >
        <Icon className={cn("w-6 h-6 md:w-5 md:h-5 shrink-0", isActive ? "text-[#185FA5] dark:text-[#3ea6ff]" : "text-sidebar-foreground/60")} />
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
              <Logo variant="icon" className="w-10 h-10 shrink-0" />
            )}
            <h2 className="text-lg font-bold tracking-tight text-sidebar-foreground truncate">
              {selectedEscola ? selectedEscola.nome : 'Painel Escolar'}
            </h2>
          </div>
          <button 
            onClick={closeMobile}
            className="md:hidden p-2 text-sidebar-foreground/70 hover:text-highlight hover:bg-sidebar-accent rounded-lg transition-colors"
            title="Recolher Menu"
            aria-label="Recolher Menu"
          >
            <X className="w-5 h-5 text-[#185FA5] dark:text-[#3ea6ff]" />
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
                <option key={v.id} value={v.escola_id} className="bg-[#18181b] text-white">
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
            if (isProfessor) {
              const permitidos = ['/home', '/mural', '/alunos', '/turmas', '/avaliacoes']
              return permitidos.includes(item.href)
            }
            if (item.href === '/painel-chefe') {
              return isDiretor()
            }
            return true
          })

          if (filteredItems.length === 0) return null

          return (
            <div key={groupIndex}>
              {group.label !== null && (
                <>
                  <hr className="border-sidebar-border/40 mx-3 my-1" />
                  <div className="px-4 pt-4 pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40">
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
              if (isProfessor) {
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
          className="w-full flex items-center gap-3.5 px-4 py-3 md:py-2.5 text-base md:text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-xl transition-colors text-left cursor-pointer min-h-[48px] md:min-h-0 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <RefreshCw className={cn("w-6 h-6 md:w-5 md:h-5 text-sidebar-foreground/60", isRefreshing && "animate-spin text-highlight")} />
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
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-colors duration-200 select-none print:hidden shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
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
    </>
  )
}
