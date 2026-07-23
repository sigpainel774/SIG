-- Migration para Gestão de Sessões Ativas (Configurações)

CREATE OR REPLACE FUNCTION public.get_my_active_sessions()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  refreshed_at timestamp without time zone,
  user_agent text,
  ip inet
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.created_at,
    s.refreshed_at,
    s.user_agent,
    s.ip
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY COALESCE(s.refreshed_at, s.created_at) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_active_sessions() TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_my_session(target_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM auth.sessions
  WHERE id = target_session_id
    AND user_id = auth.uid();
    
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_my_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_all_other_sessions(current_session_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM auth.sessions
  WHERE user_id = auth.uid()
    AND id != current_session_id;
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_all_other_sessions(uuid) TO authenticated;
