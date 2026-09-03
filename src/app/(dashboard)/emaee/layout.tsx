import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getPerfilUsuario } from '@/lib/profileCache'
import { createClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'EMAEE - Atendimento Multidisciplinar',
  description: 'Espaço Municipal de Atendimento Educacional Especializado'
}

export default async function EmaeeLayout({ children }: { children: ReactNode }) {
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
    const func = perfil?.funcionario
    const isSuperAdmin = Boolean(func?.is_superadmin)
    const temNivel1 = Boolean(perfil?.acessos?.some((a: any) => a.nivel === 1 && a.ativo))
    const isProfissionalAee = Boolean((func as any)?.is_profissional_aee)
    const cargo = (func?.cargo || '').toLowerCase()
    const cargoEmaee = /aee|psic[oó]log|psicopedagog|fonoaudi[oó]log|terapeuta|fisioterapeuta|especial/i.test(cargo)
    const temVinculoEmaee = Boolean(perfil?.vinculos?.some((v: any) => v.ativo && /emaee/i.test(v.escolaNome || '')))

    if (!isSuperAdmin && !temNivel1 && !isProfissionalAee && !cargoEmaee && !temVinculoEmaee) {
      redirect('/home')
    }
  } else {
    redirect('/login')
  }

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {children}
    </div>
  )
}
