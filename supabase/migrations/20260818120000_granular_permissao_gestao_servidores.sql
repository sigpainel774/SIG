-- ==============================================================================
-- Migration: 20260818120000_granular_permissao_gestao_servidores.sql
-- Propósito: Criar função SECURITY DEFINER pode_gerenciar_acessos_escola e 
--            atualizar RLS de acessos_usuarios para permitir que secretárias 
--            (Nível 3) autorizadas gerenciem acessos de servidores da sua unidade.
-- ==============================================================================

-- 1. Função com SECURITY DEFINER para checar se o usuário pode gerenciar acessos na escola/unidade
CREATE OR REPLACE FUNCTION public.pode_gerenciar_acessos_escola(p_escola_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_func_id uuid;
  v_is_super boolean;
BEGIN
  -- Identifica o funcionário correspondente ao auth.uid()
  SELECT id, is_superadmin INTO v_func_id, v_is_super
  FROM public.funcionarios
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  IF v_is_super = true THEN
    RETURN true;
  END IF;

  IF v_func_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Verifica se tem Nível 1 (Admin Global)
  IF EXISTS (
    SELECT 1 FROM public.acessos_usuarios
    WHERE funcionario_id = v_func_id AND nivel = 1 AND ativo = true
  ) THEN
    RETURN true;
  END IF;

  -- Se escola_id for nulo, apenas Nível 1 ou Superadmin pode gerenciar
  IF p_escola_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. Verifica se é Diretor (Nível 2) na escola
  IF EXISTS (
    SELECT 1 FROM public.acessos_usuarios
    WHERE funcionario_id = v_func_id AND escola_id = p_escola_id AND nivel = 2 AND ativo = true
  ) THEN
    RETURN true;
  END IF;

  -- 3. Verifica se é Secretário (Nível 3) com a permissão granular concedida
  IF EXISTS (
    SELECT 1 
    FROM public.acessos_usuarios au
    JOIN public.acessos_usuarios_permissoes aup ON aup.acesso_usuario_id = au.id
    WHERE au.funcionario_id = v_func_id
      AND au.escola_id = p_escola_id
      AND au.nivel = 3
      AND au.ativo = true
      AND aup.permissao = 'servidores.gerenciar_permissoes'
      AND aup.permitido = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 2. Atualiza a política de escrita da tabela acessos_usuarios
DROP POLICY IF EXISTS "acessos_usuarios_abac_write" ON public.acessos_usuarios;

CREATE POLICY "acessos_usuarios_abac_write" ON public.acessos_usuarios
FOR ALL
USING (
  is_admin_global()
  OR (
    escola_id IS NOT NULL
    AND pode_gerenciar_acessos_escola(escola_id)
  )
)
WITH CHECK (
  is_admin_global()
  OR (
    escola_id IS NOT NULL
    AND pode_gerenciar_acessos_escola(escola_id)
    AND nivel >= 3
  )
);

-- 3. Garantir permissões de escrita/leitura consistentes na tabela acessos_usuarios_permissoes
DROP POLICY IF EXISTS "acessos_usuarios_permissoes_write" ON public.acessos_usuarios_permissoes;
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.acessos_usuarios_permissoes;

CREATE POLICY "acessos_usuarios_permissoes_write" ON public.acessos_usuarios_permissoes
FOR ALL
USING (
  auth.role() = 'authenticated'
)
WITH CHECK (
  auth.role() = 'authenticated'
);
