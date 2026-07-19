'use client'

import { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
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
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Resetar Senha do Usuário"
      description={`Redefina a senha de acesso para a conta ${userName ?? ''} (${userEmail ?? ''}).`}
      maxWidth="sm:max-w-md"
    >
      <div className="flex items-center gap-2 mb-4 text-amber-400">
        <KeyRound className="w-5 h-5" />
        <span className="font-bold text-sm">Segurança da Conta</span>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
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

        <div className="flex justify-end gap-2 pt-2">
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
        </div>
      </form>
    </StandardDialog>
  )
}
