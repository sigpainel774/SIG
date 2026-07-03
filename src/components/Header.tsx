'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { ModalConfirmacaoSenha } from '@/components/modals/modal-confirmacao-senha'
import { ModalNotificacoes } from '@/components/modals/modal-notificacoes'
import { useEditModeStore } from '@/store/useEditModeStore'
import { toast } from 'sonner'

export function Header() {
  const { isEditMode, setEditMode } = useEditModeStore()
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false)
  const [modalNotifOpen, setModalNotifOpen] = useState(false)

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
      <header className="h-16 border-b border-borderCustom bg-[#121214] flex items-center justify-between px-6 shadow-sm sticky top-0 z-30">
        {/* Title / Logo */}
        <div className="flex items-center gap-3">
          <img 
            src="https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/logos/icon-192.png" 
            alt="Painel Escolar Logo" 
            className="w-7 h-7 object-contain rounded-md" 
          />
          <h1 className="font-bold text-lg text-white tracking-tight">
            Sapeaçu Painel Escolar
          </h1>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-5">
          {/* Notification Bell */}
          <button
            onClick={() => setModalNotifOpen(true)}
            className="relative p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-[#27272a] transition-colors cursor-pointer"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#121214]">
              2
            </span>
          </button>

          {/* Modo Edição Switch */}
          <div className="flex items-center gap-3">
            <span className={`text-sm font-semibold transition-colors ${isEditMode ? 'text-[#0090ff]' : 'text-zinc-400'}`}>
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
