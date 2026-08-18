'use client'

import { useState, useRef, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ModalUpdateEmailUserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail?: string
  userName?: string
  authUserId?: string | null
  funcionarioId?: string
  onSuccess?: (newEmail: string) => void
}

export function ModalUpdateEmailUser({
  open,
  onOpenChange,
  userEmail,
  userName,
  authUserId,
  funcionarioId,
  onSuccess,
}: ModalUpdateEmailUserProps) {
  const [novoEmail, setNovoEmail] = useState('')
  const [confirmarEmail, setConfirmarEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!funcionarioId) {
      toast.error('Identificador do funcionário não fornecido.')
      return
    }

    const cleanNovo = novoEmail.trim().toLowerCase()
    const cleanConfirm = confirmarEmail.trim().toLowerCase()

    if (!cleanNovo) {
      toast.error('Informe o novo e-mail.')
      return
    }

    if (!EMAIL_REGEX.test(cleanNovo)) {
      toast.error('Formato de e-mail inválido. Exemplo: usuario@escola.gov.br')
      return
    }

    if (cleanNovo === userEmail?.trim().toLowerCase()) {
      toast.error('O novo e-mail deve ser diferente do e-mail atual.')
      return
    }

    if (cleanNovo !== cleanConfirm) {
      toast.error('Os e-mails informados não coincidem.')
      return
    }

    if (!confirmStep) {
      setConfirmStep(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authUserId,
          funcionarioId,
          novoEmail: cleanNovo,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao alterar o e-mail de acesso.')
      }

      toast.success(result.message || 'E-mail de acesso alterado com sucesso!')

      if (onSuccess) {
        onSuccess(cleanNovo)
      }

      if (isMounted.current) {
        setNovoEmail('')
        setConfirmarEmail('')
        setConfirmStep(false)
        onOpenChange(false)
      }
    } catch (err: any) {
      console.error('[ModalUpdateEmailUser] Erro ao alterar e-mail:', err)
      toast.error(err?.message || 'Erro inesperado ao alterar o e-mail.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setNovoEmail('')
      setConfirmarEmail('')
      setConfirmStep(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={handleClose}
      title="Alterar E-mail de Acesso"
      description={`Modifique o e-mail de autenticação e cadastro de ${userName ?? 'usuário'}.`}
      maxWidth="sm:max-w-md"
    >
      <div className="flex items-center justify-between gap-2 mb-4 bg-sky-950/40 border border-sky-500/30 p-3 rounded-xl">
        <div className="flex items-center gap-2 text-sky-400">
          <Mail className="w-5 h-5 shrink-0" />
          <span className="font-bold text-xs uppercase tracking-wider">Credencial de Login</span>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-xl bg-surface-2 border border-borderCustom space-y-1">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
          E-mail Atual de Acesso:
        </span>
        <div className="font-mono text-sm text-foreground break-all font-semibold">
          {userEmail || 'Nenhum e-mail cadastrado'}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            Novo E-mail de Acesso
          </label>
          <Input
            type="email"
            placeholder="ex: novoemail@escola.gov.br"
            value={novoEmail}
            onChange={(e) => {
              setNovoEmail(e.target.value)
              if (confirmStep) setConfirmStep(false)
            }}
            className="bg-background border-[#3f3f46] text-foreground h-11 focus:ring-sky-500 focus:border-sky-500 font-mono text-sm"
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            Confirmar Novo E-mail
          </label>
          <Input
            type="email"
            placeholder="Repita o novo e-mail"
            value={confirmarEmail}
            onChange={(e) => {
              setConfirmarEmail(e.target.value)
              if (confirmStep) setConfirmStep(false)
            }}
            className="bg-background border-[#3f3f46] text-foreground h-11 focus:ring-sky-500 focus:border-sky-500 font-mono text-sm"
            required
            autoComplete="off"
          />
        </div>

        {confirmStep && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs leading-relaxed animate-in fade-in duration-200 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong className="block font-bold text-amber-200 mb-0.5">⚠️ Confirmação de Alteração:</strong>
              O login de <strong className="text-white">{userName || userEmail}</strong> será atualizado para{' '}
              <strong className="text-sky-300 font-mono">{novoEmail.trim().toLowerCase()}</strong>. A conta passará a exigir este novo e-mail para acesso ao sistema.
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={loading}
            className="bg-background border-[#3f3f46] text-foreground hover:bg-muted cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={loading || !novoEmail || !confirmarEmail}
            className={`${
              confirmStep
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                : 'bg-sky-600 hover:bg-sky-700 text-white font-bold'
            } gap-2 cursor-pointer`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : confirmStep ? (
              <>
                <span>Confirmar e Salvar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>Salvar Novo E-mail</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
