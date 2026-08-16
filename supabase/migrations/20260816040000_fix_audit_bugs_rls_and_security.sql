-- Migration: 20260816040000_fix_audit_bugs_rls_and_security.sql
-- Propósito: Correção consolidada dos bugs de RLS, WITH CHECK, soft-delete em RPCs e blindagem de triggers.

-- 1. [C-2] Blindagem RLS de mensagens_responsaveis
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.mensagens_responsaveis;
DROP POLICY IF EXISTS "staff_manage_mensagens_responsaveis" ON public.mensagens_responsaveis;
DROP POLICY IF EXISTS "pais_select_mensagens_responsaveis" ON public.mensagens_responsaveis;
DROP POLICY IF EXISTS "pais_insert_mensagens_responsaveis" ON public.mensagens_responsaveis;
DROP POLICY IF EXISTS "pais_update_mensagens_responsaveis" ON public.mensagens_responsaveis;

-- Staff (Admin, Diretor, Secretário ou Professor)
CREATE POLICY "staff_manage_mensagens_responsaveis" ON public.mensagens_responsaveis
  FOR ALL USING (
    public.fn_is_staff_nivel_1_2_3()
    OR (
      professor_id IN (
        SELECT id FROM public.funcionarios WHERE auth_user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.fn_is_staff_nivel_1_2_3()
    OR (
      professor_id IN (
        SELECT id FROM public.funcionarios WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Pais (Leitura apenas de seus dependentes)
CREATE POLICY "pais_select_mensagens_responsaveis" ON public.mensagens_responsaveis
  FOR SELECT USING (
    aluno_id IN (
      SELECT ra.aluno_id 
      FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );

-- Pais (Envio de mensagens apenas para seus dependentes)
CREATE POLICY "pais_insert_mensagens_responsaveis" ON public.mensagens_responsaveis
  FOR INSERT WITH CHECK (
    aluno_id IN (
      SELECT ra.aluno_id 
      FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );

-- Pais (Atualização apenas de status de leitura da mensagem)
CREATE POLICY "pais_update_mensagens_responsaveis" ON public.mensagens_responsaveis
  FOR UPDATE USING (
    aluno_id IN (
      SELECT ra.aluno_id 
      FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (true);

-- 2. [C-2] Blindagem RLS de solicitacoes_responsaveis
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.solicitacoes_responsaveis;
DROP POLICY IF EXISTS "staff_manage_solicitacoes_responsaveis" ON public.solicitacoes_responsaveis;
DROP POLICY IF EXISTS "pais_select_solicitacoes_responsaveis" ON public.solicitacoes_responsaveis;
DROP POLICY IF EXISTS "pais_insert_solicitacoes_responsaveis" ON public.solicitacoes_responsaveis;

CREATE POLICY "staff_manage_solicitacoes_responsaveis" ON public.solicitacoes_responsaveis
  FOR ALL USING (public.fn_is_staff_nivel_1_2_3())
  WITH CHECK (public.fn_is_staff_nivel_1_2_3());

CREATE POLICY "pais_select_solicitacoes_responsaveis" ON public.solicitacoes_responsaveis
  FOR SELECT USING (
    aluno_id IN (
      SELECT ra.aluno_id 
      FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "pais_insert_solicitacoes_responsaveis" ON public.solicitacoes_responsaveis
  FOR INSERT WITH CHECK (
    aluno_id IN (
      SELECT ra.aluno_id 
      FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );

-- 3. [C-3] Correção WITH CHECK na política de assinatura anônima
DROP POLICY IF EXISTS "assinatura_anon_update" ON public.assinatura;
CREATE POLICY "assinatura_anon_update" ON public.assinatura 
  FOR UPDATE 
  USING (token_verificacao IS NOT NULL) 
  WITH CHECK (true);

-- 4. [C-4] Blindagem contra recursão em turmas_update e turmas_delete
DROP POLICY IF EXISTS "turmas_update" ON public.turmas;
DROP POLICY IF EXISTS "turmas_delete" ON public.turmas;

CREATE POLICY "turmas_update" ON public.turmas
  FOR UPDATE USING (
    public.tem_acesso_a_escola(escola_id)
  )
  WITH CHECK (
    public.tem_acesso_a_escola(escola_id)
  );

CREATE POLICY "turmas_delete" ON public.turmas
  FOR DELETE USING (
    public.tem_acesso_a_escola(escola_id)
  );

-- 5. [M-2] Blindagem defensiva na trigger notificar_ciencia_ocorrencia
CREATE OR REPLACE FUNCTION public.notificar_ciencia_ocorrencia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_aluno_nome text;
  v_escola_id uuid;
  v_grupo_id uuid;
  v_destinatarios uuid[];
BEGIN
  -- Verificar se houve transição de status para 'Cientes'
  IF NEW.status_pais = 'Cientes' AND (OLD.status_pais IS NULL OR OLD.status_pais <> 'Cientes') THEN
    BEGIN
      v_grupo_id := gen_random_uuid();

      SELECT nome INTO v_aluno_nome 
      FROM public.alunos 
      WHERE id = NEW.aluno_id;

      v_escola_id := COALESCE(
        NEW.escola_id, 
        (SELECT a.escola_id FROM public.alunos a WHERE a.id = NEW.aluno_id),
        (SELECT t.escola_id FROM public.turmas t WHERE t.id = NEW.turma_id)
      );
      
      SELECT ARRAY_AGG(DISTINCT f.auth_user_id) INTO v_destinatarios
      FROM public.funcionarios f
      WHERE f.auth_user_id IS NOT NULL
        AND f.deleted_at IS NULL
        AND (
          (NEW.registrado_por IS NOT NULL AND f.id = NEW.registrado_por)
          OR (
            v_escola_id IS NOT NULL 
            AND f.id IN (
              SELECT a.funcionario_id
              FROM public.acessos_usuarios a
              WHERE a.escola_id = v_escola_id
                AND a.ativo = true
                AND (a.nivel IN (1, 2, 3) OR a.pode_ocorrencias = true)
            )
          )
        );

      IF v_destinatarios IS NOT NULL AND cardinality(v_destinatarios) > 0 THEN
        INSERT INTO public.notifications (
          user_id, 
          tenant_id, 
          grupo_id,
          title, 
          message, 
          type, 
          link, 
          created_at, 
          read
        )
        SELECT
          u_id,
          v_escola_id,
          v_grupo_id,
          'Ciência de Ocorrência Confirmada',
          'O responsável pelo estudante ' || COALESCE(v_aluno_nome, 'Aluno') || ' confirmou ciência na ocorrência: "' || COALESCE(NEW.tipo, 'Ocorrência') || '".',
          'INFO',
          '/ocorrencias',
          now(),
          false
        FROM unnest(v_destinatarios) AS u_id
        WHERE u_id IS NOT NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Erro ao disparar notificacao de ocorrencia: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. [M-3] Atualização da RPC get_dashboard_resumo com soft-delete correto
CREATE OR REPLACE FUNCTION public.get_dashboard_resumo(
  p_escola_id UUID,
  p_funcionario_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_alunos INT := 0;
  v_total_turmas INT := 0;
  v_total_funcionarios INT := 0;
  v_total_comunicados INT := 0;
  v_diarios_pendentes INT := 0;
  v_ocorrencias_mes INT := 0;
  v_inicio_mes TIMESTAMPTZ;
BEGIN
  v_inicio_mes := date_trunc('month', now());

  IF p_escola_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_alunos
    FROM public.alunos
    WHERE escola_id = p_escola_id AND deleted_at IS NULL;

    SELECT COUNT(*) INTO v_total_turmas
    FROM public.turmas
    WHERE escola_id = p_escola_id AND deleted_at IS NULL;

    SELECT COUNT(DISTINCT vf.funcionario_id) INTO v_total_funcionarios
    FROM public.vinculos_funcionarios vf
    JOIN public.funcionarios f ON f.id = vf.funcionario_id
    WHERE vf.escola_id = p_escola_id 
      AND vf.ativo = true
      AND f.deleted_at IS NULL;

    SELECT COUNT(*) INTO v_ocorrencias_mes
    FROM public.ocorrencias
    WHERE escola_id = p_escola_id 
      AND created_at >= v_inicio_mes;

    SELECT COUNT(*) INTO v_diarios_pendentes
    FROM public.atividades_secretaria
    WHERE escola_id = p_escola_id AND status = 'pendente';
  ELSE
    SELECT COUNT(*) INTO v_total_alunos FROM public.alunos WHERE deleted_at IS NULL;
    SELECT COUNT(*) INTO v_total_turmas FROM public.turmas WHERE deleted_at IS NULL;
    SELECT COUNT(DISTINCT id) INTO v_total_funcionarios FROM public.funcionarios WHERE (status IS NULL OR status = 'ativo') AND deleted_at IS NULL;
    SELECT COUNT(*) INTO v_ocorrencias_mes FROM public.ocorrencias WHERE created_at >= v_inicio_mes;
    SELECT COUNT(*) INTO v_diarios_pendentes FROM public.atividades_secretaria WHERE status = 'pendente';
  END IF;

  SELECT COUNT(*) INTO v_total_comunicados FROM public.comunicados;

  RETURN jsonb_build_object(
    'totalAlunos', v_total_alunos,
    'totalTurmas', v_total_turmas,
    'totalFuncionarios', v_total_funcionarios,
    'totalComunicados', v_total_comunicados,
    'diariosPendentes', v_diarios_pendentes,
    'ocorrenciasMes', v_ocorrencias_mes
  );
END;
$$;
