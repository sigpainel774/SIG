-- Migration: 20260813000000_add_is_conta_eja_to_funcionarios.sql
-- Descrição: Adiciona a coluna is_conta_eja na tabela funcionarios, cria a função RLS de segurança is_conta_eja_by_uid e atualiza as políticas de RLS para escolas, alunos e turmas.

-- 1. Adicionar coluna is_conta_eja na tabela public.funcionarios
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS is_conta_eja boolean DEFAULT false;

-- 2. Criar função SECURITY DEFINER para verificar se o usuário autenticado é uma Conta Especial EJA
CREATE OR REPLACE FUNCTION public.is_conta_eja_by_uid()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.funcionarios
    WHERE auth_user_id = auth.uid()
      AND is_conta_eja = true
      AND deleted_at IS NULL
  );
END;
$$;

-- 3. Atualizar Políticas RLS da tabela public.escolas para permitir leitura a contas EJA
DROP POLICY IF EXISTS "escolas_eja_select" ON public.escolas;
CREATE POLICY "escolas_eja_select" ON public.escolas 
FOR SELECT 
USING (
  is_conta_eja_by_uid()
);

-- 4. Atualizar Políticas RLS da tabela public.alunos para permitir SELECT/INSERT/UPDATE a contas EJA
DROP POLICY IF EXISTS "alunos_eja_select" ON public.alunos;
CREATE POLICY "alunos_eja_select" ON public.alunos 
FOR SELECT 
USING (
  is_conta_eja_by_uid()
);

DROP POLICY IF EXISTS "alunos_eja_insert" ON public.alunos;
CREATE POLICY "alunos_eja_insert" ON public.alunos 
FOR INSERT 
WITH CHECK (
  is_conta_eja_by_uid()
);

DROP POLICY IF EXISTS "alunos_eja_update" ON public.alunos;
CREATE POLICY "alunos_eja_update" ON public.alunos 
FOR UPDATE 
USING (
  is_conta_eja_by_uid()
);

-- 5. Atualizar Políticas RLS da tabela public.turmas para permitir gestão total de turmas EJA
DROP POLICY IF EXISTS "turmas_eja_select" ON public.turmas;
CREATE POLICY "turmas_eja_select" ON public.turmas 
FOR SELECT 
USING (
  is_conta_eja_by_uid()
);

DROP POLICY IF EXISTS "turmas_eja_insert" ON public.turmas;
CREATE POLICY "turmas_eja_insert" ON public.turmas 
FOR INSERT 
WITH CHECK (
  is_conta_eja_by_uid()
);

DROP POLICY IF EXISTS "turmas_eja_update" ON public.turmas;
CREATE POLICY "turmas_eja_update" ON public.turmas 
FOR UPDATE 
USING (
  is_conta_eja_by_uid()
);

DROP POLICY IF EXISTS "turmas_eja_delete" ON public.turmas;
CREATE POLICY "turmas_eja_delete" ON public.turmas 
FOR DELETE 
USING (
  is_conta_eja_by_uid()
);
