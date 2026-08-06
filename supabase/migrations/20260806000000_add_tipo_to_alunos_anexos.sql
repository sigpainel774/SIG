-- Migration: 20260806000000_add_tipo_to_alunos_anexos.sql
-- Propósito: Adicionar coluna "tipo" na tabela "alunos_anexos" para categorização de arquivos.

ALTER TABLE public.alunos_anexos 
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'Outros' NOT NULL;

-- Adicionar check constraint para garantir a integridade dos tipos válidos
ALTER TABLE public.alunos_anexos DROP CONSTRAINT IF EXISTS check_tipo;
ALTER TABLE public.alunos_anexos ADD CONSTRAINT check_tipo CHECK (tipo IN ('Laudos', 'Documentos Pessoais', 'Outros'));
