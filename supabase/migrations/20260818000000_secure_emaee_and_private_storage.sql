-- Migration: 20260818000000_secure_emaee_and_private_storage.sql
-- Propósito: Privatização do bucket de anexos médicos, criação do bucket de assinaturas, unificação de check_tipo, índice de unicidade e RLS restritivo para o EMAEE.

-- 1. Atualizar bucket alunos-anexos para PRIVADO (public = false) e garantir bucket assinaturas
UPDATE storage.buckets 
SET public = false 
WHERE id = 'alunos-anexos';

INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas', 'assinaturas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para alunos-anexos (Privado e Seguro)
DROP POLICY IF EXISTS "Acesso publico para leitura de alunos-anexos" ON storage.objects;
DROP POLICY IF EXISTS "Acesso autenticado para leitura de alunos-anexos" ON storage.objects;
CREATE POLICY "Acesso autenticado para leitura de alunos-anexos" ON storage.objects
  FOR SELECT USING (bucket_id = 'alunos-anexos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Acesso autenticado para insert de alunos-anexos" ON storage.objects;
CREATE POLICY "Acesso autenticado para insert de alunos-anexos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'alunos-anexos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Acesso autenticado para update de alunos-anexos" ON storage.objects;
CREATE POLICY "Acesso autenticado para update de alunos-anexos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'alunos-anexos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Acesso autenticado para delete de alunos-anexos" ON storage.objects;
CREATE POLICY "Acesso autenticado para delete de alunos-anexos" ON storage.objects
  FOR DELETE USING (bucket_id = 'alunos-anexos' AND auth.role() = 'authenticated');

-- Políticas de Storage para assinaturas
DROP POLICY IF EXISTS "Acesso publico para leitura de assinaturas" ON storage.objects;
CREATE POLICY "Acesso publico para leitura de assinaturas" ON storage.objects
  FOR SELECT USING (bucket_id = 'assinaturas');

DROP POLICY IF EXISTS "Acesso autenticado para insert de assinaturas" ON storage.objects;
CREATE POLICY "Acesso autenticado para insert de assinaturas" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'assinaturas' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Acesso autenticado para update de assinaturas" ON storage.objects;
CREATE POLICY "Acesso autenticado para update de assinaturas" ON storage.objects
  FOR UPDATE USING (bucket_id = 'assinaturas' AND auth.role() = 'authenticated');

-- 2. Atualizar constraint check_tipo em public.alunos_anexos para aceitar todas as categorias clínicas e escolares
ALTER TABLE public.alunos_anexos DROP CONSTRAINT IF EXISTS check_tipo;
ALTER TABLE public.alunos_anexos ADD CONSTRAINT check_tipo 
  CHECK (tipo IN ('Laudos', 'Documentos Pessoais', 'Exame Clínico', 'Receita', 'Receita / Prescrição', 'Encaminhamento', 'Outros'));

-- 3. Prevenção de concorrência e matrículas duplicadas no EMAEE
CREATE UNIQUE INDEX IF NOT EXISTS unq_emaee_matriculas_aluno_ativo 
ON public.emaee_matriculas (aluno_id) 
WHERE deleted_at IS NULL AND status NOT IN ('ALTA', 'INATIVO');

-- 4. Função SECURITY DEFINER para checar acesso aos módulos do EMAEE
CREATE OR REPLACE FUNCTION public.fn_pode_acessar_emaee(p_escola_atendimento_id UUID DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_funcionario RECORD;
  v_is_nivel_1 boolean;
  v_vinculado_emaee boolean;
BEGIN
  -- Verificar se é usuário autenticado
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Buscar dados do funcionário
  SELECT f.id, f.is_superadmin, f.is_profissional_aee, f.status, f.deleted_at
  INTO v_funcionario
  FROM public.funcionarios f
  WHERE f.auth_user_id = auth.uid()
    AND (f.status IS NULL OR f.status != 'inativo')
    AND f.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Superadmin tem acesso total
  IF v_funcionario.is_superadmin = true THEN
    RETURN true;
  END IF;

  -- Profissional AEE tem acesso ao EMAEE
  IF v_funcionario.is_profissional_aee = true THEN
    RETURN true;
  END IF;

  -- Checar se possui nível 1 (Secretaria de Educação)
  SELECT EXISTS (
    SELECT 1 FROM public.acessos_usuarios au
    WHERE au.funcionario_id = v_funcionario.id
      AND au.ativo = true
      AND au.nivel = 1
  ) INTO v_is_nivel_1;

  IF v_is_nivel_1 THEN
    RETURN true;
  END IF;

  -- Checar se está vinculado ou tem acesso à unidade EMAEE
  SELECT EXISTS (
    SELECT 1 
    FROM public.vinculos_funcionarios vf
    JOIN public.escolas e ON e.id = vf.escola_id
    WHERE vf.funcionario_id = v_funcionario.id
      AND vf.ativo = true
      AND (
        e.tipo = 'EMAEE' 
        OR e.nome ILIKE '%emaee%'
        OR (p_escola_atendimento_id IS NOT NULL AND vf.escola_id = p_escola_atendimento_id)
      )
  ) INTO v_vinculado_emaee;

  IF v_vinculado_emaee THEN
    RETURN true;
  END IF;

  -- Checar por acessos_usuarios com escola_id da EMAEE
  SELECT EXISTS (
    SELECT 1 
    FROM public.acessos_usuarios au
    JOIN public.escolas e ON e.id = au.escola_id
    WHERE au.funcionario_id = v_funcionario.id
      AND au.ativo = true
      AND (
        e.tipo = 'EMAEE' 
        OR e.nome ILIKE '%emaee%'
        OR (p_escola_atendimento_id IS NOT NULL AND au.escola_id = p_escola_atendimento_id)
      )
  ) INTO v_vinculado_emaee;

  RETURN v_vinculado_emaee;
END;
$$;

-- 5. Atualizar políticas RLS das tabelas do EMAEE
-- 5.1 emaee_matriculas
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.emaee_matriculas;
DROP POLICY IF EXISTS "staff_manage_emaee_matriculas" ON public.emaee_matriculas;
DROP POLICY IF EXISTS "emaee_matriculas_manage" ON public.emaee_matriculas;

CREATE POLICY "emaee_matriculas_manage" ON public.emaee_matriculas
  FOR ALL
  USING (
    fn_pode_acessar_emaee(escola_atendimento_id)
    OR (
      -- Gestor da escola regular pode ler matrículas de seus alunos encaminhados
      escola_regular_id IS NOT NULL 
      AND fn_is_funcionario_autenticado()
      AND EXISTS (
        SELECT 1 FROM public.vinculos_funcionarios vf
        JOIN public.funcionarios f ON f.id = vf.funcionario_id
        WHERE f.auth_user_id = auth.uid() 
          AND vf.ativo = true 
          AND vf.escola_id = emaee_matriculas.escola_regular_id
      )
    )
  )
  WITH CHECK (
    fn_pode_acessar_emaee(escola_atendimento_id)
    OR fn_is_funcionario_autenticado()
  );

-- 5.2 emaee_evolucoes (Sigiloso / Equipe EMAEE)
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.emaee_evolucoes;
DROP POLICY IF EXISTS "staff_manage_emaee_evolucoes" ON public.emaee_evolucoes;
DROP POLICY IF EXISTS "emaee_evolucoes_manage" ON public.emaee_evolucoes;

CREATE POLICY "emaee_evolucoes_manage" ON public.emaee_evolucoes
  FOR ALL
  USING (fn_pode_acessar_emaee())
  WITH CHECK (fn_pode_acessar_emaee());

-- 5.3 emaee_especialidades_vinculadas
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.emaee_especialidades_vinculadas;
DROP POLICY IF EXISTS "staff_manage_emaee_especialidades" ON public.emaee_especialidades_vinculadas;
DROP POLICY IF EXISTS "emaee_especialidades_manage" ON public.emaee_especialidades_vinculadas;

CREATE POLICY "emaee_especialidades_manage" ON public.emaee_especialidades_vinculadas
  FOR ALL
  USING (fn_pode_acessar_emaee())
  WITH CHECK (fn_pode_acessar_emaee());

-- 5.4 emaee_solicitacoes_relatorios
DROP POLICY IF EXISTS "permitir_autenticados_all" ON public.emaee_solicitacoes_relatorios;
DROP POLICY IF EXISTS "staff_manage_emaee_solicitacoes" ON public.emaee_solicitacoes_relatorios;
DROP POLICY IF EXISTS "emaee_solicitacoes_manage" ON public.emaee_solicitacoes_relatorios;

CREATE POLICY "emaee_solicitacoes_manage" ON public.emaee_solicitacoes_relatorios
  FOR ALL
  USING (
    fn_pode_acessar_emaee()
    OR (
      -- Gestor da escola de origem pode gerenciar solicitações criadas por sua unidade
      escola_origem_id IS NOT NULL 
      AND fn_is_funcionario_autenticado()
      AND EXISTS (
        SELECT 1 FROM public.vinculos_funcionarios vf
        JOIN public.funcionarios f ON f.id = vf.funcionario_id
        WHERE f.auth_user_id = auth.uid() 
          AND vf.ativo = true 
          AND vf.escola_id = emaee_solicitacoes_relatorios.escola_origem_id
      )
    )
  )
  WITH CHECK (
    fn_pode_acessar_emaee()
    OR fn_is_funcionario_autenticado()
  );

-- 6. Atualizar RPC solicitar_encaminhamento_emaee com validações de segurança estritas
CREATE OR REPLACE FUNCTION public.solicitar_encaminhamento_emaee(
  p_aluno_id UUID,
  p_escola_origem_id UUID,
  p_escola_emaee_id UUID,
  p_solicitante_id UUID,
  p_motivo TEXT,
  p_arquivos_anexos JSONB DEFAULT '[]'::jsonb,
  p_ficha_snapshot JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transferencia_id UUID;
  v_emaee_matricula_id UUID;
  v_destinatarios UUID[];
  v_aluno_nome TEXT;
  v_escola_origem_nome TEXT;
  v_solicitante_valido BOOLEAN;
BEGIN
  -- 1. Validar autenticação do usuário
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Operação não autorizada. Usuário não autenticado.';
  END IF;

  -- 2. Validar parâmetros obrigatórios
  IF p_aluno_id IS NULL OR p_escola_origem_id IS NULL OR p_escola_emaee_id IS NULL THEN
    RAISE EXCEPTION 'Parâmetros obrigatórios ausentes para o encaminhamento.';
  END IF;

  -- 3. Validar se o solicitante informado corresponde ao usuário autenticado ou superadmin
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (f.id = p_solicitante_id OR f.is_superadmin = true)
      AND (f.status IS NULL OR f.status != 'inativo')
      AND f.deleted_at IS NULL
  ) INTO v_solicitante_valido;

  IF NOT v_solicitante_valido THEN
    RAISE EXCEPTION 'O solicitante informado não corresponde ao usuário autenticado.';
  END IF;

  -- 4. Validar aluno
  SELECT nome INTO v_aluno_nome FROM public.alunos WHERE id = p_aluno_id AND deleted_at IS NULL;
  IF v_aluno_nome IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado com o ID especificado.';
  END IF;

  -- 5. Validar nome da escola de origem
  SELECT nome INTO v_escola_origem_nome FROM public.escolas WHERE id = p_escola_origem_id;

  -- 6. Inserir registro em transferencias_alunos
  INSERT INTO public.transferencias_alunos (
    aluno_id,
    escola_origem_id,
    escola_destino_id,
    solicitante_id,
    motivo,
    tipo_movimentacao,
    arquivos_anexos,
    ficha_snapshot,
    status
  ) VALUES (
    p_aluno_id,
    p_escola_origem_id,
    p_escola_emaee_id,
    p_solicitante_id,
    p_motivo,
    'ENCAMINHAMENTO_EMAEE',
    COALESCE(p_arquivos_anexos, '[]'::jsonb),
    COALESCE(p_ficha_snapshot, '{}'::jsonb),
    'PENDENTE'
  )
  RETURNING id INTO v_transferencia_id;

  -- 7. Inserir ou atualizar na fila de acolhimento do EMAEE (emaee_matriculas)
  SELECT id INTO v_emaee_matricula_id 
  FROM public.emaee_matriculas 
  WHERE aluno_id = p_aluno_id AND deleted_at IS NULL
  LIMIT 1;

  IF v_emaee_matricula_id IS NULL THEN
    INSERT INTO public.emaee_matriculas (
      aluno_id,
      escola_atendimento_id,
      escola_regular_id,
      principal_queixa,
      observacoes_requerimento,
      requerimento_anexos,
      status
    ) VALUES (
      p_aluno_id,
      p_escola_emaee_id,
      p_escola_origem_id,
      p_motivo,
      p_motivo,
      COALESCE(p_arquivos_anexos, '[]'::jsonb),
      'FILA_ESPERA'
    )
    RETURNING id INTO v_emaee_matricula_id;
  ELSE
    UPDATE public.emaee_matriculas
    SET 
      escola_regular_id = p_escola_origem_id,
      principal_queixa = p_motivo,
      observacoes_requerimento = p_motivo,
      requerimento_anexos = COALESCE(p_arquivos_anexos, requerimento_anexos),
      status = 'FILA_ESPERA'
    WHERE id = v_emaee_matricula_id;
  END IF;

  -- 8. Coletar IDs de auth_user_id dos servidores com Nível >= 2 no EMAEE para notificação
  SELECT ARRAY_AGG(DISTINCT f.auth_user_id)
  INTO v_destinatarios
  FROM public.acessos_usuarios au
  JOIN public.funcionarios f ON f.id = au.funcionario_id
  WHERE au.escola_id = p_escola_emaee_id
    AND au.nivel >= 2
    AND au.ativo = true
    AND f.auth_user_id IS NOT NULL;

  -- Disparar notificação se houver destinatários elegíveis
  IF v_destinatarios IS NOT NULL AND ARRAY_LENGTH(v_destinatarios, 1) > 0 THEN
    BEGIN
      PERFORM public.criar_notificacoes(
        p_destinatarios := v_destinatarios,
        p_title := 'Novo Encaminhamento EMAEE',
        p_message := 'A escola ' || COALESCE(v_escola_origem_nome, 'regular') || ' encaminhou o aluno ' || v_aluno_nome || ' para acompanhamento no EMAEE.',
        p_type := 'INFO',
        p_link := '/emaee/fila-espera'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Evitar que falha de notificação bloqueie o encaminhamento
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transferencia_id', v_transferencia_id,
    'emaee_matricula_id', v_emaee_matricula_id
  );
END;
$$;

-- Conceder execução segura
REVOKE EXECUTE ON FUNCTION public.solicitar_encaminhamento_emaee FROM public;
GRANT EXECUTE ON FUNCTION public.solicitar_encaminhamento_emaee TO authenticated;
