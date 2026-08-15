'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { KeyRound, Lock, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TrocarSenhaResponsavelPage() {
  const router = useRouter()
  const supabase = createClient()

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTrocarSenha = async (e: React.FormEvent) => {
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
    try {
      // 1. Atualizar a senha no Supabase Auth e desmarcar must_change_password
      const { data, error } = await supabase.auth.updateUser({
        password: novaSenha,
        data: {
          must_change_password: false
        }
      })

      if (error) throw error

      // 2. Atualizar flag must_change_password na tabela public.responsaveis
      if (data.user) {
        const { error: updateError } = await supabase
          .from('responsaveis')
          .update({ must_change_password: false })
          .eq('auth_user_id', data.user.id)

        if (updateError) {
          console.error('Aviso ao sincronizar tabela responsaveis:', updateError)
        }
      }

      toast.success('Senha alterada com sucesso! Redirecionando para o Portal...')
      router.push('/portal-aluno/dashboard')
    } catch (err: any) {
      console.error('Erro ao trocar senha do responsável:', err)
      toast.error(err.message || 'Erro ao redefinir sua senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <KeyRound className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Definir Nova Senha
          </h1>
          <p className="text-xs text-muted-foreground">
            Por motivos de segurança, você precisa criar uma senha pessoal definitiva no seu primeiro acesso
          </p>
        </div>

        <div className="bg-card border border-border text-card-foreground rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <form onSubmit={handleTrocarSenha} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha" className="text-xs font-medium text-foreground">
                Nova Senha Pessoal <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  required
                  minLength={6}
                  className="pl-9 bg-background border-border text-sm text-foreground focus:border-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmarSenha" className="text-xs font-medium text-foreground">
                Confirmar Nova Senha <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                  className="pl-9 bg-background border-border text-sm text-foreground focus:border-amber-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold h-10 gap-2 shadow-lg shadow-amber-600/25 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando Nova Senha...
                </>
              ) : (
                <>
                  Salvar e Acessar Portal
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>Guarde bem sua nova senha. Ela será necessária para os próximos acessos pelo celular ou computador.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
