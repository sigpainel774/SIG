-- Migration: Corrigir a função is_diretor_da_escola para utilizar acessos_usuarios e vinculos_funcionarios
-- Permite que diretores com lotação ativa ou acesso nível 2 consigam atualizar dados da escola (como assinatura)

CREATE OR REPLACE FUNCTION public.is_diretor_da_escola(escola_alvo UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (
        -- É o diretor definido na tabela escolas
        EXISTS (
          SELECT 1 FROM public.escolas e
          WHERE e.id = escola_alvo AND e.diretor_id = f.id
        )
        OR
        -- Ou possui acesso ativo de nível 2 (Diretor) para esta escola
        EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id
            AND au.escola_id = escola_alvo
            AND au.nivel = 2
            AND au.ativo = true
        )
        OR
        -- Ou possui vínculo ativo com cargo de diretor nesta escola
        EXISTS (
          SELECT 1 FROM public.vinculos_funcionarios vf
          WHERE vf.funcionario_id = f.id
            AND vf.escola_id = escola_alvo
            AND vf.ativo = true
            AND (LOWER(vf.cargo) = 'diretor' OR LOWER(vf.cargo) LIKE '%diretor%')
        )
      )
  );
$$;
