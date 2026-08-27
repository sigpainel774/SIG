'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MapPinned,
  Plus,
  Layers,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlphaQuickActionsModal } from './AlphaQuickActionsModal'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

export function AlphaBottomNav() {
  const pathname = usePathname()
  const supabase = createClient()
  const { logout } = useAuthStore()

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)

  const handleLogout = async () => {
    toast.success('Sessão encerrada com sucesso!')
    await logout(supabase, '/alpha/login')
  }

  const navItems = [
    {
      label: 'Início',
      href: '/alpha',
      icon: LayoutDashboard,
      isActive: pathname === '/alpha',
    },
    {
      label: 'Visitas.',
      href: '/alpha/visitas',
      icon: MapPinned,
      isActive: pathname.startsWith('/alpha/visitas') || pathname.startsWith('/alpha/rotas-escolas'),
    },
  ]

  const rightItems = [
    {
      label: 'Módulos',
      href: '/alpha#catalogo',
      icon: Layers,
      isActive: false,
    },
    {
      label: 'Sair',
      onClick: handleLogout,
      icon: LogOut,
      isActive: false,
    },
  ]

  return (
    <>
      <nav
        aria-label="Navegação Mobile Alpha"
        className="fixed bottom-3 inset-x-3 z-40 md:hidden pointer-events-auto"
      >
        <div className="max-w-md mx-auto bg-white/95 backdrop-blur-2xl border border-sidebar-border rounded-[28px] px-3 py-2 shadow-xl shadow-black/10 flex items-center justify-between relative">
          {/* Lado Esquerdo */}
          <div className="flex items-center gap-1 flex-1 justify-around">
            {navItems.map((item, idx) => {
              const Icon = item.icon
              return (
                <Link
                  key={idx}
                  href={item.href}
                  prefetch={true}
                  onClick={(e) => {
                    if (typeof navigator !== 'undefined' && !navigator.onLine) {
                      e.preventDefault()
                      window.location.assign(item.href)
                    }
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 relative group',
                    item.isActive
                      ? 'text-sidebar-primary font-bold'
                      : 'text-muted-foreground hover:text-sidebar-foreground'
                  )}
                >
                  <Icon className={cn('w-5 h-5 transition-transform group-active:scale-90', item.isActive ? 'scale-110 text-sidebar-primary' : 'text-muted-foreground')} />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
                  {item.isActive && (
                    <span className="w-4 h-1 bg-sidebar-primary rounded-full absolute -bottom-1 shadow-xs" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Botão Central Flutuante de Destaque (+) */}
          <div className="relative -top-3.5 px-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(true)}
              aria-label="Ações Rápidas"
              className="w-13 h-13 rounded-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-white flex items-center justify-center shadow-lg shadow-sidebar-primary/30 border-4 border-[#f3f4f7] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Lado Direito */}
          <div className="flex items-center gap-1 flex-1 justify-around">
            {rightItems.map((item, idx) => {
              const Icon = item.icon
              if (item.onClick) {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={item.onClick}
                    className="flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-muted-foreground hover:text-destructive transition-all duration-200 relative group active:scale-90 cursor-pointer"
                  >
                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors" />
                    <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
                  </button>
                )
              }
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className="flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl text-muted-foreground hover:text-sidebar-foreground transition-all duration-200 relative group active:scale-90"
                >
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
                  <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Modal de Ações Rápidas */}
      <AlphaQuickActionsModal
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
      />
    </>
  )
}
