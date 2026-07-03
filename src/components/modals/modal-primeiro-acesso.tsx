'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, ShieldAlert, Check } from 'lucide-react'
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#121212] border border-amber-500/40 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-400">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            Primeiro Acesso — Troca Obrigatória de Senha
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Sua conta utilizou uma senha provisória enviada pela administração. Por motivos de segurança, cadastre sua senha definitiva para continuar.
          </p>

          <div>
            <Label>Nova Senha Definitiva</Label>
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="bg-[#181818] border-borderCustom text-white mt-1"
              required
            />
          </div>

          <div>
            <Label>Confirme a Nova Senha</Label>
            <Input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite novamente a senha"
              className="bg-[#181818] border-borderCustom text-white mt-1"
              required
            />
          </div>

          <DialogFooter className="pt-4 border-t border-borderCustom">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Salvando Senha...' : 'Salvar Nova Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
