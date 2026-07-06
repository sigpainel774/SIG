-- Migration: Mural Optimizations
-- Create RPC function to retrieve birthdays of a specific month efficiently

CREATE OR REPLACE FUNCTION public.get_birthdays_of_month(month_num int)
RETURNS TABLE (
  day int,
  name text,
  role text
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(DAY FROM f.data_nascimento)::int AS day,
    f.nome::text AS name,
    COALESCE(f.cargo, 'Funcionário')::text AS role
  FROM public.funcionarios f
  WHERE f.data_nascimento IS NOT NULL 
    AND f.deleted_at IS NULL
    AND EXTRACT(MONTH FROM f.data_nascimento) = month_num
  UNION ALL
  SELECT 
    EXTRACT(DAY FROM a.data_nascimento)::int AS day,
    a.nome::text AS name,
    'Aluno'::text AS role
  FROM public.alunos a
  WHERE a.data_nascimento IS NOT NULL
    AND a.deleted_at IS NULL
    AND EXTRACT(MONTH FROM a.data_nascimento) = month_num
  ORDER BY day ASC;
END;
$$ LANGUAGE plpgsql;
