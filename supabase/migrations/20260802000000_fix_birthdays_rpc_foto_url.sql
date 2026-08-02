-- Migration: Fix get_birthdays_of_month RPC to include foto_url, foto_avatar_path, and foto_visualizacao_path
-- Drop existing function first because changing return table structure requires dropping in Postgres PL/pgSQL

DROP FUNCTION IF EXISTS public.get_birthdays_of_month(int);

CREATE OR REPLACE FUNCTION public.get_birthdays_of_month(month_num int)
RETURNS TABLE (
  day int,
  name text,
  role text,
  foto_url text,
  foto_avatar_path text,
  foto_visualizacao_path text
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(DAY FROM f.data_nascimento)::int AS day,
    f.nome::text AS name,
    COALESCE(f.cargo, 'Funcionário')::text AS role,
    f.foto_url::text AS foto_url,
    f.foto_avatar_path::text AS foto_avatar_path,
    f.foto_visualizacao_path::text AS foto_visualizacao_path
  FROM public.funcionarios f
  WHERE f.data_nascimento IS NOT NULL 
    AND f.deleted_at IS NULL
    AND EXTRACT(MONTH FROM f.data_nascimento) = month_num
  UNION ALL
  SELECT 
    EXTRACT(DAY FROM a.data_nascimento)::int AS day,
    a.nome::text AS name,
    'Aluno'::text AS role,
    a.foto_url::text AS foto_url,
    a.foto_avatar_path::text AS foto_avatar_path,
    a.foto_visualizacao_path::text AS foto_visualizacao_path
  FROM public.alunos a
  WHERE a.data_nascimento IS NOT NULL
    AND a.deleted_at IS NULL
    AND EXTRACT(MONTH FROM a.data_nascimento) = month_num
  ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql;
