import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { RootAdminHeader } from '@/components/RootAdminHeader'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { AuthInitializer } from '@/components/AuthInitializer'
import { PerformanceTracker } from '@/components/PerformanceTracker'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isSuperAdmin = false
  let funcionario = null
  let acessos: any[] = []
  let vinculos: any[] = []

  if (user && user.email) {
    const { data: funcData } = await supabaseAdmin
      .from('funcionarios')
      .select('*')
      .ilike('email', user.email)
      .maybeSingle()
    
    if (funcData) {
      // Reconciliação on-the-fly
      if (!funcData.auth_user_id) {
        try {
          await supabaseAdmin.from('funcionarios').update({ auth_user_id: user.id }).eq('id', funcData.id)
          funcData.auth_user_id = user.id
        } catch (err) {
          console.error('Erro na reconciliação do auth_user_id no layout:', err)
        }
      }

      funcionario = funcData
      isSuperAdmin = funcData.is_superadmin || false

      const { data: acessosData } = await supabaseAdmin
        .from('acessos_usuarios')
        .select('*')
        .eq('funcionario_id', funcData.id)
        .eq('ativo', true)
      
      acessos = acessosData || []

      const { data: vinculosData } = await supabaseAdmin
        .from('vinculos_funcionarios')
        .select('id, escola_id, cargo, ativo, escolas(nome)')
        .eq('funcionario_id', funcData.id)
      
      vinculos = (vinculosData || []).map(v => ({
        id: v.id,
        escola_id: v.escola_id,
        escolaNome: v.escolas?.nome,
        cargo: v.cargo,
        ativo: v.ativo
      }))
    } else {
      // Usuário órfão: logado mas sem cadastro na tabela funcionarios
      redirect('/login?error=orphan')
    }
  }

  // Layout exclusivo para Super Admin (Root)
  if (isSuperAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foregroundCustom">
        <AuthInitializer funcionario={funcionario} acessos={acessos} vinculos={vinculos} />
        <PerformanceTracker />
        <RootAdminHeader />
        <main className="flex-1 overflow-auto p-4 sm:p-8">
          {children}
        </main>
      </div>
    )
  }

  // Layout tradicional para Escolas (Níveis 1 a 6)
  return (
    <div className="flex min-h-screen bg-background text-foregroundCustom">
      <AuthInitializer funcionario={funcionario} acessos={acessos} vinculos={vinculos} />
      <PerformanceTracker />
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0 print:overflow-visible print:block">
        <Header />
        <div className="p-4 md:p-8 flex-1 print:p-0 print:block">
          {children}
        </div>
      </main>
    </div>
  )
}
