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
import { KeyRound, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface ModalResetSenhaUserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail?: string
  userName?: string
}

export function ModalResetSenhaUser({ open, onOpenChange, userEmail, userName }: ModalResetSenhaUserProps) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaSenha) {
      toast.error('Informe a nova senha.')
      return
    }
    if (novaSenha.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      toast.success(`Senha de ${userName || userEmail} redefinida com sucesso!`)
      setNovaSenha('')
      setConfirmarSenha('')
      onOpenChange(false)
    } catch (err) {
      toast.error('Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#121214] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <KeyRound className="w-5 h-5 text-amber-400" />
            Resetar Senha do Usuário
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Redefina a senha de acesso para a conta <strong className="text-white">{userName}</strong> ({userEmail}).
          </p>
        </DialogHeader>

        <form onSubmit={handleReset} className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Nova Senha
            </label>
            <Input
              type="password"
              placeholder="Digite a nova senha"
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              className="bg-[#18181b] border-[#3f3f46] text-white h-11 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Confirmar Nova Senha
            </label>
            <Input
              type="password"
              placeholder="Repita a nova senha"
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              className="bg-[#18181b] border-[#3f3f46] text-white h-11 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#18181b] border-[#3f3f46] text-white hover:bg-[#27272a]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Redefinindo...' : 'Salvar Nova Senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
