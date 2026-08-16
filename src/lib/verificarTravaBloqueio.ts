/**
 * verificarTravaBloqueio.ts
 *
 * Utilitário centralizado para verificar se a edição de um funcionário-alvo
 * está bloqueada pelas configurações globais da rede.
 *
 * Suporta três modos de bloqueio (cumulativos):
 *   1. Toda a rede    → bloquear_edicao_funcionarios_rede = true
 *   2. Por secretaria → escola do funcionário pertence a uma secretaria bloqueada
 *   3. Por escola     → escola do funcionário está na lista de escolas bloqueadas
 *
 * Semântica de execução:
 *   - Chama a RPC SECURITY DEFINER `verificar_trava_edicao_funcionario` no Postgres,
 *     garantindo resolução atômica e imune a restrições de visibilidade RLS do client.
 *   - Em caso de falha de conexão, opera em modo fail-open (retorna false) para não
 *     bloquear indevidamente o usuário legítimo.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConfigRedeBloqueioParcial {
  bloquear_edicao_funcionarios_rede: boolean | null
  bloquear_por_secretarias: string[] | null
  bloquear_por_escolas: string[] | null
}

/**
 * Busca a configuração de bloqueio completa da rede.
 * Retorna null em caso de erro (para fail-open no caller).
 */
export async function buscarConfigBloqueioRede(
  supabase: SupabaseClient
): Promise<ConfigRedeBloqueioParcial | null> {
  try {
    const { data, error } = await supabase
      .from('configuracoes_rede')
      .select('bloquear_edicao_funcionarios_rede, bloquear_por_secretarias, bloquear_por_escolas')
      .limit(1)
      .single()

    if (error) {
      console.warn('[verificarTravaBloqueio] Não foi possível buscar configuracoes_rede.', error)
      return null
    }

    return data as ConfigRedeBloqueioParcial
  } catch (err) {
    console.warn('[verificarTravaBloqueio] Erro inesperado ao buscar configuracoes_rede.', err)
    return null
  }
}

/**
 * Verifica se a edição do funcionário-alvo está bloqueada.
 *
 * @param configRede         Objeto de configuração (opcional / fallback).
 * @param funcionarioAlvoId  UUID do funcionário que se deseja editar (null em cadastro novo).
 * @param supabase           Cliente Supabase.
 * @returns true  → edição BLOQUEADA
 *          false → edição PERMITIDA
 */
export async function verificarTravaEdicaoFuncionario(
  configRede: ConfigRedeBloqueioParcial | null,
  funcionarioAlvoId: string | null | undefined,
  supabase: SupabaseClient
): Promise<boolean> {
  // Novo cadastro (sem funcionário alvo ainda) → liberado
  if (!funcionarioAlvoId) {
    // Se a rede inteira estiver bloqueada, checa se configRede já indica bloqueio global
    if (configRede?.bloquear_edicao_funcionarios_rede === true) return true
    return false
  }

  // 1. Prioriza a RPC SECURITY DEFINER (atômica e imune a RLS de client)
  try {
    const { data, error } = await supabase.rpc('verificar_trava_edicao_funcionario', {
      p_funcionario_alvo_id: funcionarioAlvoId,
    })

    if (!error && typeof data === 'boolean') {
      return data
    }
  } catch (rpcErr) {
    console.warn('[verificarTravaBloqueio] RPC indisponível, usando fallback local.', rpcErr)
  }

  // 2. Fallback local baseado em configRede
  if (!configRede) return false
  if (configRede.bloquear_edicao_funcionarios_rede === true) return true

  const bloqueadosPorSecretaria = configRede.bloquear_por_secretarias ?? []
  const bloqueadosPorEscola = configRede.bloquear_por_escolas ?? []

  const temBloqueioGranular = bloqueadosPorSecretaria.length > 0 || bloqueadosPorEscola.length > 0
  if (!temBloqueioGranular) return false

  try {
    const { data: vinculos } = await supabase
      .from('vinculos_funcionarios')
      .select('escola_id')
      .eq('funcionario_id', funcionarioAlvoId)
      .eq('ativo', true)

    const escolaIds = (vinculos ?? [])
      .map((v) => v.escola_id)
      .filter((id): id is string => !!id)

    if (escolaIds.length === 0) return false

    if (bloqueadosPorEscola.length > 0 && escolaIds.some((id) => bloqueadosPorEscola.includes(id))) {
      return true
    }

    if (bloqueadosPorSecretaria.length > 0) {
      const { data: escolas } = await supabase
        .from('escolas')
        .select('id, secretaria_id')
        .in('id', escolaIds)
        .is('deleted_at', null)

      const bloqueadoPorSec = (escolas ?? []).some(
        (esc) => esc.secretaria_id && bloqueadosPorSecretaria.includes(esc.secretaria_id)
      )
      if (bloqueadoPorSec) return true
    }
  } catch (fallbackErr) {
    console.warn('[verificarTravaBloqueio] Erro no fallback local.', fallbackErr)
  }

  return false
}
