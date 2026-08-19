-- Migration: 20260819000000_add_horario_fim_to_emaee_especialidades.sql
-- Descrição: Adiciona a coluna horario_fim na tabela de especialidades vinculadas do EMAEE

ALTER TABLE public.emaee_especialidades_vinculadas 
ADD COLUMN IF NOT EXISTS horario_fim time without time zone;

COMMENT ON COLUMN public.emaee_especialidades_vinculadas.horario_fim IS 'Horário de término da sessão de atendimento AEE';
