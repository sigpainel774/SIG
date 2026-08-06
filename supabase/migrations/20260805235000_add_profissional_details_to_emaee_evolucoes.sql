-- Migration: Add profissional details to funcionarios and emaee_evolucoes
-- Created At: 2026-08-05T23:50:00

ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS registro_profissional TEXT;

ALTER TABLE public.emaee_evolucoes 
ADD COLUMN IF NOT EXISTS profissional_nome TEXT,
ADD COLUMN IF NOT EXISTS profissional_registro TEXT;
