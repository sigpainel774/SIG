-- Migration: 20260816020000_notificacao_ciencia_ocorrencia.sql
-- Propósito: Notificar automaticamente a secretaria da escola e o autor da ocorrência quando o responsável registrar ciência no Portal do Aluno.

CREATE OR REPLACE FUNCTION public.notificar_ciencia_ocorrencia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_aluno_nome text;
  v_escola_id uuid;
  v_destinatarios uuid[];
BEGIN
  -- Verificar se houve transição de status para 'Cientes'
  IF NEW.status_pais = 'Cientes' AND (OLD.status_pais IS NULL OR OLD.status_pais <> 'Cientes') THEN
    
    -- Resolução defensiva do nome do aluno
    SELECT nome INTO v_aluno_nome 
    FROM public.alunos 
    WHERE id = NEW.aluno_id;

    -- Resolução defensiva do escola_id (caso não informado diretamente na ocorrência)
    v_escola_id := COALESCE(
      NEW.escola_id, 
      (SELECT escola_id FROM public.alunos WHERE id = NEW.aluno_id),
      (SELECT escola_id FROM public.turmas WHERE id = NEW.turma_id)
    );
    
    -- Coletar auth_user_id dos servidores da escola:
    -- 1. Usuários ativos da escola com nível 1, 2, 3 (Admin, Gestor, Secretaria/Coordenação) ou permissão pode_ocorrencias
    -- 2. O funcionário que registrou a ocorrência (registrado_por)
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

    -- Se existirem destinatários válidos, insere as notificações na central
    IF v_destinatarios IS NOT NULL AND cardinality(v_destinatarios) > 0 THEN
      INSERT INTO public.notifications (
        user_id, 
        tenant_id, 
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

-- Criar ou substituir o trigger na tabela ocorrencias
DROP TRIGGER IF EXISTS trg_notificar_ciencia_ocorrencia ON public.ocorrencias;
CREATE TRIGGER trg_notificar_ciencia_ocorrencia
AFTER UPDATE ON public.ocorrencias
FOR EACH ROW
EXECUTE FUNCTION public.notificar_ciencia_ocorrencia();
