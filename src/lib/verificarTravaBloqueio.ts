/**
 * verificarTravaBloqueio.ts
 *
 * Utilitário centralizado para verificar se a edição de um funcionário-alvo
 * está bloqueada pelas configurações globais da rede.
 *
 * Suporta três modos de bloqueio (cumulativos):
 *   1. Toda a rede  → bloquear_edicao_funcionarios_rede = true
 *   2. Por secretaria → escola do funcionário pertence a uma secretaria bloqueada
 *   3. Por escola   → escola do funcionário está na lista de escolas bloqueadas
 *
 * Semântica de falha:
 *   - Fail-open: erros de conectividade NÃO bloqueiam o usuário (conserva experiência).
 *   - Caso o funcionário-alvo não tenha vínculo de escola registrado, a verificação
 *     granular (por secretaria / por escola) retorna false (não bloqueado).
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
 * @param configRede   Objeto com as configurações de bloqueio (pode ser null → fail-open).
 * @param funcionarioAlvoId  UUID do funcionário que se deseja editar.
 * @param supabase     Cliente Supabase (browser) para buscar vínculos do alvo.
 * @returns true  → edição BLOQUEADA
 *          false → edição PERMITIDA
 */
export async function verificarTravaEdicaoFuncionario(
  configRede: ConfigRedeBloqueioParcial | null,
  funcionarioAlvoId: string | null | undefined,
  supabase: SupabaseClient
): Promise<boolean> {
  // Sem configuração (erro de rede) → fail-open
  if (!configRede) return false

  // ── 1. Bloqueio de toda a rede ────────────────────────────────
  if (configRede.bloquear_edicao_funcionarios_rede === true) return true

  const bloqueadosPorSecretaria = configRede.bloquear_por_secretarias ?? []
  const bloqueadosPorEscola = configRede.bloquear_por_escolas ?? []

  const temBloqueioGranular = bloqueadosPorSecretaria.length > 0 || bloqueadosPorEscola.length > 0

  // Sem bloqueio granular configurado → liberado
  if (!temBloqueioGranular) return false

  // Sem funcionário alvo identificado → não bloqueia (edge case: novo cadastro)
  if (!funcionarioAlvoId) return false

  // ── 2. Busca escolas do funcionário-alvo via vínculos ativos ──
  let escolasDoAlvo: { escola_id: string | null }[] = []

  try {
    const { data: vinculos, error } = await supabase
      .from('vinculos_funcionarios')
      .select('escola_id')
      .eq('funcionario_id', funcionarioAlvoId)
      .eq('ativo', true)

    if (error) {
      console.warn('[verificarTravaBloqueio] Erro ao buscar vínculos do funcionário-alvo.', error)
      return false // fail-open
    }

    escolasDoAlvo = vinculos ?? []
  } catch (err) {
    console.warn('[verificarTravaBloqueio] Erro inesperado ao buscar vínculos.', err)
    return false // fail-open
  }

  // Sem vínculos → não bloqueia (funcionário sem lotação não é afetado pelo filtro granular)
  if (escolasDoAlvo.length === 0) return false

  const escolaIdsDoAlvo = escolasDoAlvo
    .map((v) => v.escola_id)
    .filter((id): id is string => !!id)

  // ── 3. Verificar bloqueio por escola ─────────────────────────
  if (bloqueadosPorEscola.length > 0) {
    const bloqueadoPorEscola = escolaIdsDoAlvo.some((id) => bloqueadosPorEscola.includes(id))
    if (bloqueadoPorEscola) return true
  }

  // ── 4. Verificar bloqueio por secretaria ─────────────────────
  if (bloqueadosPorSecretaria.length > 0) {
    try {
      const { data: escolas, error } = await supabase
        .from('escolas')
        .select('id, secretaria_id')
        .in('id', escolaIdsDoAlvo)
        .is('deleted_at', null)

      if (error) {
        console.warn('[verificarTravaBloqueio] Erro ao buscar secretaria_id das escolas.', error)
        return false // fail-open
      }

      const bloqueadoPorSecretaria = (escolas ?? []).some(
        (esc) => esc.secretaria_id && bloqueadosPorSecretaria.includes(esc.secretaria_id)
      )

      if (bloqueadoPorSecretaria) return true
    } catch (err) {
      console.warn('[verificarTravaBloqueio] Erro inesperado ao verificar secretaria.', err)
      return false // fail-open
    }
  }

  return false
}
