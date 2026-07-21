'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Lock, Loader2, ShieldCheck, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrimeiroAcessoPage() {
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email ?? '')
    }
    checkUser()
  }, [supabase, router])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (novaSenha.length < 6) {
      toast.error('A senha deve conter no mínimo 6 caracteres.')
      return
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem.')
      return
    }

    setLoading(true)

    try {
      // 1. Obter usuário atual
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error('Sessão expirada. Faça login novamente.')
        router.push('/login')
        return
      }

      // 2. Atualizar senha no Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: novaSenha,
      })

      if (authError) {
        toast.error(`Erro ao atualizar a senha: ${authError.message}`)
        setLoading(false)
        return
      }

      // 3. Atualizar a flag primeiro_acesso e garantir o vínculo do auth_user_id
      const { error: dbError } = await supabase
        .from('funcionarios')
        .update({ 
          primeiro_acesso: false, 
          auth_user_id: user.id 
        })
        .eq('email', user.email ?? '')

      if (dbError) {
        console.error('Erro ao atualizar dados no banco:', dbError)
        toast.error('Senha alterada, mas houve um erro ao atualizar seu cadastro. Contate o administrador.')
        setLoading(false)
        return
      }

      toast.success('Senha atualizada com sucesso! Bem-vindo ao SIG.')
      
      // Redireciona para home limpando o histórico de navegação
      router.refresh()
      router.push('/home')
    } catch (err) {
      console.error(err)
      toast.error('Erro inesperado ao alterar a senha.')
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sessão encerrada.')
    router.push('/login')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4 font-sans relative">
      <div className="w-full max-w-[440px] p-8 sm:p-10 bg-[#161616] border border-[#242424] rounded-[24px] shadow-2xl space-y-6">
        
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-1">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white text-center tracking-tight">
            Alteração Obrigatória de Senha
          </h1>
          <p className="text-xs text-zinc-400 text-center px-4 leading-relaxed">
            Detectamos que este é o seu primeiro acesso com a senha provisória vinculada ao e-mail <span className="text-amber-500 font-semibold">{userEmail}</span>. Por segurança, altere sua senha para prosseguir.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium block pl-1">Nova Senha</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                disabled={loading}
                className="w-full h-12 pl-10 pr-4 bg-[#ebf3ff] text-slate-900 placeholder:text-slate-500 font-medium rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#389fff] transition-all disabled:opacity-60"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400 font-medium block pl-1">Confirmar Nova Senha</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Digite a nova senha novamente"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                disabled={loading}
                className="w-full h-12 pl-10 pr-4 bg-[#ebf3ff] text-slate-900 placeholder:text-slate-500 font-medium rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#389fff] transition-all disabled:opacity-60"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-[#389fff] hover:bg-[#288ffa] active:scale-[0.99] text-black font-bold text-sm rounded-xl cursor-pointer transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando nova senha...</span>
              </>
            ) : (
              'Confirmar e Entrar'
            )}
          </button>
        </form>

        <div className="border-t border-[#242424] pt-4 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800/30 text-xs gap-2 py-2 px-3 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Voltar ao login</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
