-- Migration para Tabela de Bug Reports / Feedbacks no SIG
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(50) NOT NULL DEFAULT 'bug',
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  autor_nome TEXT,
  autor_email TEXT,
  escola TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pendente',
  resposta_root TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer usuario autenticado pode criar bug_reports" ON public.bug_reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Qualquer usuario autenticado pode ver bug_reports" ON public.bug_reports
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Qualquer usuario autenticado pode atualizar bug_reports" ON public.bug_reports
  FOR UPDATE USING (auth.role() = 'authenticated');
