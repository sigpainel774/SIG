'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'

interface ModalConfirmacaoSenhaProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function ModalConfirmacaoSenha({ open = false, onOpenChange, onSuccess }: ModalConfirmacaoSenhaProps) {
  const [senha, setSenha] = useState('')

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  const handleConfirmar = () => {
    if (!senha) {
      toast.error('Digite a senha para confirmar.')
      return
    }
    
    // Simulação
    if (senha === 'painel' || senha === 'admin') {
      toast.success('Modo edição ativado com sucesso!')
      handleOpenChange(false)
      setSenha('')
      if (onSuccess) onSuccess()
    } else {
      toast.error('Senha incorreta!')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirmar()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#18181b] border-[#3f3f46] text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 m-0 text-lg">
            <Lock className="w-5 h-5 text-highlight" /> Ativar Modo Edição
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-[#aaa] text-sm mb-2 leading-relaxed">
          Para alternar para o modo de edição, confirme sua senha de login.
        </p>

        <Input
          type="password"
          placeholder="Senha do usuário"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-[#121212] border-[#3f3f46] text-white h-12"
        />

        <Button 
          onClick={handleConfirmar}
          className="w-full h-12 bg-highlight text-black hover:bg-highlight/90 font-bold mt-2"
        >
          Confirmar
        </Button>
      </DialogContent>
    </Dialog>
  )
}
