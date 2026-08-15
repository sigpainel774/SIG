-- Migration: 20260815020000_solicitacoes_responsaveis.sql
-- Descrição: Cria a tabela de solicitações de documentos e serviços escolares pelos responsáveis dos alunos.

CREATE TABLE IF NOT EXISTS public.solicitacoes_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('declaracao_bolsa_familia', 'declaracao_matricula', 'historico_escolar', 'outro')),
  titulo text NOT NULL,
  observacoes text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'concluido', 'recusado')),
  resposta_escola text,
  concluido_em timestamp with time zone,
  concluido_por uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_solicitacoes_resp_escola ON public.solicitacoes_responsaveis(escola_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_resp_aluno ON public.solicitacoes_responsaveis(aluno_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_resp_responsavel ON public.solicitacoes_responsaveis(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_resp_status ON public.solicitacoes_responsaveis(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_resp_data ON public.solicitacoes_responsaveis(created_at DESC);

-- Habilitar RLS e política padrão de desenvolvimento
ALTER TABLE public.solicitacoes_responsaveis ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'solicitacoes_responsaveis' AND policyname = 'dev_all_authenticated'
  ) THEN
    CREATE POLICY "dev_all_authenticated" ON public.solicitacoes_responsaveis
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
