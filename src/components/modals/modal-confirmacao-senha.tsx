'use client'

import { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Eye, EyeOff } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (open) {
      setSenha('')
      setShowPassword(false)
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
    <StandardDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Ativar Modo Edição"
      maxWidth="sm:max-w-[400px]"
    >
      <div className="flex items-center gap-2 mb-2 text-primary">
        <Lock className="w-5 h-5" />
        <span className="font-bold text-sm">Confirmação de Identidade</span>
      </div>
      
      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
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

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            placeholder="Senha do usuário"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoFocus
            className="h-12 pr-10 focus:ring-primary focus:border-primary font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
            tabIndex={-1}
            title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <Button 
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold mt-2 cursor-pointer shadow"
        >
          {loading ? 'Confirmando...' : 'Confirmar'}
        </Button>
      </form>
    </StandardDialog>
  )
}
