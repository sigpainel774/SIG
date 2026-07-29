import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getPerfilUsuario } from '@/lib/profileCache'

export const dynamic = 'force-dynamic'

export default async function PrimeiroAcessoLayout({ children }: { children: ReactNode }) {
  const headersList = await headers()
  const userId = headersList.get('x-user-id')
  const userEmail = headersList.get('x-user-email')

  if (userId && userEmail) {
    const perfil = await getPerfilUsuario(userId, userEmail)
    
    // Se o usuário não tiver a flag de primeiro_acesso verdadeira, expulsa de volta pro painel
    if (!perfil?.funcionario?.primeiro_acesso) {
      redirect('/home')
    }
  } else {
    // Se não estiver logado, não tem o que fazer aqui
    redirect('/login')
  }

  return <>{children}</>
}
