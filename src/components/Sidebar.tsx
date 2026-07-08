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
  X
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
  const { funcionario, limparSessao } = useAuthStore()
  const { isMobileOpen, closeMobile } = useSidebarStore()
  const { selectedEscola } = useSchoolStore()

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

  const menuItems = [
    { href: '/home', label: 'Início', icon: Home },
    { href: '/mural', label: 'Mural', icon: Pin },
    { href: '/funcionarios', label: 'Funcionários', icon: Users },
    { href: '/alunos', label: 'Alunos', icon: GraduationCap },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
    { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
  ]

  const SidebarContent = () => (
    <>
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-sidebar-border/50 md:border-b-0 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          {selectedEscola?.logo_url ? (
            <img
              src={selectedEscola.logo_url}
              alt={selectedEscola.nome}
              className="w-10 h-10 rounded-xl object-contain shrink-0 border border-sidebar-border p-1 bg-[#161616]"
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
          className="md:hidden p-2 text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent rounded-lg transition-colors"
          title="Recolher Menu"
          aria-label="Recolher Menu"
        >
          <X className="w-5 h-5 text-[#3ea6ff]" />
        </button>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href === '/configuracoes' && (pathname === '/perfil' || pathname === '/permissoes')) ||
            (item.href === '/admin' && (pathname.startsWith('/admin') || pathname === '/root'))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
              className={cn(
                "flex items-center gap-3.5 px-4 py-3 md:py-2.5 rounded-xl font-medium transition-all duration-200 text-base md:text-sm min-h-[48px] md:min-h-0",
                isActive 
                  ? "bg-sidebar-accent text-highlight font-semibold border border-sidebar-border shadow-sm" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6 md:w-5 md:h-5 shrink-0", isActive ? "text-highlight" : "text-sidebar-foreground/60")} />
              <span>{item.label}</span>
            </Link>
          )
        })}
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
