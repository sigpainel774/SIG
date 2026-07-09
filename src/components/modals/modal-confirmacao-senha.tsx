'use client'

import { useState, useEffect } from 'react'
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
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'

interface ModalConfirmacaoSenhaProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function ModalConfirmacaoSenha({ open = false, onOpenChange, onSuccess }: ModalConfirmacaoSenhaProps) {
  const [senha, setSenha] = useState('')

  useEffect(() => {
    if (open) {
      setSenha('')
    }
  }, [open])

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  const [loading, setLoading] = useState(false)
  const { funcionario } = useAuthStore()

  const handleConfirmar = async () => {
    if (!senha.trim()) {
      toast.error('Digite a senha para confirmar.')
      return
    }
    
    if (!funcionario?.email) {
      toast.error('Usuário não identificado.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: funcionario.email,
      password: senha
    })
    setLoading(false)

    if (error) {
      toast.error('Senha incorreta.')
      return
    }

    toast.success('Modo edição ativado com sucesso!')
    handleOpenChange(false)
    setSenha('')
    if (onSuccess) onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#18181b] border-[#3f3f46] text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2 m-0 text-lg">
            <Lock className="w-5 h-5 text-[#0090ff]" /> Ativar Modo Edição
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-[#aaa] text-sm mb-2 leading-relaxed">
          Para alternar para o modo de edição, confirme sua senha de login.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); handleConfirmar(); }} className="space-y-4">
          {/* Campo oculto de username para evitar que o navegador auto-preencha inputs da página de fundo */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={funcionario?.email || ''}
            readOnly
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            tabIndex={-1}
          />

          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Senha do usuário"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoFocus
            className="bg-[#121212] border-[#3f3f46] text-white h-12 focus:ring-[#0090ff] focus:border-[#0090ff]"
          />

          <Button 
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#0090ff] text-white hover:bg-[#0070f3] font-bold mt-2"
          >
            {loading ? 'Confirmando...' : 'Confirmar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
