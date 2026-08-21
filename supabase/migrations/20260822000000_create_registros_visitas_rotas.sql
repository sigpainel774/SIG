-- Migration: 20260822000000_create_registros_visitas_rotas.sql
-- Propósito: Auditoria e histórico de visitas e paradas realizadas nas rotas de escolas com suporte a sincronização offline

CREATE TABLE IF NOT EXISTS public.registros_visitas_rotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid REFERENCES public.escolas(id) ON DELETE SET NULL,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  rota_nome text NOT NULL DEFAULT 'Roteiro de Visitas',
  data_hora_chegada timestamp with time zone NOT NULL DEFAULT now(),
  latitude numeric,
  longitude numeric,
  distancia_ponto_metros numeric,
  odometro_km numeric,
  observacoes text,
  status text NOT NULL DEFAULT 'REALIZADA', -- 'REALIZADA', 'IMPREVISTO', 'AUSENTE'
  sincronizado_em timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de consulta e performance
CREATE INDEX IF NOT EXISTS idx_registros_visitas_escola ON public.registros_visitas_rotas(escola_id);
CREATE INDEX IF NOT EXISTS idx_registros_visitas_funcionario ON public.registros_visitas_rotas(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_registros_visitas_data ON public.registros_visitas_rotas(data_hora_chegada DESC);

-- RLS
ALTER TABLE public.registros_visitas_rotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS registros_visitas_select ON public.registros_visitas_rotas;
CREATE POLICY registros_visitas_select ON public.registros_visitas_rotas
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS registros_visitas_insert ON public.registros_visitas_rotas;
CREATE POLICY registros_visitas_insert ON public.registros_visitas_rotas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS registros_visitas_update ON public.registros_visitas_rotas;
CREATE POLICY registros_visitas_update ON public.registros_visitas_rotas
  FOR UPDATE USING (auth.role() = 'authenticated');
