import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getPerfilUsuario } from '@/lib/profileCache'
import { createClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  let userId = headersList.get('x-user-id')
  let userEmail = headersList.get('x-user-email')

  if (!userId || !userEmail) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
    userEmail = user?.email || null
  }

  if (userId && userEmail) {
    const perfil = await getPerfilUsuario(userId, userEmail)

    const isSuperAdmin = Boolean(perfil?.funcionario?.is_superadmin)
    const temNivel1 = Boolean(perfil?.acessos?.some((a: any) => a.nivel === 1 && a.ativo))

    if (!isSuperAdmin && !temNivel1) {
      redirect('/home')
    }
  } else {
    redirect('/login')
  }

  return <>{children}</>
}
