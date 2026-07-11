-- Criar a tabela de transferências de funcionários
CREATE TABLE public.transferencias_funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  escola_origem_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  escola_destino_id UUID REFERENCES public.escolas(id) ON DELETE SET NULL, -- Nulo para fora da rede
  solicitante_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  motivo TEXT,
  fora_da_rede BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'ACEITA', 'REJEITADA', 'ARQUIVADA'
  resposta_texto TEXT,
  respondido_por UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  respondido_em TIMESTAMP WITH TIME ZONE,
  ficha_snapshot JSONB,
  arquivos_anexos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.transferencias_funcionarios ENABLE ROW LEVEL SECURITY;

-- Política de desenvolvimento para usuários autenticados
CREATE POLICY "dev_all_authenticated" ON public.transferencias_funcionarios
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
