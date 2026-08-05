-- Migration: 20260804000000_create_emaee_schema.sql
-- Propósito: Estruturar as tabelas específicas para a unidade especializada EMAEE, incluindo matrícula clínica, associações de especialidades, fichas de evolução, solicitações pedagógicas de origem e políticas de RLS e triggers.

-- 1. Extensão segura da tabela public.alunos (se as colunas já não existirem)
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS identif_unica_censo TEXT;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS sexo TEXT;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS certidao_nascimento_novo_modelo TEXT;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS profissao_mae TEXT;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS profissao_pai TEXT;
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS nome_contato_emergencia TEXT;

-- 2. Tabela de Matrículas do EMAEE (Prontuário & Registro de Acolhimento)
CREATE TABLE IF NOT EXISTS public.emaee_matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  escola_atendimento_id UUID NOT NULL REFERENCES public.escolas(id), -- Unidade EMAEE
  data_matricula DATE NOT NULL DEFAULT CURRENT_DATE,
  turno_atendimento TEXT NOT NULL DEFAULT 'Matutino', -- 'Matutino' ou 'Vespertino'
  localizacao_atendimento TEXT DEFAULT 'Urbana', -- 'Urbana' ou 'Rural'
  
  -- Unidade Regular (Escolarização)
  escola_regular_id UUID REFERENCES public.escolas(id) ON DELETE SET NULL,
  ano_escolarizacao TEXT, -- ex: '5º Ano'
  turno_regular TEXT, -- 'Matutino', 'Vespertino', 'Integral'
  turma_regular TEXT, -- ex: 'A'
  professor_regular TEXT, -- Nome do professor regente
  gestor_regular TEXT, -- Nome do gestor escolar
  
  -- Dados Clínicos Iniciais
  principal_queixa TEXT,
  cid_codigo TEXT, -- ex: 'F84.0'
  observacoes_requerimento TEXT,
  
  -- Deficiências (Mapeamento AEE Censo 2026)
  def_baixa_visao BOOLEAN DEFAULT false,
  def_cegueira BOOLEAN DEFAULT false,
  def_auditiva BOOLEAN DEFAULT false,
  def_fisica BOOLEAN DEFAULT false,
  def_intelectual BOOLEAN DEFAULT false,
  def_surdez BOOLEAN DEFAULT false,
  def_surdocegueira BOOLEAN DEFAULT false,
  def_multipla BOOLEAN DEFAULT false,
  transtorno_tea BOOLEAN DEFAULT false,
  transtorno_outros BOOLEAN DEFAULT false,
  
  -- Status da Matrícula no EMAEE
  status TEXT DEFAULT 'FILA_ESPERA', -- 'FILA_ESPERA', 'EM_INVESTIGACAO', 'ATIVO', 'ALTA', 'INATIVO'
  
  -- Controle de Assinaturas e Autorização
  autorizado_pelo_responsavel BOOLEAN DEFAULT false,
  data_autorizacao TIMESTAMPTZ,
  responsavel_assinatura_nome TEXT,
  responsavel_assinatura_cpf TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Ativa RLS para Matrículas EMAEE
ALTER TABLE public.emaee_matriculas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.emaee_matriculas
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- 3. Tabela de Profissionais Especializados e Horários por Aluno
CREATE TABLE IF NOT EXISTS public.emaee_especialidades_vinculadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emaee_matricula_id UUID NOT NULL REFERENCES public.emaee_matriculas(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  especialidade TEXT NOT NULL, -- 'Psicólogo', 'Fonoaudiólogo', 'Neuropediatra', 'Psicopedagogo', 'Fisioterapeuta', 'Outros'
  especialidade_outros TEXT,
  frequencia TEXT DEFAULT 'SEMANAL', -- 'SEMANAL', 'QUINZENAL', 'MENSAL'
  dia_semana SMALLINT NOT NULL, -- 1 = Segunda, 2 = Terça, etc.
  horario_inicio TIME NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(emaee_matricula_id, profissional_id, especialidade)
);

-- Ativa RLS para Vínculo de Especialidades
ALTER TABLE public.emaee_especialidades_vinculadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.emaee_especialidades_vinculadas
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- 4. Tabela de Fichas de Evolução Clínico-Pedagógica
CREATE TABLE IF NOT EXISTS public.emaee_evolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emaee_matricula_id UUID NOT NULL REFERENCES public.emaee_matriculas(id) ON DELETE CASCADE,
  profissional_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  especialidade TEXT NOT NULL,
  data_atendimento DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_atendimento TEXT DEFAULT 'EVOLUCAO_ROTINA', -- 'AVALIACAO_INICIAL', 'EVOLUCAO_ROTINA', 'PARECER'
  resumo_evolucao TEXT NOT NULL,
  conduta_orientacoes TEXT,
  anexos_sessao JSONB DEFAULT '[]'::jsonb,
  assinatura_profissional_url TEXT,
  assinado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Ativa RLS para Evoluções Clínicas
ALTER TABLE public.emaee_evolucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.emaee_evolucoes
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');


-- 5. Tabela de Solicitações de Relatório de Acompanhamento à Escola de Origem
CREATE TABLE IF NOT EXISTS public.emaee_solicitacoes_relatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emaee_matricula_id UUID NOT NULL REFERENCES public.emaee_matriculas(id) ON DELETE CASCADE,
  escola_origem_id UUID NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  solicitante_id UUID REFERENCES public.funcionarios(id),
  motivo_solicitacao TEXT NOT NULL,
  prazo_resposta DATE,
  status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'RESPONDIDO', 'CANCELADO'
  relatorio_resposta_texto TEXT,
  relatorio_resposta_anexo_url TEXT,
  respondido_por UUID REFERENCES public.funcionarios(id),
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativa RLS para Solicitações de Relatório
ALTER TABLE public.emaee_solicitacoes_relatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.emaee_solicitacoes_relatorios
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
