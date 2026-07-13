-- Migration: Múltiplas Lotações e Solicitação de Transferências
-- Criado em: 2026-07-13

-- 1. Remover a unique constraint que impedia múltiplas lotações de um mesmo funcionário em escolas diferentes (se existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vinculos_funcionarios_funcionario_id_escola_id_key'
      AND conrelid = 'public.vinculos_funcionarios'::regclass
  ) THEN
    ALTER TABLE public.vinculos_funcionarios
      DROP CONSTRAINT vinculos_funcionarios_funcionario_id_escola_id_key;
  END IF;
END $$;

-- 2. Adicionar a coluna lotacao_id na tabela transferencias_funcionarios
ALTER TABLE public.transferencias_funcionarios
  ADD COLUMN IF NOT EXISTS lotacao_id UUID REFERENCES public.vinculos_funcionarios(id) ON DELETE SET NULL;

-- 3. Função SECURITY DEFINER para processar a aprovação ou rejeição de transferência de lotação (executado pelo Diretor destino ou Admin)
CREATE OR REPLACE FUNCTION public.processar_decisao_transferencia_lotacao(
  p_transferencia_id UUID,
  p_aceitar BOOLEAN,
  p_resposta_texto TEXT,
  p_respondido_por_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transferencia RECORD;
  v_vinculo_origem RECORD;
  v_cargo TEXT;
  v_funcionario_nome TEXT;
  v_escola_origem_nome TEXT;
  v_escola_destino_nome TEXT;
  v_usuario_auth_id UUID;
  v_is_admin BOOLEAN;
  v_is_diretor_destino BOOLEAN;
BEGIN
  -- Buscar dados da solicitação
  SELECT t.*, f.nome as funcionario_nome, f.cargo as funcionario_cargo_original,
         eo.nome as escola_origem_nome, ed.nome as escola_destino_nome
  INTO v_transferencia
  FROM public.transferencias_funcionarios t
  JOIN public.funcionarios f ON f.id = t.funcionario_id
  JOIN public.escolas eo ON eo.id = t.escola_origem_id
  JOIN public.escolas ed ON ed.id = t.escola_destino_id
  WHERE t.id = p_transferencia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de transferência não encontrada.';
  END IF;

  IF v_transferencia.status != 'PENDENTE' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada (status atual: %).', v_transferencia.status;
  END IF;

  -- Obter UUID do usuário autenticado no Supabase
  SELECT auth_user_id INTO v_usuario_auth_id
  FROM public.funcionarios
  WHERE id = p_respondido_por_id;

  -- Validar se o usuário que responde é admin global ou superadmin
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.id = p_respondido_por_id
      AND (
        f.is_superadmin = true
        OR EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id AND au.nivel = 1 AND au.ativo = true
        )
      )
  ) INTO v_is_admin;

  -- Validar se o usuário que responde é diretor (nível 2) na escola destino da transferência
  SELECT EXISTS (
    SELECT 1 FROM public.acessos_usuarios au
    WHERE au.funcionario_id = p_respondido_por_id
      AND au.escola_id = v_transferencia.escola_destino_id
      AND au.nivel = 2
      AND au.ativo = true
  ) INTO v_is_diretor_destino;

  -- Só permite se for admin global ou diretor da escola destino
  IF NOT v_is_admin AND NOT v_is_diretor_destino THEN
    RAISE EXCEPTION 'Apenas administradores ou o diretor da escola de destino podem responder a esta transferência.';
  END IF;

  -- Buscar vínculo original
  SELECT * INTO v_vinculo_origem
  FROM public.vinculos_funcionarios
  WHERE id = v_transferencia.lotacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vínculo de lotação original não encontrado.';
  END IF;

  IF p_aceitar THEN
    -- 1. Inativar vínculo na escola de origem
    UPDATE public.vinculos_funcionarios
    SET ativo = false,
        data_fim = CURRENT_DATE
    WHERE id = v_transferencia.lotacao_id;

    -- Determinar cargo
    v_cargo := COALESCE(v_vinculo_origem.cargo, v_transferencia.funcionario_cargo_original, 'Funcionário');

    -- 2. Criar novo vínculo na escola de destino (mantendo cargo original)
    INSERT INTO public.vinculos_funcionarios (
      funcionario_id,
      escola_id,
      cargo,
      ativo,
      data_inicio
    ) VALUES (
      v_transferencia.funcionario_id,
      v_transferencia.escola_destino_id,
      v_cargo,
      true,
      CURRENT_DATE
    );

    -- 3. Atualizar status da solicitação
    UPDATE public.transferencias_funcionarios
    SET status = 'ACEITA',
        resposta_texto = p_resposta_texto,
        respondido_por = p_respondido_por_id,
        respondido_em = NOW()
    WHERE id = p_transferencia_id;

    -- 4. Registrar em arquivados da escola de origem
    INSERT INTO public.arquivados (
      tipo,
      referencia_id,
      tabela_origem,
      motivo,
      escola_origem_id,
      arquivado_por,
      payload_completo,
      status
    ) VALUES (
      'FUNCIONARIO_TRANSFERIDO',
      v_transferencia.funcionario_id,
      'funcionarios',
      'TRANSFERENCIA: Transferência da lotação da escola ' || v_transferencia.escola_origem_nome || ' para ' || v_transferencia.escola_destino_nome,
      v_transferencia.escola_origem_id,
      p_respondido_por_id,
      row_to_json(v_transferencia)::jsonb,
      'TRANSFERIDO'
    );

  ELSE
    -- Rejeitar solicitação
    UPDATE public.transferencias_funcionarios
    SET status = 'REJEITADA',
        resposta_texto = p_resposta_texto,
        respondido_por = p_respondido_por_id,
        respondido_em = NOW()
    WHERE id = p_transferencia_id;
  END IF;
END;
$$;

-- 4. Função SECURITY DEFINER para permitir a reversão de transferência pelo Nível 1
CREATE OR REPLACE FUNCTION public.reverter_transferencia_lotacao(
  p_transferencia_id UUID,
  p_revertido_por_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transferencia RECORD;
  v_vinculo_criado RECORD;
  v_is_admin BOOLEAN;
BEGIN
  -- Buscar dados da solicitação
  SELECT t.*
  INTO v_transferencia
  FROM public.transferencias_funcionarios t
  WHERE t.id = p_transferencia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de transferência não encontrada.';
  END IF;

  IF v_transferencia.status != 'ACEITA' THEN
    RAISE EXCEPTION 'Apenas transferências aceitas podem ser revertidas.';
  END IF;

  -- Validar se o usuário que reverte é admin global ou superadmin
  SELECT EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.id = p_revertido_por_id
      AND (
        f.is_superadmin = true
        OR EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id AND au.nivel = 1 AND au.ativo = true
        )
      )
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Apenas administradores globais (Nível 1) podem reverter transferências.';
  END IF;

  -- 1. Reativar o vínculo original
  UPDATE public.vinculos_funcionarios
  SET ativo = true,
      data_fim = NULL
  WHERE id = v_transferencia.lotacao_id;

  -- 2. Inativar o vínculo criado na escola de destino
  -- Buscamos o vínculo ativo criado na escola de destino para esse funcionário
  -- que tenha data_inicio igual ou posterior à data de criação/resposta da transferência
  SELECT * INTO v_vinculo_criado
  FROM public.vinculos_funcionarios
  WHERE funcionario_id = v_transferencia.funcionario_id
    AND escola_id = v_transferencia.escola_destino_id
    AND ativo = true
  ORDER BY data_inicio DESC, created_at DESC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.vinculos_funcionarios
    SET ativo = false,
        data_fim = CURRENT_DATE
    WHERE id = v_vinculo_criado.id;
  END IF;

  -- 3. Atualizar status para REVERTIDA
  UPDATE public.transferencias_funcionarios
  SET status = 'REVERTIDA',
      resposta_texto = 'Reversão solicitada pelo Administrador Global',
      respondido_por = p_revertido_por_id,
      respondido_em = NOW()
  WHERE id = p_transferencia_id;
END;
$$;
