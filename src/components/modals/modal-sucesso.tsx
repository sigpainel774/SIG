'use client'

import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle } from 'lucide-react'

interface ModalSucessoProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  message?: string
}

export function ModalSucesso({ open = false, onOpenChange, message = 'Alterações salvas com sucesso' }: ModalSucessoProps) {
  
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Sucesso!"
      maxWidth="sm:max-w-[350px]"
      footer={
        <div className="w-full pt-2">
          <Button
            onClick={() => handleOpenChange(false)}
            className="w-full bg-green-500 text-black hover:bg-green-600 font-bold"
          >
            OK
          </Button>
        </div>
      }
    >
      <div className="text-center">
        <div className="flex justify-center mb-4 mt-2">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {message}
        </p>
      </div>
    </StandardDialog>
  )
}
