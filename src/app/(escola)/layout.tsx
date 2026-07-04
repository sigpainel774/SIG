import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { redirect } from 'next/navigation'

export default async function EscolaLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let isSuperAdmin = false

  if (user && user.email) {
    const { data } = await supabaseAdmin
      .from('funcionarios')
      .select('is_superadmin')
      .ilike('email', user.email)
      .limit(1)
      .maybeSingle()
    
    isSuperAdmin = data?.is_superadmin || false
  }

  // Se o super admin tentar acessar a rota escolar, redireciona ele para o admin
  if (isSuperAdmin) {
    redirect('/admin')
  }

  // Layout tradicional para Escolas (Níveis 1 a 6)
  return (
    <div className="flex min-h-screen bg-background text-foregroundCustom">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0 print:overflow-visible print:block">
        <Header />
        <div className="p-8 flex-1 print:p-0 print:block">
          {children}
        </div>
      </main>
    </div>
  )
}
