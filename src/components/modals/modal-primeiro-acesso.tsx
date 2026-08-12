'use client'

import { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, ShieldAlert, Check, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface ModalPrimeiroAcessoProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export function ModalPrimeiroAcesso({ open = false, onOpenChange, onSuccess }: ModalPrimeiroAcessoProps) {
  const [loading, setLoading] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaSenha || novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas digitadas não coincidem.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Sua senha definitiva foi salva com sucesso!')
      handleOpenChange(false)
      if (onSuccess) onSuccess()
    }, 1000)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Primeiro Acesso — Troca Obrigatória de Senha"
      description="Sua conta utilizou uma senha provisória enviada pela administração. Por motivos de segurança, cadastre sua senha definitiva para continuar."
      maxWidth="sm:max-w-md"
      footer={
        <div className="flex justify-end w-full pt-4 border-t border-border">
          <Button
            type="submit"
            form="form-primeiro-acesso"
            disabled={loading}
            className="w-full bg-mutedmerald-600 hover:bg-mutedmerald-700 text-white font-bold gap-2 cursor-pointer shadow"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Salvando Senha...' : 'Salvar Nova Senha'}
          </Button>
        </div>
      }
    >
      <form id="form-primeiro-acesso" onSubmit={handleSubmit} className="space-y-4 py-2">
        <p className="text-sm text-muted-foreground">
          Sua conta utilizou uma senha provisória enviada pela administração. Por motivos de segurança, cadastre sua senha definitiva para continuar.
        </p>

        <div>
          <Label className="text-xs font-medium text-muted-foreground">Nova Senha Definitiva</Label>
          <div className="relative mt-1">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="bg-background pr-10"
              required
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
        </div>

        <div>
          <Label className="text-xs font-medium text-muted-foreground">Confirme a Nova Senha</Label>
          <div className="relative mt-1">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite novamente a senha"
              className="bg-background pr-10"
              required
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
        </div>
      </form>
    </StandardDialog>
  )
}
