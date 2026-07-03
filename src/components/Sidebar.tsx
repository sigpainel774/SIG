'use client'

import Link from 'next/link'
import Image from 'next/image'
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
  ShieldCheck
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { funcionario, limparSessao } = useAuthStore()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      limparSessao()
      toast.success('Sessão encerrada com sucesso!')
      router.push('/login')
      router.refresh()
    } catch (error) {
      toast.error('Erro ao encerrar sessão')
    }
  }

  const menuItems = [
    { href: '/home', label: 'Início', icon: Home },
    { href: '/mural', label: 'Mural', icon: Pin },
    { href: '/funcionarios', label: 'Funcionários', icon: Users },
    { href: '/alunos', label: 'Alunos', icon: GraduationCap },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
    { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
    ...(funcionario?.is_superadmin || pathname.startsWith('/admin') || pathname === '/root'
      ? [{ href: '/admin', label: 'Painel Root', icon: ShieldCheck }] 
      : []),
  ]

  return (
    <aside className="w-64 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-colors duration-200 select-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-[#18181b] border border-[#27272a] p-1 shrink-0">
          <img 
            src="https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/logos/icon-192.png" 
            alt="Logo" 
            className="w-full h-full object-contain rounded-lg" 
          />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-sidebar-foreground">Painel Escolar</h2>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href === '/configuracoes' && (pathname === '/perfil' || pathname === '/permissoes')) ||
            (item.href === '/admin' && (pathname.startsWith('/admin') || pathname === '/root'))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm",
                isActive 
                  ? "bg-sidebar-accent text-highlight font-semibold border border-sidebar-border shadow-sm" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-highlight" : "text-sidebar-foreground/60")} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer Nav */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <button 
          onClick={() => router.refresh()} 
          className="w-full flex items-center gap-3.5 px-4 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-xl transition-colors text-left cursor-pointer"
        >
          <RefreshCw className="w-5 h-5 text-sidebar-foreground/60" />
          <span>Atualizar</span>
        </button>
        <button 
          onClick={handleLogout} 
          className="w-full flex items-center gap-3.5 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors text-left cursor-pointer"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
