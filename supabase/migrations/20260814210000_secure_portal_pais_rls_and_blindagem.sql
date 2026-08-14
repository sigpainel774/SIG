-- Migration: 20260814210000_secure_portal_pais_rls_and_blindagem.sql
-- Propósito: Blindagem RLS contra vazamento de informações para contas de Pais/Responsáveis e liberação estrita de leitura de filhos e turmas.

-- 1. Função auxiliar SECURITY DEFINER para verificar se o usuário autenticado é um Servidor/Funcionário da rede
CREATE OR REPLACE FUNCTION public.fn_is_funcionario_autenticado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (f.status IS NULL OR f.status != 'inativo')
      AND f.deleted_at IS NULL
  )
$$;

-- 2. Blindagem da tabela de Ocorrências (Remover 'permitir_autenticados_all' e manter apenas Staff + Pais Restrito)
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.ocorrencias;
DROP POLICY IF EXISTS "staff_manage_ocorrencias" ON public.ocorrencias;
CREATE POLICY "staff_manage_ocorrencias" ON public.ocorrencias
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

-- 3. Blindagem de Documentos e Anexos de Alunos (Restrito a Servidores)
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.alunos_anexos;
DROP POLICY IF EXISTS "staff_manage_alunos_anexos" ON public.alunos_anexos;
CREATE POLICY "staff_manage_alunos_anexos" ON public.alunos_anexos
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

-- 4. Blindagem do Prontuário e Atendimentos do EMAEE (Restrito a Servidores)
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.emaee_evolucoes;
DROP POLICY IF EXISTS "staff_manage_emaee_evolucoes" ON public.emaee_evolucoes;
CREATE POLICY "staff_manage_emaee_evolucoes" ON public.emaee_evolucoes
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.emaee_matriculas;
DROP POLICY IF EXISTS "staff_manage_emaee_matriculas" ON public.emaee_matriculas;
CREATE POLICY "staff_manage_emaee_matriculas" ON public.emaee_matriculas
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.emaee_especialidades_vinculadas;
DROP POLICY IF EXISTS "staff_manage_emaee_especialidades" ON public.emaee_especialidades_vinculadas;
CREATE POLICY "staff_manage_emaee_especialidades" ON public.emaee_especialidades_vinculadas
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.emaee_solicitacoes_relatorios;
DROP POLICY IF EXISTS "staff_manage_emaee_solicitacoes" ON public.emaee_solicitacoes_relatorios;
CREATE POLICY "staff_manage_emaee_solicitacoes" ON public.emaee_solicitacoes_relatorios
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

-- 5. Blindagem de Atestados Médicos de Servidores (Restrito a Servidores)
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.atestados;
DROP POLICY IF EXISTS "staff_manage_atestados" ON public.atestados;
CREATE POLICY "staff_manage_atestados" ON public.atestados
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

-- 6. Blindagem de Transações Financeiras e Caixa Escolar (Restrito a Gestores Staff Nível 1/2/3)
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.transacoes_financeiras;
DROP POLICY IF EXISTS "staff_manage_transacoes_financeiras" ON public.transacoes_financeiras;
CREATE POLICY "staff_manage_transacoes_financeiras" ON public.transacoes_financeiras
  FOR ALL USING (fn_is_staff_nivel_1_2_3()) WITH CHECK (fn_is_staff_nivel_1_2_3());

-- 7. Blindagem de Módulos de RH e Folha de Pagamento (Restrito a Servidores)
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.solicitacoes_rh;
DROP POLICY IF EXISTS "staff_manage_solicitacoes_rh" ON public.solicitacoes_rh;
CREATE POLICY "staff_manage_solicitacoes_rh" ON public.solicitacoes_rh
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.movimentacoes_funcionarios;
DROP POLICY IF EXISTS "staff_manage_movimentacoes_funcionarios" ON public.movimentacoes_funcionarios;
CREATE POLICY "staff_manage_movimentacoes_funcionarios" ON public.movimentacoes_funcionarios
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.adicionais_salario;
DROP POLICY IF EXISTS "staff_manage_adicionais_salario" ON public.adicionais_salario;
CREATE POLICY "staff_manage_adicionais_salario" ON public.adicionais_salario
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.folha_pagamento_config;
DROP POLICY IF EXISTS "staff_manage_folha_pagamento_config" ON public.folha_pagamento_config;
CREATE POLICY "staff_manage_folha_pagamento_config" ON public.folha_pagamento_config
  FOR ALL USING (fn_is_staff_nivel_1_2_3()) WITH CHECK (fn_is_staff_nivel_1_2_3());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.desligamentos_programados;
DROP POLICY IF EXISTS "staff_manage_desligamentos_programados" ON public.desligamentos_programados;
CREATE POLICY "staff_manage_desligamentos_programados" ON public.desligamentos_programados
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.escalas_servico;
DROP POLICY IF EXISTS "staff_manage_escalas_servico" ON public.escalas_servico;
CREATE POLICY "staff_manage_escalas_servico" ON public.escalas_servico
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

-- 8. Blindagem de Transferências Escolares e de Servidores
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.transferencias_alunos;
DROP POLICY IF EXISTS "staff_manage_transferencias_alunos" ON public.transferencias_alunos;
CREATE POLICY "staff_manage_transferencias_alunos" ON public.transferencias_alunos
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.transferencias_funcionarios;
DROP POLICY IF EXISTS "staff_manage_transferencias_funcionarios" ON public.transferencias_funcionarios;
CREATE POLICY "staff_manage_transferencias_funcionarios" ON public.transferencias_funcionarios
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

-- 9. Blindagem de Transporte Escolar, Dispositivos e Rondas
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.alunos_transporte;
DROP POLICY IF EXISTS "staff_manage_alunos_transporte" ON public.alunos_transporte;
CREATE POLICY "staff_manage_alunos_transporte" ON public.alunos_transporte
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.rotas_transporte;
DROP POLICY IF EXISTS "staff_manage_rotas_transporte" ON public.rotas_transporte;
CREATE POLICY "staff_manage_rotas_transporte" ON public.rotas_transporte
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.veiculos;
DROP POLICY IF EXISTS "staff_manage_veiculos" ON public.veiculos;
CREATE POLICY "staff_manage_veiculos" ON public.veiculos
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.abastecimentos_veiculos;
DROP POLICY IF EXISTS "staff_manage_abastecimentos_veiculos" ON public.abastecimentos_veiculos;
CREATE POLICY "staff_manage_abastecimentos_veiculos" ON public.abastecimentos_veiculos
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.manutencoes_veiculos;
DROP POLICY IF EXISTS "staff_manage_manutencoes_veiculos" ON public.manutencoes_veiculos;
CREATE POLICY "staff_manage_manutencoes_veiculos" ON public.manutencoes_veiculos
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.pontos_ronda;
DROP POLICY IF EXISTS "staff_manage_pontos_ronda" ON public.pontos_ronda;
CREATE POLICY "staff_manage_pontos_ronda" ON public.pontos_ronda
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.rotas_ronda;
DROP POLICY IF EXISTS "staff_manage_rotas_ronda" ON public.rotas_ronda;
CREATE POLICY "staff_manage_rotas_ronda" ON public.rotas_ronda
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.registros_ronda;
DROP POLICY IF EXISTS "staff_manage_registros_ronda" ON public.registros_ronda;
CREATE POLICY "staff_manage_registros_ronda" ON public.registros_ronda
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.dispositivos;
DROP POLICY IF EXISTS "staff_manage_dispositivos" ON public.dispositivos;
CREATE POLICY "staff_manage_dispositivos" ON public.dispositivos
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.solicitacoes_edicao_aluno;
DROP POLICY IF EXISTS "staff_manage_solicitacoes_edicao_aluno" ON public.solicitacoes_edicao_aluno;
CREATE POLICY "staff_manage_solicitacoes_edicao_aluno" ON public.solicitacoes_edicao_aluno
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.arquivados;
DROP POLICY IF EXISTS "staff_manage_arquivados" ON public.arquivados;
CREATE POLICY "staff_manage_arquivados" ON public.arquivados
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.atividades_secretaria;
DROP POLICY IF EXISTS "staff_manage_atividades_secretaria" ON public.atividades_secretaria;
CREATE POLICY "staff_manage_atividades_secretaria" ON public.atividades_secretaria
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.atividades_secretaria_historico;
DROP POLICY IF EXISTS "staff_manage_atividades_secretaria_historico" ON public.atividades_secretaria_historico;
CREATE POLICY "staff_manage_atividades_secretaria_historico" ON public.atividades_secretaria_historico
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.grade_curricular_escola;
DROP POLICY IF EXISTS "staff_manage_grade_curricular_escola" ON public.grade_curricular_escola;
CREATE POLICY "staff_manage_grade_curricular_escola" ON public.grade_curricular_escola
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.grade_semanal;
DROP POLICY IF EXISTS "staff_manage_grade_semanal" ON public.grade_semanal;
CREATE POLICY "staff_manage_grade_semanal" ON public.grade_semanal
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.horarios_aulas_slots;
DROP POLICY IF EXISTS "staff_manage_horarios_aulas_slots" ON public.horarios_aulas_slots;
CREATE POLICY "staff_manage_horarios_aulas_slots" ON public.horarios_aulas_slots
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.agenda_aulas;
DROP POLICY IF EXISTS "staff_manage_agenda_aulas" ON public.agenda_aulas;
CREATE POLICY "staff_manage_agenda_aulas" ON public.agenda_aulas
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.recuperacoes_finais;
DROP POLICY IF EXISTS "staff_manage_recuperacoes_finais" ON public.recuperacoes_finais;
CREATE POLICY "staff_manage_recuperacoes_finais" ON public.recuperacoes_finais
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.prazos_unidades;
DROP POLICY IF EXISTS "staff_manage_prazos_unidades" ON public.prazos_unidades;
CREATE POLICY "staff_manage_prazos_unidades" ON public.prazos_unidades
  FOR ALL USING (fn_is_funcionario_autenticado()) WITH CHECK (fn_is_funcionario_autenticado());

-- 10. Políticas de Leitura Específicas do Portal do Aluno / Responsáveis em Alunos e Turmas
DROP POLICY IF EXISTS "pais_read_filhos_portal_ativo" ON public.alunos;
CREATE POLICY "pais_read_filhos_portal_ativo" ON public.alunos
  FOR SELECT USING (
    id IN (
      SELECT ra.aluno_id 
      FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pais_read_turmas_portal_ativo" ON public.turmas;
CREATE POLICY "pais_read_turmas_portal_ativo" ON public.turmas
  FOR SELECT USING (
    id IN (
      SELECT a.turma_id 
      FROM public.alunos a
      JOIN public.responsaveis_alunos ra ON ra.aluno_id = a.id
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );
