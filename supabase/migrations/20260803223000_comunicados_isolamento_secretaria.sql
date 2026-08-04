-- 1. Create comunicados_lidos table
CREATE TABLE IF NOT EXISTS public.comunicados_lidos (
  comunicado_id UUID NOT NULL REFERENCES public.comunicados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (comunicado_id, user_id)
);

ALTER TABLE public.comunicados_lidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.comunicados_lidos;
CREATE POLICY "dev_all_authenticated" ON public.comunicados_lidos FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. Add secretaria_id to comunicados
ALTER TABLE public.comunicados ADD COLUMN IF NOT EXISTS secretaria_id UUID REFERENCES public.secretarias(id) ON DELETE CASCADE;

-- 3. Set old comunicados to Educação
UPDATE public.comunicados 
SET secretaria_id = (SELECT id FROM public.secretarias WHERE nome ILIKE '%educação%' OR nome ILIKE '%educacao%' LIMIT 1)
WHERE secretaria_id IS NULL;

-- 4. Update get_birthdays_of_month
CREATE OR REPLACE FUNCTION public.get_birthdays_of_month(month_num integer, p_secretaria_id uuid DEFAULT NULL)
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
      p_secretaria_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM public.escolas e 
        WHERE e.id = a.escola_id AND e.secretaria_id = p_secretaria_id
      )
    )
  ORDER BY day ASC;
END;
$function$;
