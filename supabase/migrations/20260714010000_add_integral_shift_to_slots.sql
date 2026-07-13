-- Migration: Adicionar Suporte ao Turno Integral e buscas case-insensitive nos Slots de Horários
-- Criado em: 2026-07-13

-- 1. Alterar a CHECK constraint da tabela horarios_aulas_slots para aceitar 'integral' (case-insensitive)
ALTER TABLE public.horarios_aulas_slots DROP CONSTRAINT IF EXISTS horarios_aulas_slots_turno_check;

ALTER TABLE public.horarios_aulas_slots 
  ADD CONSTRAINT horarios_aulas_slots_turno_check 
  CHECK (LOWER(turno) IN ('matutino', 'vespertino', 'noturno', 'integral'));

-- 2. Atualizar a função gerar_agenda_ano_letivo para fazer a busca case-insensitive no turno
CREATE OR REPLACE FUNCTION public.gerar_agenda_ano_letivo(
  p_escola_id UUID,
  p_ano_letivo INTEGER,
  p_data_inicio DATE,
  p_data_fim DATE
) RETURNS INTEGER AS $$
DECLARE
  v_data DATE;
  v_dia_semana SMALLINT;
  v_slot RECORD;
  v_horario RECORD;
  v_count INTEGER := 0;
BEGIN
  v_data := p_data_inicio;
  WHILE v_data <= p_data_fim LOOP
    -- Ajustar dia_semana para 1=segunda...7=domingo
    v_dia_semana := CASE EXTRACT(DOW FROM v_data)::INT
      WHEN 0 THEN 7 ELSE EXTRACT(DOW FROM v_data)::INT END;

    FOR v_slot IN
      SELECT gs.*, t.turno, m.professor_id 
      FROM public.grade_semanal gs
      JOIN public.turmas t ON t.id = gs.turma_id
      JOIN public.materias m ON m.id = gs.materia_id
      WHERE gs.escola_id = p_escola_id
        AND gs.ano_letivo = p_ano_letivo
        AND gs.dia_semana = v_dia_semana
        AND gs.ativo = true
    LOOP
      -- Buscar os horários exatos definidos pelo slot usando comparação case-insensitive
      SELECT horario_inicio, horario_fim INTO v_horario
      FROM public.horarios_aulas_slots
      WHERE escola_id = p_escola_id
        AND LOWER(turno) = LOWER(v_slot.turno)
        AND ordem_aula = v_slot.ordem_aula;

      IF FOUND THEN
        INSERT INTO public.agenda_aulas
          (escola_id, turma_id, materia_id, professor_id, grade_semanal_id, data, horario_inicio, horario_fim, status)
        VALUES
          (p_escola_id, v_slot.turma_id, v_slot.materia_id, v_slot.professor_id, v_slot.id, v_data, v_horario.horario_inicio, v_horario.horario_fim, 'normal')
        ON CONFLICT (turma_id, data, horario_inicio) DO NOTHING;

        v_count := v_count + 1;
      END IF;
    END LOOP;

    v_data := v_data + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
