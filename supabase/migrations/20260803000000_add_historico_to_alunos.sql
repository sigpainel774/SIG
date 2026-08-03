-- Migration: 20260803000000_add_historico_to_alunos.sql
-- Adiciona a coluna historico na tabela public.alunos

ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS historico text;

COMMENT ON COLUMN public.alunos.historico IS 'Registros e historico geral do aluno';
