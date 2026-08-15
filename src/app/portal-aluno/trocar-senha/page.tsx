'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { KeyRound, Lock, Loader2, CheckCircle2, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const AZUL = '#0B4FB3'

export default function TrocarSenhaResponsavelPage() {
  const router = useRouter()
  // ES-07: createClient estável
  const supabase = useMemo(() => createClient(), [])

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)

  const handleTrocarSenha = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novaSenha || novaSenha.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas digitadas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: novaSenha,
        data: { must_change_password: false },
      })

      if (error) throw error

      // ES-14: avisar (sem bloquear fluxo) se sync com tabela falhar
      if (data.user) {
        const { error: updateError } = await supabase
          .from('responsaveis')
          .update({ must_change_password: false })
          .eq('auth_user_id', data.user.id)

        if (updateError) {
          console.error('Aviso ao sincronizar tabela responsaveis:', updateError)
          // ES-14: notificar o usuário sem bloquear o fluxo
          toast.warning(
            'Senha alterada, mas houve uma inconsistência nos dados. Se houver problemas no próximo acesso, procure a secretaria.'
          )
        }
      }

      toast.success('Senha alterada com sucesso! Redirecionando...')
      // ES-04: refresh antes de push
      router.refresh()
      router.push('/portal-aluno/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao redefinir sua senha.'
      console.error('Erro ao trocar senha do responsável:', err)
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
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[420px] rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: 'rgba(220,235,250,0.6)' }}
      />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
            style={{ backgroundColor: '#EBF5FF', border: `1px solid #C8DCF5` }}
          >
            <KeyRound className="w-8 h-8" style={{ color: AZUL }} aria-hidden="true" />
          </div>
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
          >
            Definir Nova Senha
          </h1>
          <p className="text-xs text-slate-500">
            Por motivos de segurança, você precisa criar uma senha pessoal definitiva no seu primeiro acesso.
          </p>
        </div>

        <div
          className="bg-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_12px_30px_rgba(18,45,76,0.08)]"
          style={{ border: '1px solid #DCE7F2' }}
        >
          <form onSubmit={handleTrocarSenha} className="space-y-4">
            {/* Nova Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha" className="text-xs font-semibold" style={{ color: '#102D50' }}>
                Nova Senha Pessoal <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" aria-hidden="true" />
                <Input
                  id="novaSenha"
                  type={showNova ? 'text' : 'password'}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pl-9 pr-10 bg-white text-sm"
                  style={{ borderColor: '#DCE7F2' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNova((v) => !v)}
                  aria-label={showNova ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showNova ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmarSenha" className="text-xs font-semibold" style={{ color: '#102D50' }}>
                Confirmar Nova Senha <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" aria-hidden="true" />
                <Input
                  id="confirmarSenha"
                  type={showConfirmar ? 'text' : 'password'}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pl-9 pr-10 bg-white text-sm"
                  style={{ borderColor: '#DCE7F2' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmar((v) => !v)}
                  aria-label={showConfirmar ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmar ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full font-extrabold h-11 gap-2 mt-1 text-white"
              style={{
                backgroundColor: AZUL,
                boxShadow: '0 8px 18px rgba(11,79,179,0.22)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Salvando Nova Senha...
                </>
              ) : (
                <>
                  Salvar e Acessar Portal
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>

          <div
            className="p-3 rounded-xl flex items-start gap-2.5 text-xs leading-relaxed"
            style={{ backgroundColor: '#EBF5FF', border: '1px solid #C8DCF5', color: '#1E4D8C' }}
          >
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" style={{ color: AZUL }} aria-hidden="true" />
            <span>
              Guarde bem sua nova senha. Ela será necessária para os próximos acessos pelo celular ou computador.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
