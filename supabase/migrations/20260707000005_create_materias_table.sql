CREATE TABLE public.materias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
  escola_id UUID REFERENCES public.escolas(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dev_all_authenticated" ON public.materias
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
