-- Migration: 20260821133000_emaee_atendido_and_alunos_rls.sql
-- Descrição: Adiciona coluna atendido_emaee na tabela public.alunos, índice e políticas RLS para equipe autorizada do EMAEE.

-- 1. Adicionar a coluna atendido_emaee na tabela public.alunos
ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS atendido_emaee boolean NOT NULL DEFAULT false;

-- 2. Criar índice para performance em buscas de alunos do EMAEE
CREATE INDEX IF NOT EXISTS idx_alunos_atendido_emaee 
ON public.alunos(atendido_emaee) 
WHERE atendido_emaee = true;

-- 3. Atualizar os alunos que já possuem matrícula no EMAEE para atendido_emaee = true
UPDATE public.alunos a
SET atendido_emaee = true
WHERE EXISTS (
  SELECT 1 FROM public.emaee_matriculas em
  WHERE em.aluno_id = a.id AND em.deleted_at IS NULL
);

-- 4. Criar políticas RLS para equipe autorizada do EMAEE na tabela alunos
DROP POLICY IF EXISTS "alunos_emaee_select" ON public.alunos;
CREATE POLICY "alunos_emaee_select" ON public.alunos
  FOR SELECT
  TO public
  USING (
    fn_pode_acessar_emaee() 
    AND (
      tem_acesso_a_escola(escola_id) 
      OR atendido_emaee = true 
      OR EXISTS (
        SELECT 1 FROM public.emaee_matriculas em 
        WHERE em.aluno_id = alunos.id AND em.deleted_at IS NULL
      )
    )
  );

DROP POLICY IF EXISTS "alunos_emaee_insert" ON public.alunos;
CREATE POLICY "alunos_emaee_insert" ON public.alunos
  FOR INSERT
  TO public
  WITH CHECK (
    fn_pode_acessar_emaee() 
    AND tem_acesso_a_escola(escola_id)
  );

DROP POLICY IF EXISTS "alunos_emaee_update" ON public.alunos;
CREATE POLICY "alunos_emaee_update" ON public.alunos
  FOR UPDATE
  TO public
  USING (
    fn_pode_acessar_emaee() 
    AND (
      tem_acesso_a_escola(escola_id) 
      OR atendido_emaee = true 
      OR EXISTS (
        SELECT 1 FROM public.emaee_matriculas em 
        WHERE em.aluno_id = alunos.id AND em.deleted_at IS NULL
      )
    )
  );
