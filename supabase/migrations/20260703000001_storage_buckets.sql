-- Migration 2: Configuração dos Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('fotos-alunos', 'fotos-alunos', true),
  ('logos-escolas', 'logos-escolas', true),
  ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS no Storage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Acesso publico para leitura de fotos de alunos'
  ) THEN
    CREATE POLICY "Acesso publico para leitura de fotos de alunos" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'fotos-alunos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Acesso publico para leitura de logos de escolas'
  ) THEN
    CREATE POLICY "Acesso publico para leitura de logos de escolas" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'logos-escolas');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Acesso autenticado para upload de documentos'
  ) THEN
    CREATE POLICY "Acesso autenticado para upload de documentos" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id IN ('fotos-alunos', 'logos-escolas', 'documentos') AND auth.role() = 'authenticated');
  END IF;
END $$;
