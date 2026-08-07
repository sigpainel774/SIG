-- Migration para adicionar a flag is_profissional_aee na tabela funcionarios
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS is_profissional_aee BOOLEAN DEFAULT false NOT NULL;

COMMENT ON COLUMN public.funcionarios.is_profissional_aee IS 'Indica se o servidor é um Profissional AEE (Atendimento Educacional Especializado) para exibição na seção específica do EMAEE.';
