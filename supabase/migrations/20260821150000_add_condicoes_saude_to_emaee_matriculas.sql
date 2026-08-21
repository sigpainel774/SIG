-- Migration: 20260821150000_add_condicoes_saude_to_emaee_matriculas.sql
-- Propósito: Adiciona a coluna condicoes_saude (JSONB) na tabela public.emaee_matriculas para armazenar condições de neurodesenvolvimento e seus respectivos CIDs específicos.

ALTER TABLE public.emaee_matriculas 
ADD COLUMN IF NOT EXISTS condicoes_saude JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.emaee_matriculas.condicoes_saude IS 'Mapeamento das condições de saúde/neurodesenvolvimento e CIDs específicos (TEA, TDAH, DI, Dislexia, Disgrafia, TOD, Ansiedade, Superdotação).';
