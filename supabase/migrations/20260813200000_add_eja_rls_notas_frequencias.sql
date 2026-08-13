-- Migration: 20260813200000_add_eja_rls_notas_frequencias.sql
-- Descrição: Adiciona políticas de RLS complementares para permitir que Contas Especiais EJA acessem notas, frequências, matérias e recuperações finais da rede.

DROP POLICY IF EXISTS "notas_eja_select" ON public.notas;
CREATE POLICY "notas_eja_select" ON public.notas FOR SELECT USING (is_conta_eja_by_uid());

DROP POLICY IF EXISTS "notas_eja_write" ON public.notas;
CREATE POLICY "notas_eja_write" ON public.notas FOR ALL USING (is_conta_eja_by_uid()) WITH CHECK (is_conta_eja_by_uid());

DROP POLICY IF EXISTS "frequencias_eja_select" ON public.frequencias;
CREATE POLICY "frequencias_eja_select" ON public.frequencias FOR SELECT USING (is_conta_eja_by_uid());

DROP POLICY IF EXISTS "frequencias_eja_write" ON public.frequencias;
CREATE POLICY "frequencias_eja_write" ON public.frequencias FOR ALL USING (is_conta_eja_by_uid()) WITH CHECK (is_conta_eja_by_uid());

DROP POLICY IF EXISTS "materias_eja_write" ON public.materias;
CREATE POLICY "materias_eja_write" ON public.materias FOR ALL USING (is_conta_eja_by_uid()) WITH CHECK (is_conta_eja_by_uid());

DROP POLICY IF EXISTS "recuperacoes_finais_eja_all" ON public.recuperacoes_finais;
CREATE POLICY "recuperacoes_finais_eja_all" ON public.recuperacoes_finais FOR ALL USING (is_conta_eja_by_uid()) WITH CHECK (is_conta_eja_by_uid());
