-- Migration: 20260724000000_secure_perf_and_audit_rls.sql
-- 1. Função de verificação de superadmin por UID de sessão
CREATE OR REPLACE FUNCTION public.is_superadmin_by_uid()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.funcionarios WHERE auth_user_id = auth.uid() AND deleted_at IS NULL LIMIT 1),
    false
  );
$$;

-- 2. RLS de Produção para performance_metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_all_authenticated" ON public.performance_metrics;
DROP POLICY IF EXISTS "perf_metrics_insert_own" ON public.performance_metrics;
DROP POLICY IF EXISTS "perf_metrics_admin_select" ON public.performance_metrics;
DROP POLICY IF EXISTS "perf_metrics_admin_delete" ON public.performance_metrics;

CREATE POLICY "perf_metrics_insert_own" ON public.performance_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "perf_metrics_admin_select" ON public.performance_metrics
  FOR SELECT USING (public.is_superadmin_by_uid());

CREATE POLICY "perf_metrics_admin_delete" ON public.performance_metrics
  FOR DELETE USING (public.is_superadmin_by_uid());

-- 3. RLS de Produção para audit_logs (Append-Only e leitura ROOT)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_all_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_superadmin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_blocked" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_blocked" ON public.audit_logs;

CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "audit_logs_select_superadmin" ON public.audit_logs
  FOR SELECT USING (public.is_superadmin_by_uid());

-- 4. Atualização da RPC get_performance_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_performance_dashboard_stats(period_days int DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time timestamp with time zone;
  v_total_samples bigint;
  v_good_samples bigint;
  v_score numeric;
  v_cpu_stats jsonb;
  v_ram_stats jsonb;
  v_network_stats jsonb;
  v_route_metrics jsonb;
  v_p95_route numeric;
  v_p99_route numeric;
BEGIN
  -- Segurança: apenas superadmins podem invocar
  IF NOT public.is_superadmin_by_uid() THEN
    RAISE EXCEPTION 'Acesso negado: apenas funcionários autorizados.';
  END IF;

  v_start_time := now() - (GREATEST(period_days, 1) || ' days')::interval;

  -- Total e boas amostras restritas a ROUTE_CHANGE_MS
  SELECT count(*), count(*) FILTER (WHERE rating = 'good')
  INTO v_total_samples, v_good_samples
  FROM public.performance_metrics
  WHERE metric_name = 'ROUTE_CHANGE_MS' AND created_at >= v_start_time;

  IF v_total_samples > 0 THEN
    v_score := round((v_good_samples::numeric / v_total_samples::numeric) * 100, 1);
  ELSE
    v_score := NULL; -- Tratar como null quando não houver amostras
  END IF;

  -- Percentis P95 e P99 globais de navegação
  SELECT 
    round(percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value)::numeric, 1),
    round(percentile_cont(0.99) WITHIN GROUP (ORDER BY metric_value)::numeric, 1)
  INTO v_p95_route, v_p99_route
  FROM public.performance_metrics
  WHERE metric_name = 'ROUTE_CHANGE_MS' AND created_at >= v_start_time;

  -- Estatísticas por CPU
  SELECT jsonb_agg(t) INTO v_cpu_stats
  FROM (
    SELECT 
      COALESCE(hardware_concurrency::text, 'Desconhecida') as cpu,
      round(avg(metric_value), 0) as avg,
      count(*) as count
    FROM public.performance_metrics
    WHERE metric_name = 'ROUTE_CHANGE_MS' AND created_at >= v_start_time
    GROUP BY hardware_concurrency
    ORDER BY avg DESC
  ) t;

  -- Estatísticas por RAM
  SELECT jsonb_agg(t) INTO v_ram_stats
  FROM (
    SELECT 
      COALESCE(device_memory::text || ' GB', 'Desconhecida') as ram,
      round(avg(metric_value), 0) as avg,
      count(*) as count
    FROM public.performance_metrics
    WHERE metric_name = 'ROUTE_CHANGE_MS' AND created_at >= v_start_time
    GROUP BY device_memory
    ORDER BY avg DESC
  ) t;

  -- Estatísticas por Rede
  SELECT jsonb_agg(t) INTO v_network_stats
  FROM (
    SELECT 
      COALESCE(connection_type, 'Desconhecida') as type,
      round(avg(metric_value), 0) as avg,
      count(*) as count
    FROM public.performance_metrics
    WHERE metric_name = 'ROUTE_CHANGE_MS' AND created_at >= v_start_time
    GROUP BY connection_type
    ORDER BY avg DESC
  ) t;

  -- Rotas com P50, P75, P95 e Média
  SELECT jsonb_agg(t) INTO v_route_metrics
  FROM (
    SELECT 
      pathname,
      round(avg(metric_value), 2) as avg_value,
      round(percentile_cont(0.50) WITHIN GROUP (ORDER BY metric_value)::numeric, 1) as p50,
      round(percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value)::numeric, 1) as p75,
      round(percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value)::numeric, 1) as p95,
      count(*) as sample_count
    FROM public.performance_metrics
    WHERE metric_name = 'ROUTE_CHANGE_MS' AND created_at >= v_start_time
    GROUP BY pathname
    ORDER BY avg_value DESC
  ) t;

  RETURN jsonb_build_object(
    'score', v_score,
    'total_samples', v_total_samples,
    'p95', COALESCE(v_p95_route, 0),
    'p99', COALESCE(v_p99_route, 0),
    'cpu_stats', COALESCE(v_cpu_stats, '[]'::jsonb),
    'ram_stats', COALESCE(v_ram_stats, '[]'::jsonb),
    'network_stats', COALESCE(v_network_stats, '[]'::jsonb),
    'route_metrics', COALESCE(v_route_metrics, '[]'::jsonb)
  );
END;
$$;
