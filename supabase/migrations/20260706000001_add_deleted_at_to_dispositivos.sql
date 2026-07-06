-- Suporte a Soft Delete / Lixeira Global na tabela de dispositivos
ALTER TABLE public.dispositivos ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
