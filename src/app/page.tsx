import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabaseServer'
import { getPerfilUsuario } from '@/lib/profileCache'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const headersList = await headers()
  let userId = headersList.get('x-user-id')
  let userEmail = headersList.get('x-user-email')

  if (!userId || !userEmail) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userId = user?.id || null
    userEmail = user?.email || null

    if (user?.user_metadata?.tipo_conta === 'responsavel') {
      if (user.user_metadata?.must_change_password) {
        redirect('/portal-aluno/trocar-senha')
      }
      redirect('/portal-aluno/dashboard')
    }
  }

  if (!userId || !userEmail) {
    redirect('/login')
  }

  const perfil = await getPerfilUsuario(userId, userEmail)
  if (!perfil || !perfil.funcionario) {
    redirect('/login?error=orphan')
  }

  if (perfil.funcionario.primeiro_acesso) {
    redirect('/primeiro-acesso')
  }

  if (perfil.funcionario.is_superadmin) {
    redirect('/admin')
  }

  redirect('/home')
}

