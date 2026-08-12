-- Migration: Fix Histórico Consolidado de Logins Diários RPC
-- Data: 2026-08-12
-- Descrição: Atualiza a RPC get_daily_login_history_admin para consultar public.user_navigation_trail (em vez da tabela vazia access_logs), consolidando logins diários, funcionários, tempo de tela, IPs e geolocalização.

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
