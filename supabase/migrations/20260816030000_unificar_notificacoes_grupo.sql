-- Migration: 20260816030000_unificar_notificacoes_grupo.sql
-- Propósito: Padronização do comportamento global de notificações em grupo (grupo_id):
-- Quando qualquer servidor marcar como lida, dá baixa coletiva para todo o grupo com auditoria de quem processou.

-- 1. RPC para marcar notificação individual ou de grupo como lida
CREATE OR REPLACE FUNCTION public.marcar_notificacao_lida_grupo(
  p_notif_id uuid,
  p_funcionario_id uuid DEFAULT NULL,
  p_funcionario_nome text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_grupo_id uuid;
  v_count int := 0;
BEGIN
  -- Obter grupo_id e status atual da notificação
  SELECT grupo_id INTO v_grupo_id
  FROM public.notifications
  WHERE id = p_notif_id;

  IF v_grupo_id IS NOT NULL THEN
    -- Atualiza todos os membros do mesmo lote/grupo
    UPDATE public.notifications
    SET 
      read = true,
      processado_por = COALESCE(processado_por, p_funcionario_id),
      processado_por_nome = COALESCE(processado_por_nome, p_funcionario_nome),
      processado_em = COALESCE(processado_em, now())
    WHERE grupo_id = v_grupo_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
  ELSE
    -- Atualiza apenas o registro individual
    UPDATE public.notifications
    SET 
      read = true,
      processado_por = COALESCE(processado_por, p_funcionario_id),
      processado_por_nome = COALESCE(processado_por_nome, p_funcionario_nome),
      processado_em = COALESCE(processado_em, now())
    WHERE id = p_notif_id;
    
    v_count := 1;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'grupo_id', v_grupo_id, 
    'updated_count', v_count
  );
END;
$$;

-- 2. RPC para marcar todas as notificações não lidas de um usuário (sincronizando grupos)
CREATE OR REPLACE FUNCTION public.marcar_todas_notificacoes_lidas_usuario(
  p_auth_user_id uuid,
  p_funcionario_id uuid DEFAULT NULL,
  p_funcionario_nome text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_grupos_ids uuid[];
  v_count int := 0;
BEGIN
  -- Coletar todos os grupo_id das notificações não lidas do usuário
  SELECT ARRAY_AGG(DISTINCT grupo_id) INTO v_grupos_ids
  FROM public.notifications
  WHERE user_id = p_auth_user_id
    AND read = false
    AND grupo_id IS NOT NULL;

  -- Se houver grupos, marca todos os membros desses grupos como lidos
  IF v_grupos_ids IS NOT NULL AND cardinality(v_grupos_ids) > 0 THEN
    UPDATE public.notifications
    SET 
      read = true,
      processado_por = COALESCE(processado_por, p_funcionario_id),
      processado_por_nome = COALESCE(processado_por_nome, p_funcionario_nome),
      processado_em = COALESCE(processado_em, now())
    WHERE grupo_id = ANY(v_grupos_ids);
  END IF;

  -- Marca as individuais restantes do usuário
  UPDATE public.notifications
  SET 
    read = true,
    processado_por = COALESCE(processado_por, p_funcionario_id),
    processado_por_nome = COALESCE(processado_por_nome, p_funcionario_nome),
    processado_em = COALESCE(processado_em, now())
  WHERE user_id = p_auth_user_id
    AND read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'updated_count', v_count);
END;
$$;

-- 3. Atualizar trigger de notificação de ciência de ocorrência para gerar grupo_id único por lote
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
    
    -- Gerar UUID de grupo para este lote de ciência
    v_grupo_id := gen_random_uuid();

    -- Resolução defensiva do nome do aluno
    SELECT nome INTO v_aluno_nome 
    FROM public.alunos 
    WHERE id = NEW.aluno_id;

    -- Resolução defensiva do escola_id
    v_escola_id := COALESCE(
      NEW.escola_id, 
      (SELECT escola_id FROM public.alunos WHERE id = NEW.aluno_id),
      (SELECT escola_id FROM public.turmas WHERE id = NEW.turma_id)
    );
    
    -- Coletar auth_user_id dos servidores da escola e do autor da ocorrência
    SELECT ARRAY_AGG(DISTINCT f.auth_user_id) INTO v_destinatarios
    FROM public.funcionarios f
    WHERE f.auth_user_id IS NOT NULL
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

    -- Inserir notificações com o mesmo grupo_id compartilhado
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

  END IF;

  RETURN NEW;
END;
$$;

-- Recriar trigger
DROP TRIGGER IF EXISTS trg_notificar_ciencia_ocorrencia ON public.ocorrencias;
CREATE TRIGGER trg_notificar_ciencia_ocorrencia
AFTER UPDATE ON public.ocorrencias
FOR EACH ROW
EXECUTE FUNCTION public.notificar_ciencia_ocorrencia();
