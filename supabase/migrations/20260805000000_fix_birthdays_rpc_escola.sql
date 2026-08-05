-- Drop old signature of get_birthdays_of_month
DROP FUNCTION IF EXISTS public.get_birthdays_of_month(integer, uuid);

-- Recreate function with p_escola_id parameter
CREATE OR REPLACE FUNCTION public.get_birthdays_of_month(month_num integer, p_secretaria_id uuid DEFAULT NULL, p_escola_id uuid DEFAULT NULL)
 RETURNS TABLE(day integer, name text, role text, foto_url text, foto_avatar_path text, foto_visualizacao_path text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    AND (
      p_escola_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM public.vinculos_funcionarios vf 
        WHERE vf.funcionario_id = f.id AND vf.escola_id = p_escola_id AND vf.ativo = true
      )
    )
    AND (
      p_escola_id IS NOT NULL OR 
      p_secretaria_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM public.vinculos_funcionarios vf 
        JOIN public.escolas e ON vf.escola_id = e.id 
        WHERE vf.funcionario_id = f.id AND e.secretaria_id = p_secretaria_id AND vf.ativo = true
      )
    )
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
    AND (
      p_escola_id IS NULL OR 
      a.escola_id = p_escola_id OR
      EXISTS (
        SELECT 1 FROM public.emaee_matriculas em 
        WHERE em.aluno_id = a.id AND em.escola_atendimento_id = p_escola_id AND em.status = 'ATIVO' AND em.deleted_at IS NULL
      )
    )
    AND (
      p_escola_id IS NOT NULL OR
      p_secretaria_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM public.escolas e 
        WHERE e.id = a.escola_id AND e.secretaria_id = p_secretaria_id
      )
    )
  ORDER BY day ASC;
END;
$function$;
