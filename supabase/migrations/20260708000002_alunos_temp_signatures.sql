-- Migration: Adicionar campos de tokens temporários de assinatura na tabela de alunos
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS codigo_temp_resp TEXT;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS codigo_temp_func TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.alunos.codigo_temp_resp IS 'Código temporário de 4 dígitos para assinatura do responsável pelo celular';
COMMENT ON COLUMN public.alunos.codigo_temp_func IS 'Código temporário de 4 dígitos para assinatura do funcionário pelo celular';
