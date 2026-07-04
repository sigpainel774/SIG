import { ReactNode } from 'react'
import { RootAdminHeader } from '@/components/RootAdminHeader'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: ReactNode }) {
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

  // Se não for super admin, barra e manda de volta pra home da escola
  if (!isSuperAdmin) {
    redirect('/home')
  }

  // Layout exclusivo para Super Admin (Root)
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-foregroundCustom">
      <RootAdminHeader />
      <main className="flex-1 overflow-auto p-4 sm:p-8">
        {children}
      </main>
    </div>
  )
}
