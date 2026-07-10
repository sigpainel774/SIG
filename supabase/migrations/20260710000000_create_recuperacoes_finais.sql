-- Migration: Criar tabela de recuperações finais
CREATE TABLE IF NOT EXISTS public.recuperacoes_finais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  nota NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_aluno_materia_recuperacao UNIQUE (aluno_id, materia_id)
);

-- Habilitar RLS e criar política de segurança para desenvolvimento
ALTER TABLE public.recuperacoes_finais ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recuperacoes_finais' AND policyname = 'dev_all_authenticated'
  ) THEN
    CREATE POLICY "dev_all_authenticated" ON public.recuperacoes_finais
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
