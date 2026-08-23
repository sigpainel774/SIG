import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { getPerfilUsuario } from '@/lib/profileCache'
import { AuthInitializer } from '@/components/AuthInitializer'
import { AlphaSidebar } from '@/components/alpha/AlphaSidebar'
import { FlaskConical } from 'lucide-react'
import { AlphaConnectivityBanner } from '@/components/alpha/AlphaConnectivityBanner'

export const dynamic = 'force-dynamic'

export default async function AlphaDashboardLayout({ children }: { children: ReactNode }) {
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
    redirect('/alpha/login')
  }

  const perfil = await getPerfilUsuario(userId, userEmail)

  if (!perfil) {
    redirect('/alpha/login?error=orphan')
  }

  const funcionario = perfil.funcionario
  const acessos = perfil.acessos
  const vinculos = perfil.vinculos

  return (
    <div className="flex min-h-screen bg-[#080d1b] text-slate-100 relative overflow-x-hidden">
      <AuthInitializer funcionario={funcionario} acessos={acessos} vinculos={vinculos} />

      {/* ── Textura de Estrelas / Partículas de Fundo ── */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.22) 0%, transparent 40%), radial-gradient(circle at 85% 80%, rgba(37, 99, 235, 0.18) 0%, transparent 45%), radial-gradient(#60a5fa 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 100%, 32px 32px',
        }}
      />

      {/* Sidebar Dedicada do Alpha */}
      <AlphaSidebar />

      {/* Conteúdo Principal da Rota Alpha */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-auto relative z-10">
        {/* Faixa superior com identificação do ambiente e conectividade */}
        <div className="bg-[#0c1427]/80 backdrop-blur-md border-b border-blue-900/40 px-4 py-2.5 text-xs flex items-center justify-between gap-2 z-20 sticky top-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 text-[11px] font-bold shadow-xs tracking-wide">
              <FlaskConical className="w-3.5 h-3.5 text-blue-400 stroke-[2.2]" />
              <span>SIG ALPHA LAB</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden md:inline font-medium">
              Ambiente de Prototipagem &amp; Operação 100% Offline-First
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AlphaConnectivityBanner />
          </div>
        </div>

        {/* Corpo da página */}
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
