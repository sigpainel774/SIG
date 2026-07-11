CREATE TABLE IF NOT EXISTS public.configuracao_notificacoes_niveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel integer, -- 1, 2, 3, 4, 5
  cargo_pattern text, -- padrão de cargo (ex: '%Professor%')
  tipo_notificacao text NOT NULL, -- 'transferencia', 'solicitacao_rh', 'comunicado', 'alerta_prazo'
  enviar_web boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_nivel_tipo UNIQUE (nivel, tipo_notificacao),
  CONSTRAINT unique_cargo_tipo UNIQUE (cargo_pattern, tipo_notificacao)
);

ALTER TABLE public.configuracao_notificacoes_niveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.configuracao_notificacoes_niveis
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

INSERT INTO public.configuracao_notificacoes_niveis (nivel, cargo_pattern, tipo_notificacao, enviar_web) VALUES
  (1, null, 'transferencia', true),
  (1, null, 'solicitacao_rh', true),
  (1, null, 'comunicado', true),
  (1, null, 'alerta_prazo', true),
  
  (2, null, 'transferencia', true),
  (2, null, 'comunicado', true),
  (2, null, 'alerta_prazo', true),
  
  (3, null, 'transferencia', true),
  (3, null, 'comunicado', true),
  
  (4, null, 'comunicado', true),
  (4, null, 'alerta_prazo', true),
  
  (null, '%Professor%', 'comunicado', true),
  (null, '%Professor%', 'alerta_prazo', true)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.prazos_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid REFERENCES public.escolas(id) ON DELETE CASCADE, -- null indica prazo geral da rede
  unidade integer NOT NULL, -- 1, 2, 3, 4
  data_limite date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.prazos_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.prazos_unidades
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
