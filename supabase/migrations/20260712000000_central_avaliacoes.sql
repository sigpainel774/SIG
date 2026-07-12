-- =====================================================================
-- Migration: Central de Avaliações da Secretaria
-- Data: 2026-07-12
-- Descrição: Cria o fluxo completo de envio de atividades pelo professor
--            para a secretaria, com status, histórico, notificações
--            compartilhadas e sistema de trimestres.
-- =====================================================================

-- -----------------------------------------------------------------------
-- ETAPA 1: Storage Bucket para arquivos de atividades
-- -----------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('atividades-secretaria', 'atividades-secretaria', true)
ON CONFLICT (id) DO NOTHING;

-- Política de leitura pública (download e impressão)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'atividades_secretaria_read'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "atividades_secretaria_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'atividades-secretaria');
  END IF;
END $$;

-- Política de upload (somente autenticados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'atividades_secretaria_insert'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "atividades_secretaria_insert"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'atividades-secretaria'
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- Política de exclusão (somente autenticados)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'atividades_secretaria_delete'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "atividades_secretaria_delete"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'atividades-secretaria'
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- ETAPA 2: Tabela principal de atividades
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atividades_secretaria (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id         uuid    NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_id          uuid    NOT NULL REFERENCES public.turmas(id)  ON DELETE CASCADE,
  materia_id        uuid    REFERENCES public.materias(id) ON DELETE SET NULL,
  professor_id      uuid    NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,

  titulo            text    NOT NULL,
  observacoes       text,
  data_aplicacao    date    NOT NULL,
  trimestre         integer CHECK (trimestre BETWEEN 1 AND 3),  -- 3 trimestres letivos
  ano_letivo        integer NOT NULL DEFAULT EXTRACT(YEAR FROM now()),

  arquivo_url       text,       -- URL pública no Storage
  arquivo_nome      text,       -- nome original do arquivo
  arquivo_tipo      text,       -- MIME type (application/pdf, etc.)

  -- Fluxo de status: recebida → em_impressao → impressa → entregue_professor
  status            text    NOT NULL DEFAULT 'recebida'
                    CHECK (status IN ('recebida', 'em_impressao', 'impressa', 'entregue_professor')),

  -- Rastreabilidade de quem alterou o status
  updated_by        uuid    REFERENCES public.funcionarios(id) ON DELETE SET NULL,

  created_at        timestamp with time zone DEFAULT now(),
  updated_at        timestamp with time zone DEFAULT now()
);

-- Índices para desempenho nas consultas mais frequentes
CREATE INDEX IF NOT EXISTS idx_atividades_escola     ON public.atividades_secretaria (escola_id);
CREATE INDEX IF NOT EXISTS idx_atividades_professor  ON public.atividades_secretaria (professor_id);
CREATE INDEX IF NOT EXISTS idx_atividades_turma      ON public.atividades_secretaria (turma_id);
CREATE INDEX IF NOT EXISTS idx_atividades_materia    ON public.atividades_secretaria (materia_id);
CREATE INDEX IF NOT EXISTS idx_atividades_status     ON public.atividades_secretaria (status);
CREATE INDEX IF NOT EXISTS idx_atividades_ano_trim   ON public.atividades_secretaria (ano_letivo, trimestre);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_atividades_secretaria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_atividades_secretaria_updated_at ON public.atividades_secretaria;
CREATE TRIGGER trg_atividades_secretaria_updated_at
  BEFORE UPDATE ON public.atividades_secretaria
  FOR EACH ROW EXECUTE FUNCTION update_atividades_secretaria_updated_at();

-- RLS
ALTER TABLE public.atividades_secretaria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.atividades_secretaria
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------
-- ETAPA 3: Tabela de histórico de mudanças de status
-- (permite calcular KPIs de tempo médio entre etapas)
-- -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.atividades_secretaria_historico (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id    uuid    NOT NULL REFERENCES public.atividades_secretaria(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo     text    NOT NULL,
  alterado_por    uuid    REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  alterado_por_nome text, -- desnormalizado para facilitar exibição no histórico
  alterado_em     timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ativ_hist_atividade ON public.atividades_secretaria_historico (atividade_id);
CREATE INDEX IF NOT EXISTS idx_ativ_hist_alterado_em ON public.atividades_secretaria_historico (alterado_em);

-- RLS
ALTER TABLE public.atividades_secretaria_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.atividades_secretaria_historico
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------
-- ETAPA 4: Alterar tabela notifications para suportar
--          notificações compartilhadas entre múltiplos secretários
-- -----------------------------------------------------------------------
-- grupo_id: agrupa as N notificações disparadas para o mesmo evento
--           (uma por secretário, mas todas do mesmo grupo)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS grupo_id          uuid,
  ADD COLUMN IF NOT EXISTS processado_por    uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processado_por_nome text,
  ADD COLUMN IF NOT EXISTS processado_em     timestamp with time zone;

-- Índice para buscas por grupo (atualização em lote ao processar)
CREATE INDEX IF NOT EXISTS idx_notifications_grupo_id ON public.notifications (grupo_id);

-- -----------------------------------------------------------------------
-- ETAPA 5: Configuração de notificações para o novo tipo
-- -----------------------------------------------------------------------
INSERT INTO public.configuracao_notificacoes_niveis (nivel, cargo_pattern, tipo_notificacao, enviar_web)
VALUES
  (3, null, 'atividade_secretaria', true),  -- Secretários recebem
  (2, null, 'atividade_secretaria', true)   -- Diretores também recebem (leitura-only)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------
-- ETAPA 6: Estender prazos_unidades para suporte a trimestres municipais
-- (configurado por usuários nível 1 — âmbito da rede/cidade toda)
-- -----------------------------------------------------------------------
-- A tabela prazos_unidades já existe com: escola_id, unidade (1-4), data_limite
-- Apenas garantimos compatibilidade com trimestres (1-3):
-- A coluna escola_id com valor NULL indica prazo geral da rede (nível 1)
-- Nenhuma alteração de schema necessária — a semântica já suporta.

-- -----------------------------------------------------------------------
-- FIM DA MIGRATION
-- -----------------------------------------------------------------------
