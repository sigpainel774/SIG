-- Migration: 20260813210000_add_is_teste_to_escolas.sql
-- Propósito: Adicionar coluna is_teste em public.escolas para isolar unidades de teste

ALTER TABLE public.escolas 
ADD COLUMN IF NOT EXISTS is_teste boolean DEFAULT false NOT NULL;

-- Atualizar escolas que contêm 'Teste' no nome
UPDATE public.escolas 
SET is_teste = true 
WHERE nome ILIKE '%teste%';
