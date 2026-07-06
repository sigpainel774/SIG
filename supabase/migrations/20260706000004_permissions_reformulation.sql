-- Adicionar escola_id como FK direta (sem passar por orgaos)
ALTER TABLE public.acessos_usuarios
  ADD COLUMN IF NOT EXISTS escola_id UUID REFERENCES public.escolas(id) ON DELETE CASCADE;

-- Criar índice para performance no RLS
CREATE INDEX IF NOT EXISTS idx_acessos_usuarios_escola_id 
  ON public.acessos_usuarios(escola_id);

-- Vínculo pedagógico: coordenador ou professor vinculado a turmas específicas
CREATE TABLE IF NOT EXISTS public.vinculos_turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('coordenador', 'professor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(funcionario_id, turma_id)
);

-- RLS e policy de desenvolvimento
ALTER TABLE public.vinculos_turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all_authenticated" ON public.vinculos_turmas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Reescrever função tem_acesso_a_escola() (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.tem_acesso_a_escola(escola_alvo UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (
        -- ROOT ou Nível 1 (Administrador Global): acesso a tudo
        f.is_superadmin = true
        OR EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id AND au.nivel = 1 AND au.ativo = true
        )
        OR
        -- Demais: apenas escolas onde possui lotação física ativa
        EXISTS (
          SELECT 1 FROM public.vinculos_funcionarios vf
          WHERE vf.funcionario_id = f.id
            AND vf.escola_id = escola_alvo
            AND vf.ativo = true
        )
      )
  );
$$;

-- Função auxiliar: verificar se é admin global (para simplificar checks no front)
CREATE OR REPLACE FUNCTION public.is_admin_global()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (
        f.is_superadmin = true
        OR EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id AND au.nivel = 1 AND au.ativo = true
        )
      )
  );
$$;

-- ESCOLAS: substituir dev_all_authenticated
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.escolas;
CREATE POLICY "escolas_acesso_por_lotacao"
ON public.escolas FOR ALL
USING (public.tem_acesso_a_escola(id))
WITH CHECK (public.is_admin_global());

-- ALUNOS
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.alunos;
CREATE POLICY "alunos_acesso_por_escola"
ON public.alunos FOR SELECT
USING (public.tem_acesso_a_escola(escola_id));

CREATE POLICY "alunos_escrita_por_escola"
ON public.alunos FOR INSERT WITH CHECK (public.tem_acesso_a_escola(escola_id));

CREATE POLICY "alunos_update_por_escola"
ON public.alunos FOR UPDATE USING (public.tem_acesso_a_escola(escola_id));

CREATE POLICY "alunos_delete_admin"
ON public.alunos FOR DELETE USING (public.is_admin_global());

-- TURMAS
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.turmas;

-- Leitura: escola + (admin global OU coordenador/prof com vínculo de turma)
CREATE POLICY "turmas_leitura"
ON public.turmas FOR SELECT
USING (
  public.tem_acesso_a_escola(escola_id) AND (
    public.is_admin_global()
    OR EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid() AND au.nivel <= 3 AND au.ativo = true
    )
    OR EXISTS (
      SELECT 1 FROM public.vinculos_turmas vt
      JOIN public.funcionarios f ON f.id = vt.funcionario_id
      WHERE f.auth_user_id = auth.uid() AND vt.turma_id = turmas.id
    )
  )
);

-- Escrita: apenas admin global ou nível <= 3 da escola
CREATE POLICY "turmas_escrita"
ON public.turmas FOR INSERT WITH CHECK (
  public.tem_acesso_a_escola(escola_id) AND (
    public.is_admin_global()
    OR EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid() AND au.nivel <= 3 AND au.ativo = true
    )
  )
);

-- FUNCIONARIOS: substituir dev_all_authenticated
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.funcionarios;

-- Leitura: admin global vê todos; demais vêem apenas os da sua escola
CREATE POLICY "funcionarios_leitura"
ON public.funcionarios FOR SELECT
USING (
  -- Próprio funcionário sempre vê a si mesmo
  auth_user_id = auth.uid()
  OR public.is_admin_global()
  OR EXISTS (
    SELECT 1 FROM public.vinculos_funcionarios vf_alvo
    JOIN public.vinculos_funcionarios vf_eu ON vf_eu.escola_id = vf_alvo.escola_id
    JOIN public.funcionarios f_eu ON f_eu.id = vf_eu.funcionario_id
    WHERE vf_alvo.funcionario_id = funcionarios.id
      AND vf_alvo.ativo = true
      AND vf_eu.ativo = true
      AND f_eu.auth_user_id = auth.uid()
  )
);

CREATE POLICY "funcionarios_escrita" ON public.funcionarios FOR INSERT
  WITH CHECK (public.is_admin_global());
CREATE POLICY "funcionarios_update" ON public.funcionarios FOR UPDATE
  USING (public.is_admin_global() OR auth_user_id = auth.uid());
CREATE POLICY "funcionarios_delete" ON public.funcionarios FOR DELETE
  USING (public.is_admin_global());

-- VINCULOS_FUNCIONARIOS
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.vinculos_funcionarios;
CREATE POLICY "vinculos_leitura"
ON public.vinculos_funcionarios FOR SELECT
USING (
  public.is_admin_global()
  OR funcionario_id = (SELECT id FROM public.funcionarios WHERE auth_user_id = auth.uid())
  OR public.tem_acesso_a_escola(escola_id)
);
CREATE POLICY "vinculos_escrita"
ON public.vinculos_funcionarios FOR ALL
USING (public.is_admin_global())
WITH CHECK (public.is_admin_global());
