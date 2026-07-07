-- Adiciona colunas de latitude e longitude na tabela de alunos para integração com mapa
ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;
