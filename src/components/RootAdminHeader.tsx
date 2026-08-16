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
    <div className="bg-surface-1 border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-50 w-full min-w-0">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <ThemeSwitcher buttonClassName="border border-border bg-card hover:bg-muted text-foreground" />
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 dark:bg-[#7c3aed]/10 dark:text-[#a78bfa] dark:hover:bg-[#7c3aed]/20 dark:border-[#7c3aed]/30 px-3 py-1.5 rounded-lg transition-colors text-sm font-semibold cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Início Root</span>
        </button>
      </div>
    </div>
  )
}
