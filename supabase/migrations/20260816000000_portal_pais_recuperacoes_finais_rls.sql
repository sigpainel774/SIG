-- ======================================================================================
-- MIGRATION: 20260816000000_portal_pais_recuperacoes_finais_rls.sql
-- Data: 2026-08-16
-- Propósito: Liberar leitura de notas de recuperação final para pais e responsáveis
--            vinculados aos alunos no Portal dos Pais em escolas com o portal ativado.
-- Tabelas afetadas: public.recuperacoes_finais
-- ======================================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'recuperacoes_finais' 
      AND policyname = 'pais_read_recuperacoes_portal_ativo'
  ) THEN
    CREATE POLICY "pais_read_recuperacoes_portal_ativo"
      ON public.recuperacoes_finais
      FOR SELECT
      TO public
      USING (
        aluno_id IN (
          SELECT ra.aluno_id
          FROM public.responsaveis_alunos ra
          JOIN public.responsaveis r ON r.id = ra.responsavel_id
          JOIN public.alunos a ON a.id = ra.aluno_id
          JOIN public.escolas e ON e.id = a.escola_id
          WHERE r.auth_user_id = auth.uid()
            AND e.portal_pais_ativo = true
        )
      );
  END IF;
END $$;
