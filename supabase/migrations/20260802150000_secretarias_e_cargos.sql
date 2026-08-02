-- Migration: 20260802150000_secretarias_e_cargos.sql

-- 1. Create table public.secretarias
CREATE TABLE IF NOT EXISTS public.secretarias (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome text NOT NULL,
  logo_url text,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

-- Habilitar RLS
ALTER TABLE public.secretarias ENABLE ROW LEVEL SECURITY;

-- 2. Migrate data from configuracoes_rede to secretarias
INSERT INTO public.secretarias (nome)
SELECT COALESCE(nome_rede, 'Secretaria Municipal de Educação de Sapeaçu')
FROM public.configuracoes_rede
LIMIT 1;

-- Ensure at least one secretariat exists if configuracoes_rede was empty
INSERT INTO public.secretarias (nome)
SELECT 'Secretaria Municipal de Educação de Sapeaçu'
WHERE NOT EXISTS (SELECT 1 FROM public.secretarias);

-- 3. Update public.cargos
ALTER TABLE public.cargos ADD COLUMN IF NOT EXISTS secretaria_id uuid REFERENCES public.secretarias(id) ON DELETE CASCADE;

-- Se já existirem cargos, vamos vinculá-los à primeira secretaria
UPDATE public.cargos 
SET secretaria_id = (SELECT id FROM public.secretarias ORDER BY created_at ASC LIMIT 1)
WHERE secretaria_id IS NULL;

-- 4. Update public.acessos_usuarios
ALTER TABLE public.acessos_usuarios ADD COLUMN IF NOT EXISTS secretarias_ids uuid[] DEFAULT NULL;

-- 5. Functions for Secretarias RLS
CREATE OR REPLACE FUNCTION public.tem_acesso_a_secretaria(p_secretaria_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (
        f.is_superadmin = true
        OR EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id AND au.nivel = 1 AND au.ativo = true
            AND (au.secretarias_ids IS NULL OR p_secretaria_id = ANY(au.secretarias_ids))
        )
      )
  );
$$;

-- RLS policies for Secretarias
DROP POLICY IF EXISTS "secretarias_leitura" ON public.secretarias;
CREATE POLICY "secretarias_leitura" ON public.secretarias
  FOR SELECT USING (public.tem_acesso_a_secretaria(id));

DROP POLICY IF EXISTS "secretarias_escrita" ON public.secretarias;
CREATE POLICY "secretarias_escrita" ON public.secretarias
  FOR ALL USING (public.is_admin_global()) WITH CHECK (public.is_admin_global());

-- Atualizar RLS de performance_metrics (inserção anon)
DROP POLICY IF EXISTS "perf_metrics_insert_own" ON public.performance_metrics;
DROP POLICY IF EXISTS "perf_metrics_insert_anon_and_auth" ON public.performance_metrics;

CREATE POLICY "perf_metrics_insert_anon_and_auth" ON public.performance_metrics
  FOR INSERT WITH CHECK (true);

-- Atualizar RLS de audit_logs (leitura para ROOT e Gestores Locais)
CREATE OR REPLACE FUNCTION public.tem_acesso_a_escola_audit(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (
        f.is_superadmin = true
        OR EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id AND au.nivel = 1 AND au.ativo = true
        )
        OR EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id AND au.escola_id = p_tenant_id AND au.ativo = true
        )
      )
  );
$$;

DROP POLICY IF EXISTS "audit_logs_select_superadmin" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_authorized" ON public.audit_logs;

CREATE POLICY "audit_logs_select_authorized" ON public.audit_logs
  FOR SELECT USING (public.is_superadmin_by_uid() OR (tenant_id IS NOT NULL AND public.tem_acesso_a_escola_audit(tenant_id)));
