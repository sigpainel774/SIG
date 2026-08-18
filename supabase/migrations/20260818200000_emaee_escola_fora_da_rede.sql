-- Migration: 20260818200000_emaee_escola_fora_da_rede.sql
-- Propósito: Adicionar suporte para registro de escola de origem fora da rede (outro município/particular/estadual) na ficha de matrícula/prontuário do EMAEE.

ALTER TABLE public.emaee_matriculas
ADD COLUMN IF NOT EXISTS escola_origem_fora_rede BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escola_origem_nome TEXT,
ADD COLUMN IF NOT EXISTS escola_origem_municipio TEXT,
ADD COLUMN IF NOT EXISTS escola_origem_uf TEXT;
