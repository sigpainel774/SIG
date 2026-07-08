-- Migration: Adicionar assinatura_diretor_url e RLS para alteração por diretores
-- Permite que os diretores das escolas editem os dados de suas respectivas unidades escolares

ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS assinatura_diretor_url TEXT;

-- Função auxiliar com SECURITY DEFINER para verificar se o usuário é o diretor da escola alvo
CREATE OR REPLACE FUNCTION public.is_diretor_da_escola(escola_alvo UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.escolas e
    JOIN public.funcionarios f ON f.id = e.diretor_id
    WHERE e.id = escola_alvo AND f.auth_user_id = auth.uid()
  );
$$;

-- Criar a política de atualização na tabela escolas que permita escrita para diretores ou superadmins
DROP POLICY IF EXISTS "update_escola_diretor" ON public.escolas;
CREATE POLICY "update_escola_diretor" ON public.escolas
  FOR UPDATE USING (
    public.is_diretor_da_escola(id) OR public.is_admin_global()
  );
