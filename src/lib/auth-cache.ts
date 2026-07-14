import { cache } from 'react'
import { supabaseAdmin } from './supabaseAdmin'

/**
 * Busca o funcionário pelo e-mail (case-insensitive).
 * Usa React.cache() para deduplicar chamadas dentro do mesmo request SSR.
 * DashboardLayout e RootPage chamam esta função — o banco é consultado apenas uma vez.
 */
export const getCachedFuncionarioByEmail = cache(async (email: string) => {
  const { data } = await supabaseAdmin
    .from('funcionarios')
    .select('*')
    .ilike('email', email)
    .maybeSingle()
  return data
})

/**
 * Busca os acessos ativos de um funcionário.
 * Deduplica chamadas dentro do mesmo request SSR.
 */
export const getCachedAcessos = cache(async (funcionarioId: string) => {
  const { data } = await supabaseAdmin
    .from('acessos_usuarios')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .eq('ativo', true)
  return data ?? []
})

/**
 * Busca os vínculos de um funcionário com suas escolas.
 * Deduplica chamadas dentro do mesmo request SSR.
 */
export const getCachedVinculos = cache(async (funcionarioId: string) => {
  const { data } = await supabaseAdmin
    .from('vinculos_funcionarios')
    .select('id, escola_id, cargo, ativo, escolas(nome)')
    .eq('funcionario_id', funcionarioId)
  return data ?? []
})
