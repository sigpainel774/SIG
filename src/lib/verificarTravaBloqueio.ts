/**
 * verificarTravaBloqueio.ts
 *
 * Utilitário centralizado para verificar travas de bloqueio e exceções de edição:
 *   1. Toda a rede        → bloquear_edicao_funcionarios_rede = true
 *   2. Por secretaria     → secretaria está na lista de bloqueadas
 *   3. Por escola         → escola está na lista de bloqueadas
 *   4. Módulo EMAEE       → bloquear_emaee = true (profissionais AEE / atendimentos)
 *   5. Por Ano Letivo     → ano_letivo está em bloquear_por_anos_letivos
 *   6. Nível de Usuário   →
 *      - Whitelist (liberar_por_usuarios) : Permissão especial que ignora bloqueios gerais
 *      - Blacklist (bloquear_por_usuarios): Bloqueio individual mandatório
 *
 * Semântica de execução:
 *   - Prioriza a RPC SECURITY DEFINER `verificar_trava_edicao_funcionario` no Postgres.
 *   - Executa fallback local resiliente baseado no objeto `ConfigRedeBloqueioParcial`.
 *   - Em caso de falha de conexão, opera em modo fail-open (retorna false) para não
 *     bloquear indevidamente o usuário legítimo.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConfigRedeBloqueioParcial {
  bloquear_edicao_funcionarios_rede: boolean | null
  bloquear_por_secretarias: string[] | null
  bloquear_por_escolas: string[] | null
  bloquear_emaee?: boolean | null
  bloquear_por_anos_letivos?: number[] | null
  bloquear_por_usuarios?: string[] | null
  liberar_por_usuarios?: string[] | null
}

export interface OpcoesVerificacaoBloqueio {
  usuarioExecutorId?: string | null
  anoLetivo?: number | null
  isEmaee?: boolean
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
      .select(`
        bloquear_edicao_funcionarios_rede,
        bloquear_por_secretarias,
        bloquear_por_escolas,
        bloquear_emaee,
        bloquear_por_anos_letivos,
        bloquear_por_usuarios,
        liberar_por_usuarios
      `)
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
 * @param opcoes             Opções extras (executor, ano letivo, flag EMAEE).
 * @returns true  → edição BLOQUEADA
 *          false → edição PERMITIDA
 */
export async function verificarTravaEdicaoFuncionario(
  configRede: ConfigRedeBloqueioParcial | null,
  funcionarioAlvoId: string | null | undefined,
  supabase: SupabaseClient,
  opcoes?: OpcoesVerificacaoBloqueio
): Promise<boolean> {
  const usuarioExecutorId = opcoes?.usuarioExecutorId ?? null
  const anoLetivo = opcoes?.anoLetivo ?? null
  const isEmaee = opcoes?.isEmaee ?? false

  // 1. Prioriza a RPC SECURITY DEFINER (atômica e imune a RLS de client)
  try {
    const { data, error } = await supabase.rpc('verificar_trava_edicao_funcionario', {
      p_funcionario_alvo_id: funcionarioAlvoId ?? null,
      p_usuario_executor_id: usuarioExecutorId,
      p_ano_letivo: anoLetivo,
      p_is_emaee: isEmaee,
    } as any)

    if (!error && typeof data === 'boolean') {
      return data
    }
  } catch (rpcErr) {
    console.warn('[verificarTravaBloqueio] RPC indisponível, usando fallback local.', rpcErr)
  }

  // 2. Fallback local baseado em configRede
  if (!configRede) return false

  const whitelist = configRede.liberar_por_usuarios ?? []
  const blacklist = configRede.bloquear_por_usuarios ?? []

  // 2.1. Whitelist de Usuário Executor (Prioridade máxima: bypass de bloqueio)
  if (usuarioExecutorId && whitelist.includes(usuarioExecutorId)) {
    return false
  }

  // 2.2. Blacklist de Usuário (Bloqueio mandatório)
  if (usuarioExecutorId && blacklist.includes(usuarioExecutorId)) {
    return true
  }
  if (funcionarioAlvoId && blacklist.includes(funcionarioAlvoId)) {
    return true
  }

  // 2.3. Trava do Módulo EMAEE
  if (configRede.bloquear_emaee === true) {
    if (isEmaee) return true
    if (funcionarioAlvoId) {
      try {
        const { data: func } = await supabase
          .from('funcionarios')
          .select('is_profissional_aee')
          .eq('id', funcionarioAlvoId)
          .single()
        if (func?.is_profissional_aee) return true
      } catch (err) {
        console.warn('[verificarTravaBloqueio] Erro ao verificar flag AEE do funcionário.', err)
      }
    }
  }

  // 2.4. Trava por Ano Letivo
  if (anoLetivo !== null && (configRede.bloquear_por_anos_letivos ?? []).includes(anoLetivo)) {
    return true
  }

  // 2.5. Trava Global de Toda a Rede
  if (configRede.bloquear_edicao_funcionarios_rede === true) {
    return true
  }

  // Se for novo cadastro sem alvo e rede não estiver bloqueada globalmente
  if (!funcionarioAlvoId) {
    return false
  }

  // 2.6. Trava Granular por Secretaria ou Escola
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

/**
 * Helper rápido para verificar se um Ano Letivo específico está bloqueado.
 */
export async function verificarTravaAnoLetivo(
  configRede: ConfigRedeBloqueioParcial | null,
  anoLetivo: number,
  usuarioExecutorId?: string | null,
  supabase?: SupabaseClient
): Promise<boolean> {
  const whitelist = configRede?.liberar_por_usuarios ?? []
  if (usuarioExecutorId && whitelist.includes(usuarioExecutorId)) return false

  if (configRede?.bloquear_por_anos_letivos?.includes(anoLetivo)) return true
  if (configRede?.bloquear_edicao_funcionarios_rede === true) return true

  return false
}

/**
 * Helper rápido para verificar se o Módulo EMAEE está bloqueado.
 */
export async function verificarTravaEmaee(
  configRede: ConfigRedeBloqueioParcial | null,
  usuarioExecutorId?: string | null
): Promise<boolean> {
  const whitelist = configRede?.liberar_por_usuarios ?? []
  if (usuarioExecutorId && whitelist.includes(usuarioExecutorId)) return false

  if (configRede?.bloquear_emaee === true) return true
  if (configRede?.bloquear_edicao_funcionarios_rede === true) return true

  return false
}
