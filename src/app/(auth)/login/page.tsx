'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Ban, PenTool, Loader2, Eye, EyeOff } from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { PwaInstallButton } from '@/components/PwaInstallButton'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suspendedModalOpen, setSuspendedModalOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('error') === 'orphan') {
        supabase.auth.signOut().then(() => {
          toast.error('Acesso negado. Seu e-mail não pertence a nenhum funcionário cadastrado.')
          // Limpa o parâmetro da URL
          window.history.replaceState({}, '', '/login')
        })
      }
    }
  }, [supabase])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const cleanEmail = email.trim().toLowerCase()

      // 1. Verificação rápida síncrona no localStorage (sem custo de rede)
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

      // 2. Realizar autenticação direta via Supabase Auth (Single RTT)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })

      if (error || !data.user) {
        toast.error('Erro ao fazer login. Verifique as credenciais.')
        setLoading(false)
        return
      }

      // 3. Após autenticação bem-sucedida, validar o status do funcionário no banco (com permissão RLS do usuário autenticado)
      const { data: funcCheck, error: funcCheckError } = await supabase
        .from('funcionarios')
        .select('id, status, primeiro_acesso, is_superadmin, is_conta_eja, auth_user_id')
        .eq('email', data.user.email || cleanEmail)
        .maybeSingle()

      // Tratamento de Erro Silencioso de UX: Evita que o usuário órfão sofra flickering
      if (!funcCheck) {
        await supabase.auth.signOut()
        setLoading(false)
        toast.error('Acesso negado. Seu e-mail não pertence a nenhum funcionário cadastrado.')
        return
      }

      // Reconciliação imediata de auth_user_id caso ainda não esteja vinculado
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
        // Atualizar lista local de suspensos no localStorage com limite de itens
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

      // Se a conta estiver ativa, garantir remoção do cache local de suspensos caso estivesse presente anteriormente
      if (typeof window !== 'undefined' && localSuspended.includes(cleanEmail)) {
        const updatedList = localSuspended.filter((item) => item !== cleanEmail)
        localStorage.setItem('sig_suspended_emails', JSON.stringify(updatedList))
      }

      if (funcCheck?.primeiro_acesso) {
        toast.success('Primeiro acesso! Por favor, altere sua senha.')
        window.location.href = '/primeiro-acesso'
        return
      }

      toast.success('Login bem-sucedido!')

      // Destino inteligente e determinístico
      const isSuperAdmin = funcCheck?.is_superadmin === true
      const isContaEja = funcCheck?.is_conta_eja === true
      const targetPath = isSuperAdmin ? '/admin' : (isContaEja ? '/eja' : '/home')

      // Redirecionamento completo para hidratação limpa de sessão e cookies
      window.location.href = targetPath
    } catch (err) {
      console.error(err)
      toast.error('Erro ao realizar login.')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4 font-sans relative">
      {/* Botão de Assinatura na parte superior */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <Button
          type="button"
          onClick={() => router.push('/assinar')}
          className="bg-[#1f1f23] hover:bg-[#2e2e33] text-[#3ea6ff] border border-[#3ea6ff]/20 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Assinatura</span>
        </Button>
      </div>

      <div className="w-full max-w-[420px] p-8 sm:p-10 bg-[#161616] border border-[#242424] rounded-[24px] shadow-2xl space-y-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <img
            src="/img/brasao-login.jpg"
            alt="Brasão Sapeaçu"
            className="w-14 h-14 object-contain"
          />
          <h1 className="text-2xl sm:text-[26px] font-bold text-[#ffffff] text-center tracking-tight">
            SIG - Sapeaçu
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div>
            <input
              id="email"
              type="email"
              placeholder="exemplo@sig.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full h-13 px-4 py-3 bg-[#ebf3ff] text-slate-900 placeholder:text-slate-500 font-medium rounded-xl text-base outline-none focus:ring-2 focus:ring-[#389fff] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full h-13 pl-4 pr-12 py-3 bg-[#ebf3ff] text-slate-900 placeholder:text-slate-500 font-medium rounded-xl text-base outline-none focus:ring-2 focus:ring-[#389fff] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors p-1 cursor-pointer"
              tabIndex={-1}
              title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 mt-2 bg-[#389fff] hover:bg-[#288ffa] active:scale-[0.99] text-black font-bold text-base rounded-xl cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
      </div>

      {/* Botão para Instalação Direta do PWA no Tablet / Celular / Computador */}
      <PwaInstallButton variant="login" />

      {/* Pop-up de Usuário Suspenso padronizado com StandardDialog (Montagem condicional) */}
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
              Usuario suspenso, contate a administração
            </p>
          </div>
        </StandardDialog>
      )}
    </div>
  )
}
