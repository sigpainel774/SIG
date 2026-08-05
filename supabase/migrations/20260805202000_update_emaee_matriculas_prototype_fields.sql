-- Migration: 20260805202000_update_emaee_matriculas_prototype_fields.sql
-- Propósito: Adicionar colunas complementares para a Ficha de Matrícula AEE 2026 do EMAEE (outros transtornos, assinaturas e dados de naturalidade/zona residencial do aluno).

ALTER TABLE public.emaee_matriculas 
ADD COLUMN IF NOT EXISTS outros_transtornos TEXT;

ALTER TABLE public.emaee_matriculas 
ADD COLUMN IF NOT EXISTS assinatura_responsavel_matricula_url TEXT;

ALTER TABLE public.emaee_matriculas 
ADD COLUMN IF NOT EXISTS assinatura_responsavel_aluno_url TEXT;

ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS uf_nascimento TEXT;

ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS municipio_nascimento TEXT;

ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS zona_residencial TEXT;
