import { ReactNode } from 'react'

export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { RootAdminHeader } from '@/components/RootAdminHeader'
import { SimulationBanner } from '@/components/SimulationBanner'
import { createClient } from '@/lib/supabaseServer'
import { getPerfilUsuario } from '@/lib/profileCache'
import { AuthInitializer } from '@/components/AuthInitializer'
import { PerformanceTracker } from '@/components/PerformanceTracker'
import { AccessTracker } from '@/components/AccessTracker'
import { SessionTimeoutWatcher } from '@/components/SessionTimeoutWatcher'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  const cookieStore = await cookies()
  const isSimulating = cookieStore.get('sig_simulating')?.value === '1'

  let userId = headersList.get('x-user-id')
  let userEmail = headersList.get('x-user-email')

  if (!userId || !userEmail) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
    userEmail = user?.email || null
  }

  let isSuperAdmin = false
  let funcionario = null
  let acessos: any[] = []
  let vinculos: any[] = []

  if (userId && userEmail) {
    // Busca o perfil completo via cache (0 queries no cache hit, 3 paralelas no miss)
    const perfil = await getPerfilUsuario(userId, userEmail)

    if (!perfil) {
      // Usuário órfão: logado mas sem cadastro na tabela funcionarios
      redirect('/login?error=orphan')
    }
    
    if (perfil.funcionario?.primeiro_acesso) {
      redirect('/primeiro-acesso')
    }

    funcionario = perfil.funcionario
    acessos = perfil.acessos
    vinculos = perfil.vinculos
    isSuperAdmin = funcionario.is_superadmin || false
  } else {
    redirect('/login')
  }

  // Layout exclusivo para Super Admin (Root) - apenas se não estiver simulando
  if (isSuperAdmin && !isSimulating) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foregroundCustom w-full min-w-0 overflow-x-hidden">
        <AuthInitializer funcionario={funcionario} acessos={acessos} vinculos={vinculos} />
        <SessionTimeoutWatcher />
        <PerformanceTracker />
        <AccessTracker />
        <SimulationBanner />
        <RootAdminHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-8 w-full min-w-0 max-w-full">
          {children}
        </main>
      </div>
    )
  }

  // Layout tradicional para Escolas (Níveis 1 a 6)
  return (
    <div className="flex min-h-screen bg-background text-foregroundCustom">
      <AuthInitializer funcionario={funcionario} acessos={acessos} vinculos={vinculos} />
      <SessionTimeoutWatcher />
      <PerformanceTracker />
      <AccessTracker />
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0 print:overflow-visible print:block">
        <SimulationBanner />
        <Header />
        <div className="p-4 md:p-8 flex-1 print:p-0 print:block">
          {children}
        </div>
      </main>
    </div>
  )
}

