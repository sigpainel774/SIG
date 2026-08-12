-- Migration: Fix Informações Avançadas de Acesso (RPCs)
-- Data: 2026-08-12
-- Descrição: Atualiza as RPCs get_daily_login_history_admin, get_user_navigation_trail_admin e get_all_active_sessions_admin com suporte a fallbacks de auth_user_id quando funcionario_id for nulo, garantindo exibição completa dos dados e tempo de tela.

-- 1. Histórico Diário de Logins Consolidado
CREATE OR REPLACE FUNCTION public.get_daily_login_history_admin(
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '30 days')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  data_acesso date,
  funcionario_id uuid,
  funcionario_nome text,
  funcionario_email text,
  cargo text,
  escola_nome text,
  primeiro_login timestamptz,
  ultima_atividade timestamptz,
  total_sessoes bigint,
  total_tempo_tela_segundos bigint,
  ip_address text,
  geo_city text,
  geo_region text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar se o chamador é superadmin ou nível 1
  IF NOT EXISTS (
    SELECT 1 FROM public.funcionarios f 
    WHERE f.auth_user_id = auth.uid() AND f.is_superadmin = true
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.acessos_usuarios a
      JOIN public.funcionarios f ON f.id = a.funcionario_id
      WHERE f.auth_user_id = auth.uid() AND (a.nivel <= 1 OR f.is_superadmin = true)
    ) THEN
      RAISE EXCEPTION 'Acesso negado: permissão restrita a Superadmins e Administradores da Rede.';
    END IF;
  END IF;

  RETURN QUERY
  WITH raw_data AS (
    SELECT 
      unt.opened_at::date AS d_acesso,
      COALESCE(unt.funcionario_id, f.id) AS f_id,
      COALESCE(f.nome, 'Usuário do Sistema') AS f_nome,
      COALESCE(f.email, u.email::text, 'Sem e-mail') AS f_email,
      COALESCE(f.cargo, 'Servidor') AS f_cargo,
      unt.opened_at,
      unt.session_id,
      unt.id AS nav_id,
      COALESCE(unt.duration_seconds, 0) AS duration_seconds,
      unt.ip_address,
      geo.city AS city,
      geo.region AS region
    FROM public.user_navigation_trail unt
    LEFT JOIN public.funcionarios f ON f.id = COALESCE(unt.funcionario_id, (SELECT f2.id FROM public.funcionarios f2 WHERE f2.auth_user_id = unt.user_id LIMIT 1))
    LEFT JOIN auth.users u ON u.id = unt.user_id OR u.id = f.auth_user_id
    LEFT JOIN public.ip_geolocation_cache geo ON geo.ip_address = unt.ip_address
    WHERE unt.opened_at::date BETWEEN p_start_date AND p_end_date
  )
  SELECT 
    rd.d_acesso AS data_acesso,
    rd.f_id AS funcionario_id,
    rd.f_nome AS funcionario_nome,
    rd.f_email AS funcionario_email,
    rd.f_cargo AS cargo,
    COALESCE(
      (
        SELECT esc.nome 
        FROM public.vinculos_funcionarios vf 
        JOIN public.escolas esc ON esc.id = vf.escola_id 
        WHERE vf.funcionario_id = rd.f_id AND vf.ativo = true 
        LIMIT 1
      ),
      'Geral'
    ) AS escola_nome,
    MIN(rd.opened_at) AS primeiro_login,
    MAX(rd.opened_at) AS ultima_atividade,
    COUNT(DISTINCT COALESCE(rd.session_id, rd.nav_id::text))::bigint AS total_sessoes,
    SUM(rd.duration_seconds)::bigint AS total_tempo_tela_segundos,
    MAX(rd.ip_address) AS ip_address,
    MAX(rd.city) AS geo_city,
    MAX(rd.region) AS geo_region
  FROM raw_data rd
  GROUP BY 
    rd.d_acesso,
    rd.f_id,
    rd.f_nome,
    rd.f_email,
    rd.f_cargo
  ORDER BY data_acesso DESC, primeiro_login DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_login_history_admin(date, date) TO authenticated;

-- 2. Trilha de Navegação do Usuário
CREATE OR REPLACE FUNCTION public.get_user_navigation_trail_admin(
  p_funcionario_id uuid DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  session_id text,
  funcionario_id uuid,
  funcionario_nome text,
  pathname text,
  page_title text,
  opened_at timestamptz,
  closed_at timestamptz,
  duration_seconds integer,
  ip_address text,
  user_agent text,
  geo_city text,
  geo_region text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    unt.id,
    unt.session_id,
    COALESCE(unt.funcionario_id, f.id) AS funcionario_id,
    COALESCE(f.nome, 'Usuário Desconhecido') AS funcionario_nome,
    unt.pathname,
    unt.page_title,
    unt.opened_at,
    unt.closed_at,
    unt.duration_seconds,
    unt.ip_address,
    unt.user_agent,
    geo.city AS geo_city,
    geo.region AS geo_region
  FROM public.user_navigation_trail unt
  LEFT JOIN public.funcionarios f ON f.id = COALESCE(unt.funcionario_id, (SELECT f2.id FROM public.funcionarios f2 WHERE f2.auth_user_id = unt.user_id LIMIT 1))
  LEFT JOIN public.ip_geolocation_cache geo ON geo.ip_address = unt.ip_address
  WHERE (p_funcionario_id IS NULL OR unt.funcionario_id = p_funcionario_id OR f.id = p_funcionario_id)
  ORDER BY unt.opened_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_navigation_trail_admin(uuid, int) TO authenticated;

-- 3. Sessões Ativas da Rede
CREATE OR REPLACE FUNCTION public.get_all_active_sessions_admin()
RETURNS TABLE (
  session_id text,
  user_id uuid,
  funcionario_id uuid,
  funcionario_nome text,
  funcionario_email text,
  funcionario_cargo text,
  escola_nome text,
  foto_url text,
  created_at timestamptz,
  refreshed_at timestamp without time zone,
  user_agent text,
  ip text,
  current_pathname text,
  total_active_seconds_today bigint,
  geo_city text,
  geo_region text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verificar se o chamador é superadmin ou nível 1
  IF NOT EXISTS (
    SELECT 1 FROM public.funcionarios f 
    WHERE f.auth_user_id = auth.uid() AND f.is_superadmin = true
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.acessos_usuarios a
      JOIN public.funcionarios f ON f.id = a.funcionario_id
      WHERE f.auth_user_id = auth.uid() AND (a.nivel <= 1 OR f.is_superadmin = true)
    ) THEN
      RAISE EXCEPTION 'Acesso negado: permissão restrita a Superadmins e Administradores da Rede.';
    END IF;
  END IF;

  RETURN QUERY
  WITH latest_nav AS (
    SELECT DISTINCT ON (unt.session_id)
      unt.session_id,
      unt.pathname,
      unt.opened_at
    FROM public.user_navigation_trail unt
    ORDER BY unt.session_id, unt.opened_at DESC
  ),
  daily_dwell AS (
    SELECT 
      COALESCE(unt.funcionario_id, f2.id) AS funcionario_id,
      SUM(COALESCE(unt.duration_seconds, 0))::bigint as total_seconds
    FROM public.user_navigation_trail unt
    LEFT JOIN public.funcionarios f2 ON f2.auth_user_id = unt.user_id
    WHERE unt.opened_at >= CURRENT_DATE
    GROUP BY COALESCE(unt.funcionario_id, f2.id)
  )
  SELECT 
    s.id::text AS session_id,
    s.user_id,
    f.id AS funcionario_id,
    COALESCE(f.nome, 'Usuário do Sistema') AS funcionario_nome,
    COALESCE(f.email, u.email::text, 'Sem e-mail') AS funcionario_email,
    COALESCE(f.cargo, 'Servidor') AS funcionario_cargo,
    COALESCE(
      (
        SELECT esc.nome 
        FROM public.vinculos_funcionarios vf 
        JOIN public.escolas esc ON esc.id = vf.escola_id 
        WHERE vf.funcionario_id = f.id AND vf.ativo = true 
        LIMIT 1
      ),
      'Geral / Rede'
    ) AS escola_nome,
    f.foto_url,
    s.created_at,
    s.refreshed_at,
    s.user_agent,
    host(s.ip)::text AS ip,
    ln.pathname AS current_pathname,
    COALESCE(dd.total_seconds, 0) AS total_active_seconds_today,
    geo.city AS geo_city,
    geo.region AS geo_region
  FROM auth.sessions s
  JOIN auth.users u ON u.id = s.user_id
  LEFT JOIN public.funcionarios f ON f.auth_user_id = s.user_id
  LEFT JOIN latest_nav ln ON ln.session_id = s.id::text
  LEFT JOIN daily_dwell dd ON dd.funcionario_id = f.id
  LEFT JOIN public.ip_geolocation_cache geo ON geo.ip_address = host(s.ip)::text
  ORDER BY COALESCE(s.refreshed_at, s.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_active_sessions_admin() TO authenticated;
