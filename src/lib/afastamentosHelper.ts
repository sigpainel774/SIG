import { SupabaseClient } from '@supabase/supabase-js'

export async function verificarEAtualizarRetornosAfastamentos(supabase: SupabaseClient) {
  try {
    const hojeStr = new Date().toISOString().split('T')[0]

    // Buscar atestados cujo término seja menor ou igual à data de hoje, e que o funcionário esteja com status 'afastado'
    const { data: atestadosExpirados, error } = await (supabase.from as any)('atestados')
      .select(`
        id,
        cid,
        dias_afastamento,
        data_fim,
        escola_id,
        funcionario_id,
        funcionarios!inner(id, nome, status)
      `)
      .lte('data_fim', hojeStr)
      .not('data_fim', 'is', null)

    if (error) {
      console.error('Erro ao verificar atestados expirados:', error)
      return
    }

    if (!atestadosExpirados || (atestadosExpirados as any[]).length === 0) return

    for (const atest of atestadosExpirados as any[]) {
      const func = atest.funcionarios as any
      if (!func || func.status !== 'afastado') continue

      // 1. Atualizar status do funcionário para 'ativo'
      const { error: updateError } = await supabase
        .from('funcionarios')
        .update({ status: 'ativo' })
        .eq('id', func.id)

      if (updateError) {
        console.error(`Erro ao retornar funcionário ${func.id} à ativa:`, updateError)
        continue
      }

      // 2. Buscar usuários de nível 2 (Diretores/Chefes) da escola em acessos_usuarios
      let queryNivel2 = supabase
        .from('acessos_usuarios')
        .select('funcionario_id, funcionarios!inner(auth_user_id, nome)')
        .eq('nivel', 2)
        .eq('ativo', true)

      if (atest.escola_id) {
        queryNivel2 = queryNivel2.eq('escola_id', atest.escola_id)
      }

      const { data: gestores, error: gestoresError } = await queryNivel2

      if (gestoresError) {
        console.error('Erro ao buscar gestores Nível 2 para notificação:', gestoresError)
      } else if (gestores && gestores.length > 0) {
        const notificacoes = (gestores as any[])
          .map((g: any) => {
            const authUserId = g.funcionarios?.auth_user_id
            if (!authUserId) return null
            return {
              user_id: authUserId,
              title: 'Retorno de Servidor à Ativa',
              message: `O servidor ${func.nome} concluiu o período de afastamento/licença e retornou à ativa hoje (${new Date().toLocaleDateString('pt-BR')}).`,
              type: 'info',
              link: '/funcionarios',
              read: false,
            }
          })
          .filter((n): n is NonNullable<typeof n> => n !== null)

        if (notificacoes.length > 0) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notificacoes as any)

          if (notifError) {
            console.error('Erro ao registrar notificações de retorno à ativa:', notifError)
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro inesperado na verificação de retorno de afastamentos:', err)
  }
}
