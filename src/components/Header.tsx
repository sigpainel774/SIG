'use client'

import { useState, useEffect } from 'react'
import { Bell, Menu, School, Sun, Moon, Monitor } from 'lucide-react'
import { ModalConfirmacaoSenha } from '@/components/modals/modal-confirmacao-senha'
import { ModalNotificacoes } from '@/components/modals/modal-notificacoes'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useSidebarStore } from '@/store/useSidebarStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Logo } from './Logo'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'

export function Header() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const pathname = usePathname()
  const { isEditMode, setEditMode } = useEditModeStore()
  const { funcionario } = useAuthStore()
  const { toggleMobile } = useSidebarStore()
  const { selectedEscola } = useSchoolStore()
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false)
  const [modalNotifOpen, setModalNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setThemeMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!funcionario?.id) return
    const supabase = createClient()

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', funcionario.id as string)
        .eq('read', false)
      
      if (!error && count !== null) {
        setUnreadCount(count)
      }
    }

    fetchUnreadCount()

    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${funcionario.id as string}` 
        },
        (payload: any) => {
          setUnreadCount((prev) => prev + 1)
          toast.info(payload.new.title || 'Nova notificação')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [funcionario?.id])

  const handleToggleClick = () => {
    if (!isEditMode) {
      setModalSenhaOpen(true)
    } else {
      setEditMode(false)
      toast.info('Modo edição desativado.')
    }
  }

  return (
    <>
      <header className="h-16 border-b border-borderCustom bg-surface-1 flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-30 print:hidden min-w-0">
        {/* Title / Logo & Mobile Menu Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={toggleMobile}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors cursor-pointer shrink-0"
            title="Menu Principal"
            aria-label="Alternar Menu Lateral"
          >
            <Menu className="w-6 h-6 text-[#185FA5] dark:text-[#3ea6ff]" />
          </button>
          {selectedEscola?.logo_url ? (
            <img
              src={selectedEscola.logo_url}
              alt={selectedEscola.nome}
              className="w-7 h-7 rounded-lg object-contain shrink-0 border border-borderCustom p-0.5 bg-surface-1"
            />
          ) : (
            <School className="w-5 h-5 text-[#185FA5] dark:text-[#3ea6ff] shrink-0" />
          )}
          <h1 className="font-bold text-base md:text-lg text-foreground tracking-tight hidden sm:block truncate">
            {selectedEscola ? selectedEscola.nome : 'Sapeaçu Painel Escolar'}
          </h1>
          <h1 className="font-bold text-sm text-foreground tracking-tight sm:hidden truncate">
            {selectedEscola ? selectedEscola.nome : 'Painel Escolar'}
          </h1>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Seletor de Tema */}
          {mounted && (
            <div className="relative">
              <button
                onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors cursor-pointer flex items-center justify-center"
                title="Alterar Tema"
              >
                {theme === 'light' && <Sun className="w-5 h-5 text-amber-500" />}
                {theme === 'dark' && <Moon className="w-5 h-5 text-blue-400" />}
                {theme === 'system' && <Monitor className="w-5 h-5" />}
              </button>

              {themeMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setThemeMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-36 rounded-xl border border-borderCustom bg-card p-1 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150">
                    <button
                      onClick={() => {
                        setTheme('light')
                        setThemeMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-hoverCustom transition-colors text-left cursor-pointer ${
                        theme === 'light' ? 'text-[#185FA5] dark:text-[#3ea6ff] font-semibold' : 'text-foregroundCustom'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Claro</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('dark')
                        setThemeMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-hoverCustom transition-colors text-left cursor-pointer ${
                        theme === 'dark' ? 'text-[#185FA5] dark:text-[#3ea6ff] font-semibold' : 'text-foregroundCustom'
                      }`}
                    >
                      <Moon className="w-4 h-4 text-blue-400" />
                      <span>Escuro</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('system')
                        setThemeMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-hoverCustom transition-colors text-left cursor-pointer ${
                        theme === 'system' ? 'text-[#185FA5] dark:text-[#3ea6ff] font-semibold' : 'text-foregroundCustom'
                      }`}
                    >
                      <Monitor className="w-4 h-4" />
                      <span>Sistema</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Notification Bell */}
          <button
            onClick={() => setModalNotifOpen(true)}
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors cursor-pointer flex items-center justify-center"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-surface-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Modo Edição Switch */}
          <div className="flex items-center gap-2 md:gap-3 h-9">
            <span className={`text-xs sm:text-sm font-semibold transition-colors hidden sm:block ${isEditMode ? 'text-[#185FA5] dark:text-[#3ea6ff]' : 'text-muted-foreground'}`}>
              Modo Edição
            </span>
            
            <button
              type="button"
              role="switch"
              aria-checked={isEditMode}
              onClick={handleToggleClick}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEditMode ? 'bg-[#185FA5] dark:bg-primary' : 'bg-surface-3'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isEditMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Password Modal */}
      <ModalConfirmacaoSenha
        open={modalSenhaOpen}
        onOpenChange={setModalSenhaOpen}
        onSuccess={() => setEditMode(true)}
      />

      {/* Notifications Modal */}
      <ModalNotificacoes
        open={modalNotifOpen}
        onOpenChange={setModalNotifOpen}
      />
    </>
  )
}
