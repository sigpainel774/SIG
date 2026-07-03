-- Migration: Expandir tabela de alunos com dados estendidos e JSONB dados_matricula

ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS inep TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS serie TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS turma_id UUID REFERENCES turmas(id) ON DELETE SET NULL;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS rg TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nis TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cartao_sus TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS certidao_nascimento TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nome_mae TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS nome_pai TEXT;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS dados_matricula JSONB DEFAULT '{}'::jsonb;

-- Garantir buckets de armazenamento caso não existam no Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos_alunos', 'fotos_alunos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas_alunos', 'assinaturas_alunos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso público para visualização de fotos e assinaturas
CREATE POLICY "Public Read Access Fotos Alunos" ON storage.objects
FOR SELECT USING (bucket_id = 'fotos_alunos');

CREATE POLICY "Public Read Access Assinaturas Alunos" ON storage.objects
FOR SELECT USING (bucket_id = 'assinaturas_alunos');

CREATE POLICY "Public Insert Access Fotos Alunos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'fotos_alunos');

CREATE POLICY "Public Insert Access Assinaturas Alunos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'assinaturas_alunos');
