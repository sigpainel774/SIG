'use client'

import { ArrowLeftRight, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

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
    <PageHeader
      title="Central de Transferências"
      description="Gestão unificada de fluxo de entradas (Recebimentos) e saídas (Submissões) de alunos e funcionários."
      icon={ArrowLeftRight}
      iconVariant="primary"
      backHref="/home"
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onRefresh} 
            disabled={loading}
            className="bg-[#121212] border-[#3f3f46] text-white hover:bg-[#27272a] h-10"
            title="Atualizar dados"
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
              className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white font-semibold gap-2 h-10 px-4 rounded-xl shadow-md border-none cursor-pointer text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Transferência</span>
            </Button>
          )}
        </div>
      }
    />
  )
}

