-- Migration: Permissões Granulares por Secretário (ABAC)
-- Data: 2026-07-25

-- 1. Tabela de permissões por acesso
CREATE TABLE IF NOT EXISTS public.acessos_usuarios_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acesso_usuario_id uuid NOT NULL REFERENCES public.acessos_usuarios(id) ON DELETE CASCADE,
  permissao text NOT NULL,
  permitido boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_acesso_permissao UNIQUE (acesso_usuario_id, permissao)
);

-- Habilita RLS
ALTER TABLE public.acessos_usuarios_permissoes ENABLE ROW LEVEL SECURITY;

-- Política RLS para desenvolvimento e usuários autenticados
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.acessos_usuarios_permissoes;
CREATE POLICY "dev_all_authenticated" ON public.acessos_usuarios_permissoes
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 2. Função RPC de verificação de permissão (SECURITY DEFINER para prevenir recursão RLS)
CREATE OR REPLACE FUNCTION public.tem_permissao(
  p_permissao text,
  p_escola_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_superadmin boolean;
  v_nivel integer;
  v_acesso_id uuid;
  v_permitido boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;

  -- 1. Superadmin tem acesso total
  SELECT is_superadmin INTO v_is_superadmin 
  FROM public.funcionarios 
  WHERE auth_user_id = v_user_id AND deleted_at IS NULL;
  
  IF v_is_superadmin = true THEN RETURN true; END IF;

  -- 2. Busca o acesso ativo do usuário para a escola especificada
  SELECT id, nivel INTO v_acesso_id, v_nivel
  FROM public.acessos_usuarios
  WHERE funcionario_id = (SELECT id FROM public.funcionarios WHERE auth_user_id = v_user_id AND deleted_at IS NULL)
    AND (p_escola_id IS NULL OR escola_id = p_escola_id)
    AND ativo = true
  ORDER BY (CASE WHEN escola_id = p_escola_id THEN 0 ELSE 1 END), nivel ASC
  LIMIT 1;

  IF v_acesso_id IS NULL THEN RETURN false; END IF;

  -- 3. Nível 1 (Root) e Nível 2 (Diretor) possuem permissão plena na escola
  IF v_nivel <= 2 THEN RETURN true; END IF;

  -- 4. Nível 3 (Secretário) depende do toggle específico
  IF v_nivel = 3 THEN
    SELECT permitido INTO v_permitido
    FROM public.acessos_usuarios_permissoes
    WHERE acesso_usuario_id = v_acesso_id AND permissao = p_permissao;
    
    RETURN COALESCE(v_permitido, false);
  END IF;

  -- Demais níveis (ex: professores)
  RETURN false;
END;
$$;

-- 3. Semente de dados (Seeding) para manter acesso dos secretários já cadastrados
INSERT INTO public.acessos_usuarios_permissoes (acesso_usuario_id, permissao, permitido)
SELECT au.id, p.permissao, true
FROM public.acessos_usuarios au
CROSS JOIN (
  VALUES 
    ('alunos.consultar'),
    ('alunos.cadastrar'),
    ('alunos.editar'),
    ('alunos.anexos'),
    ('documentos.imprimir_ficha'),
    ('documentos.imprimir_comprovante'),
    ('matriculas.realizar'),
    ('atividades.ver_fila'),
    ('atividades.imprimir'),
    ('atividades.atualizar_status'),
    ('secretaria.emitir_documentos')
) AS p(permissao)
WHERE au.nivel = 3 AND au.ativo = true
ON CONFLICT (acesso_usuario_id, permissao) DO NOTHING;
