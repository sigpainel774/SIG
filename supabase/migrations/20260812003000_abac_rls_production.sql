-- 1. Remover políticas permissivas de desenvolvimento de todas as tabelas
DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND policyname IN (
        'dev_all_authenticated', 
        'Enable all for authenticated', 
        'Enable ALL for authenticated',
        'dev_all_authenticated_mensagens'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ==========================================
-- 2. POLÍTICAS GENÉRICAS (ADMIN GLOBAL) E CATÁLOGOS
-- ==========================================

-- Escolas: leitura para todos autenticados para permitir transferências e seleções
DROP POLICY IF EXISTS "escolas_leitura_geral" ON public.escolas;
CREATE POLICY "escolas_leitura_geral" ON public.escolas FOR SELECT USING (auth.role() = 'authenticated');

-- Cargos
DROP POLICY IF EXISTS "admin_global_all_cargos" ON public.cargos;
CREATE POLICY "admin_global_all_cargos" ON public.cargos FOR ALL USING (is_admin_global());
DROP POLICY IF EXISTS "leitura_autenticados_cargos" ON public.cargos;
CREATE POLICY "leitura_autenticados_cargos" ON public.cargos FOR SELECT USING (auth.role() = 'authenticated');

-- Orgaos
DROP POLICY IF EXISTS "admin_global_all_orgaos" ON public.orgaos;
CREATE POLICY "admin_global_all_orgaos" ON public.orgaos FOR ALL USING (is_admin_global());
DROP POLICY IF EXISTS "leitura_autenticados_orgaos" ON public.orgaos;
CREATE POLICY "leitura_autenticados_orgaos" ON public.orgaos FOR SELECT USING (auth.role() = 'authenticated');

-- Secretarias
DROP POLICY IF EXISTS "admin_global_all_secretarias" ON public.secretarias;
CREATE POLICY "admin_global_all_secretarias" ON public.secretarias FOR ALL USING (is_admin_global());
DROP POLICY IF EXISTS "leitura_autenticados_secretarias" ON public.secretarias;
CREATE POLICY "leitura_autenticados_secretarias" ON public.secretarias FOR SELECT USING (auth.role() = 'authenticated');

-- Configuracoes Rede
DROP POLICY IF EXISTS "admin_global_all_config_rede" ON public.configuracoes_rede;
CREATE POLICY "admin_global_all_config_rede" ON public.configuracoes_rede FOR ALL USING (is_admin_global());
DROP POLICY IF EXISTS "leitura_autenticados_config_rede" ON public.configuracoes_rede;
CREATE POLICY "leitura_autenticados_config_rede" ON public.configuracoes_rede FOR SELECT USING (auth.role() = 'authenticated');

-- ==========================================
-- 3. GRUPO A: ACADÊMICO & GESTÃO ESCOLAR
-- ==========================================

-- Alunos
DROP POLICY IF EXISTS "alunos_abac_select" ON public.alunos;
CREATE POLICY "alunos_abac_select" ON public.alunos FOR SELECT USING (
  is_admin_global() 
  OR escola_id = ANY(get_minhas_escolas_ids())
);
DROP POLICY IF EXISTS "alunos_abac_insert" ON public.alunos;
CREATE POLICY "alunos_abac_insert" ON public.alunos FOR INSERT WITH CHECK (
  is_admin_global() 
  OR (escola_id = ANY(get_minhas_escolas_ids()) AND get_meu_nivel_maximo() <= 3)
);
DROP POLICY IF EXISTS "alunos_abac_update" ON public.alunos;
CREATE POLICY "alunos_abac_update" ON public.alunos FOR UPDATE USING (
  is_admin_global() 
  OR (escola_id = ANY(get_minhas_escolas_ids()) AND get_meu_nivel_maximo() <= 3)
);

-- Turmas
DROP POLICY IF EXISTS "turmas_abac_select" ON public.turmas;
CREATE POLICY "turmas_abac_select" ON public.turmas FOR SELECT USING (
  is_admin_global() 
  OR escola_id = ANY(get_minhas_escolas_ids())
);
DROP POLICY IF EXISTS "turmas_abac_insert" ON public.turmas;
CREATE POLICY "turmas_abac_insert" ON public.turmas FOR INSERT WITH CHECK (
  is_admin_global() 
  OR (escola_id = ANY(get_minhas_escolas_ids()) AND get_meu_nivel_maximo() <= 3)
);
DROP POLICY IF EXISTS "turmas_abac_update" ON public.turmas;
CREATE POLICY "turmas_abac_update" ON public.turmas FOR UPDATE USING (
  is_admin_global() 
  OR (escola_id = ANY(get_minhas_escolas_ids()) AND get_meu_nivel_maximo() <= 3)
);
DROP POLICY IF EXISTS "turmas_abac_delete" ON public.turmas;
CREATE POLICY "turmas_abac_delete" ON public.turmas FOR DELETE USING (
  is_admin_global() 
  OR (escola_id = ANY(get_minhas_escolas_ids()) AND get_meu_nivel_maximo() <= 3)
);

-- Materias
DROP POLICY IF EXISTS "materias_abac_select" ON public.materias;
CREATE POLICY "materias_abac_select" ON public.materias FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "materias_abac_write" ON public.materias;
CREATE POLICY "materias_abac_write" ON public.materias FOR ALL USING (
  is_admin_global() 
  OR (escola_id = ANY(get_minhas_escolas_ids()) AND get_meu_nivel_maximo() <= 3)
);

-- Notas
DROP POLICY IF EXISTS "notas_abac_select" ON public.notas;
CREATE POLICY "notas_abac_select" ON public.notas FOR SELECT USING (
  is_admin_global() 
  OR escola_id = ANY(get_minhas_escolas_ids())
);
DROP POLICY IF EXISTS "notas_abac_write" ON public.notas;
CREATE POLICY "notas_abac_write" ON public.notas FOR ALL USING (
  is_admin_global() 
  OR escola_id = ANY(get_minhas_escolas_ids())
);

-- Frequencias
DROP POLICY IF EXISTS "frequencias_abac_select" ON public.frequencias;
CREATE POLICY "frequencias_abac_select" ON public.frequencias FOR SELECT USING (
  is_admin_global() 
  OR escola_id = ANY(get_minhas_escolas_ids())
);
DROP POLICY IF EXISTS "frequencias_abac_write" ON public.frequencias;
CREATE POLICY "frequencias_abac_write" ON public.frequencias FOR ALL USING (
  is_admin_global() 
  OR escola_id = ANY(get_minhas_escolas_ids())
);

-- ==========================================
-- 4. GRUPO B: GESTÃO DE PESSOAS E RH
-- ==========================================
-- Vinculos_funcionarios
DROP POLICY IF EXISTS "vinculos_func_abac_select" ON public.vinculos_funcionarios;
CREATE POLICY "vinculos_func_abac_select" ON public.vinculos_funcionarios FOR SELECT USING (
  is_admin_global() 
  OR funcionario_id = get_meu_funcionario_id()
  OR escola_id = ANY(get_minhas_escolas_ids())
);
DROP POLICY IF EXISTS "vinculos_func_abac_write" ON public.vinculos_funcionarios;
CREATE POLICY "vinculos_func_abac_write" ON public.vinculos_funcionarios FOR ALL USING (
  is_admin_global() 
  OR (escola_id = ANY(get_minhas_escolas_ids()) AND get_meu_nivel_maximo() <= 3)
);

-- Acessos_usuarios
DROP POLICY IF EXISTS "acessos_usuarios_abac_select" ON public.acessos_usuarios;
CREATE POLICY "acessos_usuarios_abac_select" ON public.acessos_usuarios FOR SELECT USING (
  is_admin_global() 
  OR funcionario_id = get_meu_funcionario_id()
  OR escola_id = ANY(get_minhas_escolas_ids())
);
DROP POLICY IF EXISTS "acessos_usuarios_abac_write" ON public.acessos_usuarios;
CREATE POLICY "acessos_usuarios_abac_write" ON public.acessos_usuarios FOR ALL USING (
  is_admin_global()
);

-- ==========================================
-- 5. GRUPO E: COMUNICAÇÃO, LOGS E MÉTRICAS
-- ==========================================
-- Comunicados
DROP POLICY IF EXISTS "comunicados_abac_select" ON public.comunicados;
CREATE POLICY "comunicados_abac_select" ON public.comunicados FOR SELECT USING (
  auth.role() = 'authenticated'
);
DROP POLICY IF EXISTS "comunicados_abac_write" ON public.comunicados;
CREATE POLICY "comunicados_abac_write" ON public.comunicados FOR ALL USING (
  is_admin_global() 
);

-- Performance Metrics
DROP POLICY IF EXISTS "perf_metrics_anon_auth_insert" ON public.performance_metrics;
CREATE POLICY "perf_metrics_anon_auth_insert" ON public.performance_metrics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "perf_metrics_admin_select" ON public.performance_metrics;
CREATE POLICY "perf_metrics_admin_select" ON public.performance_metrics FOR SELECT USING (is_admin_global());

-- Assinatura (Exceção Anon)
DROP POLICY IF EXISTS "assinatura_anon_update" ON public.assinatura;
CREATE POLICY "assinatura_anon_update" ON public.assinatura FOR UPDATE USING (token_verificacao IS NOT NULL);

-- Notificações
DROP POLICY IF EXISTS "notifications_own_select" ON public.notifications;
CREATE POLICY "notifications_own_select" ON public.notifications FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_own_update" ON public.notifications;
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_own_delete" ON public.notifications;
CREATE POLICY "notifications_own_delete" ON public.notifications FOR DELETE USING (user_id = auth.uid());
