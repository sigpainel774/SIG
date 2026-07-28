-- Migration: RPCs consolidadas para Dashboards (M-1) e Boletim Escolar (M-2)
-- Data: 2026-07-25

-- 1. RPC para Admin Dashboard KPIs (M-1)
CREATE OR REPLACE FUNCTION public.obter_admin_dashboard_kpis(
  p_escola_id UUID,
  p_data DATE DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  p_inicio_mes TIMESTAMPTZ DEFAULT date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo'))
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 2. RPC para Estatísticas Multi-Escola de Professores (M-1)
CREATE OR REPLACE FUNCTION public.obter_multi_escolas_stats(
  p_funcionario_id UUID,
  p_escola_ids UUID[],
  p_data DATE DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_escola_id UUID;
  v_turmas_count INT;
  v_aulas_count INT;
  v_chamadas_pendentes INT;
BEGIN
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

-- 3. RPC para Emissão de Boletim Escolar Única (M-2)
CREATE OR REPLACE FUNCTION public.obter_dados_boletim(
  p_aluno_id UUID,
  p_turma_id UUID,
  p_escola_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_turma jsonb;
  v_escola jsonb;
  v_materias jsonb;
  v_notas jsonb;
  v_recuperacoes jsonb;
BEGIN
  -- Turma
  SELECT jsonb_build_object(
    'id', t.id,
    'nome', t.nome,
    'turno', t.turno,
    'ano_letivo', t.ano_letivo
  ) INTO v_turma
  FROM public.turmas t
  WHERE t.id = p_turma_id;

  -- Escola
  SELECT jsonb_build_object(
    'nome', COALESCE(e.nome, 'Escola Não Identificada'),
    'logo_url', e.logo_url
  ) INTO v_escola
  FROM public.escolas e
  WHERE e.id = p_escola_id;

  -- Matérias
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'nome', m.nome,
      'base_curricular', m.base_curricular
    ) ORDER BY m.nome ASC
  ), '[]'::jsonb) INTO v_materias
  FROM public.materias m
  WHERE m.turma_id = p_turma_id;

  -- Fallback: Se a turma não tiver matérias específicas em public.materias, busca da grade_curricular_escola
  IF v_materias IS NULL OR jsonb_array_length(v_materias) = 0 THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', g.id,
        'nome', g.nome,
        'base_curricular', g.base_curricular
      ) ORDER BY g.nome ASC
    ), '[]'::jsonb) INTO v_materias
    FROM public.grade_curricular_escola g
    WHERE g.escola_id = p_escola_id;
  END IF;

  -- Notas
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'materia_id', n.materia_id,
      'unidade', n.unidade,
      'nota1', n.nota1,
      'nota2', n.nota2,
      'nota3', n.nota3
    )
  ), '[]'::jsonb) INTO v_notas
  FROM public.notas n
  WHERE n.aluno_id = p_aluno_id AND n.turma_id = p_turma_id;

  -- Recuperações finais
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'materia_id', r.materia_id,
      'nota', r.nota
    )
  ), '[]'::jsonb) INTO v_recuperacoes
  FROM public.recuperacoes_finais r
  WHERE r.aluno_id = p_aluno_id AND r.turma_id = p_turma_id;

  RETURN jsonb_build_object(
    'turma', COALESCE(v_turma, '{}'::jsonb),
    'escolaNome', COALESCE(v_escola->>'nome', 'Escola Não Identificada'),
    'escolaLogoUrl', v_escola->'logo_url',
    'materias', COALESCE(v_materias, '[]'::jsonb),
    'notas', COALESCE(v_notas, '[]'::jsonb),
    'recuperacoes', COALESCE(v_recuperacoes, '[]'::jsonb)
  );
END;
$$;
