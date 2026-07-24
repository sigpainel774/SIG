-- Migration 009: Índices Compostos de Alta Performance para Dashboards de Docentes (M-1)

-- 1. Índice em vinculos_turmas (funcionario_id, escola_id)
CREATE INDEX IF NOT EXISTS idx_vinculos_turmas_func_escola 
  ON public.vinculos_turmas (funcionario_id, escola_id);

-- 2. Índice em agenda_aulas (professor_id, escola_id, data)
CREATE INDEX IF NOT EXISTS idx_agenda_aulas_prof_escola_data 
  ON public.agenda_aulas (professor_id, escola_id, data);

-- 3. Índice em frequencias (escola_id, data)
CREATE INDEX IF NOT EXISTS idx_frequencias_escola_data 
  ON public.frequencias (escola_id, data);

-- 4. Índice em atividades_secretaria (professor_id, escola_id, status)
CREATE INDEX IF NOT EXISTS idx_atividades_sec_prof_escola_status 
  ON public.atividades_secretaria (professor_id, escola_id, status);
