'use client'

import { useState, useRef, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KeyRound, Lock, Sparkles, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface ModalResetSenhaUserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail?: string
  userName?: string
  authUserId?: string | null
  funcionarioId?: string
}

export function ModalResetSenhaUser({
  open,
  onOpenChange,
  userEmail,
  userName,
  authUserId,
  funcionarioId,
}: ModalResetSenhaUserProps) {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const handleGerarSenhaProvisoria = () => {
    // Gerar senha provisória aleatória de 8 caracteres (ex: Sig#8492)
    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    const senhaGerada = `Sig#${randomDigits}`
    setNovaSenha(senhaGerada)
    setConfirmarSenha(senhaGerada)
    toast.info(`Senha provisória "${senhaGerada}" gerada e preenchida!`)
  }

  const handleCopySenha = async () => {
    if (!novaSenha) return
    try {
      await navigator.clipboard.writeText(novaSenha)
      setCopied(true)
      toast.success('Senha copiada para a área de transferência!')
      setTimeout(() => {
        if (isMounted.current) setCopied(false)
      }, 2000)
    } catch {
      toast.error('Não foi possível copiar automaticamente.')
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!authUserId) {
      toast.error('O usuário selecionado não possui uma conta de autenticação (auth_user_id) vinculada.')
      return
    }

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

    if (!confirmStep) {
      setConfirmStep(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId,
          funcionarioId,
          novaSenha,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao redefinir a senha.')
      }

      toast.success(result.message || `Senha de ${userName || userEmail} redefinida com sucesso!`)

      if (isMounted.current) {
        setNovaSenha('')
        setConfirmarSenha('')
        setConfirmStep(false)
        onOpenChange(false)
      }
    } catch (err: any) {
      console.error('[ModalResetSenhaUser] Erro ao redefinir senha:', err)
      toast.error(err?.message || 'Erro ao redefinir a senha do usuário.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setNovaSenha('')
      setConfirmarSenha('')
      setConfirmStep(false)
      setShowPassword(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={handleClose}
      title="Resetar Senha do Usuário"
      description={`Redefina a senha de acesso para a conta ${userName ?? ''} (${userEmail ?? ''}).`}
      maxWidth="sm:max-w-md"
    >
      <div className="flex items-center justify-between gap-2 mb-4 bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl">
        <div className="flex items-center gap-2 text-amber-400">
          <KeyRound className="w-5 h-5 shrink-0" />
          <span className="font-bold text-xs uppercase tracking-wider">Redefinição Administrativa</span>
        </div>

        <Button
          type="button"
          onClick={handleGerarSenhaProvisoria}
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5 h-8 px-2.5 rounded-lg shrink-0 cursor-pointer shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 fill-black" />
          <span>Gerar Provisória</span>
        </Button>
      </div>

      <form onSubmit={handleResetSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Nova Senha
            </label>

            {novaSenha && (
              <button
                type="button"
                onClick={handleCopySenha}
                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiada!' : 'Copiar'}
              </button>
            )}
          </div>

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite ou gere a nova senha"
              value={novaSenha}
              onChange={e => {
                setNovaSenha(e.target.value)
                if (confirmStep) setConfirmStep(false)
              }}
              className="bg-background border-[#3f3f46] text-foreground h-11 pr-10 focus:ring-amber-500 focus:border-amber-500 font-mono"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            Confirmar Nova Senha
          </label>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Repita a nova senha"
            value={confirmarSenha}
            onChange={e => {
              setConfirmarSenha(e.target.value)
              if (confirmStep) setConfirmStep(false)
            }}
            className="bg-background border-[#3f3f46] text-foreground h-11 focus:ring-amber-500 focus:border-amber-500 font-mono"
            required
          />
        </div>

        {confirmStep && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs leading-relaxed animate-in fade-in duration-200">
            <strong className="block font-bold text-amber-200 mb-0.5">⚠️ Confirmar alteração de senha:</strong>
            A senha da conta de <strong className="text-white">{userName || userEmail}</strong> será redefinida imediatamente e a flag de primeiro acesso será ativada.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={loading}
            className="bg-background border-[#3f3f46] text-foreground hover:bg-muted"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={loading || !novaSenha || !confirmarSenha}
            className={`${
              confirmStep
                ? 'bg-mutedmerald-600 hover:bg-mutedmerald-700 text-white font-bold'
                : 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
            } gap-2`}
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Redefinindo...' : confirmStep ? 'Confirmar e Salvar' : 'Salvar Nova Senha'}
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
