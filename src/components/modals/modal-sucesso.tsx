'use client'

import { 
  Dialog, 
  DialogContent,
} from '@/components/ui/dialog'
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[350px] bg-[#121212] border-green-500 text-center p-6 border shadow-2xl">
        <div className="flex justify-center mb-4 mt-2">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Sucesso!</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          {message}
        </p>
        <Button
          onClick={() => handleOpenChange(false)}
          className="w-full bg-green-500 text-black hover:bg-green-600 font-bold"
        >
          OK
        </Button>
      </DialogContent>
    </Dialog>
  )
}
