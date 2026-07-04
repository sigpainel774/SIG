'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Erro ao fazer login. Verifique as credenciais.')
      setLoading(false)
      return
    }

    toast.success('Login bem sucedido!')
    router.push('/home')
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a] p-4 font-sans">
      <div className="w-full max-w-[420px] p-8 sm:p-10 bg-[#161616] border border-[#242424] rounded-[24px] shadow-2xl space-y-6">
        <h1 className="text-2xl sm:text-[26px] font-bold text-white text-center tracking-tight pt-1">
          Sapeaçu Painel Escolar
        </h1>

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
    </div>
  )
}
