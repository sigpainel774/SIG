-- Migration: Informações Avançadas de Acessos
-- Data: 2026-08-11
-- Descrição: Criação das tabelas user_navigation_trail e ip_geolocation_cache, e RPCs administrativas para rastreamento de sessões ativas, trilha de navegação, histórico de logins e revogação remota.

-- 1. Tabela de Trilha de Navegação (Abriu e Fechou telas com tempo de permanência)
CREATE TABLE IF NOT EXISTS public.user_navigation_trail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  pathname text NOT NULL,
  page_title text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  duration_seconds integer DEFAULT 0,
  ip_address text,
  user_agent text,
  geo_location jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabela de Cache de Geolocalização por IP
CREATE TABLE IF NOT EXISTS public.ip_geolocation_cache (
  ip_address text PRIMARY KEY,
  city text,
  region text,
  country text,
  isp text,
  latitude numeric,
  longitude numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_user_nav_trail_funcionario ON public.user_navigation_trail(funcionario_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_nav_trail_session ON public.user_navigation_trail(session_id);
CREATE INDEX IF NOT EXISTS idx_user_nav_trail_opened_at ON public.user_navigation_trail(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_ip ON public.access_logs(ip_address, created_at DESC);

-- 4. RLS para user_navigation_trail
ALTER TABLE public.user_navigation_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_all_authenticated" ON public.user_navigation_trail;
CREATE POLICY "dev_all_authenticated" ON public.user_navigation_trail
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- RLS para ip_geolocation_cache
ALTER TABLE public.ip_geolocation_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_all_authenticated" ON public.ip_geolocation_cache;
CREATE POLICY "dev_all_authenticated" ON public.ip_geolocation_cache
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 5. RPC: Obter todas as sessões ativas da rede (Admin / Superadmin)
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
      unt.funcionario_id,
      SUM(COALESCE(unt.duration_seconds, 0))::bigint as total_seconds
    FROM public.user_navigation_trail unt
    WHERE unt.opened_at >= CURRENT_DATE
    GROUP BY unt.funcionario_id
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

-- 6. RPC: Revogar qualquer sessão de usuário (Superadmin)
CREATE OR REPLACE FUNCTION public.revoke_any_user_session_admin(target_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted integer;
BEGIN
  -- Validar permissão Superadmin
  IF NOT EXISTS (
    SELECT 1 FROM public.funcionarios f 
    WHERE f.auth_user_id = auth.uid() AND f.is_superadmin = true
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas Superadmins podem encerrar sessões remotamente.';
  END IF;

  DELETE FROM auth.sessions
  WHERE id = target_session_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_any_user_session_admin(uuid) TO authenticated;

-- 7. RPC: Histórico diário de logins consolidado
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
  RETURN QUERY
  SELECT 
    al.created_at::date AS data_acesso,
    f.id AS funcionario_id,
    COALESCE(f.nome, 'Usuário do Sistema') AS funcionario_nome,
    COALESCE(f.email, al.email, 'Sem e-mail') AS funcionario_email,
    COALESCE(f.cargo, 'Servidor') AS cargo,
    COALESCE(
      (
        SELECT esc.nome 
        FROM public.vinculos_funcionarios vf 
        JOIN public.escolas esc ON esc.id = vf.escola_id 
        WHERE vf.funcionario_id = f.id AND vf.ativo = true 
        LIMIT 1
      ),
      'Geral'
    ) AS escola_nome,
    MIN(al.created_at) AS primeiro_login,
    MAX(al.created_at) AS ultima_atividade,
    COUNT(al.id)::bigint AS total_sessoes,
    COALESCE(
      (
        SELECT SUM(unt.duration_seconds)::bigint
        FROM public.user_navigation_trail unt
        WHERE unt.funcionario_id = f.id AND unt.opened_at::date = al.created_at::date
      ),
      0
    ) AS total_tempo_tela_segundos,
    al.ip_address,
    geo.city AS geo_city,
    geo.region AS geo_region
  FROM public.access_logs al
  LEFT JOIN public.funcionarios f ON (f.email = al.email OR f.auth_user_id::text = (al.detalhes->>'user_id'))
  LEFT JOIN public.ip_geolocation_cache geo ON geo.ip_address = al.ip_address
  WHERE al.created_at::date BETWEEN p_start_date AND p_end_date
  GROUP BY 
    al.created_at::date,
    f.id,
    f.nome,
    f.email,
    al.email,
    f.cargo,
    al.ip_address,
    geo.city,
    geo.region
  ORDER BY data_acesso DESC, primeiro_login DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_login_history_admin(date, date) TO authenticated;

-- 8. RPC: Obter trilha de navegação por funcionário
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
    unt.funcionario_id,
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
  LEFT JOIN public.funcionarios f ON f.id = unt.funcionario_id
  LEFT JOIN public.ip_geolocation_cache geo ON geo.ip_address = unt.ip_address
  WHERE (p_funcionario_id IS NULL OR unt.funcionario_id = p_funcionario_id)
  ORDER BY unt.opened_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_navigation_trail_admin(uuid, int) TO authenticated;
