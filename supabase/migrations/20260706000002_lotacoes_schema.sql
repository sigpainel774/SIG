-- Migration: Lotações Schema
-- Adiciona colunas necessárias para Gestão de Lotações

-- 1. Expandir vinculos_funcionarios com cargo, ativo e datas
ALTER TABLE public.vinculos_funcionarios
  ADD COLUMN IF NOT EXISTS cargo       TEXT,
  ADD COLUMN IF NOT EXISTS ativo       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS data_inicio DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS data_fim    DATE;

-- 2. Expandir funcionarios com dados pessoais adicionais
ALTER TABLE public.funcionarios
  ADD COLUMN IF NOT EXISTS cpf      TEXT,
  ADD COLUMN IF NOT EXISTS formacao TEXT,
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 3. RLS para vinculos_funcionarios (dev policy — substituir em produção)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'vinculos_funcionarios'
      AND policyname = 'dev_all_authenticated'
  ) THEN
    CREATE POLICY "dev_all_authenticated"
    ON public.vinculos_funcionarios
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. Bucket fotos-funcionarios (configurado via MCP/SQL Storage API)
-- A criação do bucket é feita via MCP separado.
