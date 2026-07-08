'use client'

import { useState, useEffect } from 'react'
import { Bell, Menu } from 'lucide-react'
import { ModalConfirmacaoSenha } from '@/components/modals/modal-confirmacao-senha'
import { ModalNotificacoes } from '@/components/modals/modal-notificacoes'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useSidebarStore } from '@/store/useSidebarStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Logo } from './Logo'
import { useSchoolStore } from '@/store/useSchoolStore'

export function Header() {
  const { isEditMode, setEditMode } = useEditModeStore()
  const { funcionario } = useAuthStore()
  const { toggleMobile } = useSidebarStore()
  const { selectedEscola } = useSchoolStore()
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false)
  const [modalNotifOpen, setModalNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!funcionario?.auth_user_id) return
    const supabase = createClient()

    const fetchUnreadCount = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', funcionario.auth_user_id as string)
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
          filter: `user_id=eq.${funcionario.auth_user_id as string}` 
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
  }, [funcionario?.auth_user_id])

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
      <header className="h-16 border-b border-borderCustom bg-[#121214] flex items-center justify-between px-4 sm:px-6 shadow-sm sticky top-0 z-30 print:hidden min-w-0">
        {/* Title / Logo & Mobile Menu Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={toggleMobile}
            className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-[#27272a] transition-colors cursor-pointer shrink-0"
            title="Menu Principal"
            aria-label="Alternar Menu Lateral"
          >
            <Menu className="w-6 h-6 text-[#3ea6ff]" />
          </button>
          {selectedEscola?.logo_url ? (
            <img
              src={selectedEscola.logo_url}
              alt={selectedEscola.nome}
              className="w-7 h-7 rounded-lg object-contain shrink-0 border border-borderCustom p-0.5 bg-[#161616]"
            />
          ) : (
            <Logo variant="icon" className="w-7 h-7 shrink-0" />
          )}
          <h1 className="font-bold text-base md:text-lg text-white tracking-tight hidden sm:block truncate">
            {selectedEscola ? selectedEscola.nome : 'Sapeaçu Painel Escolar'}
          </h1>
          <h1 className="font-bold text-sm text-white tracking-tight sm:hidden truncate">
            {selectedEscola ? selectedEscola.nome : 'Painel Escolar'}
          </h1>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          {/* Notification Bell */}
          <button
            onClick={() => setModalNotifOpen(true)}
            className="relative p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-[#27272a] transition-colors cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#121214]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Modo Edição Switch */}
          <div className="flex items-center gap-2 md:gap-3">
            <span className={`text-xs sm:text-sm font-semibold transition-colors hidden sm:block ${isEditMode ? 'text-[#0090ff]' : 'text-zinc-400'}`}>
              Modo Edição
            </span>
            
            <button
              type="button"
              role="switch"
              aria-checked={isEditMode}
              onClick={handleToggleClick}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isEditMode ? 'bg-[#0090ff]' : 'bg-zinc-700'
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
