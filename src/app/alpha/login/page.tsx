'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  FlaskConical,
  Lock,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  WifiOff,
  Ban,
} from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'

export default function AlphaLoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suspendedModalOpen, setSuspendedModalOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine)
      const handleOnline = () => setIsOffline(false)
      const handleOffline = () => setIsOffline(true)
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      const params = new URLSearchParams(window.location.search)
      if (params.get('error') === 'orphan') {
        supabase.auth.signOut().then(() => {
          toast.error('Acesso negado. Seu e-mail não pertence a nenhum funcionário cadastrado no SIG.')
          window.history.replaceState({}, '', '/alpha/login')
        })
      }

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha seu e-mail e senha para acessar o Alpha.')
      return
    }

    setLoading(true)

    try {
      const cleanEmail = email.trim().toLowerCase()

      // 1. Verificação rápida síncrona no localStorage de suspensos
      let localSuspended: string[] = []
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sig_suspended_emails')
        if (stored) {
          try {
            localSuspended = JSON.parse(stored)
          } catch (err) {}
        }
      }

      if (localSuspended.includes(cleanEmail)) {
        setLoading(false)
        setSuspendedModalOpen(true)
        return
      }

      // 2. Autenticação direta via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error || !data.user) {
        if (error?.message?.toLowerCase().includes('invalid login credentials')) {
          toast.error('E-mail ou senha incorretos.')
        } else {
          toast.error(error?.message ?? 'Erro ao autenticar no Sistema Alpha.')
        }
        setLoading(false)
        return
      }

      // 3. Validação do funcionário no banco
      const { data: funcCheck, error: funcCheckError } = await supabase
        .from('funcionarios')
        .select('id, status, primeiro_acesso, is_superadmin, is_alpha, auth_user_id')
        .eq('email', data.user.email || cleanEmail)
        .maybeSingle()

      if (!funcCheck) {
        await supabase.auth.signOut()
        setLoading(false)
        toast.error('Acesso negado. Sua conta não possui vínculo ativo no SIG.')
        return
      }

      // Reconciliação imediata de auth_user_id se necessário
      if (!funcCheck.auth_user_id && data.user.id) {
        try {
          await supabase
            .from('funcionarios')
            .update({ auth_user_id: data.user.id })
            .eq('id', funcCheck.id)
        } catch (reconcileErr) {
          console.warn('Aviso na reconciliação de auth_user_id:', reconcileErr)
        }
      }

      const status = funcCheck?.status?.toLowerCase()
      if (status === 'suspenso' || status === 'sem acesso') {
        if (typeof window !== 'undefined') {
          const MAX_ITEMS = 50
          if (!localSuspended.includes(cleanEmail)) {
            const updatedList = [cleanEmail, ...localSuspended].slice(0, MAX_ITEMS)
            localStorage.setItem('sig_suspended_emails', JSON.stringify(updatedList))
          }
        }

        await supabase.auth.signOut()
        setLoading(false)
        setSuspendedModalOpen(true)
        return
      }

      toast.success('Bem-vindo ao Sistema Alpha!')

      // Redirecionamento completo para o ambiente Alpha
      window.location.href = '/alpha'
    } catch (err: unknown) {
      console.error('Erro no login do Alpha:', err)
      const msg = err instanceof Error ? err.message : 'Erro ao realizar login.'
      toast.error(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0a0a0c] text-foreground font-sans relative overflow-hidden">
      {/* ── Efeitos de Fundo (Glow / Gradientes Tecnológicos) ── */}
      <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[300px] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Topo: Aviso de Conectividade / Offline ── */}
      <div className="w-full px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-400 text-xs font-bold tracking-wide">
            <FlaskConical className="w-3.5 h-3.5 animate-pulse text-violet-400" />
            <span>SIG ALPHA LAB</span>
          </div>
        </div>

        {isOffline && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Modo Offline</span>
          </div>
        )}
      </div>

      {/* ── Centro: Card de Login Alpha ── */}
      <div className="flex-1 flex items-center justify-center p-4 z-10">
        <div className="w-full max-w-[420px] bg-[#121217]/90 backdrop-blur-xl border border-violet-500/20 rounded-[28px] p-7 sm:p-9 shadow-2xl shadow-violet-950/40 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Cabeçalho do Card */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30 text-white">
                <FlaskConical className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#121217] flex items-center justify-center" title="Laboratório Ativo">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
                SIG ALPHA
                <span className="bg-linear-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent text-sm font-extrabold uppercase">
                  LAB
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Ambiente de Prototipagem &amp; Operação
              </p>
            </div>
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-zinc-300">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operador@sig.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="w-full h-12 pl-10 pr-4 bg-[#1a1a22] border border-violet-500/20 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 font-medium outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-300">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full h-12 pl-10 pr-11 bg-[#1a1a22] border border-violet-500/20 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 font-medium outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/60 transition-all disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 bg-linear-to-r from-violet-600 via-indigo-600 to-violet-700 hover:from-violet-500 hover:to-indigo-600 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Acessando Laboratório...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema Alpha</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link Alternativo para Login Institucional Padrão */}
          <div className="pt-2 border-t border-zinc-800/80 text-center">
            <Link
              href="/login"
              className="text-xs text-zinc-400 hover:text-violet-400 font-medium transition-colors"
            >
              Ir para o Login Institucional Padrão &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── Rodapé: Informações da Rede ── */}
      <div className="w-full py-4 text-center text-xs text-zinc-500 z-10">
        <p>Secretaria Municipal de Educação &bull; Sapeaçu / BA</p>
      </div>

      {/* Modal de Acesso Suspenso */}
      {suspendedModalOpen && (
        <StandardDialog
          open={suspendedModalOpen}
          onOpenChange={setSuspendedModalOpen}
          title="Acesso Suspenso"
          maxWidth="sm:max-w-[400px]"
          footer={
            <Button
              type="button"
              onClick={() => setSuspendedModalOpen(false)}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
            >
              Entendido
            </Button>
          }
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-1">
              <Ban className="w-7 h-7" />
            </div>
            <p className="text-zinc-300 text-base leading-relaxed font-medium">
              Usuário suspenso, contate a administração do SIG.
            </p>
          </div>
        </StandardDialog>
      )}
    </div>
  )
}
