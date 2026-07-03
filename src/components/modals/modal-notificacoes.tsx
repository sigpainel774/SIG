'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Bell, History, Circle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ModalNotificacoesProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ModalNotificacoes({ open = false, onOpenChange }: ModalNotificacoesProps) {
  const router = useRouter()
  const [filtro, setFiltro] = useState('todas')

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  // Dados mocados simulando as notificações do painel antigo
  const notificacoesMock = [
    { id: 1, tipo: 'transferencia', titulo: 'Transferência Recebida', lida: false, tempo: '10 min atrás' },
    { id: 2, tipo: 'sistema', titulo: 'Bem-vindo ao SIG', lida: true, tempo: '2 horas atrás' },
  ]

  const irParaHistorico = () => {
    handleOpenChange(false)
    router.push('/historico-notificacoes')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Usando alinhamento customizado para imitar o painel lateral/top-right do legado */}
      <DialogContent className="sm:max-w-[380px] bg-[#18181b] border-[#3f3f46] text-white p-0 gap-0 overflow-hidden sm:absolute sm:top-[60px] sm:right-[20px] sm:translate-x-0 sm:translate-y-0 sm:left-auto">
        <DialogHeader className="p-4 border-b border-[#3f3f46]">
          <DialogTitle className="text-white flex items-center gap-2 m-0 text-base">
            <Bell className="w-5 h-5 text-highlight" /> 
            Notificações
          </DialogTitle>
        </DialogHeader>
        
        {/* Filtros */}
        <div className="px-4 py-3 border-b border-[#3f3f46] bg-[#121214] flex gap-2">
          <select 
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="flex-1 bg-[#27272a] border border-[#3f3f46] text-white rounded-md p-1.5 text-xs outline-none"
          >
            <option value="todas">Todas</option>
            <option value="nao_lidas">Não Lidas</option>
            <option value="transferencias">Transferências</option>
          </select>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 flex flex-col gap-2">
          {notificacoesMock.map((notif) => (
            <div 
              key={notif.id} 
              className={`p-3 rounded-lg border flex gap-3 cursor-pointer transition-colors ${notif.lida ? 'bg-transparent border-transparent hover:bg-[#27272a]' : 'bg-[#27272a]/50 border-[#3ea6ff]/30 hover:bg-[#27272a]'}`}
            >
              <div className="pt-1">
                {!notif.lida && <Circle className="w-2 h-2 fill-[#3ea6ff] text-[#3ea6ff]" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white mb-1">{notif.titulo}</p>
                <p className="text-xs text-[#aaa]">{notif.tempo}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Link Histórico */}
        <div className="p-3 border-t border-[#3f3f46] bg-[#121214] flex justify-center items-center">
          <Button 
            variant="ghost" 
            onClick={irParaHistorico}
            className="w-full border border-dashed border-[#3ea6ff] text-[#3ea6ff] hover:bg-[#3ea6ff]/10 hover:text-[#3ea6ff] rounded-md h-auto py-2 text-xs font-semibold gap-2"
          >
            <History className="w-3.5 h-3.5" /> Ver Histórico Completo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
