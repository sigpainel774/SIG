-- Migration: Correção de Segurança em RPCs SECURITY DEFINER (G-3)
-- Data: 2026-07-30

-- 1. RPC para Admin Dashboard KPIs (G-3)
CREATE OR REPLACE FUNCTION public.obter_admin_dashboard_kpis(
  p_escola_id UUID,
  p_data DATE DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  p_inicio_mes TIMESTAMPTZ DEFAULT date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_total_alunos INT := 0;
  v_total_turmas INT := 0;
  v_ocorrencias_mes INT := 0;
  v_transferencias_pendentes INT := 0;
  v_atividades_pendentes INT := 0;
  v_turmas_com_freq_hoje INT := 0;
BEGIN
  -- Validação de Segurança e Pertencimento via auth.uid()
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM public.funcionarios f
    LEFT JOIN public.acessos_usuarios a ON a.funcionario_id = f.id AND a.ativo = true
    LEFT JOIN public.vinculos_funcionarios v ON v.funcionario_id = f.id AND v.ativo = true
    WHERE f.auth_user_id = auth.uid()
      AND (
        f.is_superadmin = true 
        OR a.nivel = 1
        OR a.escola_id = p_escola_id
        OR v.escola_id = p_escola_id
      )
  ) THEN
    RAISE EXCEPTION 'Acesso negado para esta escola.';
  END IF;

  -- Total de alunos ativos
  SELECT COUNT(*) INTO v_total_alunos
  FROM public.alunos
  WHERE escola_id = p_escola_id AND deleted_at IS NULL;

  -- Total de turmas ativas
  SELECT COUNT(*) INTO v_total_turmas
  FROM public.turmas
  WHERE escola_id = p_escola_id AND deleted_at IS NULL;

  -- Ocorrências do mês
  SELECT COUNT(*) INTO v_ocorrencias_mes
  FROM public.ocorrencias
  WHERE escola_id = p_escola_id AND created_at >= p_inicio_mes;

  -- Transferências pendentes
  SELECT COUNT(*) INTO v_transferencias_pendentes
  FROM public.transferencias_alunos
  WHERE escola_destino_id = p_escola_id AND status = 'pendente';

  -- Atividades pendentes na secretaria
  SELECT COUNT(*) INTO v_atividades_pendentes
  FROM public.atividades_secretaria
  WHERE escola_id = p_escola_id AND status IN ('recebida', 'em_impressao');

  -- Turmas com frequência registrada hoje
  SELECT COUNT(DISTINCT turma_id) INTO v_turmas_com_freq_hoje
  FROM public.frequencias
  WHERE escola_id = p_escola_id AND data = p_data;

  RETURN jsonb_build_object(
    'totalAlunos', COALESCE(v_total_alunos, 0),
    'totalTurmas', COALESCE(v_total_turmas, 0),
    'ocorrenciasMes', COALESCE(v_ocorrencias_mes, 0),
    'transferenciasPendentes', COALESCE(v_transferencias_pendentes, 0),
    'turmasComFrequenciaHoje', COALESCE(v_turmas_com_freq_hoje, 0),
    'totalTurmasAtivas', COALESCE(v_total_turmas, 0),
    'atividadesPendentesSecretaria', COALESCE(v_atividades_pendentes, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.obter_admin_dashboard_kpis(UUID, DATE, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_admin_dashboard_kpis(UUID, DATE, TIMESTAMPTZ) TO authenticated;

-- 2. RPC para Estatísticas Multi-Escola de Professores (G-3)
CREATE OR REPLACE FUNCTION public.obter_multi_escolas_stats(
  p_funcionario_id UUID,
  p_escola_ids UUID[],
  p_data DATE DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_escola_id UUID;
  v_turmas_count INT;
  v_aulas_count INT;
  v_chamadas_pendentes INT;
BEGIN
  -- Validação de Segurança via auth.uid()
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM public.funcionarios f
    LEFT JOIN public.acessos_usuarios a ON a.funcionario_id = f.id AND a.ativo = true
    WHERE f.auth_user_id = auth.uid()
      AND (
        f.is_superadmin = true 
        OR a.nivel = 1
        OR f.id = p_funcionario_id
      )
  ) THEN
    RAISE EXCEPTION 'Acesso negado para as estatísticas solicitadas.';
  END IF;

  IF p_escola_ids IS NULL OR array_length(p_escola_ids, 1) IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  FOREACH v_escola_id IN ARRAY p_escola_ids LOOP
    -- Turmas vinculadas
    SELECT COUNT(*) INTO v_turmas_count
    FROM public.vinculos_turmas
    WHERE funcionario_id = p_funcionario_id AND escola_id = v_escola_id;

    -- Aulas hoje
    SELECT COUNT(*) INTO v_aulas_count
    FROM public.agenda_aulas
    WHERE professor_id = p_funcionario_id 
      AND escola_id = v_escola_id 
      AND data = p_data 
      AND status != 'cancelado';

    -- Chamadas pendentes hoje
    SELECT COUNT(*) INTO v_chamadas_pendentes
    FROM public.agenda_aulas a
    WHERE a.professor_id = p_funcionario_id 
      AND a.escola_id = v_escola_id 
      AND a.data = p_data 
      AND a.status != 'cancelado'
      AND NOT EXISTS (
        SELECT 1 FROM public.frequencias f 
        WHERE f.escola_id = v_escola_id 
          AND f.data = p_data
          AND (
            f.agenda_aula_id = a.id 
            OR (f.materia_id = a.materia_id AND f.turma_id = a.turma_id AND f.data = a.data)
          )
      );

    v_result := v_result || jsonb_build_object(
      v_escola_id::text, jsonb_build_object(
        'turmas', COALESCE(v_turmas_count, 0),
        'aulasHoje', COALESCE(v_aulas_count, 0),
        'chamadasPendentes', COALESCE(v_chamadas_pendentes, 0)
      )
    );
  END LOOP;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.obter_multi_escolas_stats(UUID, UUID[], DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.obter_multi_escolas_stats(UUID, UUID[], DATE) TO authenticated;
