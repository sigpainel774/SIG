-- Migration: 20260817000000_gestao_flexivel_atividades_e_alertas.sql
-- 1. Adicionar colunas de pontuação e envio para impressão em atividades_secretaria
ALTER TABLE public.atividades_secretaria 
  ADD COLUMN IF NOT EXISTS pontos_maximos numeric(4,2) NOT NULL DEFAULT 2.50 CHECK (pontos_maximos >= 1.0 AND pontos_maximos <= 10.0),
  ADD COLUMN IF NOT EXISTS enviado_impressao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS enviado_impressao_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ordem_atividade integer DEFAULT 1;

-- 2. Criar tabela notas_atividades para suporte a até 10 atividades por aluno
CREATE TABLE IF NOT EXISTS public.notas_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id uuid NOT NULL REFERENCES public.atividades_secretaria(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  nota numeric(4,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(atividade_id, aluno_id)
);

-- Habilitar RLS em notas_atividades
ALTER TABLE public.notas_atividades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dev_all_authenticated" ON public.notas_atividades;
CREATE POLICY "dev_all_authenticated" ON public.notas_atividades
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. Função RPC para verificar pendências de pontuação no trimestre (Professor + Diretor)
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
  v_prazo RECORD;
  v_pendencias jsonb := '[]'::jsonb;
  v_item RECORD;
  v_diretor_auth_id uuid;
  v_diretor_func_id uuid;
  v_prof_auth_id uuid;
  v_dias_restantes integer;
  v_ja_notificado boolean;
BEGIN
  -- Percorrer prazos de unidades cadastrados para a escola
  FOR v_prazo IN 
    SELECT unidade, data_limite 
    FROM public.prazos_unidades 
    WHERE (escola_id = p_escola_id OR escola_id IS NULL)
      AND data_limite >= v_hoje
    ORDER BY data_limite ASC
  LOOP
    v_dias_restantes := v_prazo.data_limite - v_hoje;
    
    -- Se faltar 5 dias ou menos para o prazo da unidade
    IF v_dias_restantes <= 5 AND v_dias_restantes >= 0 THEN
      
      -- Buscar turmas/matérias cujo somatório de pontos_maximos seja < 10.0
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
          AND a.trimestre = v_prazo.unidade
          AND a.escola_id = p_escola_id
        WHERE m.escola_id = p_escola_id
          AND (p_professor_id IS NULL OR m.professor_id = p_professor_id)
        GROUP BY m.id, m.nome, t.id, t.nome, f.id, f.nome, f.auth_user_id
        HAVING COALESCE(SUM(a.pontos_maximos), 0) < 10.0
      LOOP
        -- Acumular no retorno JSON
        v_pendencias := v_pendencias || jsonb_build_object(
          'unidade', v_prazo.unidade,
          'data_limite', v_prazo.data_limite,
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
          -- Evitar duplicidade nas últimas 24h
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
              '⚠️ Pontuação Incompleta no ' || v_prazo.unidade || 'º Trimestre',
              'A pontuação da disciplina ' || v_item.materia_nome || ' na turma ' || v_item.turma_nome || ' está em ' || v_item.total_pontos || '/10.0 pts. Faltam ' || v_dias_restantes || ' dia(s) para o encerramento do prazo.',
              'warning',
              '/avaliacoes?tab=atividades&turma=' || v_item.turma_id,
              now()
            );
          END IF;
        END IF;

        -- 2. Notificar o Diretor da Escola
        -- Buscar Diretor da escola ativa
        SELECT e.diretor_id, f.auth_user_id 
        INTO v_diretor_func_id, v_diretor_auth_id
        FROM public.escolas e
        LEFT JOIN public.funcionarios f ON f.id = e.diretor_id
        WHERE e.id = p_escola_id;

        -- Fallback: Se não houver diretor_id na escola, buscar usuário Nível 2
        IF v_diretor_auth_id IS NULL THEN
          SELECT f.auth_user_id 
          INTO v_diretor_auth_id
          FROM public.acessos_usuarios a
          JOIN public.funcionarios f ON f.id = a.funcionario_id
          WHERE a.escola_id = p_escola_id 
            AND a.nivel = 2 
            AND a.ativo = true
            AND f.auth_user_id IS NOT NULL
          LIMIT 1;
        END IF;

        IF v_diretor_auth_id IS NOT NULL AND v_diretor_auth_id <> v_item.professor_auth_id THEN
          SELECT EXISTS(
            SELECT 1 FROM public.notifications
            WHERE user_id = v_diretor_auth_id
              AND title ILIKE '%Aviso Pedagógico%'
              AND message ILIKE '%' || v_item.professor_nome || '%'
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
              v_diretor_auth_id,
              '📌 Aviso Pedagógico: Pontuação Incompleta (' || v_prazo.unidade || 'º Tri)',
              'O professor ' || v_item.professor_nome || ' possui apenas ' || v_item.total_pontos || '/10.0 pts cadastrados em ' || v_item.materia_nome || ' (' || v_item.turma_nome || ') a ' || v_dias_restantes || ' dia(s) do prazo.',
              'info',
              '/avaliacoes?tab=atividades&turma=' || v_item.turma_id,
              now()
            );
          END IF;
        END IF;

      END LOOP;
    END IF;
  END LOOP;

  RETURN v_pendencias;
END;
$$;
