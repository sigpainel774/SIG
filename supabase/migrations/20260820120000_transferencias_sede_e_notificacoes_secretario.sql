-- Migration: 20260820120000_transferencias_sede_e_notificacoes_secretario.sql
-- Propósito: Adicionar suporte a despacho da Sede/Secretaria de Educação em transferências de funcionários, flag aguarda_despacho_sede e limpeza de diretor_id na escola de origem ao transferir diretor.

-- 1. Adicionar a coluna aguarda_despacho_sede na tabela transferencias_funcionarios
ALTER TABLE public.transferencias_funcionarios
  ADD COLUMN IF NOT EXISTS aguarda_despacho_sede BOOLEAN DEFAULT FALSE;

-- 2. Atualizar a RPC processar_decisao_transferencia_lotacao para permitir despacho da Secretaria e limpar diretor_id na escola de origem
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

  -- Validar se o usuário que responde é admin global, superadmin ou Nível 1
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
    RAISE EXCEPTION 'Apenas o Secretário de Educação, Administradores Globais ou a Direção da escola de destino podem responder a esta transferência.';
  END IF;

  -- Se tiver vínculo específico de lotação original
  IF v_transferencia.lotacao_id IS NOT NULL THEN
    SELECT * INTO v_vinculo_origem
    FROM public.vinculos_funcionarios
    WHERE id = v_transferencia.lotacao_id;
  ELSE
    SELECT * INTO v_vinculo_origem
    FROM public.vinculos_funcionarios
    WHERE funcionario_id = v_transferencia.funcionario_id
      AND escola_id = v_transferencia.escola_origem_id
      AND ativo = true
    LIMIT 1;
  END IF;

  IF p_aceitar THEN
    -- 1. Inativar vínculo na escola de origem
    IF v_vinculo_origem.id IS NOT NULL THEN
      UPDATE public.vinculos_funcionarios
      SET ativo = false,
          data_fim = CURRENT_DATE
      WHERE id = v_vinculo_origem.id;
    END IF;

    -- Limpa automaticamente o diretor_id da escola de origem se o funcionário transferido for o diretor cadastrado
    UPDATE public.escolas
    SET diretor_id = NULL
    WHERE id = v_transferencia.escola_origem_id
      AND diretor_id = v_transferencia.funcionario_id;

    -- Determinar cargo
    v_cargo := COALESCE(v_vinculo_origem.cargo, v_transferencia.funcionario_cargo_original, 'Funcionário');

    -- 2. Criar novo vínculo na escola de destino
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
      'TRANSFERENCIA: Transferência da lotação da escola ' || v_transferencia.escola_origem_nome || ' para ' || v_transferencia.escola_destino_nome || (CASE WHEN v_is_admin THEN ' (Despachado pela Secretaria de Educação)' ELSE '' END),
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
