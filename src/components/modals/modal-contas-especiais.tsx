'use client'

import { StandardDialog } from '@/components/ui/standard-dialog'
import { ContasEspeciaisView } from '@/components/permissoes/ContasEspeciaisView'
import { usePermissoes } from '@/components/permissoes/usePermissoes'

interface ModalContasEspeciaisProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ModalContasEspeciais({ open, onOpenChange }: ModalContasEspeciaisProps) {
  const hook = usePermissoes()

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gestão de Contas Especiais"
      description="Sinalize contas administrativas ou de teste para que não apareçam na listagem de funcionários nem nos relatórios do sistema."
      maxWidth="sm:max-w-4xl"
    >
      <div className="py-2 max-h-[80vh] overflow-y-auto pr-1">
        <ContasEspeciaisView hook={hook} />
      </div>
    </StandardDialog>
  )
}
