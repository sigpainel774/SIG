-- Migration: Adicionar assinatura_url à tabela de funcionarios
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS assinatura_url text;
