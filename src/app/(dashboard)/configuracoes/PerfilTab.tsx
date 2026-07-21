'use client'

import { useState } from 'react'
import { User, Lock, ChevronDown, Save, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface PerfilTabProps {
  nome: string
  email: string
  cargo: string
  status: string
  mounted: boolean
}

function ProfileField({
  label,
  value,
  strong,
  badge,
  isStatus,
}: {
  label: string
  value: string
  strong?: boolean
  badge?: boolean
  isStatus?: boolean
}) {
  return (
    <div>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {badge || isStatus ? (
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide',
            isStatus
              ? value.toLowerCase() === 'ativo'
                ? 'bg-emerald-50 border-emerald-200/50 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800/50 dark:text-emerald-400'
                : 'bg-zinc-50 border-zinc-200/50 text-zinc-700 dark:bg-zinc-800/40 dark:border-zinc-700/50 dark:text-zinc-400'
              : 'bg-blue-50 border-blue-200/50 text-[#185FA5] dark:bg-blue-950/40 dark:border-blue-800/50 dark:text-blue-400'
          )}
        >
          {isStatus && (
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full mr-1.5',
                value.toLowerCase() === 'ativo' ? 'bg-emerald-500' : 'bg-zinc-500'
              )}
            />
          )}
          {value}
        </span>
      ) : (
        <span className={strong ? 'text-base font-semibold text-foregroundCustom' : 'text-sm text-foregroundCustom'}>
          {value}
        </span>
      )}
    </div>
  )
}

export function PerfilTab({ nome, email, cargo, status, mounted }: PerfilTabProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  const handleUpdatePassword = async () => {
    if (novaSenha.length < 6) {
      toast.error('A senha deve conter no mínimo 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem.')
      return
    }

    setUpdating(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      })

      if (error) {
        toast.error(`Erro ao atualizar senha: ${error.message}`)
        setUpdating(false)
        return
      }

      toast.success('Senha atualizada com sucesso!')
      setNovaSenha('')
      setConfirmarSenha('')
      setShowPassword(false)
    } catch (err) {
      console.error(err)
      toast.error('Erro inesperado ao atualizar a senha.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Ficha Funcional */}
      <Card className="border-[0.5px] border-borderCustom bg-card p-5">
        <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom/50 pb-4 text-lg font-semibold text-foregroundCustom">
          <User className="h-5 w-5 text-[#185FA5] dark:text-[#3ea6ff]" />
          Dados da Ficha Funcional
        </h2>
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-input text-foregroundCustom border border-borderCustom">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <ProfileField label="Nome Completo" value={mounted ? nome : 'Carregando...'} strong />
            <ProfileField label="E-mail" value={mounted ? email : 'Carregando...'} />
            <ProfileField label="Cargo" value={mounted ? cargo : 'Carregando...'} badge />
            <ProfileField label="Status" value={mounted ? status : 'Carregando...'} isStatus />
          </div>
        </div>
      </Card>

      {/* Alerta de segurança */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-800 dark:text-blue-100 flex items-start gap-3">
        <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
        <div>
          <h3 className="font-semibold text-sm">Recomendações de Segurança</h3>
          <p className="text-xs leading-5 mt-1 text-muted-foreground">
            Se este é seu primeiro acesso usando uma senha padrão fornecida pela secretaria, crie uma senha forte e pessoal.
          </p>
        </div>
      </div>

      {/* Alterar Senha */}
      <Card className="border-borderCustom bg-card p-6">
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className={cn(
            'flex w-full items-center justify-between gap-3 text-left text-lg font-semibold text-foregroundCustom cursor-pointer',
            showPassword ? 'border-b border-borderCustom pb-4' : ''
          )}
        >
          <span className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-highlight" />
            Alterar Senha de Acesso
          </span>
          <ChevronDown
            className={cn('h-5 w-5 text-muted-foreground transition-transform', showPassword ? 'rotate-180' : '')}
          />
        </button>

        {showPassword && (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Nova Senha</label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  disabled={updating}
                  className="bg-input"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-muted-foreground">Confirmar Nova Senha</label>
                <Input
                  type="password"
                  placeholder="Digite a nova senha novamente"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  disabled={updating}
                  className="bg-input"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleUpdatePassword}
                disabled={updating}
                className="bg-highlight text-background hover:bg-highlight/90 font-medium"
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Atualizar Senha
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
