-- Migration: 055_dashboard_metrics_rpc.sql
-- Descrição: RPC para agregação de alta performance dos indicadores do Dashboard do SIG.

CREATE OR REPLACE FUNCTION public.get_dashboard_resumo(
  p_escola_id UUID,
  p_funcionario_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_alunos INT := 0;
  v_total_turmas INT := 0;
  v_total_funcionarios INT := 0;
  v_total_comunicados INT := 0;
  v_diarios_pendentes INT := 0;
  v_ocorrencias_mes INT := 0;
  v_inicio_mes TIMESTAMPTZ;
BEGIN
  v_inicio_mes := date_trunc('month', now());

  -- Total de alunos ativos na escola
  IF p_escola_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_alunos
    FROM public.alunos
    WHERE escola_id = p_escola_id AND deleted_at IS NULL;

    -- Total de turmas ativas na escola
    SELECT COUNT(*) INTO v_total_turmas
    FROM public.turmas
    WHERE escola_id = p_escola_id AND deleted_at IS NULL;

    -- Total de funcionarios lotados ativos
    SELECT COUNT(DISTINCT funcionario_id) INTO v_total_funcionarios
    FROM public.vinculos_funcionarios
    WHERE escola_id = p_escola_id AND ativo = true;

    -- Ocorrencias no mes corrente
    SELECT COUNT(*) INTO v_ocorrencias_mes
    FROM public.ocorrencias
    WHERE escola_id = p_escola_id AND created_at >= v_inicio_mes;

    -- Diarios/Atividades da secretaria pendentes
    SELECT COUNT(*) INTO v_diarios_pendentes
    FROM public.atividades_secretaria
    WHERE escola_id = p_escola_id AND status = 'pendente';
  ELSE
    -- Visao municipal global (Superadmin)
    SELECT COUNT(*) INTO v_total_alunos FROM public.alunos WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO v_total_turmas FROM public.turmas WHERE deleted_at IS NULL;
    SELECT COUNT(DISTINCT id) INTO v_total_funcionarios FROM public.funcionarios WHERE status = 'ativo' AND deleted_at IS NULL;
    SELECT COUNT(*) INTO v_ocorrencias_mes FROM public.ocorrencias WHERE created_at >= v_inicio_mes;
    SELECT COUNT(*) INTO v_diarios_pendentes FROM public.atividades_secretaria WHERE status = 'pendente';
  END IF;

  -- Total de comunicados no mural
  SELECT COUNT(*) INTO v_total_comunicados FROM public.comunicados;

  RETURN jsonb_build_object(
    'totalAlunos', v_total_alunos,
    'totalTurmas', v_total_turmas,
    'totalFuncionarios', v_total_funcionarios,
    'totalComunicados', v_total_comunicados,
    'diariosPendentes', v_diarios_pendentes,
    'ocorrenciasMes', v_ocorrencias_mes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_resumo(UUID, UUID) TO authenticated, anon, service_role;
