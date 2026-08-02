-- Migration: 20260802200000_fix_secretarias_rls.sql
-- Propósito: Corrigir políticas RLS da tabela secretarias:
--   1. Remover policy FOR ALL que conflitava com FOR SELECT
--   2. Separar em políticas distintas por operação (SELECT, INSERT, UPDATE, DELETE)
--   3. Garantir que a leitura use is_superadmin_by_uid() para acesso root
--   4. Corrigir o join de escolas no select do super painel

-- ─── Remover policies existentes com conflito ───────────────────────────────
DROP POLICY IF EXISTS "secretarias_leitura" ON public.secretarias;
DROP POLICY IF EXISTS "secretarias_escrita" ON public.secretarias;

-- ─── Policy de LEITURA: superadmin vê tudo, nível 1 vê as suas ───────────────
-- Usa is_superadmin_by_uid() (confiável, baseado em auth.uid() + tabela funcionarios)
-- OU tem_acesso_a_secretaria(id) (cobre nível 1 com secretarias_ids correto)
CREATE POLICY "secretarias_select" ON public.secretarias
  FOR SELECT USING (
    public.is_superadmin_by_uid()
    OR public.tem_acesso_a_secretaria(id)
  );

-- ─── Policies de ESCRITA: apenas admin global (superadmin ou nível 1) ────────
CREATE POLICY "secretarias_insert" ON public.secretarias
  FOR INSERT WITH CHECK (public.is_admin_global());

CREATE POLICY "secretarias_update" ON public.secretarias
  FOR UPDATE
  USING (public.is_admin_global())
  WITH CHECK (public.is_admin_global());

CREATE POLICY "secretarias_delete" ON public.secretarias
  FOR DELETE USING (public.is_admin_global());
