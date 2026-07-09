-- Migration: Ajustar políticas de RLS para capturas de assinaturas por celular (anônimas)
-- 1. Permitir que usuários anônimos selecionem registros de alunos que estão em processo de assinatura
CREATE POLICY "alunos_anon_select_signature" ON public.alunos
FOR SELECT
USING (codigo_temp_resp IS NOT NULL OR codigo_temp_func IS NOT NULL);

-- 2. Permitir que usuários anônimos atualizem o registro do aluno com a assinatura
CREATE POLICY "alunos_anon_update_signature" ON public.alunos
FOR UPDATE
USING (codigo_temp_resp IS NOT NULL OR codigo_temp_func IS NOT NULL)
WITH CHECK (true);

-- 3. Ajustar política de UPDATE no Storage bucket de assinaturas para permitir atualização anônima (upsert)
DROP POLICY IF EXISTS "Acesso autenticado para update de assinaturas_alunos" ON storage.objects;

CREATE POLICY "Public Update Access Assinaturas Alunos" ON storage.objects
FOR UPDATE
USING (bucket_id = 'assinaturas_alunos');
