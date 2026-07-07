-- Migration: performance_metrics
CREATE TABLE public.performance_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id      UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  escola_id           UUID REFERENCES public.escolas(id) ON DELETE SET NULL,
  pathname            TEXT NOT NULL,
  metric_name         TEXT NOT NULL,
  -- Valores aceitos: 'ROUTE_CHANGE_MS' | 'FCP' | 'LCP' | 'CLS' | 'FID' | 'TTFB' | 'INP'
  metric_value        NUMERIC NOT NULL,
  rating              TEXT NOT NULL,
  -- Valores aceitos: 'good' | 'needs-improvement' | 'poor'
  connection_type     TEXT,       -- 'wifi' | '4g' | '3g' | '2g' | null (ex: Safari não suporta)
  device_memory       NUMERIC,    -- RAM em GB (null se browser não suportar)
  hardware_concurrency INTEGER,   -- Núcleos de CPU
  user_agent          TEXT,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS: habilitar antes de criar políticas
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- CORREÇÃO #1: apenas dev_all_authenticated aqui.
-- Políticas de produção virão em migration separada.
CREATE POLICY "dev_all_authenticated" ON public.performance_metrics
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- CORREÇÃO #7: 4 índices cobrindo todos os eixos de query da UI
CREATE INDEX IF NOT EXISTS idx_perf_metrics_path_date
  ON public.performance_metrics(pathname, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_metric_name
  ON public.performance_metrics(metric_name, rating);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_created_at
  ON public.performance_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_funcionario
  ON public.performance_metrics(funcionario_id);

-- CORREÇÃO #7: Função de limpeza automática (30 dias de retenção)
CREATE OR REPLACE FUNCTION public.cleanup_performance_metrics()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.performance_metrics
  WHERE created_at < NOW() - INTERVAL '30 days';
$$;

-- Agendar limpeza automática todo dia 1 às 03:00 UTC via pg_cron
-- (só executa se a extensão pg_cron estiver habilitada no projeto Supabase)
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-perf-metrics',
      '0 3 1 * *',
      'SELECT public.cleanup_performance_metrics()'
    );
  END IF;
END;
$do$;
