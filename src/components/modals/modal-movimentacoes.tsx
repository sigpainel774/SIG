'use client'

import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

interface Movimentacao {
  id: string
  data: string
  tipo: string
  descricao: string
}

interface ModalMovimentacoesProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  nomeServidor?: string
  movimentacoes?: Movimentacao[]
}

export function ModalMovimentacoes({ 
  open = false, 
  onOpenChange,
  nomeServidor = 'Servidor',
  movimentacoes = []
}: ModalMovimentacoesProps) {
  
  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[680px] bg-[#18181b] border-[#3f3f46] text-white p-0 overflow-hidden flex flex-col max-h-[88vh]">
        <div className="sticky top-0 bg-[#181818] z-10 border-b border-[#2a2a2a] p-4 flex justify-between items-start">
          <div>
            <DialogTitle className="text-white text-lg m-0">Histórico de Movimentações</DialogTitle>
            <p className="mt-1 text-[13px] text-[#aaa]">{nomeServidor}</p>
          </div>
          
          <div className="flex gap-2 items-center">
            <Button 
              onClick={() => window.print()} 
              title="Imprimir histórico"
              className="w-10 h-10 rounded-full bg-highlight text-[#050505] p-0 hover:bg-highlight/90 flex-shrink-0"
            >
              <Printer className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto">
          {movimentacoes.length === 0 ? (
            <div className="text-center text-[#aaa] py-8 text-sm border border-dashed border-[#3f3f46] rounded-md">
              Nenhuma movimentação registrada.
            </div>
          ) : (
            <div className="space-y-4">
              {movimentacoes.map((mov) => (
                <div key={mov.id} className="p-3 border border-[#3f3f46] rounded-md bg-[#1f1f23]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-highlight text-sm font-semibold">{mov.tipo}</span>
                    <span className="text-[#aaa] text-xs">{mov.data}</span>
                  </div>
                  <p className="text-sm text-white">{mov.descricao}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
