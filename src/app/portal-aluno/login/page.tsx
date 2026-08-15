'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  Mail,
  Lock,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'

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
      className="min-h-screen flex flex-col justify-between bg-[#0052cc]"
      style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
    >
      {/* ─── SEÇÃO SUPERIOR (Branca com curva orgânica) ─── */}
      <div className="w-full bg-white relative">
        <div className="max-w-md mx-auto px-6 pt-10 sm:pt-14 pb-8 sm:pb-10 flex flex-col items-center text-center">
          
          {/* Logo Oficial da Prefeitura de Sapeaçu */}
          <div className="mb-2 flex items-center justify-center">
            <img
              src="/img/logo-prefeitura.png"
              alt="Prefeitura Municipal de Sapeaçu"
              className="w-auto h-24 sm:h-28 max-w-[260px] object-contain mx-auto select-none"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                if (!target.src.includes('supabase.co')) {
                  target.src = 'https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/logos/logo-prefeitura.png'
                }
              }}
            />
          </div>

          {/* Título e Subtítulo do Portal */}
          <div className="mt-5 sm:mt-6 space-y-1.5 w-full">
            <h1 className="text-2xl sm:text-[26px] font-extrabold text-[#0a2540] tracking-tight">
              Portal dos Pais &amp; Responsáveis
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-normal">
              Acompanhe a vida escolar dos seus filhos
            </p>
          </div>

          {/* Formulário de Login */}
          <form onSubmit={handleLogin} className="w-full mt-7 sm:mt-8 space-y-3.5 sm:space-y-4" noValidate>
            {/* Campo E-mail */}
            <div className="relative">
              <Mail
                className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0052cc] pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail cadastrado"
                required
                autoComplete="email"
                disabled={loading}
                className="w-full h-12 sm:h-13 pl-11 pr-4 bg-white border border-slate-300 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052cc]/30 focus:border-[#0052cc] transition-all disabled:opacity-60"
              />
            </div>

            {/* Campo Senha */}
            <div className="relative">
              <Lock
                className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0052cc] pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso"
                required
                autoComplete="current-password"
                disabled={loading}
                className="w-full h-12 sm:h-13 pl-11 pr-11 bg-white border border-slate-300 rounded-xl text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0052cc]/30 focus:border-[#0052cc] transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-1"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>

            {/* Botão Entrar no Portal */}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full h-12 sm:h-13 bg-[#0052cc] hover:bg-[#0047b3] active:bg-[#003d9e] text-white font-bold text-base sm:text-lg rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Conectando...</span>
                </>
              ) : (
                <span>Entrar no Portal</span>
              )}
            </button>
          </form>

          {/* Badge de Segurança */}
          <div className="flex items-center justify-center gap-3 mt-6 sm:mt-7 select-none">
            <div className="w-10 h-10 rounded-full bg-[#e3eefc] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#0052cc]" aria-hidden="true" />
            </div>
            <div className="text-left text-xs sm:text-[13px] text-slate-600 leading-tight font-medium">
              <p>Acesso seguro e exclusivo para</p>
              <p>responsáveis cadastrados</p>
            </div>
          </div>

        </div>

        {/* Curva decorativa orgânica na parte inferior da área branca com acento laranja */}
        <div className="relative w-full overflow-hidden leading-none">
          <svg
            viewBox="0 0 1000 90"
            preserveAspectRatio="none"
            className="relative block w-full h-10 sm:h-14"
            aria-hidden="true"
          >
            {/* Traço laranja de destaque sob a curva esquerda */}
            <path
              d="M 0,22 C 60,42 160,72 320,80 C 420,84 480,72 560,50"
              fill="none"
              stroke="#f97316"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {/* Curva branca principal */}
            <path
              d="M 0,0 L 1000,0 L 1000,10 C 850,55 600,90 320,76 C 160,68 60,38 0,18 Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </div>

      {/* ─── SEÇÃO INFERIOR (Fundo Azul Real com Card da Secretaria) ─── */}
      <div className="w-full flex-1 flex flex-col justify-center items-center px-6 py-6 sm:py-8 max-w-md mx-auto">
        {/* Card Branco com Logo da Secretaria Municipal de Educação */}
        <div className="w-full max-w-[320px] bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-xl select-none flex items-center justify-center">
          <img
            src="/img/logo-secretaria.png"
            alt="Secretaria Municipal de Educação"
            className="w-full h-auto max-h-16 sm:max-h-20 object-contain mx-auto"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement
              if (!target.src.includes('supabase.co')) {
                target.src = 'https://nijjizpcodnjhvqwjuso.supabase.co/storage/v1/object/public/alunos-anexos/logos/logo-secretaria-educacao-2026.png'
              }
            }}
          />
        </div>

        {/* Linha separadora laranja fina */}
        <div className="w-full max-w-[280px] h-[1.5px] bg-[#f97316]/90 mt-5 sm:mt-6" />

        {/* Slogan com Ícone de Educação */}
        <div className="flex items-center justify-center gap-2.5 mt-3.5 text-white text-sm sm:text-[15px] font-medium select-none">
          {/* Ícone de pessoa com livro aberto */}
          <svg
            className="w-5 h-5 sm:w-6 sm:h-6 text-[#f97316] shrink-0"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            {/* Cabeça */}
            <circle cx="12" cy="5.5" r="3.2" />
            {/* Asas/Páginas do Livro */}
            <path d="M3.5 13.2C3.5 12.5 4.1 12 4.8 12H11V19.2C11 19.6 10.6 20 10.2 20H4.8C4.1 20 3.5 19.4 3.5 18.7V13.2Z" />
            <path d="M20.5 13.2C20.5 12.5 19.9 12 19.2 12H13V19.2C13 19.6 13.4 20 13.8 20H19.2C19.9 20 20.5 19.4 20.5 18.7V13.2Z" />
          </svg>
          <p>
            Mais <span className="text-[#f97316] font-bold">presença</span> na jornada escolar
          </p>
        </div>
      </div>
    </div>
  )
}

