-- Migration: 20260817013000_vincular_calendario_a_alertas_avaliacoes.sql
-- Descrição: Integração do Calendário Acadêmico Oficial com o motor de alertas de atividades (10 pontos a 5 dias do prazo)

CREATE OR REPLACE FUNCTION public.verificar_pendencias_pontuacao_trimestre(
  p_escola_id uuid,
  p_professor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_hoje date := CURRENT_DATE;
  v_ano_atual integer := EXTRACT(YEAR FROM CURRENT_DATE);
  v_sec_id uuid;
  v_cal RECORD;
  v_prazo RECORD;
  v_pendencias jsonb := '[]'::jsonb;
  v_item RECORD;
  v_diretor_auth_id uuid;
  v_diretor_func_id uuid;
  v_dias_restantes integer;
  v_ja_notificado boolean;
  v_unidade_alvo integer;
  v_data_limite date;
BEGIN
  -- 1. Obter a secretaria_id da escola
  SELECT secretaria_id INTO v_sec_id
  FROM public.escolas
  WHERE id = p_escola_id;

  -- 2. Buscar datas oficiais do calendário acadêmico da secretaria
  IF v_sec_id IS NOT NULL THEN
    SELECT * INTO v_cal
    FROM public.calendarios_academicos
    WHERE secretaria_id = v_sec_id
      AND ano_letivo = v_ano_atual
      AND ativo = true;
  END IF;

  -- 3. Percorrer os 3 trimestres oficiais
  FOR v_unidade_alvo IN 1..3 LOOP
    v_data_limite := NULL;

    IF v_cal.id IS NOT NULL THEN
      IF v_unidade_alvo = 1 THEN
        v_data_limite := v_cal.trimestre1_fim;
      ELSIF v_unidade_alvo = 2 THEN
        v_data_limite := v_cal.trimestre2_fim;
      ELSIF v_unidade_alvo = 3 THEN
        v_data_limite := v_cal.trimestre3_fim;
      END IF;
    END IF;

    -- Fallback: Se não definido no calendário acadêmico, busca em prazos_unidades
    IF v_data_limite IS NULL THEN
      SELECT data_limite INTO v_data_limite
      FROM public.prazos_unidades
      WHERE (escola_id = p_escola_id OR escola_id IS NULL)
        AND unidade = v_unidade_alvo
      ORDER BY data_limite ASC
      LIMIT 1;
    END IF;

    -- Se houver data limite futura ou no dia de hoje
    IF v_data_limite IS NOT NULL AND v_data_limite >= v_hoje THEN
      v_dias_restantes := v_data_limite - v_hoje;

      -- Se faltar 5 dias ou menos para o término do trimestre
      IF v_dias_restantes <= 5 AND v_dias_restantes >= 0 THEN
        
        -- Buscar turmas/matérias cujo somatório de pontos_maximos seja < 10.0
        -- (EXCEÇÃO EXPLÍCITA: Ignora profissionais AEE e turmas EMAEE)
        FOR v_item IN
          SELECT 
            m.id AS materia_id,
            m.nome AS materia_nome,
            t.id AS turma_id,
            t.nome AS turma_nome,
            f.id AS professor_id,
            f.nome AS professor_nome,
            f.auth_user_id AS professor_auth_id,
            COALESCE(SUM(a.pontos_maximos), 0) AS total_pontos,
            COUNT(a.id) AS total_atividades
          FROM public.materias m
          JOIN public.turmas t ON t.id = m.turma_id
          JOIN public.funcionarios f ON f.id = m.professor_id
          LEFT JOIN public.atividades_secretaria a 
            ON a.materia_id = m.id 
            AND a.turma_id = t.id 
            AND a.trimestre = v_unidade_alvo
            AND a.escola_id = p_escola_id
          WHERE m.escola_id = p_escola_id
            AND t.deleted_at IS NULL
            AND (p_professor_id IS NULL OR m.professor_id = p_professor_id)
            AND COALESCE(f.is_profissional_aee, false) = false
            AND t.nome NOT ILIKE '%EMAEE%'
            AND t.nome NOT ILIKE '%AEE%'
          GROUP BY m.id, m.nome, t.id, t.nome, f.id, f.nome, f.auth_user_id
          HAVING COALESCE(SUM(a.pontos_maximos), 0) < 10.0
        LOOP
          -- Acumular no retorno JSON
          v_pendencias := v_pendencias || jsonb_build_object(
            'unidade', v_unidade_alvo,
            'data_limite', v_data_limite,
            'dias_restantes', v_dias_restantes,
            'materia_id', v_item.materia_id,
            'materia_nome', v_item.materia_nome,
            'turma_id', v_item.turma_id,
            'turma_nome', v_item.turma_nome,
            'professor_id', v_item.professor_id,
            'professor_nome', v_item.professor_nome,
            'total_pontos', v_item.total_pontos,
            'total_atividades', v_item.total_atividades
          );

          -- 1. Notificar o Professor (se tiver auth_user_id)
          IF v_item.professor_auth_id IS NOT NULL THEN
            SELECT EXISTS(
              SELECT 1 FROM public.notifications
              WHERE user_id = v_item.professor_auth_id
                AND title ILIKE '%Pontuação Incompleta%'
                AND message ILIKE '%' || v_item.turma_nome || '%'
                AND created_at > (now() - interval '24 hours')
            ) INTO v_ja_notificado;

            IF NOT v_ja_notificado THEN
              INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                link,
                created_at
              ) VALUES (
                v_item.professor_auth_id,
                '⚠️ Pontuação Incompleta no ' || v_unidade_alvo || 'º Trimestre',
                'A pontuação da disciplina ' || v_item.materia_nome || ' na turma ' || v_item.turma_nome || ' está em ' || v_item.total_pontos || '/10.0 pts. Faltam ' || v_dias_restantes || ' dia(s) para o encerramento do prazo oficial (' || to_char(v_data_limite, 'DD/MM/YYYY') || ').',
                'warning',
                '/avaliacoes?tab=atividades&turma=' || v_item.turma_id,
                now()
              );
            END IF;
          END IF;

          -- 2. Notificar o Diretor da Escola
          SELECT e.diretor_id, f.auth_user_id 
          INTO v_diretor_func_id, v_diretor_auth_id
          FROM public.escolas e
          LEFT JOIN public.funcionarios f ON f.id = e.diretor_id
          WHERE e.id = p_escola_id;

          IF v_diretor_auth_id IS NULL THEN
            SELECT f.auth_user_id 
            INTO v_diretor_auth_id
            FROM public.acessos_usuarios au
            JOIN public.funcionarios f ON f.id = au.funcionario_id
            WHERE au.escola_id = p_escola_id
              AND au.nivel = 2
              AND au.ativo = true
            LIMIT 1;
          END IF;

          IF v_diretor_auth_id IS NOT NULL THEN
            SELECT EXISTS(
              SELECT 1 FROM public.notifications
              WHERE user_id = v_diretor_auth_id
                AND title ILIKE '%Pendência de Pontuação%'
                AND message ILIKE '%' || v_item.professor_nome || '%'
                AND created_at > (now() - interval '24 hours')
            ) INTO v_ja_notificado;

            IF NOT v_ja_notificado THEN
              INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                link,
                created_at
              ) VALUES (
                v_diretor_auth_id,
                '📋 Pendência de Pontuação - ' || v_item.professor_nome,
                'A disciplina ' || v_item.materia_nome || ' (' || v_item.turma_nome || ') está com ' || v_item.total_pontos || '/10.0 pts planejados no ' || v_unidade_alvo || 'º Trimestre. Faltam ' || v_dias_restantes || ' dia(s).',
                'warning',
                '/avaliacoes?tab=visao_geral&turma=' || v_item.turma_id,
                now()
              );
            END IF;
          END IF;

        END LOOP;
      END IF;
    END IF;
  END LOOP;

  RETURN v_pendencias;
END;
$$;
