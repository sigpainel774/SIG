'use client'

import { useState, useRef, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, Sparkles, Copy, Check, Eye, EyeOff, ShieldCheck, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { sanitizeEmail } from '@/lib/stringUtils'

interface ModalCreateAuthUserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  funcionarioId?: string
  userName?: string
  userEmail?: string
  cargo?: string
  escolaNome?: string
  onSuccess?: (authUserId: string, novoEmail: string) => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ModalCreateAuthUser({
  open,
  onOpenChange,
  funcionarioId,
  userName,
  userEmail,
  cargo,
  escolaNome,
  onSuccess,
}: ModalCreateAuthUserProps) {
  const [emailInput, setEmailInput] = useState('')
  const [senhaProvisoria, setSenhaProvisoria] = useState('')
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

  // Inicializar e-mail ao abrir o modal
  useEffect(() => {
    if (open) {
      const initialEmail = userEmail && EMAIL_REGEX.test(userEmail.trim()) ? userEmail.trim().toLowerCase() : ''
      setEmailInput(initialEmail)
      
      // Gerar senha provisória automática por padrão
      const randomDigits = Math.floor(1000 + Math.random() * 9000)
      const senhaGerada = `Sig#${randomDigits}`
      setSenhaProvisoria(senhaGerada)
      setConfirmarSenha(senhaGerada)
      setConfirmStep(false)
      setShowPassword(false)
    }
  }, [open, userEmail])

  const handleGerarSenhaProvisoria = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000)
    const senhaGerada = `Sig#${randomDigits}`
    setSenhaProvisoria(senhaGerada)
    setConfirmarSenha(senhaGerada)
    toast.info(`Senha provisória "${senhaGerada}" gerada com sucesso!`)
  }

  const handleCopySenha = async () => {
    if (!senhaProvisoria) return
    try {
      await navigator.clipboard.writeText(senhaProvisoria)
      setCopied(true)
      toast.success('Senha provisória copiada para a área de transferência!')
      setTimeout(() => {
        if (isMounted.current) setCopied(false)
      }, 2000)
    } catch {
      toast.error('Não foi possível copiar automaticamente.')
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!funcionarioId) {
      toast.error('Identificador do funcionário não localizado.')
      return
    }

    const cleanEmail = emailInput.trim().toLowerCase()
    if (!cleanEmail) {
      toast.error('Informe um e-mail de acesso válido.')
      return
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast.error('O formato do e-mail é inválido.')
      return
    }

    if (!senhaProvisoria || senhaProvisoria.length < 6) {
      toast.error('A senha provisória deve conter pelo menos 6 caracteres.')
      return
    }

    if (senhaProvisoria !== confirmarSenha) {
      toast.error('As senhas não coincidem.')
      return
    }

    if (!confirmStep) {
      setConfirmStep(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/create-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funcionarioId,
          email: cleanEmail,
          senhaProvisoria,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao criar conta de acesso.')
      }

      toast.success(result.message || `Conta de ${userName ?? cleanEmail} criada com sucesso!`)

      if (onSuccess && result.authUserId) {
        onSuccess(result.authUserId, cleanEmail)
      }

      if (isMounted.current) {
        handleClose(false)
      }
    } catch (err: any) {
      console.error('[ModalCreateAuthUser] Erro ao criar conta de acesso:', err)
      toast.error(err?.message || 'Erro ao processar criação de conta autoconfirmada.')
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      setSenhaProvisoria('')
      setConfirmarSenha('')
      setConfirmStep(false)
      setShowPassword(false)
    }
    onOpenChange(newOpen)
  }

  const hasValidInitialEmail = userEmail && EMAIL_REGEX.test(userEmail.trim())

  return (
    <StandardDialog
      open={open}
      onOpenChange={handleClose}
      title="Criar Usuário Autoconfirmado"
      description={`Provisione o acesso imediato ao SIG para o servidor ${userName ?? ''}.`}
      maxWidth="sm:max-w-md"
    >
      {/* Cabeçalho de Destaque / Identificação */}
      <div className="flex items-center justify-between gap-2 mb-4 bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl">
        <div className="flex items-center gap-2 text-emerald-400">
          <UserPlus className="w-5 h-5 shrink-0" />
          <div className="leading-tight">
            <span className="font-bold text-xs uppercase tracking-wider block">Novo Acesso de Servidor</span>
            <span className="text-[11px] text-emerald-300/80 font-normal">Autoconfirmado sem link por e-mail</span>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleGerarSenhaProvisoria}
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs gap-1.5 h-8 px-2.5 rounded-lg shrink-0 cursor-pointer shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 fill-black" />
          <span>Gerar Nova</span>
        </Button>
      </div>

      {/* Resumo do Funcionário */}
      <div className="bg-surface-2 border border-borderCustom rounded-xl p-3 mb-4 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Servidor:</span>
          <span className="font-bold text-foreground max-w-[240px] truncate" title={userName}>
            {userName ?? 'Não informado'}
          </span>
        </div>
        {cargo && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cargo:</span>
            <span className="font-semibold text-foreground">{cargo}</span>
          </div>
        )}
        {escolaNome && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lotação:</span>
            <span className="font-semibold text-foreground max-w-[240px] truncate" title={escolaNome}>
              {escolaNome}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleCreateSubmit} className="space-y-4">
        {/* Campo de E-mail */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            E-mail de Login {hasValidInitialEmail ? '(Cadastrado)' : '(Obrigatório)'}
          </label>
          <div className="relative">
            <Input
              type="email"
              placeholder="ex: servidor@escola.gov.br"
              value={emailInput}
              onChange={e => {
                setEmailInput(sanitizeEmail(e.target.value))
                if (confirmStep) setConfirmStep(false)
              }}
              className="bg-background border-[#3f3f46] text-foreground h-11 pr-10 focus:ring-emerald-500 focus:border-emerald-500 font-mono text-sm"
              required
            />
            <Mail className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
          </div>
          {!hasValidInitialEmail && (
            <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              O cadastro do servidor não possuía e-mail válido. Digite o e-mail oficial acima.
            </p>
          )}
        </div>

        {/* Senha Provisória */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
              Senha Provisória
            </label>

            {senhaProvisoria && (
              <button
                type="button"
                onClick={handleCopySenha}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiada!' : 'Copiar Senha'}
              </button>
            )}
          </div>

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite ou gere a senha provisória"
              value={senhaProvisoria}
              onChange={e => {
                setSenhaProvisoria(e.target.value)
                if (confirmStep) setConfirmStep(false)
              }}
              className="bg-background border-[#3f3f46] text-foreground h-11 pr-10 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
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

        {/* Confirmar Senha Provisória */}
        <div>
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            Confirmar Senha Provisória
          </label>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Repita a senha provisória"
            value={confirmarSenha}
            onChange={e => {
              setConfirmarSenha(e.target.value)
              if (confirmStep) setConfirmStep(false)
            }}
            className="bg-background border-[#3f3f46] text-foreground h-11 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
            required
          />
        </div>

        {/* Confirmação Pré-Criação */}
        {confirmStep && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs leading-relaxed animate-in fade-in duration-200">
            <strong className="block font-bold text-emerald-200 mb-0.5">🛡️ Confirmar criação imediata:</strong>
            A conta para <strong className="text-white">{userName ?? emailInput}</strong> será criada e ativada imediatamente com a senha informada. O servidor deverá cadastrar uma nova senha no primeiro acesso.
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
            disabled={loading || !emailInput || !senhaProvisoria || !confirmarSenha}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando Acesso...
              </>
            ) : confirmStep ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                Confirmar Criação
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Criar Acesso Imediato
              </>
            )}
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
