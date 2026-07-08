-- Migration: Criar tabelas de frequências e notas

-- 1. Tabela de Frequências
CREATE TABLE IF NOT EXISTS public.frequencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  presenca BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_aluno_data UNIQUE (aluno_id, data)
);

-- Habilitar RLS e criar policy de dev
ALTER TABLE public.frequencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all_authenticated" ON public.frequencias
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- 2. Tabela de Notas
CREATE TABLE IF NOT EXISTS public.notas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  unidade INTEGER NOT NULL CHECK (unidade BETWEEN 1 AND 3),
  nota1 NUMERIC,
  nota2 NUMERIC,
  nota3 NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_aluno_materia_unidade UNIQUE (aluno_id, materia_id, unit = unidade) -- Espera, o índice deve ser aluno_id, materia_id, unidade
);

-- Correção da restrição de notas:
ALTER TABLE public.notas DROP CONSTRAINT IF EXISTS unique_aluno_materia_unidade;
ALTER TABLE public.notas ADD CONSTRAINT unique_aluno_materia_unidade UNIQUE (aluno_id, materia_id, unidade);

-- Habilitar RLS e criar policy de dev
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all_authenticated" ON public.notas
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
