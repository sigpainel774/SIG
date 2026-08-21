-- ==============================================================================
-- Migration: Relatório Executivo e Estratégico do EMAEE + Logs de Acesso
-- Data: 2026-08-21
-- ==============================================================================

-- 1. Tabela de Logs de Acesso aos Relatórios Estratégicos
CREATE TABLE IF NOT EXISTS public.logs_acesso_relatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nivel_acesso text NOT NULL,
  relatorio text NOT NULL DEFAULT 'emaee_estrategico',
  escopo text NOT NULL DEFAULT 'rede_toda',
  acao text NOT NULL, -- 'visualizacao', 'impressao', 'exportacao'
  ip text,
  user_agent text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

-- Habilita RLS na tabela de logs
ALTER TABLE public.logs_acesso_relatorios ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Apenas Superadmin e Nível 1 podem ler logs de auditoria
DROP POLICY IF EXISTS "superadmin_read_logs_acesso_relatorios" ON public.logs_acesso_relatorios;
CREATE POLICY "superadmin_read_logs_acesso_relatorios" ON public.logs_acesso_relatorios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.funcionarios f
      WHERE f.auth_user_id = auth.uid() AND f.is_superadmin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.acessos_usuarios a
      JOIN public.funcionarios f ON f.id = a.funcionario_id
      WHERE f.auth_user_id = auth.uid() AND a.nivel = 1 AND a.ativo = true
    )
  );

-- Inserção permitida para autenticados
DROP POLICY IF EXISTS "auth_insert_logs_acesso_relatorios" ON public.logs_acesso_relatorios;
CREATE POLICY "auth_insert_logs_acesso_relatorios" ON public.logs_acesso_relatorios
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 2. Índices de Alta Performance para Agregações
CREATE INDEX IF NOT EXISTS idx_emaee_matriculas_status_escola 
  ON public.emaee_matriculas(status, escola_atendimento_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_emaee_matriculas_condicoes_gin 
  ON public.emaee_matriculas USING gin(condicoes_saude);

CREATE INDEX IF NOT EXISTS idx_emaee_evolucoes_data_especialidade 
  ON public.emaee_evolucoes(data_atendimento, especialidade) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_logs_acesso_relatorios_criado_em 
  ON public.logs_acesso_relatorios(criado_em DESC);

-- 3. RPC: obter_relatorio_emaee_agregado
CREATE OR REPLACE FUNCTION public.obter_relatorio_emaee_agregado(
  p_ano integer DEFAULT NULL,
  p_escola_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_auth_id uuid;
  v_func_id uuid;
  v_func_nome text;
  v_is_superadmin boolean;
  v_nivel integer;
  v_escola_vinculo uuid;
  v_ano integer;
  v_resultado jsonb;
  v_total_ativos integer;
  v_total_fila integer;
  v_total_altas integer;
  v_total_geral integer;
  v_tempo_medio_fila numeric;
  v_taxa_resolutividade numeric;
  v_epidemiologia jsonb;
  v_especialidades jsonb;
  v_origem_escolas jsonb;
  v_intersetorialidade jsonb;
  v_logistica jsonb;
  v_escopo_desc text;
BEGIN
  v_caller_auth_id := auth.uid();
  IF v_caller_auth_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Identifica o funcionário e suas permissões
  SELECT 
    f.id, f.nome, COALESCE(f.is_superadmin, false),
    COALESCE(MIN(a.nivel), 99),
    (SELECT a2.escola_id FROM public.acessos_usuarios a2 WHERE a2.funcionario_id = f.id AND a2.ativo = true LIMIT 1)
  INTO 
    v_func_id, v_func_nome, v_is_superadmin, v_nivel, v_escola_vinculo
  FROM public.funcionarios f
  LEFT JOIN public.acessos_usuarios a ON a.funcionario_id = f.id AND a.ativo = true
  WHERE f.auth_user_id = v_caller_auth_id AND f.deleted_at IS NULL
  GROUP BY f.id, f.nome, f.is_superadmin;

  -- Validação de Segurança Estrita
  IF NOT (v_is_superadmin = true OR v_nivel IN (1, 2)) THEN
    RAISE EXCEPTION 'Permissão insuficiente para acessar o Relatório Estratégico do EMAEE' USING ERRCODE = '42501';
  END IF;

  -- Se for Nível 2 (Diretor/Coordenador), restringe ao escopo da própria escola
  IF NOT (v_is_superadmin = true OR v_nivel = 1) THEN
    p_escola_id := v_escola_vinculo;
  END IF;

  v_ano := COALESCE(p_ano, EXTRACT(year FROM CURRENT_DATE)::integer);

  -- Define descrição do escopo
  IF p_escola_id IS NOT NULL THEN
    SELECT nome INTO v_escopo_desc FROM public.escolas WHERE id = p_escola_id;
    v_escopo_desc := COALESCE(v_escopo_desc, 'Unidade EMAEE');
  ELSE
    v_escopo_desc := 'Rede Municipal de Sapeaçu (Consolidado Geral)';
  END IF;

  -- Registro de Auditoria (Blindado contra falha)
  BEGIN
    INSERT INTO public.logs_acesso_relatorios (
      usuario_id,
      auth_user_id,
      nivel_acesso,
      relatorio,
      escopo,
      acao
    ) VALUES (
      v_func_id,
      v_caller_auth_id,
      CASE 
        WHEN v_is_superadmin THEN 'Superadmin Root'
        WHEN v_nivel = 1 THEN 'Nível 1 (Secretaria de Educação)'
        WHEN v_nivel = 2 THEN 'Nível 2 (Gestão EMAEE)'
        ELSE 'Nível ' || v_nivel
      END,
      'emaee_estrategico',
      v_escopo_desc,
      'visualizacao'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Não bloqueia a entrega do relatório caso o log falhe
    RAISE WARNING 'Falha ao registrar log de acesso: %', SQLERRM;
  END;

  -- 1. KPIs Centrais
  SELECT
    COUNT(*) FILTER (WHERE status IN ('ATIVO', 'EM_INVESTIGACAO')),
    COUNT(*) FILTER (WHERE status = 'FILA_ESPERA'),
    COUNT(*) FILTER (WHERE status IN ('ALTA', 'DESLIGADO', 'INATIVO')),
    COUNT(*),
    ROUND(COALESCE(AVG(CURRENT_DATE - COALESCE(data_matricula, created_at::date)) FILTER (WHERE status = 'FILA_ESPERA'), 0), 1),
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'ALTA')::numeric / 
       NULLIF(COUNT(*) FILTER (WHERE status IN ('ATIVO', 'EM_INVESTIGACAO', 'ALTA')), 0) * 100
      ), 1
    )
  INTO
    v_total_ativos,
    v_total_fila,
    v_total_altas,
    v_total_geral,
    v_tempo_medio_fila,
    v_taxa_resolutividade
  FROM public.emaee_matriculas
  WHERE deleted_at IS NULL
    AND (p_escola_id IS NULL OR escola_atendimento_id = p_escola_id);

  -- 2. Eixo Epidemiológico & Censo (TEA, TDAH, DI, etc.)
  WITH diag_calc AS (
    SELECT
      COUNT(*) AS total_pacientes,
      COUNT(*) FILTER (WHERE (condicoes_saude->'transtorno_tea'->>'selecionado')::boolean = true OR transtorno_tea = true) AS tea,
      COUNT(*) FILTER (WHERE (condicoes_saude->'tdah'->>'selecionado')::boolean = true) AS tdah,
      COUNT(*) FILTER (WHERE (condicoes_saude->'deficiencia_intelectual'->>'selecionado')::boolean = true OR def_intelectual = true) AS def_intelectual,
      COUNT(*) FILTER (WHERE (condicoes_saude->'dislexia'->>'selecionado')::boolean = true) AS dislexia,
      COUNT(*) FILTER (WHERE (condicoes_saude->'disgrafia_disortografia'->>'selecionado')::boolean = true) AS disgrafia,
      COUNT(*) FILTER (WHERE (condicoes_saude->'tod'->>'selecionado')::boolean = true) AS tod,
      COUNT(*) FILTER (WHERE (condicoes_saude->'ansiedade'->>'selecionado')::boolean = true) AS ansiedade,
      COUNT(*) FILTER (WHERE (condicoes_saude->'superdotacao'->>'selecionado')::boolean = true) AS superdotacao,
      COUNT(*) FILTER (WHERE def_baixa_visao = true OR def_cegueira = true) AS def_visual,
      COUNT(*) FILTER (WHERE def_auditiva = true OR def_surdez = true) AS def_auditiva,
      COUNT(*) FILTER (WHERE def_fisica = true) AS def_fisica,
      COUNT(*) FILTER (WHERE def_multipla = true OR def_surdocegueira = true) AS def_multipla,
      COUNT(*) FILTER (WHERE transtorno_outros = true OR NULLIF(outros_transtornos, '') IS NOT NULL) AS outros
    FROM public.emaee_matriculas
    WHERE deleted_at IS NULL
      AND status IN ('ATIVO', 'EM_INVESTIGACAO', 'FILA_ESPERA')
      AND (p_escola_id IS NULL OR escola_atendimento_id = p_escola_id)
  )
  SELECT jsonb_build_object(
    'total_base', total_pacientes,
    'tea', tea,
    'tdah', tdah,
    'def_intelectual', def_intelectual,
    'dislexia', dislexia,
    'disgrafia', disgrafia,
    'tod', tod,
    'ansiedade', ansiedade,
    'superdotacao', superdotacao,
    'def_visual', def_visual,
    'def_auditiva', def_auditiva,
    'def_fisica', def_fisica,
    'def_multipla', def_multipla,
    'outros', outros
  ) INTO v_epidemiologia FROM diag_calc;

  -- 3. Eixo de Especialidades & Atendimentos
  WITH esp_calc AS (
    SELECT
      ev.especialidade,
      COUNT(ev.id) AS total_atendimentos,
      COUNT(DISTINCT ev.profissional_id) AS total_profissionais,
      COUNT(DISTINCT ev.emaee_matricula_id) AS pacientes_atendidos
    FROM public.emaee_evolucoes ev
    JOIN public.emaee_matriculas m ON m.id = ev.emaee_matricula_id
    WHERE ev.deleted_at IS NULL
      AND m.deleted_at IS NULL
      AND EXTRACT(year FROM ev.data_atendimento) = v_ano
      AND (p_escola_id IS NULL OR m.escola_atendimento_id = p_escola_id)
    GROUP BY ev.especialidade
    ORDER BY total_atendimentos DESC
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'especialidade', especialidade,
    'total_atendimentos', total_atendimentos,
    'total_profissionais', total_profissionais,
    'pacientes_atendidos', pacientes_atendidos
  )), '[]'::jsonb) INTO v_especialidades FROM esp_calc;

  -- 4. Eixo Escolas de Origem (Ranking sem expor nomes de alunos)
  WITH orig_calc AS (
    SELECT
      COALESCE(e.nome, m.escola_origem_nome, 'Escola Não Informada / Fora da Rede') AS escola_nome,
      COUNT(*) AS total_encaminhados,
      COUNT(*) FILTER (WHERE m.status IN ('ATIVO', 'EM_INVESTIGACAO')) AS em_atendimento,
      COUNT(*) FILTER (WHERE m.status = 'FILA_ESPERA') AS na_fila
    FROM public.emaee_matriculas m
    LEFT JOIN public.escolas e ON e.id = m.escola_regular_id
    WHERE m.deleted_at IS NULL
      AND (p_escola_id IS NULL OR m.escola_atendimento_id = p_escola_id)
    GROUP BY COALESCE(e.nome, m.escola_origem_nome, 'Escola Não Informada / Fora da Rede')
    ORDER BY total_encaminhados DESC
    LIMIT 15
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'escola_nome', escola_nome,
    'total_encaminhados', total_encaminhados,
    'em_atendimento', em_atendimento,
    'na_fila', na_fila
  )), '[]'::jsonb) INTO v_origem_escolas FROM orig_calc;

  -- 5. Intersetorialidade (Pareceres e Relatórios Solicitados pelas Escolas)
  WITH inter_calc AS (
    SELECT
      COUNT(*) AS total_solicitacoes,
      COUNT(*) FILTER (WHERE sr.status = 'PENDENTE') AS pendentes,
      COUNT(*) FILTER (WHERE sr.status = 'CONCLUIDO' OR sr.status = 'RESPONDIDO') AS respondidos,
      ROUND(COALESCE(AVG(sr.respondido_em::date - sr.created_at::date) FILTER (WHERE sr.respondido_em IS NOT NULL), 0), 1) AS tempo_medio_resposta_dias
    FROM public.emaee_solicitacoes_relatorios sr
    JOIN public.emaee_matriculas m ON m.id = sr.emaee_matricula_id
    WHERE m.deleted_at IS NULL
      AND (p_escola_id IS NULL OR m.escola_atendimento_id = p_escola_id)
  )
  SELECT jsonb_build_object(
    'total_solicitacoes', total_solicitacoes,
    'pendentes', pendentes,
    'respondidos', respondidos,
    'tempo_medio_resposta_dias', tempo_medio_resposta_dias
  ) INTO v_intersetorialidade FROM inter_calc;

  -- 6. Logística e Censo Demográfico
  WITH log_calc AS (
    SELECT
      COUNT(*) FILTER (WHERE localizacao_atendimento = 'Urbana' OR localizacao_atendimento IS NULL) AS zona_urbana,
      COUNT(*) FILTER (WHERE localizacao_atendimento = 'Rural') AS zona_rural,
      COUNT(*) FILTER (WHERE turno_atendimento = 'Matutino') AS turno_matutino,
      COUNT(*) FILTER (WHERE turno_atendimento = 'Vespertino') AS turno_vespertino
    FROM public.emaee_matriculas
    WHERE deleted_at IS NULL
      AND status IN ('ATIVO', 'EM_INVESTIGACAO', 'FILA_ESPERA')
      AND (p_escola_id IS NULL OR escola_atendimento_id = p_escola_id)
  )
  SELECT jsonb_build_object(
    'zona_urbana', zona_urbana,
    'zona_rural', zona_rural,
    'turno_matutino', turno_matutino,
    'turno_vespertino', turno_vespertino
  ) INTO v_logistica FROM log_calc;

  -- Montagem do Payload Final Consolidado
  v_resultado := jsonb_build_object(
    'meta', jsonb_build_object(
      'gerado_em', now(),
      'ano_letivo', v_ano,
      'escopo', v_escopo_desc,
      'is_nivel_1', (v_is_superadmin OR v_nivel = 1)
    ),
    'kpis', jsonb_build_object(
      'total_ativos', v_total_ativos,
      'total_fila', v_total_fila,
      'total_altas', v_total_altas,
      'total_geral', v_total_geral,
      'tempo_medio_fila_dias', v_tempo_medio_fila,
      'taxa_resolutividade', COALESCE(v_taxa_resolutividade, 0)
    ),
    'epidemiologia', v_epidemiologia,
    'especialidades', v_especialidades,
    'origem_escolas', v_origem_escolas,
    'intersetorialidade', v_intersetorialidade,
    'logistica', v_logistica
  );

  RETURN v_resultado;
END;
$$;

-- 4. RPC: obter_relatorio_emaee_detalhe_paciente (Exclusiva para Nível 2)
CREATE OR REPLACE FUNCTION public.obter_relatorio_emaee_detalhe_paciente(
  p_paciente_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_auth_id uuid;
  v_func_id uuid;
  v_nivel integer;
  v_escola_vinculo uuid;
  v_escola_paciente uuid;
  v_detalhe jsonb;
BEGIN
  v_caller_auth_id := auth.uid();
  IF v_caller_auth_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado: Usuário não autenticado' USING ERRCODE = '42501';
  END IF;

  -- Identifica o funcionário e verifica se é Nível 2
  SELECT 
    f.id, MIN(a.nivel), (SELECT a2.escola_id FROM public.acessos_usuarios a2 WHERE a2.funcionario_id = f.id AND a2.ativo = true LIMIT 1)
  INTO 
    v_func_id, v_nivel, v_escola_vinculo
  FROM public.funcionarios f
  JOIN public.acessos_usuarios a ON a.funcionario_id = f.id AND a.ativo = true
  WHERE f.auth_user_id = v_caller_auth_id AND f.deleted_at IS NULL
  GROUP BY f.id;

  -- Bloqueio Estrito: Nível 1 ou usuários sem vínculo com a unidade são impedidos
  IF v_nivel IS NULL OR v_nivel <> 2 THEN
    RAISE EXCEPTION 'Acesso negado: Visualização individual restrita a gestores clínicos da unidade EMAEE' USING ERRCODE = '42501';
  END IF;

  -- Verifica se o paciente pertence à mesma escola do Nível 2
  SELECT escola_atendimento_id INTO v_escola_paciente
  FROM public.emaee_matriculas
  WHERE id = p_paciente_id AND deleted_at IS NULL;

  IF v_escola_paciente IS NULL OR v_escola_paciente <> v_escola_vinculo THEN
    RAISE EXCEPTION 'Acesso negado: Paciente não pertence à sua unidade de atendimento' USING ERRCODE = '42501';
  END IF;

  -- Retorna os dados do prontuário
  SELECT jsonb_build_object(
    'id', m.id,
    'numero_matricula_emaee', m.numero_matricula_emaee,
    'status', m.status,
    'data_matricula', m.data_matricula,
    'aluno', jsonb_build_object(
      'id', a.id,
      'nome', a.nome,
      'data_nascimento', a.data_nascimento,
      'sexo', a.sexo
    ),
    'condicoes_saude', m.condicoes_saude,
    'principal_queixa', m.principal_queixa
  ) INTO v_detalhe
  FROM public.emaee_matriculas m
  JOIN public.alunos a ON a.id = m.aluno_id
  WHERE m.id = p_paciente_id;

  RETURN v_detalhe;
END;
$$;

-- 5. RPC: obter_logs_acesso_relatorios (Superadmin e Nível 1)
CREATE OR REPLACE FUNCTION public.obter_logs_acesso_relatorios(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_relatorio text DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  usuario_nome text,
  nivel_acesso text,
  relatorio text,
  escopo text,
  acao text,
  criado_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Valida se o usuário é Superadmin ou Nível 1
  IF NOT EXISTS (
    SELECT 1 FROM public.funcionarios f
    LEFT JOIN public.acessos_usuarios a ON a.funcionario_id = f.id AND a.ativo = true
    WHERE f.auth_user_id = auth.uid() 
      AND f.deleted_at IS NULL
      AND (f.is_superadmin = true OR a.nivel = 1)
  ) THEN
    RAISE EXCEPTION 'Acesso negado aos logs de auditoria' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT 
    l.id,
    COALESCE(f.nome, 'Usuário Sistema') AS usuario_nome,
    l.nivel_acesso,
    l.relatorio,
    l.escopo,
    l.acao,
    l.criado_em
  FROM public.logs_acesso_relatorios l
  LEFT JOIN public.funcionarios f ON f.id = l.usuario_id
  WHERE (p_relatorio IS NULL OR l.relatorio = p_relatorio)
    AND (p_data_inicio IS NULL OR l.criado_em::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR l.criado_em::date <= p_data_fim)
  ORDER BY l.criado_em DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- 6. RPC: registrar_log_acao_relatorio
CREATE OR REPLACE FUNCTION public.registrar_log_acao_relatorio(
  p_relatorio text,
  p_acao text,
  p_escopo text DEFAULT 'Rede Municipal de Sapeaçu'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_auth_id uuid;
  v_func_id uuid;
  v_is_superadmin boolean;
  v_nivel integer;
BEGIN
  v_caller_auth_id := auth.uid();
  IF v_caller_auth_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT 
    f.id, COALESCE(f.is_superadmin, false), COALESCE(MIN(a.nivel), 99)
  INTO 
    v_func_id, v_is_superadmin, v_nivel
  FROM public.funcionarios f
  LEFT JOIN public.acessos_usuarios a ON a.funcionario_id = f.id AND a.ativo = true
  WHERE f.auth_user_id = v_caller_auth_id AND f.deleted_at IS NULL
  GROUP BY f.id, f.is_superadmin;

  INSERT INTO public.logs_acesso_relatorios (
    usuario_id,
    auth_user_id,
    nivel_acesso,
    relatorio,
    escopo,
    acao
  ) VALUES (
    v_func_id,
    v_caller_auth_id,
    CASE 
      WHEN v_is_superadmin THEN 'Superadmin Root'
      WHEN v_nivel = 1 THEN 'Nível 1 (Secretaria de Educação)'
      WHEN v_nivel = 2 THEN 'Nível 2 (Gestão EMAEE)'
      ELSE 'Nível ' || v_nivel
    END,
    p_relatorio,
    p_escopo,
    p_acao
  );

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;
