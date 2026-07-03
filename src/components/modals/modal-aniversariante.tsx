'use client'

import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { PartyPopper } from 'lucide-react'

interface ModalAniversarianteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  nome?: string
  orgao?: string
  dia?: string
}

export function ModalAniversariante({ 
  open = false, 
  onOpenChange,
  nome = 'Nome do Funcionário',
  orgao = 'Órgão: Escola',
  dia = 'Dia 15'
}: ModalAniversarianteProps) {
  
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#18181b] border-purple-500/50 text-white text-center">
        <DialogHeader className="flex flex-col items-center">
          <DialogTitle className="text-white text-xl m-0">Aniversariante! 🎉</DialogTitle>
        </DialogHeader>
        
        <div className="w-[110px] h-[110px] rounded-full mx-auto my-4 border-[4px] border-purple-500 flex items-center justify-center bg-[#1f1f1f] shadow-[0_4px_15px_rgba(168,85,247,0.3)]">
          <PartyPopper className="w-[50px] h-[50px] text-purple-500" />
        </div>

        <h3 className="mt-2 mb-1 text-white text-lg font-bold">{nome}</h3>
        <p className="m-0 mb-2 text-[#aaa] text-sm">{orgao}</p>
        <p className="m-0 text-highlight font-bold text-[15px]">{dia}</p>
      </DialogContent>
    </Dialog>
  )
}
