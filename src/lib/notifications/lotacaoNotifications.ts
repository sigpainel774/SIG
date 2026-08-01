import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Coleta os `auth_user_id` (IDs do auth.users) dos funcionários que possuem
 * acessos ativos nas escolas informadas, nos níveis informados.
 *
 * Sempre filtra IDs nulos (funcionários sem conta de login) para evitar
 * erro de tipo UUID no Postgres ao chamar a RPC criar_notificacoes.
 *
 * @param supabase  - Instância do cliente Supabase (browser ou server)
 * @param escolaIds - Lista de escola_id a considerar
 * @param niveis    - Níveis de acesso a incluir (default: [1, 2])
 * @returns Array de strings UUID prontos para passar à RPC criar_notificacoes
 */
export async function coletarAuthUserIds(
  supabase: SupabaseClient,
  escolaIds: string[],
  niveis: number[] = [1, 2]
): Promise<string[]> {
  if (!escolaIds.length) return []

  const userIds = new Set<string>()

  // Busca acessos ativos filtrando por escola(s) e nível(is)
  const { data: acessos } = await supabase
    .from('acessos_usuarios')
    .select('funcionarios(auth_user_id)')
    .in('escola_id', escolaIds)
    .in('nivel', niveis)
    .eq('ativo', true)

  if (acessos) {
    acessos.forEach((acc: any) => {
      const id = acc.funcionarios?.auth_user_id
      // ES-4: filtrar nulos para evitar erro de tipo uuid no Postgres
      if (id && typeof id === 'string' && id.length > 0) {
        userIds.add(id)
      }
    })
  }

  return Array.from(userIds)
}

/**
 * Coleta os `auth_user_id` dos administradores globais (nível 1) ativos,
 * independentemente de escola.
 */
export async function coletarAuthUserIdsAdminsGlobais(
  supabase: SupabaseClient
): Promise<string[]> {
  const userIds = new Set<string>()

  const { data: admins } = await supabase
    .from('acessos_usuarios')
    .select('funcionarios(auth_user_id)')
    .eq('nivel', 1)
    .eq('ativo', true)

  if (admins) {
    admins.forEach((acc: any) => {
      const id = acc.funcionarios?.auth_user_id
      if (id && typeof id === 'string' && id.length > 0) {
        userIds.add(id)
      }
    })
  }

  return Array.from(userIds)
}
