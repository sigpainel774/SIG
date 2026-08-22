import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { getPerfilUsuario } from '@/lib/profileCache'
import { AuthInitializer } from '@/components/AuthInitializer'
import { AlphaSidebar } from '@/components/alpha/AlphaSidebar'
import { FlaskConical } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AlphaLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()

  let userId = headersList.get('x-user-id')
  let userEmail = headersList.get('x-user-email')

  if (!userId || !userEmail) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id || null
    userEmail = user?.email || null
  }

  if (!userId || !userEmail) {
    redirect('/login')
  }

  const perfil = await getPerfilUsuario(userId, userEmail)

  if (!perfil) {
    redirect('/login?error=orphan')
  }

  const funcionario = perfil.funcionario
  const acessos = perfil.acessos
  const vinculos = perfil.vinculos

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AuthInitializer funcionario={funcionario} acessos={acessos} vinculos={vinculos} />

      {/* Sidebar Dedicada do Alpha */}
      <AlphaSidebar />

      {/* Conteúdo Principal da Rota Alpha */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-auto">
        {/* Faixa superior discreta de identificação do ambiente */}
        <div className="bg-linear-to-r from-violet-950/40 via-background to-background border-b border-border/70 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FlaskConical className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-semibold text-foreground">Ambiente Alpha Encapsulado</span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              — Dados de testes e funções experimentais isolados
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SISTEMA ATIVO
            </span>
          </div>
        </div>

        {/* Corpo da página */}
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
