'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowLeftRight, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TransferenciasHeaderProps {
  loading: boolean
  isEditMode: boolean
  activeTab: 'alunos' | 'funcionarios'
  onRefresh: () => Promise<any>
  onOpenFuncionarioModal: () => void
  routerPush: (path: string) => void
}

export function TransferenciasHeader({
  loading,
  isEditMode,
  activeTab,
  onRefresh,
  onOpenFuncionarioModal,
  routerPush
}: TransferenciasHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#3f3f46]">
      <div>
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="p-2.5 rounded-2xl bg-[#e0f2fe] text-[#185FA5] dark:bg-[#1b253b] dark:text-[#3ea6ff] border-[0.5px] border-[#3f3f46] shadow-sm flex items-center justify-center">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Central de Transferências</h1>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm mt-2 ml-1">
          Gestão unificada de fluxo de entradas (Recebimentos) e saídas (Submissões) de alunos e funcionários.
        </p>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={onRefresh} 
          disabled={loading}
          className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a] h-11"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        {isEditMode && (
          <Button
            onClick={() => {
              if (activeTab === 'alunos') {
                routerPush('/alunos/transferencia')
              } else {
                onOpenFuncionarioModal()
              }
            }}
            className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white font-semibold gap-2 h-11 px-4 rounded-xl shadow-md border-none cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Transferência</span>
          </Button>
        )}
      </div>
    </div>
  )
}
