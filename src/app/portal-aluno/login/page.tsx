'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { GraduationCap, Mail, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function PortalAlunoLoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha seu e-mail e senha para entrar.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (error) {
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          toast.error('E-mail ou senha incorretos. Verifique suas credenciais com a secretaria da escola.')
        } else {
          toast.error(error.message)
        }
        return
      }

      const user = data.user
      if (user?.user_metadata?.must_change_password) {
        toast.info('Primeiro acesso detectado! Por favor, defina sua nova senha pessoal.')
        router.push('/portal-aluno/trocar-senha')
      } else {
        toast.success('Bem-vindo(a) ao Portal do Aluno!')
        router.push('/portal-aluno/dashboard')
      }
    } catch (err: any) {
      console.error('Erro ao autenticar responsável:', err)
      toast.error('Erro ao conectar ao portal. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Cabeçalho de Identificação */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Portal do Aluno & Responsáveis
          </h1>
          <p className="text-xs text-muted-foreground">
            Acompanhe o boletim, frequência diária e comunicados da escola
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="bg-card border border-border text-card-foreground rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-foreground">
                Seu E-mail Cadastrado
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  required
                  className="pl-9 bg-background border-border text-sm text-foreground focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-foreground">
                Senha de Acesso
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-9 bg-background border-border text-sm text-foreground focus:border-indigo-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-10 gap-2 shadow-lg shadow-indigo-600/25 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  Entrar no Portal
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <div className="pt-4 border-t border-border text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Acesso restrito a pais e responsáveis cadastrados</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Primeiro acesso ou esqueceu a senha? Solicite as credenciais presencialmente na secretaria da escola do seu filho.
            </p>
          </div>
        </div>

        {/* Rodapé institucional */}
        <p className="text-center text-xs text-muted-foreground">
          SIG — Sistema Integrado de Gestão Escolar Municipal
        </p>
      </div>
    </div>
  )
}
