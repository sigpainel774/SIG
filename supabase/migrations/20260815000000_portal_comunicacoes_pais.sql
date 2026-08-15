-- Migration: 20260815000000_portal_comunicacoes_pais.sql
-- Descrição: Adiciona portal_comunicacoes_ativo em escolas e cria a tabela mensagens_responsaveis para troca de recados entre professores e pais.

-- 1. Coluna de controle na tabela escolas (desativado por padrão)
ALTER TABLE public.escolas 
ADD COLUMN IF NOT EXISTS portal_comunicacoes_ativo boolean DEFAULT false;

-- 2. Tabela de mensagens entre professores e responsáveis dos alunos
CREATE TABLE IF NOT EXISTS public.mensagens_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  professor_id uuid REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  responsavel_id uuid REFERENCES public.responsaveis(id) ON DELETE SET NULL,
  remetente_tipo text NOT NULL DEFAULT 'professor' CHECK (remetente_tipo IN ('professor', 'responsavel')),
  autor_nome text,
  titulo text,
  conteudo text NOT NULL,
  lida_responsavel boolean DEFAULT false,
  lida_responsavel_em timestamp with time zone,
  lida_professor boolean DEFAULT false,
  lida_professor_em timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  deleted_at timestamp with time zone
);

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_mensagens_resp_aluno ON public.mensagens_responsaveis(aluno_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_resp_turma ON public.mensagens_responsaveis(turma_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_resp_escola ON public.mensagens_responsaveis(escola_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_resp_data ON public.mensagens_responsaveis(created_at DESC);

-- 4. Habilitar RLS e criar política para usuários autenticados
ALTER TABLE public.mensagens_responsaveis ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'mensagens_responsaveis' AND policyname = 'dev_all_authenticated'
  ) THEN
    CREATE POLICY "dev_all_authenticated" ON public.mensagens_responsaveis
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
