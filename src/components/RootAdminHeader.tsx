'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Home } from 'lucide-react'
import { useEditModeStore } from '@/store/useEditModeStore'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

export function RootAdminHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { setEditMode } = useEditModeStore()

  useEffect(() => {
    setEditMode(true)
  }, [setEditMode])

  // Não mostrar na página inicial do painel root
  if (pathname === '/admin' || pathname === '/root') {
    return null
  }

  return (
    <div className="bg-surface-1 border-b border-borderCustom px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <ThemeSwitcher buttonClassName="border border-[#7c3aed]/20 bg-[#141416]" />
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 bg-[#7c3aed]/10 text-[#a78bfa] hover:bg-[#7c3aed]/20 border border-[#7c3aed]/30 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold"
        >
          <Home className="w-4 h-4" />
          <span>Início Root</span>
        </button>
      </div>
    </div>
  )
}

