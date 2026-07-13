-- Migration: Grade Horária e KPIs do Professor
-- Criado em: 2026-07-13

-- 1. Tabela de Definição de Slots de Horários por Turno
CREATE TABLE IF NOT EXISTS public.horarios_aulas_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turno TEXT NOT NULL CHECK (turno IN ('matutino', 'vespertino', 'noturno')),
  ordem_aula SMALLINT NOT NULL CHECK (ordem_aula > 0),
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_slot_escola_turno UNIQUE (escola_id, turno, ordem_aula),
  CONSTRAINT check_horarios CHECK (horario_fim > horario_inicio)
);

ALTER TABLE public.horarios_aulas_slots ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'horarios_aulas_slots' 
      AND policyname = 'dev_all_authenticated'
  ) THEN
    CREATE POLICY "dev_all_authenticated" ON public.horarios_aulas_slots
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- 2. Tabela de Grade Semanal (Template Recorrente)
CREATE TABLE IF NOT EXISTS public.grade_semanal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  ano_letivo INTEGER NOT NULL,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1=segunda ... 7=domingo
  ordem_aula SMALLINT NOT NULL CHECK (ordem_aula > 0), -- Faz referência ao slot definido
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_slot_semanal UNIQUE (turma_id, dia_semana, ordem_aula, ano_letivo)
);

CREATE INDEX IF NOT EXISTS idx_grade_semanal_turma_ano ON public.grade_semanal (turma_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_grade_semanal_materia ON public.grade_semanal (materia_id);

ALTER TABLE public.grade_semanal ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'grade_semanal' 
      AND policyname = 'dev_all_authenticated'
  ) THEN
    CREATE POLICY "dev_all_authenticated" ON public.grade_semanal
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- 3. Tabela de Agenda de Aulas (Instâncias de aula geradas)
CREATE TABLE IF NOT EXISTS public.agenda_aulas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escola_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  materia_id UUID NOT NULL REFERENCES public.materias(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL, -- Histórico
  grade_semanal_id UUID REFERENCES public.grade_semanal(id) ON DELETE SET NULL,
  data DATE NOT NULL,
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'alterado', 'cancelado')),
  data_original DATE,
  horario_original_inicio TIME,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT check_horario_valido CHECK (horario_fim > horario_inicio)
);

-- Índices e restrições parciais exclusivas para evitar conflitos de salas e professores
CREATE UNIQUE INDEX IF NOT EXISTS unique_turma_horario_ativo 
  ON public.agenda_aulas (turma_id, data, horario_inicio) 
  WHERE (status <> 'cancelado');

CREATE UNIQUE INDEX IF NOT EXISTS unique_professor_horario_ativo 
  ON public.agenda_aulas (professor_id, data, horario_inicio) 
  WHERE (status <> 'cancelado' AND professor_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_agenda_aulas_turma_data ON public.agenda_aulas (turma_id, data);
CREATE INDEX IF NOT EXISTS idx_agenda_aulas_materia_data ON public.agenda_aulas (materia_id, data);
CREATE INDEX IF NOT EXISTS idx_agenda_aulas_professor_data ON public.agenda_aulas (professor_id, data);

ALTER TABLE public.agenda_aulas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'agenda_aulas' 
      AND policyname = 'dev_all_authenticated'
  ) THEN
    CREATE POLICY "dev_all_authenticated" ON public.agenda_aulas
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. Atualizar Tabela de Frequências para chamada baseada na matéria específica
ALTER TABLE public.frequencias 
  ADD COLUMN IF NOT EXISTS materia_id UUID REFERENCES public.materias(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS agenda_aula_id UUID REFERENCES public.agenda_aulas(id) ON DELETE CASCADE;

-- Remover restrição antiga baseada unicamente em dia
ALTER TABLE public.frequencias DROP CONSTRAINT IF EXISTS unique_aluno_data;

-- Garantir que o aluno só receba uma chamada por matéria no dia
-- Usando uma verificação e criação condicional da constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_aluno_data_materia'
  ) THEN
    ALTER TABLE public.frequencias 
      ADD CONSTRAINT unique_aluno_data_materia UNIQUE (aluno_id, data, materia_id);
  END IF;
END $$;

-- 5. Função PL/pgSQL para Geração Automática da Agenda via Slots
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
      -- Buscar os horários exatos definidos pelo slot
      SELECT horario_inicio, horario_fim INTO v_horario
      FROM public.horarios_aulas_slots
      WHERE escola_id = p_escola_id
        AND turno = v_slot.turno
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
