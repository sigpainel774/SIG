-- Adicionar campos de timestamp de código à tabela de alunos
ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS codigo_temp_resp_criado_em TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS codigo_temp_func_criado_em TIMESTAMPTZ;

-- Criar a tabela assinatura
CREATE TABLE IF NOT EXISTS public.assinatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL DEFAULT 'comprovante_matricula',
  token_verificacao TEXT UNIQUE NOT NULL,
  hash_sha256 TEXT NOT NULL,
  arquivo_pdf_url TEXT,
  
  -- Evidências Responsável
  ip_responsavel TEXT,
  user_agent_responsavel TEXT,
  dispositivo_responsavel TEXT,
  data_responsavel TIMESTAMPTZ,
  
  -- Evidências Funcionário
  ip_funcionario TEXT,
  user_agent_funcionario TEXT,
  dispositivo_funcionario TEXT,
  data_funcionario TIMESTAMPTZ,
  
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Criar tabela de solicitações de liberação para edição/assinatura
CREATE TABLE IF NOT EXISTS public.solicitacoes_edicao_aluno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
  solicitante_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  justificativa TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  aprovado_por UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  justificativa_resposta TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  respondido_em TIMESTAMPTZ
);

-- Habilitar RLS e Políticas
ALTER TABLE public.assinatura ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_edicao_aluno ENABLE ROW LEVEL SECURITY;

-- Evitar drops indesejados nas políticas
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.assinatura;
DROP POLICY IF EXISTS "public_select_verificacao" ON public.assinatura;
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.solicitacoes_edicao_aluno;

CREATE POLICY "dev_all_authenticated" ON public.assinatura
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "public_select_verificacao" ON public.assinatura
  FOR SELECT USING (true);

CREATE POLICY "dev_all_authenticated" ON public.solicitacoes_edicao_aluno
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Atualizar política de INSERT do bucket de assinaturas para público (necessário para celular anônimo)
DROP POLICY IF EXISTS "Public Insert Access Assinaturas Alunos" ON storage.objects;
CREATE POLICY "Public Insert Access Assinaturas Alunos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'assinaturas_alunos');

-- Criar bucket de Comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes_matriculas', 'comprovantes_matriculas', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS no Storage para Comprovantes
DROP POLICY IF EXISTS "Public Read Access Comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Access Comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access Comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access Comprovantes" ON storage.objects;

CREATE POLICY "Public Read Access Comprovantes" ON storage.objects FOR SELECT USING (bucket_id = 'comprovantes_matriculas');
CREATE POLICY "Public Insert Access Comprovantes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comprovantes_matriculas');
CREATE POLICY "Public Update Access Comprovantes" ON storage.objects FOR UPDATE USING (bucket_id = 'comprovantes_matriculas');
CREATE POLICY "Public Delete Access Comprovantes" ON storage.objects FOR DELETE USING (bucket_id = 'comprovantes_matriculas');
