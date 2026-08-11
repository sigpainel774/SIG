-- Migration: 20260811150000_fix_level3_and_school_access_rls.sql
-- Propósito: Blindagem e correção das funções RLS e permissões para usuários Nível 3 (Secretário Escolar) e Nível 2 (Diretor)

-- 1. Atualizar a função tem_acesso_a_escola para incluir acessos_usuarios com escola_id
CREATE OR REPLACE FUNCTION public.tem_acesso_a_escola(escola_alvo UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (
        -- É Superadmin
        f.is_superadmin = true
        OR
        -- É Administrador Global (Nível 1)
        EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id 
            AND au.nivel = 1 
            AND au.ativo = true
            AND (
              au.secretarias_ids IS NULL 
              OR ARRAY_LENGTH(au.secretarias_ids, 1) IS NULL
              OR EXISTS (
                SELECT 1 FROM public.escolas esc 
                WHERE esc.id = escola_alvo 
                  AND esc.secretaria_id = ANY(au.secretarias_ids)
              )
            )
        )
        OR
        -- Possui acesso ativo para esta escola específica via acessos_usuarios (Nível 2, 3, etc.)
        EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id
            AND au.escola_id = escola_alvo
            AND au.ativo = true
        )
        OR
        -- Possui vínculo ativo para esta escola via vinculos_funcionarios
        EXISTS (
          SELECT 1 FROM public.vinculos_funcionarios vf
          WHERE vf.funcionario_id = f.id
            AND vf.escola_id = escola_alvo
            AND vf.ativo = true
        )
      )
  );
$$;

-- 2. Atualizar a função pode_ler_funcionario para incluir coincidência de acessos_usuarios
CREATE OR REPLACE FUNCTION public.pode_ler_funcionario(funcionario_id_alvo UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f_eu
    WHERE f_eu.auth_user_id = auth.uid()
      AND (
        -- É o próprio funcionário
        f_eu.id = funcionario_id_alvo
        OR
        -- É Admin Global / Superadmin / RH da Rede
        f_eu.is_superadmin = true
        OR
        EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f_eu.id 
            AND (au.nivel = 1 OR au.pode_rh_rede = true)
            AND au.ativo = true
        )
        OR
        -- Compartilha uma escola com vínculo ativo no vinculos_funcionarios
        EXISTS (
          SELECT 1 FROM public.vinculos_funcionarios vf_alvo
          JOIN public.vinculos_funcionarios vf_eu ON vf_eu.escola_id = vf_alvo.escola_id
          WHERE vf_alvo.funcionario_id = funcionario_id_alvo
            AND vf_alvo.ativo = true
            AND vf_eu.ativo = true
            AND vf_eu.funcionario_id = f_eu.id
        )
        OR
        -- Compartilha uma escola via acessos_usuarios (Nível 2 ou 3)
        EXISTS (
          SELECT 1 FROM public.acessos_usuarios au_alvo
          JOIN public.acessos_usuarios au_eu ON au_eu.escola_id = au_alvo.escola_id
          WHERE au_alvo.funcionario_id = funcionario_id_alvo
            AND au_alvo.ativo = true
            AND au_eu.ativo = true
            AND au_eu.funcionario_id = f_eu.id
        )
      )
  );
$$;

-- 3. Atualizar política RLS de escrita (INSERT) na tabela funcionarios
DROP POLICY IF EXISTS "funcionarios_escrita" ON public.funcionarios;
CREATE POLICY "funcionarios_escrita" ON public.funcionarios
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      is_admin_global()
      OR EXISTS (
        SELECT 1 FROM public.acessos_usuarios au
        WHERE au.funcionario_id = (SELECT id FROM public.funcionarios WHERE auth_user_id = auth.uid() LIMIT 1)
          AND au.nivel IN (1, 2, 3)
          AND au.ativo = true
      )
    )
  );

-- 4. Atualizar política RLS de alteração (UPDATE) na tabela funcionarios
DROP POLICY IF EXISTS "funcionarios_update" ON public.funcionarios;
CREATE POLICY "funcionarios_update" ON public.funcionarios
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      is_admin_global()
      OR auth_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.acessos_usuarios au
        WHERE au.funcionario_id = (SELECT id FROM public.funcionarios WHERE auth_user_id = auth.uid() LIMIT 1)
          AND au.nivel IN (1, 2, 3)
          AND au.ativo = true
      )
    )
  );
