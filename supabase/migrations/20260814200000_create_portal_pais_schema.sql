-- Migration: 20260814200000_create_portal_pais_schema.sql
-- Propósito: Estrutura do Portal dos Pais (contas de responsáveis, vínculos com alunos, auditoria e ativação gradual por escola).

-- 1. Flag de ativação gradual do portal na tabela escolas
ALTER TABLE public.escolas 
ADD COLUMN IF NOT EXISTS portal_pais_ativo boolean DEFAULT false;

-- 2. Tabela de Responsáveis (independente de funcionarios)
CREATE TABLE IF NOT EXISTS public.responsaveis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    cpf text NOT NULL UNIQUE,
    nome text NOT NULL,
    email text NOT NULL,
    telefone text,
    ativo boolean DEFAULT true,
    must_change_password boolean DEFAULT true,
    criado_por uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);

-- 3. Vínculo Responsável x Aluno
CREATE TABLE IF NOT EXISTS public.responsaveis_alunos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    responsavel_id uuid NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
    aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
    parentesco text DEFAULT 'Responsável',
    created_at timestamptz DEFAULT now(),
    UNIQUE(responsavel_id, aluno_id)
);

-- 4. Log de Auditoria para ações com Pais/Responsáveis
CREATE TABLE IF NOT EXISTS public.responsavel_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL,
    acao text NOT NULL,
    executado_por uuid REFERENCES auth.users(id),
    detalhes jsonb,
    created_at timestamptz DEFAULT now()
);

-- 5. Habilitar RLS em todas as novas tabelas
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsavel_audit_log ENABLE ROW LEVEL SECURITY;

-- 6. Função auxiliar SECURITY DEFINER para verificar se o usuário é Staff (Nível 1, 2 ou 3) ou Superadmin
CREATE OR REPLACE FUNCTION public.fn_is_staff_nivel_1_2_3()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    LEFT JOIN public.acessos_usuarios au ON au.funcionario_id = f.id
    WHERE f.auth_user_id = auth.uid()
      AND (
        f.is_superadmin = true 
        OR (au.ativo = true AND au.nivel IN (1, 2, 3))
      )
  )
$$;

-- 7. Policies para Staff (Admin / Diretores / Secretários)
DROP POLICY IF EXISTS "staff_manage_responsaveis" ON public.responsaveis;
CREATE POLICY "staff_manage_responsaveis" ON public.responsaveis
  FOR ALL USING (fn_is_staff_nivel_1_2_3()) WITH CHECK (fn_is_staff_nivel_1_2_3());

DROP POLICY IF EXISTS "staff_manage_responsaveis_alunos" ON public.responsaveis_alunos;
CREATE POLICY "staff_manage_responsaveis_alunos" ON public.responsaveis_alunos
  FOR ALL USING (fn_is_staff_nivel_1_2_3()) WITH CHECK (fn_is_staff_nivel_1_2_3());

DROP POLICY IF EXISTS "staff_manage_responsavel_audit_log" ON public.responsavel_audit_log;
CREATE POLICY "staff_manage_responsavel_audit_log" ON public.responsavel_audit_log
  FOR ALL USING (fn_is_staff_nivel_1_2_3()) WITH CHECK (fn_is_staff_nivel_1_2_3());

-- 8. Policies de Leitura dos Pais (Apenas seus próprios dados)
DROP POLICY IF EXISTS "pais_read_proprio" ON public.responsaveis;
CREATE POLICY "pais_read_proprio" ON public.responsaveis
  FOR SELECT USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "pais_read_vinculos" ON public.responsaveis_alunos;
CREATE POLICY "pais_read_vinculos" ON public.responsaveis_alunos
  FOR SELECT USING (
    responsavel_id IN (
      SELECT id FROM public.responsaveis WHERE auth_user_id = auth.uid()
    )
  );

-- 9. Policy de Notas para Pais (Apenas se a escola do aluno estiver com o portal ativo)
DROP POLICY IF EXISTS "pais_read_notas_portal_ativo" ON public.notas;
CREATE POLICY "pais_read_notas_portal_ativo" ON public.notas
  FOR SELECT USING (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      JOIN public.alunos a ON a.id = ra.aluno_id
      JOIN public.escolas e ON e.id = a.escola_id
      WHERE r.auth_user_id = auth.uid()
        AND e.portal_pais_ativo = true
    )
  );

-- 10. Policy de Frequências para Pais (Apenas se portal ativo)
DROP POLICY IF EXISTS "pais_read_frequencias_portal_ativo" ON public.frequencias;
CREATE POLICY "pais_read_frequencias_portal_ativo" ON public.frequencias
  FOR SELECT USING (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      JOIN public.alunos a ON a.id = ra.aluno_id
      JOIN public.escolas e ON e.id = a.escola_id
      WHERE r.auth_user_id = auth.uid()
        AND e.portal_pais_ativo = true
    )
  );

-- 11. Correção de RLS em Ocorrências (Remover conflito com permitir_autenticados_all)
DROP POLICY IF EXISTS "pais_read_ocorrencias_portal_ativo" ON public.ocorrencias;
CREATE POLICY "pais_read_ocorrencias_portal_ativo" ON public.ocorrencias
  FOR SELECT USING (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      JOIN public.alunos a ON a.id = ra.aluno_id
      JOIN public.escolas e ON e.id = a.escola_id
      WHERE r.auth_user_id = auth.uid()
        AND e.portal_pais_ativo = true
    )
  );

-- Pais podem atualizar status_pais para "Cientes"
DROP POLICY IF EXISTS "pais_update_ciente_ocorrencias" ON public.ocorrencias;
CREATE POLICY "pais_update_ciente_ocorrencias" ON public.ocorrencias
  FOR UPDATE USING (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      JOIN public.alunos a ON a.id = ra.aluno_id
      JOIN public.escolas e ON e.id = a.escola_id
      WHERE r.auth_user_id = auth.uid()
        AND e.portal_pais_ativo = true
    )
  )
  WITH CHECK (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      JOIN public.alunos a ON a.id = ra.aluno_id
      JOIN public.escolas e ON e.id = a.escola_id
      WHERE r.auth_user_id = auth.uid()
        AND e.portal_pais_ativo = true
    )
  );
