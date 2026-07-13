-- Índices para melhorar o desempenho das queries mais frequentes identificadas no painel

-- a) SELECT aluno_id, presenca FROM frequencias WHERE turma_id = '<id>' AND data = '<data>';
CREATE INDEX IF NOT EXISTS idx_frequencias_turma_data ON public.frequencias (turma_id, data);

-- b) SELECT * FROM notas WHERE turma_id = '<id>';
CREATE INDEX IF NOT EXISTS idx_notas_turma ON public.notas (turma_id);

-- c) SELECT * FROM materias WHERE turma_id = '<id>' AND escola_id = '<id>';
CREATE INDEX IF NOT EXISTS idx_materias_turma_escola ON public.materias (turma_id, escola_id);

-- d) SELECT * FROM alunos WHERE turma_id = '<id>' AND escola_id = '<id>' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alunos_turma_escola ON public.alunos (turma_id, escola_id) WHERE (deleted_at IS NULL);
