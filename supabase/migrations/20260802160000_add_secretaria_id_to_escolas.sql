-- Migration: Adiciona secretaria_id na tabela public.escolas e vincula escolas existentes à Secretaria Municipal de Educação

ALTER TABLE public.escolas 
ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES public.secretarias(id) ON DELETE SET NULL;

-- Garante que exista pelo menos a Secretaria Municipal de Educação
INSERT INTO public.secretarias (nome, ativo)
SELECT 'Secretaria Municipal de Educação', true
WHERE NOT EXISTS (SELECT 1 FROM public.secretarias LIMIT 1);

-- Preenche retroativamente todas as escolas existentes com o ID da Secretaria Municipal de Educação (ou a primeira secretaria cadastrada)
UPDATE public.escolas
SET secretaria_id = (
  SELECT id FROM public.secretarias 
  WHERE nome ILIKE '%Educação%' OR nome ILIKE '%Educacao%' 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE secretaria_id IS NULL;
