-- Migration: 20260817010000_calendario_academico_schema.sql
-- Descrição: Criação das tabelas para o Módulo de Calendário Acadêmico da Rede Municipal de Educação

-- 1. Tabela Principal: calendarios_academicos
CREATE TABLE IF NOT EXISTS public.calendarios_academicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secretaria_id UUID NOT NULL REFERENCES public.secretarias(id) ON DELETE CASCADE,
  ano_letivo INTEGER NOT NULL,
  
  -- Definição dos 3 Trimestres
  trimestre1_inicio DATE,
  trimestre1_fim DATE,
  trimestre2_inicio DATE,
  trimestre2_fim DATE,
  trimestre3_inicio DATE,
  trimestre3_fim DATE,
  
  -- Recessos Oficiais
  recesso_junino_inicio DATE,
  recesso_junino_fim DATE,
  recesso_fim_ano_inicio DATE,
  recesso_fim_ano_fim DATE,
  
  meta_dias_letivos INTEGER DEFAULT 200,
  ativo BOOLEAN DEFAULT true,
  publicado BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  
  CONSTRAINT unique_secretaria_ano_letivo UNIQUE(secretaria_id, ano_letivo)
);

-- 2. Tabela de Eventos, Feriados e Pontos Facultativos: calendario_eventos
CREATE TABLE IF NOT EXISTS public.calendario_eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendario_id UUID NOT NULL REFERENCES public.calendarios_academicos(id) ON DELETE CASCADE,
  ano_letivo INTEGER NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'feriado_nacional',
    'feriado_estadual',
    'feriado_municipal',
    'ponto_facultativo',
    'recesso_escolar',
    'sabado_letivo',
    'dia_letivo_especial',
    'conselho_classe',
    'planejamento_pedagogico'
  )),
  descricao TEXT NOT NULL,
  letivo BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  criado_por UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  
  CONSTRAINT unique_calendario_evento_data UNIQUE(calendario_id, data)
);

-- 3. Tabela de Histórico de Alterações: calendario_historico
CREATE TABLE IF NOT EXISTS public.calendario_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calendario_id UUID NOT NULL REFERENCES public.calendarios_academicos(id) ON DELETE CASCADE,
  ano_letivo INTEGER NOT NULL,
  acao TEXT NOT NULL,
  descricao_alteracao TEXT NOT NULL,
  detalhes_json JSONB DEFAULT '{}'::jsonb,
  alterado_por_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  alterado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_calendarios_academicos_sec_ano ON public.calendarios_academicos(secretaria_id, ano_letivo);
CREATE INDEX IF NOT EXISTS idx_calendario_eventos_cal_data ON public.calendario_eventos(calendario_id, data);
CREATE INDEX IF NOT EXISTS idx_calendario_eventos_ano_data ON public.calendario_eventos(ano_letivo, data);
CREATE INDEX IF NOT EXISTS idx_calendario_historico_cal_data ON public.calendario_historico(calendario_id, created_at DESC);

-- Habilitação de RLS
ALTER TABLE public.calendarios_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario_historico ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS de desenvolvimento
DROP POLICY IF EXISTS "dev_all_authenticated_calendarios" ON public.calendarios_academicos;
CREATE POLICY "dev_all_authenticated_calendarios" ON public.calendarios_academicos
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "dev_all_authenticated_cal_eventos" ON public.calendario_eventos;
CREATE POLICY "dev_all_authenticated_cal_eventos" ON public.calendario_eventos
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "dev_all_authenticated_cal_historico" ON public.calendario_historico;
CREATE POLICY "dev_all_authenticated_cal_historico" ON public.calendario_historico
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
