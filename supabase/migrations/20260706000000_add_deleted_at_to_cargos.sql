-- Adiciona coluna deleted_at na tabela cargos para suportar Soft Delete (Lixeira Global)
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
