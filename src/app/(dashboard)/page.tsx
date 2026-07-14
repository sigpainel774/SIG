import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer'
import { getCachedFuncionarioByEmail } from '@/lib/auth-cache'

/**
 * Página raiz do dashboard ("/").
 *
 * Responsabilidade única: redirecionar o usuário autenticado
 * para o painel correto (/admin para superadmin, /home para demais).
 *
 * Esta lógica foi movida para cá a partir do proxy.ts, eliminando
 * a consulta ao banco de dados no middleware.
 *
 * Como está dentro do grupo (dashboard), o DashboardLayout já executa
 * getCachedFuncionarioByEmail() antes desta página. O React.cache()
 * garante que a segunda chamada aqui não dispara uma nova query ao banco.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  // React.cache() deduplica: se DashboardLayout já chamou isto, retorna do cache em memória.
  const funcionario = await getCachedFuncionarioByEmail(user.email)

  if (!funcionario) {
    redirect('/login?error=orphan')
  }

  redirect(funcionario.is_superadmin ? '/admin' : '/home')
}
