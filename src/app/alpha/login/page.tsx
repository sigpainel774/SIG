'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  FlaskConical,
  Lock,
  User,
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
import { AlphaLogoGraphic } from '@/components/alpha/AlphaIcon'

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
    <div className="min-h-screen flex flex-col justify-between bg-[#f3f4f7] text-[#1a1a1a] font-sans relative overflow-hidden select-none">
      {/* ── Topo: Badge de Identificação e Status Offline ── */}
      <div className="w-full max-w-5xl mx-auto px-5 pt-5 flex items-center justify-between z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sidebar-accent border border-sidebar-border text-sidebar-accent-foreground text-xs font-bold shadow-xs tracking-wide">
          <FlaskConical className="w-4 h-4 text-sidebar-primary stroke-[2.2]" />
          <span>SIG ALPHA LAB</span>
        </div>

        {isOffline && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Modo Offline</span>
          </div>
        )}
      </div>

      {/* ── Centro: Card Branco de Login Inspirado no Mockup ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-[430px] bg-white rounded-[28px] sm:rounded-[32px] p-7 sm:p-10 shadow-xl border border-sidebar-border space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Cabeçalho do Card */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-2">
              <AlphaLogoGraphic className="w-20 h-20 drop-shadow-xs" />
            </div>

            <h1 className="text-[26px] font-black text-[#1a1a1a] tracking-tight flex items-center justify-center gap-1.5">
              SIG ALPHA
              <span className="text-sidebar-primary text-sm font-black tracking-wider uppercase">
                LAB
              </span>
            </h1>

            <p className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mt-1">
              Ambiente de Prototipagem &amp; Operação
            </p>
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleLogin} className="space-y-4 pt-1" noValidate>
            {/* Campo E-mail */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="email" className="text-[13px] font-semibold text-[#1a1a1a] block">
                E-mail Institucional
              </label>
              <div className="relative flex items-center bg-sidebar-accent/40 border border-sidebar-border rounded-2xl focus-within:border-sidebar-primary focus-within:ring-2 focus-within:ring-sidebar-primary/20 transition-all overflow-hidden">
                <div className="pl-3.5 pr-1 text-sidebar-accent-foreground flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-primary">
                    <User className="w-4 h-4" />
                  </div>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adm@super.com"
                  required
                  autoComplete="email"
                  disabled={loading}
                  className="w-full h-12 pl-2.5 pr-4 bg-transparent text-sm text-[#1a1a1a] placeholder:text-muted-foreground font-medium outline-none disabled:opacity-60"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5 text-left">
              <label htmlFor="password" className="text-[13px] font-semibold text-[#1a1a1a] block">
                Senha de Acesso
              </label>
              <div className="relative flex items-center bg-sidebar-accent/40 border border-sidebar-border rounded-2xl focus-within:border-sidebar-primary focus-within:ring-2 focus-within:ring-sidebar-primary/20 transition-all overflow-hidden">
                <div className="pl-3.5 pr-1 text-sidebar-accent-foreground flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 rounded-lg bg-sidebar-accent flex items-center justify-center text-sidebar-primary">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full h-12 pl-2.5 pr-10 bg-transparent text-sm text-[#1a1a1a] placeholder:text-muted-foreground font-medium outline-none disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1a1a1a] transition-colors p-1 cursor-pointer"
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
              className="w-full h-13 mt-3 bg-sidebar-primary hover:bg-sidebar-primary/90 active:scale-[0.99] text-white font-bold text-xs sm:text-sm tracking-wide rounded-2xl shadow-md shadow-sidebar-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed uppercase"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Acessando Sistema...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema Alpha</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Link para o Login Institucional Padrão */}
          <div className="pt-3 border-t border-sidebar-border text-center">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-sidebar-primary font-semibold transition-colors inline-flex items-center gap-1.5 group"
            >
              <span>Ir para o Login Institucional Padrão</span>
              <Sparkles className="w-3.5 h-3.5 text-sidebar-primary group-hover:rotate-12 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Rodapé: Informações Institucionais ── */}
      <div className="w-full py-4 text-center text-xs text-muted-foreground z-10">
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
