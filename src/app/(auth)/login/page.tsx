'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Ban, AlertTriangle } from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      // 1. Verificar previamente se o e-mail está na lista local ou no banco como suspenso
      const cleanEmail = email.trim().toLowerCase()

      // Verificar no localStorage se o usuário foi marcado como suspenso
      let localSuspended: string[] = []
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sig_suspended_emails')
        if (stored) {
          try {
            localSuspended = JSON.parse(stored)
          } catch (err) {}
        }
      }

      const isLocalSuspended = localSuspended.includes(cleanEmail)

      // Verificar no Supabase funcionarios
      let isDbSuspended = false
      try {
        const { data: func } = await supabase
          .from('funcionarios')
          .select('status')
          .ilike('email', cleanEmail)
          .maybeSingle()
        
        if (func?.status && (
          func.status.toLowerCase() === 'suspenso' || 
          func.status.toLowerCase() === 'sem acesso'
        )) {
          isDbSuspended = true
        }
      } catch (err) {
        console.warn('Erro ao consultar status no banco:', err)
      }

      if (isLocalSuspended || isDbSuspended) {
        setLoading(false)
        setSuspendedModalOpen(true)
        return
      }

      // 2. Realizar autenticação via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error('Erro ao fazer login. Verifique as credenciais.')
        setLoading(false)
        return
      }

      // 3. Após login, re-verificar no perfil se a conta está suspensa
      const { data: funcCheck } = await supabase
        .from('funcionarios')
        .select('status')
        .eq('email', data.user.email || '')
        .maybeSingle()

      if (funcCheck?.status && (
        funcCheck.status.toLowerCase() === 'suspenso' || 
        funcCheck.status.toLowerCase() === 'sem acesso'
      )) {
        await supabase.auth.signOut()
        setLoading(false)
        setSuspendedModalOpen(true)
        return
      }

      toast.success('Login bem sucedido!')
      window.location.href = '/'
    } catch (err) {
      console.error(err)
      toast.error('Erro ao realizar login.')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] p-4 font-sans">
      <div className="w-full max-w-[420px] p-8 sm:p-10 bg-[#161616] border border-[#242424] rounded-[24px] shadow-2xl space-y-6">
        <div className="flex flex-col items-center justify-center gap-3">
          <Logo variant="icon" className="w-14 h-14" />
          <h1 className="text-2xl sm:text-[26px] font-bold text-white text-center tracking-tight">
            Sapeaçu Painel Escolar
          </h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 pt-2">
          <div>
            <input
              id="email"
              type="email"
              placeholder="adm@super.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-13 px-4 py-3 bg-[#ebf3ff] text-slate-900 placeholder:text-slate-500 font-medium rounded-xl text-base outline-none focus:ring-2 focus:ring-[#389fff] transition-all"
            />
          </div>

          <div>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-13 px-4 py-3 bg-[#ebf3ff] text-slate-900 placeholder:text-slate-500 font-medium rounded-xl text-base outline-none focus:ring-2 focus:ring-[#389fff] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 mt-2 bg-[#389fff] hover:bg-[#288ffa] active:scale-[0.99] text-black font-bold text-base rounded-xl cursor-pointer transition-all shadow-lg flex items-center justify-center"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Pop-up de Usuário Suspenso conforme especificação exata */}
      <Dialog open={suspendedModalOpen} onOpenChange={setSuspendedModalOpen}>
        <DialogContent className="sm:max-w-[400px] bg-[#18181b] border-[#3f3f46] text-white text-center">
          <DialogHeader className="items-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-2">
              <Ban className="w-7 h-7" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Acesso Suspenso
            </DialogTitle>
          </DialogHeader>

          <p className="text-zinc-300 text-base py-3 leading-relaxed font-medium">
            Usuario suspenso, contate a administração
          </p>

          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              onClick={() => setSuspendedModalOpen(false)}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
