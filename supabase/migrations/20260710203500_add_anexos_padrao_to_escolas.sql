ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS anexos_padrao text[] DEFAULT '{}';
