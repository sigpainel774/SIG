import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { VinculoFuncionario } from '@/store/useAuthStore'
import type { Database } from '@/types/supabase'

type Funcionario = Database['public']['Tables']['funcionarios']['Row']
type AcessoUsuario = Database['public']['Tables']['acessos_usuarios']['Row']

export type PerfilCache = {
  funcionario: Funcionario
  acessos: AcessoUsuario[]
  vinculos: VinculoFuncionario[]
}

/**
 * Busca o perfil completo do funcionário (dados, acessos e vínculos) com cache
 * de servidor (Next.js unstable_cache). O cache é armazenado por userId com
 * TTL de 1 hora e pode ser invalidado explicitamente via revalidateTag.
 *
 * Usa Promise.all para buscar acessos e vínculos em paralelo, reduzindo latência
 * no cache miss de ~2 roundtrips sequenciais para ~1 roundtrip paralelo.
 *
 * @param userId - UUID do usuário autenticado (auth.users.id)
 * @param email  - E-mail do usuário (usado para localizar o funcionário)
 * @returns PerfilCache | null (null = funcionário órfão, sem registro na tabela)
 */
export async function getPerfilUsuario(
  userId: string,
  email: string
): Promise<PerfilCache | null> {
  return unstable_cache(
    async (): Promise<PerfilCache | null> => {
      // Busca o funcionário pelo email (case-insensitive)
      const { data: funcData, error: funcError } = await supabaseAdmin
        .from('funcionarios')
        .select('*')
        .ilike('email', email)
        .maybeSingle()

      if (funcError) {
        console.error('[profileCache] Erro ao buscar funcionário:', funcError)
        throw new Error(`Erro ao buscar perfil do funcionário: ${funcError.message}`)
      }

      if (!funcData) return null

      // Reconciliação on-the-fly: vincula auth_user_id se ainda não estiver preenchido
      if (!funcData.auth_user_id) {
        try {
          await supabaseAdmin
            .from('funcionarios')
            .update({ auth_user_id: userId })
            .eq('id', funcData.id)
          funcData.auth_user_id = userId
        } catch (err) {
          console.error('[profileCache] Erro na reconciliação do auth_user_id:', err)
        }
      }

      // Busca acessos e vínculos em paralelo para reduzir latência
      const [acessosRes, vinculosRes] = await Promise.all([
        supabaseAdmin
          .from('acessos_usuarios')
          .select('*')
          .eq('funcionario_id', funcData.id)
          .eq('ativo', true),
        supabaseAdmin
          .from('vinculos_funcionarios')
          .select('id, escola_id, cargo, ativo, escolas(nome)')
          .eq('funcionario_id', funcData.id),
      ])

      if (acessosRes.error) {
        console.error('[profileCache] Erro ao buscar acessos:', acessosRes.error)
        throw new Error(`Erro ao carregar permissões: ${acessosRes.error.message}`)
      }

      if (vinculosRes.error) {
        console.error('[profileCache] Erro ao buscar vínculos:', vinculosRes.error)
        throw new Error(`Erro ao carregar lotações: ${vinculosRes.error.message}`)
      }

      const vinculos: VinculoFuncionario[] = (vinculosRes.data || []).map((v: any) => ({
        id: v.id,
        escola_id: v.escola_id,
        escolaNome: v.escolas?.nome,
        cargo: v.cargo,
        ativo: v.ativo,
      }))

      return {
        funcionario: funcData,
        acessos: (acessosRes.data || []) as AcessoUsuario[],
        vinculos,
      }
    },
    // Cache key único por usuário
    [`perfil-usuario-${userId}`],
    {
      revalidate: 3600, // 1 hora (em segundos)
      tags: [`perfil-${userId}`],
    }
  )()
}
