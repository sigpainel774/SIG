import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { RootAdminHeader } from '@/components/RootAdminHeader'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isSuperAdmin = false

  if (user && user.email) {
    const { data } = await supabaseAdmin
      .from('funcionarios')
      .select('is_superadmin')
      .eq('email', user.email)
      .single()
    
    isSuperAdmin = data?.is_superadmin || false
  }

  // Layout exclusivo para Super Admin (Root)
  if (isSuperAdmin) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-foregroundCustom">
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
