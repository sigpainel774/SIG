-- Migration: performance_dashboard_rpc
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
  -- 0. Segurança: apenas administradores globais/superadmins podem invocar
  IF NOT public.is_superadmin_by_uid() THEN
    RAISE EXCEPTION 'Acesso negado: apenas funcionários autorizados.';
  END IF;

  v_start_time := now() - (period_days || ' days')::interval;

  -- 1. Total e boas amostras para o Score Geral
  SELECT count(*), count(*) FILTER (WHERE rating = 'good')
  INTO v_total_samples, v_good_samples
  FROM public.performance_metrics
  WHERE created_at >= v_start_time;

  IF v_total_samples > 0 THEN
    v_score := round((v_good_samples::numeric / v_total_samples::numeric) * 100, 1);
  ELSE
    v_score := 100.0;
  END IF;

  -- 2. Percentis P95 e P99 globais de navegação (ROUTE_CHANGE_MS)
  SELECT 
    round(percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value)::numeric, 1),
    round(percentile_cont(0.99) WITHIN GROUP (ORDER BY metric_value)::numeric, 1)
  INTO v_p95_route, v_p99_route
  FROM public.performance_metrics
  WHERE metric_name = 'ROUTE_CHANGE_MS' AND created_at >= v_start_time;

  -- 3. Estatísticas por CPU (hardware_concurrency)
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

  -- 4. Estatísticas por RAM (device_memory)
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

  -- 5. Estatísticas por Rede (connection_type)
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

  -- 6. Rotas
  SELECT jsonb_agg(t) INTO v_route_metrics
  FROM (
    SELECT 
      pathname,
      round(avg(metric_value), 2) as avg_value,
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
