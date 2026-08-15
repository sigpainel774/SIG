-- Migration: 20260815010000_fix_pais_update_proprio_rls.sql
-- Propósito: Adicionar política RLS de UPDATE na tabela responsaveis para permitir que o próprio responsável atualize seus dados e a flag must_change_password após o primeiro acesso.

DROP POLICY IF EXISTS "pais_update_proprio" ON public.responsaveis;
CREATE POLICY "pais_update_proprio" ON public.responsaveis
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Sincronizar registros legados onde auth.users já concluiu a troca de senha
UPDATE public.responsaveis r
SET must_change_password = false
FROM auth.users u
WHERE r.auth_user_id = u.id
  AND (u.raw_user_meta_data->>'must_change_password')::boolean = false
  AND r.must_change_password = true;
