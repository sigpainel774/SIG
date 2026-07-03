'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Home, 
  Pin, 
  Users, 
  GraduationCap, 
  ShieldCheck, 
  FileBarChart, 
  HelpCircle, 
  User, 
  RefreshCw, 
  LogOut 
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const limparSessao = useAuthStore((state) => state.limparSessao)

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
    { href: '/admin', label: 'Painel Admin ROOT', icon: ShieldCheck },
    { href: '/home', label: 'Início Escolar', icon: Home },
    { href: '/mural', label: 'Mural', icon: Pin },
    { href: '/funcionarios', label: 'Funcionários', icon: Users },
    { href: '/alunos', label: 'Alunos', icon: GraduationCap },
    { href: '/permissoes', label: 'Permissões', icon: ShieldCheck },
    { href: '/relatorios', label: 'Relatórios', icon: FileBarChart },
    { href: '/ajuda', label: 'Ajuda', icon: HelpCircle },
    { href: '/perfil', label: 'Perfil', icon: User },
  ]

  return (
    <aside className="w-64 flex flex-col border-r border-borderCustom bg-[#0c0c0c] text-foregroundCustom h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white text-lg shadow-md">
          S
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Painel Escolar</h2>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm",
                isActive 
                  ? "bg-card text-highlight border border-borderCustom shadow-sm" 
                  : "text-foregroundCustom/80 hover:bg-hoverCustom hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-highlight" : "text-foregroundCustom/70")} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer Nav */}
      <div className="p-3 border-t border-borderCustom space-y-1">
        <button 
          onClick={() => router.refresh()} 
          className="w-full flex items-center gap-3.5 px-4 py-2.5 text-sm font-medium text-foregroundCustom/80 hover:bg-hoverCustom hover:text-white rounded-xl transition-colors text-left"
        >
          <RefreshCw className="w-5 h-5 text-foregroundCustom/70" />
          <span>Atualizar</span>
        </button>
        <button 
          onClick={handleLogout} 
          className="w-full flex items-center gap-3.5 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors text-left"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}
