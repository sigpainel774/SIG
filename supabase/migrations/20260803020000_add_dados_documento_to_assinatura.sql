-- Migration: 20260803020000_add_dados_documento_to_assinatura.sql
-- Descrição: Adiciona a coluna dados_documento (jsonb) na tabela public.assinatura para armazenar o conteúdo de ofícios e documentos oficiais emitidos.

ALTER TABLE public.assinatura 
ADD COLUMN IF NOT EXISTS dados_documento jsonb DEFAULT NULL;

COMMENT ON COLUMN public.assinatura.dados_documento IS 'Payload JSON contendo dados do documento emitido (ex: numeroOficio, destinatario, assunto, conteudoHtml)';
