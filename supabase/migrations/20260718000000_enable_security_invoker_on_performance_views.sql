-- Enable security_invoker = true on performance_metrics views
-- This ensures they respect Row Level Security (RLS) policies of the underlying performance_metrics table
ALTER VIEW public.performance_metrics_by_route SET (security_invoker = true);
ALTER VIEW public.performance_metrics_summary SET (security_invoker = true);
