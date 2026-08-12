-- Migration: Criação da Tabela de Registros de Backup
-- Data: 2026-08-12
-- Descrição: Tabela backup_registros para gerenciamento documental e auditoria de backups do sistema SIG.

CREATE TABLE IF NOT EXISTS public.backup_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'MANUAL',
  descricao text NOT NULL,
  iniciado_por uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  iniciado_por_nome text,
  status text NOT NULL DEFAULT 'CONCLUIDO',
  tamanho_estimado_mb numeric,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.backup_registros ENABLE ROW LEVEL SECURITY;

-- Política de RLS restrita exclusivamente a Superadmins
DROP POLICY IF EXISTS "backup_superadmin_only" ON public.backup_registros;
CREATE POLICY "backup_superadmin_only" ON public.backup_registros
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.funcionarios f
      WHERE f.auth_user_id = auth.uid() AND f.is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.funcionarios f
      WHERE f.auth_user_id = auth.uid() AND f.is_superadmin = true
    )
  );

-- Índice para consultas ordenadas por data
CREATE INDEX IF NOT EXISTS idx_backup_registros_created_at ON public.backup_registros(created_at DESC);
