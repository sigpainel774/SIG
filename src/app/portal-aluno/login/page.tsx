'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  GraduationCap,
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const AZUL = '#0B4FB3'
const LARANJA = '#F47C12'

export default function PortalAlunoLoginPage() {
  const router = useRouter()
  // ES-07: createClient estável com useMemo
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  // ES-18: toggle de visibilidade da senha
  const [showPassword, setShowPassword] = useState(false)

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
        password,
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

      // ES-15: Validar que a conta é do tipo responsável
      if (user?.user_metadata?.tipo_conta && user.user_metadata.tipo_conta !== 'responsavel') {
        await supabase.auth.signOut()
        toast.error('Este portal é exclusivo para pais e responsáveis. Use o acesso da secretaria para entrar no sistema.')
        return
      }

      // ES-04: router.refresh() antes de push para reconciliar cookies de sessão com SSR
      router.refresh()

      if (user?.user_metadata?.must_change_password) {
        toast.info('Primeiro acesso! Por favor, defina sua nova senha pessoal.')
        router.push('/portal-aluno/trocar-senha')
      } else {
        toast.success('Bem-vindo(a) ao Portal dos Pais!')
        router.push('/portal-aluno/dashboard')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao conectar ao portal.'
      console.error('Erro ao autenticar responsável:', err)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#F6F9FC', fontFamily: 'var(--font-source-sans), sans-serif' }}
    >
      {/* Luz de fundo decorativa */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[480px] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: 'rgba(220,235,250,0.6)' }}
      />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Identificação institucional */}
        <div className="text-center space-y-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
            style={{ backgroundColor: '#DDEBFA' }}
          >
            <GraduationCap className="w-8 h-8" style={{ color: AZUL }} aria-hidden="true" />
          </div>
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.18em] mb-1"
              style={{ color: LARANJA }}
            >
              Prefeitura de Sapeaçu
            </p>
            <h1
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              Portal dos Pais
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Acompanhe o boletim, frequência e comunicados da escola
            </p>
          </div>
        </div>

        {/* Card do formulário */}
        <div
          className="bg-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_12px_30px_rgba(18,45,76,0.08)]"
          style={{ border: `1px solid #DCE7F2` }}
        >
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold"
                style={{ color: '#102D50' }}
              >
                E-mail cadastrado
              </Label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 absolute left-3 top-3 text-slate-400"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="pl-9 bg-white text-sm"
                  style={{ borderColor: '#DCE7F2' }}
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold"
                style={{ color: '#102D50' }}
              >
                Senha de acesso
              </Label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 absolute left-3 top-3 text-slate-400"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="pl-9 pr-10 bg-white text-sm"
                  style={{ borderColor: '#DCE7F2' }}
                />
                {/* ES-18: Botão de mostrar/ocultar senha */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full font-extrabold h-11 gap-2 mt-1 text-white transition-all duration-150"
              style={{
                backgroundColor: AZUL,
                boxShadow: '0 8px 18px rgba(11,79,179,0.22)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Conectando...
                </>
              ) : (
                <>
                  Entrar no Portal
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>

          <div
            className="pt-4 border-t text-center space-y-2"
            style={{ borderColor: '#E3ECF4' }}
          >
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck
                className="w-3.5 h-3.5"
                style={{ color: AZUL }}
                aria-hidden="true"
              />
              <span>Acesso restrito a pais e responsáveis cadastrados</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Primeiro acesso ou esqueceu a senha? Solicite as credenciais
              presencialmente na secretaria da escola do seu filho.
            </p>
          </div>
        </div>

        {/* Rodapé institucional */}
        <p className="text-center text-xs text-slate-400">
          Secretaria Municipal de Educação de Sapeaçu
        </p>
      </div>
    </div>
  )
}
