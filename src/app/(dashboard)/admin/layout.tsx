import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  let data = null
  if (user.email) {
    const result = await supabaseAdmin
      .from('funcionarios')
      .select('is_superadmin')
      .ilike('email', user.email)
      .maybeSingle()
    data = result.data
  }
    
  if (!data?.is_superadmin) {
    redirect('/home')
  }

  return <>{children}</>
}
