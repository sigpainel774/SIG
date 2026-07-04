import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data } = await supabaseAdmin
    .from('funcionarios')
    .select('is_superadmin')
    .eq('auth_user_id', user.id)
    .maybeSingle()
    
  if (!data?.is_superadmin) {
    redirect('/home')
  }

  return <>{children}</>
}
