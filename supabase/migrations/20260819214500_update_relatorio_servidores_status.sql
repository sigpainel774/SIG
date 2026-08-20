-- Migration: update_relatorio_servidores_status
-- Data: 2026-08-19
-- Descrição: Atualiza get_relatorio_servidores para suportar parâmetro p_status e calcular contadores de servidores ativos vs afastados e taxa de afastamento.

CREATE OR REPLACE FUNCTION public.get_relatorio_servidores(
  p_escola_id uuid DEFAULT NULL::uuid,
  p_cargo text DEFAULT NULL::text,
  p_modalidade text DEFAULT NULL::text,
  p_vinculo_tipo text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_is_superadmin boolean := false;
  v_has_nivel_1 boolean := false;
  v_has_access boolean := false;
  v_resumo jsonb;
  v_cargos_breakdown jsonb;
  v_resultado jsonb;
BEGIN
  -- 1. Obter o usuário autenticado
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '45000';
  END IF;

  -- 2. Verificar se é superadmin ou Nível 1
  SELECT COALESCE(f.is_superadmin, false) INTO v_is_superadmin
  FROM public.funcionarios f
  WHERE f.auth_user_id = v_user_id AND f.deleted_at IS NULL
  LIMIT 1;

  IF NOT v_is_superadmin THEN
    SELECT EXISTS (
      SELECT 1 
      FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = v_user_id 
        AND au.nivel = 1 
        AND au.ativo = true
        AND f.deleted_at IS NULL
    ) INTO v_has_nivel_1;
  END IF;

  -- Se não for SuperAdmin nem Nível 1, validar acesso Nível 2 (Diretor) ou Nível 3 (Secretário com permissão)
  IF NOT v_is_superadmin AND NOT v_has_nivel_1 THEN
    IF p_escola_id IS NULL THEN
      RAISE EXCEPTION 'Acesso negado: É necessário informar uma escola para usuários deste nível' USING ERRCODE = '45000';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      LEFT JOIN public.acessos_usuarios_permissoes aup 
        ON aup.acesso_usuario_id = au.id 
       AND aup.permissao = 'relatorios.servidores' 
       AND aup.permitido = true
      WHERE f.auth_user_id = v_user_id
        AND f.deleted_at IS NULL
        AND au.ativo = true
        AND (au.escola_id = p_escola_id OR au.escola_id IS NULL)
        AND (
          au.nivel = 2 -- Nível 2 (Diretor): acesso automático à sua escola
          OR (au.nivel = 3 AND aup.id IS NOT NULL) -- Nível 3 (Secretário): exige permissão granular relatorios.servidores
        )
    ) INTO v_has_access;

    IF NOT v_has_access THEN
      RAISE EXCEPTION 'Acesso negado: Você não possui permissão para acessar o relatório de servidores desta unidade' USING ERRCODE = '45000';
    END IF;
  END IF;

  -- 3. Agregação com CTE para consistência total de dados
  WITH vinculos_filtrados AS (
    SELECT 
      vf.id AS vinculo_id,
      vf.funcionario_id,
      vf.escola_id,
      COALESCE(NULLIF(TRIM(vf.cargo), ''), NULLIF(TRIM(f.cargo), ''), 'Cargo não informado') AS cargo_final,
      LOWER(COALESCE(TRIM(f.status), 'ativo')) AS status_final,
      CASE 
        WHEN UPPER(COALESCE(f.tipo_vinculo, '')) LIKE '%EFETIVO%' OR UPPER(COALESCE(f.tipo_vinculo, '')) LIKE '%CONCURSADO%' THEN 'Concursado'
        WHEN UPPER(COALESCE(f.tipo_vinculo, '')) LIKE '%CONTRATADO%' 
             OR UPPER(COALESCE(f.tipo_vinculo, '')) LIKE '%SUBSTITUTO%' 
             OR UPPER(COALESCE(f.tipo_vinculo, '')) LIKE '%PRESTADOR%' 
             OR UPPER(COALESCE(f.tipo_vinculo, '')) LIKE '%RESERVISTA%' THEN 'Contratado'
        WHEN UPPER(COALESCE(f.tipo_vinculo, '')) LIKE '%NOMEADO%' THEN 'Nomeado'
        ELSE 'Outros'
      END AS vinculo_tipo_final,
      CASE 
        WHEN UPPER(COALESCE(f.modalidade_ensino, '')) LIKE '%EJA%' 
             OR UPPER(COALESCE(vf.cargo, '')) LIKE '%EJA%' 
             OR UPPER(COALESCE(f.cargo, '')) LIKE '%EJA%' THEN 'EJA'
        ELSE 'Regular'
      END AS modalidade_final
    FROM public.vinculos_funcionarios vf
    JOIN public.funcionarios f ON f.id = vf.funcionario_id
    WHERE vf.ativo = true
      AND f.deleted_at IS NULL
      AND COALESCE(f.is_conta_especial, false) = false
      AND (p_escola_id IS NULL OR vf.escola_id = p_escola_id)
  ),
  vinculos_com_filtros AS (
    SELECT *
    FROM vinculos_filtrados
    WHERE (p_cargo IS NULL OR p_cargo = '' OR cargo_final = p_cargo)
      AND (p_modalidade IS NULL OR p_modalidade = '' OR p_modalidade = 'Todos' OR modalidade_final = p_modalidade)
      AND (p_vinculo_tipo IS NULL OR p_vinculo_tipo = '' OR p_vinculo_tipo = 'Todos' OR vinculo_tipo_final = p_vinculo_tipo)
      AND (
        p_status IS NULL 
        OR p_status = '' 
        OR p_status = 'Todos'
        OR (LOWER(p_status) = 'ativo' AND (status_final = 'ativo' OR status_final = ''))
        OR (LOWER(p_status) = 'afastado' AND status_final = 'afastado')
      )
  ),
  totais_resumo AS (
    SELECT
      COUNT(DISTINCT funcionario_id) AS total_servidores_unicos,
      COUNT(vinculo_id) AS total_cargos_ocupados,
      COUNT(DISTINCT CASE WHEN status_final = 'ativo' OR status_final = '' THEN funcionario_id END) AS total_ativos,
      COUNT(DISTINCT CASE WHEN status_final = 'afastado' THEN funcionario_id END) AS total_afastados,
      COUNT(vinculo_id) FILTER (WHERE vinculo_tipo_final = 'Contratado') AS total_contratados,
      COUNT(vinculo_id) FILTER (WHERE vinculo_tipo_final = 'Concursado') AS total_concursados,
      COUNT(vinculo_id) FILTER (WHERE vinculo_tipo_final = 'Nomeado') AS total_nomeados,
      COUNT(vinculo_id) FILTER (WHERE vinculo_tipo_final = 'Outros') AS total_outros,
      COUNT(vinculo_id) FILTER (WHERE modalidade_final = 'Regular') AS total_regular,
      COUNT(vinculo_id) FILTER (WHERE modalidade_final = 'EJA') AS total_eja
    FROM vinculos_com_filtros
  ),
  cargos_agrupados AS (
    SELECT 
      cargo_final AS cargo,
      COUNT(vinculo_id) AS ocupacoes,
      COUNT(vinculo_id) FILTER (WHERE status_final = 'afastado') AS afastados,
      COUNT(vinculo_id) FILTER (WHERE modalidade_final = 'Regular') AS regular,
      COUNT(vinculo_id) FILTER (WHERE modalidade_final = 'EJA') AS eja,
      COUNT(vinculo_id) FILTER (WHERE vinculo_tipo_final = 'Concursado') AS concursados,
      COUNT(vinculo_id) FILTER (WHERE vinculo_tipo_final = 'Contratado') AS contratados,
      COUNT(vinculo_id) FILTER (WHERE vinculo_tipo_final = 'Nomeado') AS nomeados,
      COUNT(vinculo_id) FILTER (WHERE vinculo_tipo_final = 'Outros') AS outros
    FROM vinculos_com_filtros
    GROUP BY cargo_final
    ORDER BY ocupacoes DESC, cargo_final ASC
  )
  SELECT 
    jsonb_build_object(
      'total_servidores_unicos', COALESCE(tr.total_servidores_unicos, 0),
      'total_cargos_ocupados', COALESCE(tr.total_cargos_ocupados, 0),
      'total_ativos', COALESCE(tr.total_ativos, 0),
      'total_afastados', COALESCE(tr.total_afastados, 0),
      'taxa_afastamento', CASE 
        WHEN COALESCE(tr.total_servidores_unicos, 0) > 0 
        THEN ROUND((COALESCE(tr.total_afastados, 0)::numeric / tr.total_servidores_unicos::numeric) * 100, 1)
        ELSE 0.0
      END,
      'total_contratados', COALESCE(tr.total_contratados, 0),
      'total_concursados', COALESCE(tr.total_concursados, 0),
      'total_nomeados', COALESCE(tr.total_nomeados, 0),
      'total_outros', COALESCE(tr.total_outros, 0),
      'total_regular', COALESCE(tr.total_regular, 0),
      'total_eja', COALESCE(tr.total_eja, 0)
    ),
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'cargo', ca.cargo,
          'ocupacoes', ca.ocupacoes,
          'afastados', ca.afastados,
          'regular', ca.regular,
          'eja', ca.eja,
          'concursados', ca.concursados,
          'contratados', ca.contratados,
          'nomeados', ca.nomeados,
          'outros', ca.outros
        )
      ) FROM cargos_agrupados ca),
      '[]'::jsonb
    )
  INTO v_resumo, v_cargos_breakdown
  FROM totais_resumo tr;

  v_resultado := jsonb_build_object(
    'resumo', COALESCE(v_resumo, '{}'::jsonb),
    'cargos', COALESCE(v_cargos_breakdown, '[]'::jsonb)
  );

  RETURN v_resultado;
END;
$function$;
