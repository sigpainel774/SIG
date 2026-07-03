'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('') // The temporary password will be "painel"
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // A lógica de bloqueio de IP/tentativas (access_logs, blocked_ips) 
    // idealmente roda em um Route Handler (/api/auth/login), 
    // mas por simplicidade de setup, fazemos o Auth via Supabase primeiro:
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
    router.push('/home') // O middleware se encarrega de redirecionar Nível 6 / 5
    router.refresh()
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card border border-borderCustom rounded-2xl shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-highlight/10 rounded-full">
            <LogIn className="w-8 h-8 text-highlight" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SIG Educação</h1>
          <p className="text-sm text-foregroundCustom/70">Faça login para acessar o sistema</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foregroundCustom">Email Institucional</Label>
            <Input
              id="email"
              type="email"
              placeholder="funcionario@escola.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-input border-borderCustom text-foregroundCustom focus-visible:ring-highlight"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foregroundCustom">Senha</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Sua senha (ex: painel)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-input border-borderCustom text-foregroundCustom focus-visible:ring-highlight"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-highlight text-background hover:bg-highlight/90 font-semibold"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </Button>
        </form>
      </div>
    </div>
  )
}
