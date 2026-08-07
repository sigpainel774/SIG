-- Migration: 20260807210000_controles_globais_rede.sql
-- Propósito: Adicionar colunas de controle global para privacidade no chat e restrição de edição de funcionários.

-- 1. Adicionar permitir_mensagens_globais na tabela funcionarios
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS permitir_mensagens_globais BOOLEAN DEFAULT true;

-- 2. Adicionar bloquear_edicao_funcionarios_rede na tabela configuracoes_rede
ALTER TABLE public.configuracoes_rede 
ADD COLUMN IF NOT EXISTS bloquear_edicao_funcionarios_rede BOOLEAN DEFAULT false;

-- 3. Garantir que exista ao menos uma linha em configuracoes_rede caso a tabela esteja vazia
INSERT INTO public.configuracoes_rede (id, secretario_educacao, cargo_secretario, nome_rede, bloquear_edicao_funcionarios_rede)
SELECT 
  gen_random_uuid(),
  'MARCUS ALANO CORREIA OLIVEIRA',
  'Secretário(a) de Educação',
  'Secretaria Municipal de Educação de Sapeaçu',
  false
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes_rede);
