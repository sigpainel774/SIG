import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { getPerfilUsuario } from '@/lib/profileCache'
import { AuthInitializer } from '@/components/AuthInitializer'
import { AlphaAuthClientGuard } from '@/components/alpha/AlphaAuthClientGuard'
import { AlphaSidebar } from '@/components/alpha/AlphaSidebar'
import { FlaskConical } from 'lucide-react'
import { AlphaConnectivityBanner } from '@/components/alpha/AlphaConnectivityBanner'
import { AlphaBottomNav } from '@/components/alpha/AlphaBottomNav'

export const dynamic = 'force-dynamic'

export default async function AlphaDashboardLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()

  let userId = headersList.get('x-user-id')
  let userEmail = headersList.get('x-user-email')

  if (!userId || !userEmail) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id || null
      userEmail = user?.email || null
    } catch {
      userId = null
      userEmail = null
    }
  }

  let perfil = null
  if (userId && userEmail) {
    try {
      perfil = await getPerfilUsuario(userId, userEmail)
    } catch {
      perfil = null
    }
  }

  const funcionario = perfil?.funcionario || null
  const acessos = perfil?.acessos || []
  const vinculos = perfil?.vinculos || []

  return (
    <AlphaAuthClientGuard initialFuncionarioId={funcionario?.id}>
      <div className="light flex min-h-screen bg-[#f3f4f7] text-[#1a1a1a] relative overflow-x-hidden">
        {funcionario && (
          <AuthInitializer funcionario={funcionario} acessos={acessos} vinculos={vinculos} />
        )}

      {/* Sidebar Dedicada do Alpha */}
      <AlphaSidebar />

      {/* Conteúdo Principal da Rota Alpha */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-auto relative z-10">
        {/* Faixa superior com identificação do ambiente e conectividade */}
        <div className="bg-white/90 backdrop-blur-md border-b border-sidebar-border px-4 py-2.5 text-xs flex items-center justify-between gap-2 z-20 sticky top-0 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sidebar-accent border border-sidebar-border text-sidebar-accent-foreground text-[11px] font-bold shadow-xs tracking-wide">
              <FlaskConical className="w-3.5 h-3.5 text-sidebar-primary stroke-[2.2]" />
              <span>SIG ALPHA LAB</span>
            </div>
            <span className="text-[11px] text-muted-foreground hidden md:inline font-medium">
              Ambiente de Prototipagem &amp; Operação 100% Offline-First
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AlphaConnectivityBanner />
          </div>
        </div>

        {/* Corpo da página com padding de compensação para barra inferior no mobile */}
        <div className="flex-1 p-4 md:p-8 pb-28 md:pb-8">{children}</div>

        {/* Barra de Navegação Inferior Móvel */}
        <AlphaBottomNav />
      </main>
    </div>
  </AlphaAuthClientGuard>
  )
}
