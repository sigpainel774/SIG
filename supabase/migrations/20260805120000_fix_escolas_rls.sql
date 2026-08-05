-- Migration: 20260805120000_fix_escolas_rls.sql
-- Propósito: Separar a política de ALL da tabela escolas em INSERT/UPDATE/DELETE.
-- Isso previne que o Postgres avalie a função tem_acesso_a_escola (que consulta a própria tabela escolas)
-- durante os SELECTs na API PostgREST, o que vinha causando Infinite Recursion silencioso 
-- e bloqueando a listagem de unidades e postos de saúde (exibindo "Nenhuma unidade associada").

-- 1. Remove a policy agregadora (ALL) que causava o conflito em leituras
DROP POLICY IF EXISTS "escolas_acesso_por_lotacao" ON public.escolas;

-- 2. Recria as policies separadamente (A política de SELECT já é garantida por "escolas_select_authenticated")
CREATE POLICY "escolas_insert" ON public.escolas
  FOR INSERT WITH CHECK (
    public.is_admin_global() 
    OR public.tem_acesso_a_secretaria(secretaria_id)
  );

CREATE POLICY "escolas_update_geral" ON public.escolas
  FOR UPDATE USING (
    public.is_admin_global() 
    OR public.tem_acesso_a_secretaria(secretaria_id)
  ) WITH CHECK (
    public.is_admin_global() 
    OR public.tem_acesso_a_secretaria(secretaria_id)
  );

CREATE POLICY "escolas_delete" ON public.escolas
  FOR DELETE USING (
    public.is_admin_global() 
    OR public.tem_acesso_a_secretaria(secretaria_id)
  );

-- Mantém a "update_escola_diretor" original que já existe para o Diretor atualizar infos da própria escola.
