'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setAuth } = useAuthStore()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao fazer login. Verifique as credenciais.')
        setLoading(false)
        return
      }

      setAuth(data.funcionario, data.acessos)
      toast.success('Login bem sucedido!')
      router.push(data.redirect)
      router.refresh()
    } catch (error) {
      toast.error('Ocorreu um erro inesperado.')
      setLoading(false)
    }
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
