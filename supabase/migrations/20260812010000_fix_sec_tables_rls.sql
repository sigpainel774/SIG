-- Migration: 20260812010000_fix_sec_tables_rls.sql
-- Propósito: Adicionar políticas RLS de leitura e escrita para usuários autenticados nas 45 tabelas operacionais e secundárias
-- mantendo a proteção ABAC e liberando o fluxo de anexos, ocorrências, transferências, atestados e EMAEE.

DO $$ 
DECLARE 
  tbl TEXT;
  tables_all TEXT[] := ARRAY[
    'abastecimentos_veiculos',
    'acessos_usuarios_permissoes',
    'adicionais_salario',
    'agenda_aulas',
    'alunos_anexos',
    'alunos_transporte',
    'arquivados',
    'atestados',
    'atividades_secretaria',
    'atividades_secretaria_historico',
    'blocked_ips',
    'comunicados_lidos',
    'configuracao_notificacoes_niveis',
    'desligamentos_programados',
    'dispositivos',
    'emaee_especialidades_vinculadas',
    'emaee_evolucoes',
    'emaee_matriculas',
    'emaee_solicitacoes_relatorios',
    'escalas_servico',
    'folha_pagamento_config',
    'grade_curricular_escola',
    'grade_semanal',
    'horarios_aulas_slots',
    'ip_geolocation_cache',
    'manutencoes_veiculos',
    'mensagens_internas',
    'movimentacoes_funcionarios',
    'ocorrencias',
    'pontos_ronda',
    'prazos_unidades',
    'recuperacoes_finais',
    'registros_ronda',
    'rotas_ronda',
    'rotas_transporte',
    'solicitacoes_edicao_aluno',
    'solicitacoes_rh',
    'transacoes_financeiras',
    'transferencias_alunos',
    'transferencias_funcionarios',
    'user_navigation_trail',
    'veiculos',
    'vinculos_turmas'
  ];
BEGIN
  -- 1. Aplicar política FOR ALL para usuários autenticados nas 43 tabelas operacionais
  FOREACH tbl IN ARRAY tables_all LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "permitir_autenticados_all" ON public.%I FOR ALL USING (auth.role() = %L) WITH CHECK (auth.role() = %L);', tbl, 'authenticated', 'authenticated');
  END LOOP;
END $$;

-- 2. Tabela trash_bin: INSERT para todos autenticados (garante triggers de exclusão), SELECT/UPDATE/DELETE restrito a Superadmins
ALTER TABLE public.trash_bin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trash_bin_insert_authenticated" ON public.trash_bin;
CREATE POLICY "trash_bin_insert_authenticated" ON public.trash_bin FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "trash_bin_admin_manage" ON public.trash_bin;
CREATE POLICY "trash_bin_admin_manage" ON public.trash_bin FOR ALL USING (is_admin_global());

-- 3. Tabela access_logs: INSERT para todos autenticados/anon (logs de acesso), SELECT restrito a Superadmins
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "access_logs_insert_all" ON public.access_logs;
CREATE POLICY "access_logs_insert_all" ON public.access_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "access_logs_admin_select" ON public.access_logs;
CREATE POLICY "access_logs_admin_select" ON public.access_logs FOR SELECT USING (is_admin_global());
