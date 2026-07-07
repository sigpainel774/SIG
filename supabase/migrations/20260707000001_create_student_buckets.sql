-- Migration: Criar buckets fotos_alunos e assinaturas_alunos com políticas de RLS
-- Garante a existência dos buckets e configura as políticas corretas para acesso do app

INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos_alunos', 'fotos_alunos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas_alunos', 'assinaturas_alunos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de RLS no Storage

-- 1. Leitura Pública
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access Fotos Alunos' AND tablename = 'objects') THEN
    CREATE POLICY "Public Read Access Fotos Alunos" ON storage.objects FOR SELECT USING (bucket_id = 'fotos_alunos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access Assinaturas Alunos' AND tablename = 'objects') THEN
    CREATE POLICY "Public Read Access Assinaturas Alunos" ON storage.objects FOR SELECT USING (bucket_id = 'assinaturas_alunos');
  END IF;
END $$;

-- 2. Inserção (Upload) Autenticada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert Access Fotos Alunos' AND tablename = 'objects') THEN
    CREATE POLICY "Public Insert Access Fotos Alunos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'fotos_alunos' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert Access Assinaturas Alunos' AND tablename = 'objects') THEN
    CREATE POLICY "Public Insert Access Assinaturas Alunos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assinaturas_alunos' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 3. Atualização (Update) Autenticada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso autenticado para update de fotos_alunos' AND tablename = 'objects') THEN
    CREATE POLICY "Acesso autenticado para update de fotos_alunos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'fotos_alunos' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso autenticado para update de assinaturas_alunos' AND tablename = 'objects') THEN
    CREATE POLICY "Acesso autenticado para update de assinaturas_alunos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'assinaturas_alunos' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. Exclusão (Delete) Autenticada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso autenticado para delete de fotos_alunos' AND tablename = 'objects') THEN
    CREATE POLICY "Acesso autenticado para delete de fotos_alunos" ON storage.objects
    FOR DELETE USING (bucket_id = 'fotos_alunos' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Acesso autenticado para delete de assinaturas_alunos' AND tablename = 'objects') THEN
    CREATE POLICY "Acesso autenticado para delete de assinaturas_alunos" ON storage.objects
    FOR DELETE USING (bucket_id = 'assinaturas_alunos' AND auth.role() = 'authenticated');
  END IF;
END $$;
