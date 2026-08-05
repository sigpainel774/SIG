-- Migration: 20260805191500_encaminhamentos_emaee.sql
-- Propósito: Adicionar suporte a encaminhamentos AEE/EMMAE na tabela transferencias_alunos e RPC segura para submissão direta do aluno para a fila de espera do EMMAE.

-- 1. Coluna de identificação do tipo de movimentação
ALTER TABLE public.transferencias_alunos 
ADD COLUMN IF NOT EXISTS tipo_movimentacao TEXT DEFAULT 'TRANSFERENCIA_REGULAR';

-- 2. Colunas complementares para controle de anexos de requerimento em emaee_matriculas
ALTER TABLE public.emaee_matriculas 
ADD COLUMN IF NOT EXISTS requerimento_anexo_url TEXT;

ALTER TABLE public.emaee_matriculas 
ADD COLUMN IF NOT EXISTS requerimento_anexos JSONB DEFAULT '[]'::jsonb;

-- 3. Função RPC para registrar encaminhamento para o EMMAE
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
AS $$
DECLARE
  v_transferencia_id UUID;
  v_emaee_matricula_id UUID;
  v_destinatarios UUID[];
  v_aluno_nome TEXT;
  v_escola_origem_nome TEXT;
BEGIN
  -- Validar aluno
  SELECT nome INTO v_aluno_nome FROM public.alunos WHERE id = p_aluno_id;
  IF v_aluno_nome IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado com o ID especificado.';
  END IF;

  -- Validar nome da escola de origem
  SELECT nome INTO v_escola_origem_nome FROM public.escolas WHERE id = p_escola_origem_id;

  -- 1. Inserir registro em transferencias_alunos
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
    'ENCAMINHAMENTO_EMMAE',
    p_arquivos_anexos,
    p_ficha_snapshot,
    'PENDENTE'
  )
  RETURNING id INTO v_transferencia_id;

  -- 2. Inserir ou atualizar na fila de acolhimento do EMMAE (emaee_matriculas)
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
      p_arquivos_anexos,
      'FILA_ESPERA'
    )
    RETURNING id INTO v_emaee_matricula_id;
  ELSE
    UPDATE public.emaee_matriculas
    SET 
      escola_regular_id = p_escola_origem_id,
      principal_queixa = p_motivo,
      observacoes_requerimento = p_motivo,
      requerimento_anexos = p_arquivos_anexos,
      status = 'FILA_ESPERA'
    WHERE id = v_emaee_matricula_id;
  END IF;

  -- 3. Coletar IDs de auth_user_id dos servidores com Nível 2 no EMMAE para notificação
  SELECT ARRAY_AGG(DISTINCT f.auth_user_id)
  INTO v_destinatarios
  FROM public.acessos_usuarios au
  JOIN public.funcionarios f ON f.id = au.funcionario_id
  WHERE au.escola_id = p_escola_emaee_id
    AND au.nivel >= 2
    AND au.ativo = true
    AND f.auth_user_id IS NOT NULL;

  -- Disparar notificação in-app se houver destinatários elegíveis
  IF v_destinatarios IS NOT NULL AND ARRAY_LENGTH(v_destinatarios, 1) > 0 THEN
    PERFORM public.criar_notificacoes(
      p_destinatarios := v_destinatarios,
      p_title := 'Novo Encaminhamento AEE (EMMAE)',
      p_message := 'A escola ' || COALESCE(v_escola_origem_nome, 'regular') || ' encaminhou o aluno ' || v_aluno_nome || ' para acompanhamento no EMMAE.',
      p_type := 'INFO',
      p_link := '/transferencias?tab=alunos&subtab=recebimentos&id=' || v_transferencia_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transferencia_id', v_transferencia_id,
    'emaee_matricula_id', v_emaee_matricula_id
  );
END;
$$;
