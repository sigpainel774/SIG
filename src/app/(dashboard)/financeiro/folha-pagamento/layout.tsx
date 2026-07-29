import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getPerfilUsuario } from '@/lib/profileCache'

export const dynamic = 'force-dynamic'

export default async function FolhaPagamentoLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')
  const userEmail = headersList.get('x-user-email')

  if (userId && userEmail) {
    const perfil = await getPerfilUsuario(userId, userEmail)
    
    const isSuperAdmin = perfil?.funcionario?.is_superadmin
    const temNivel1 = perfil?.acessos?.some((a: any) => a.nivel === 1)
    
    if (!isSuperAdmin && !temNivel1) {
      redirect('/home')
    }
  } else {
    redirect('/login')
  }

  return <>{children}</>
}
