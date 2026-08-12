-- Migration: 20260812220000_update_navigation_trail_rpc_filters.sql
-- Descrição: Atualiza a RPC get_user_navigation_trail_admin com suporte a timezone local (America/Sao_Paulo), filtro por data (início/fim), busca por nome/tela e limite expandido.

CREATE OR REPLACE FUNCTION public.get_user_navigation_trail_admin(
  p_funcionario_id uuid DEFAULT NULL,
  p_limit int DEFAULT 300,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_search text DEFAULT NULL
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
    AND (p_start_date IS NULL OR (unt.opened_at AT TIME ZONE 'America/Sao_Paulo')::date >= p_start_date)
    AND (p_end_date IS NULL OR (unt.opened_at AT TIME ZONE 'America/Sao_Paulo')::date <= p_end_date)
    AND (
      p_search IS NULL OR p_search = '' OR
      COALESCE(f.nome, '') ILIKE '%' || p_search || '%' OR
      COALESCE(unt.pathname, '') ILIKE '%' || p_search || '%' OR
      COALESCE(unt.page_title, '') ILIKE '%' || p_search || '%'
    )
  ORDER BY unt.opened_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_navigation_trail_admin(uuid, int, date, date, text) TO authenticated;
