-- Migration: 20260805100000_salvaguardas_secretarias.sql
-- Propósito: Adicionar controle dinâmico de módulos a nível de secretaria, isolamento rigoroso por RLS para usuários de Nível 1, e blindagem de cargos/comunicados.

-- ─── 1. Adicionar coluna modulos_ativos em public.secretarias ──────────────────
ALTER TABLE public.secretarias 
  ADD COLUMN IF NOT EXISTS modulos_ativos text[] 
  DEFAULT '{"coleta-local", "configuracoes-basicas", "geolocalizacao", "funcionarios-basico"}'::text[];

-- ─── 2. Semeia secretarias existentes com os respectivos módulos completos ────
-- Educação: tudo
UPDATE public.secretarias 
SET modulos_ativos = '{"coleta-local", "configuracoes-basicas", "geolocalizacao", "funcionarios-basico", "mural", "alunos", "turmas", "matriculas", "avaliacoes", "ocorrencias", "documentos", "transferencias", "arquivos", "relatorios", "central-atividades", "lideranca"}'::text[]
WHERE nome ILIKE '%educação%' OR nome ILIKE '%educacao%';

-- Saúde: tudo de saúde
UPDATE public.secretarias 
SET modulos_ativos = '{"coleta-local", "configuracoes-basicas", "geolocalizacao", "funcionarios-basico", "mural", "atestados", "documentos", "relatorios", "central-atividades", "lideranca", "arquivos"}'::text[]
WHERE nome ILIKE '%saúde%' OR nome ILIKE '%saude%';

-- EMAEE (se houver)
UPDATE public.secretarias 
SET modulos_ativos = '{"coleta-local", "configuracoes-basicas", "geolocalizacao", "funcionarios-basico", "mural", "pacientes", "fila-espera", "especialistas", "relatorios-escola", "arquivos", "relatorios"}'::text[]
WHERE nome ILIKE '%emaee%';

-- ─── 3. Atualizar a função tem_acesso_a_escola para restringir Nível 1 ──────────
CREATE OR REPLACE FUNCTION public.tem_acesso_a_escola(escola_alvo UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_secretaria_id UUID;
BEGIN
  -- Obter a secretaria vinculada à escola
  SELECT secretaria_id INTO v_secretaria_id FROM public.escolas WHERE id = escola_alvo;

  RETURN EXISTS (
    SELECT 1 FROM public.funcionarios f
    WHERE f.auth_user_id = auth.uid()
      AND (
        -- ROOT/Superadmin global vê tudo
        f.is_superadmin = true
        OR
        -- Nível 1 (Administrador) vê apenas escolas das secretarias que tem permissão
        EXISTS (
          SELECT 1 FROM public.acessos_usuarios au
          WHERE au.funcionario_id = f.id 
            AND au.nivel = 1 
            AND au.ativo = true
            AND (
              v_secretaria_id IS NULL 
              OR au.secretarias_ids IS NULL 
              OR v_secretaria_id = ANY(au.secretarias_ids)
            )
        )
        OR
        -- Demais usuários vêem apenas escolas com lotação física ativa
        EXISTS (
          SELECT 1 FROM public.vinculos_funcionarios vf
          WHERE vf.funcionario_id = f.id
            AND vf.escola_id = escola_alvo
            AND vf.ativo = true
        )
      )
  );
END;
$$;

-- ─── 4. Ajustar políticas RLS de gravação da tabela secretarias ─────────────
DROP POLICY IF EXISTS "secretarias_insert" ON public.secretarias;
CREATE POLICY "secretarias_insert" ON public.secretarias
  FOR INSERT WITH CHECK (public.is_superadmin_by_uid());

DROP POLICY IF EXISTS "secretarias_update" ON public.secretarias;
CREATE POLICY "secretarias_update" ON public.secretarias
  FOR UPDATE USING (public.is_superadmin_by_uid()) WITH CHECK (public.is_superadmin_by_uid());

DROP POLICY IF EXISTS "secretarias_delete" ON public.secretarias;
CREATE POLICY "secretarias_delete" ON public.secretarias
  FOR DELETE USING (public.is_superadmin_by_uid());

-- ─── 5. Ajustar RLS para evitar vazamento de Cargos por secretaria ──────────
DROP POLICY IF EXISTS "Leitura de cargos para todos os autenticados" ON public.cargos;
DROP POLICY IF EXISTS "cargos_select_isolado" ON public.cargos;

CREATE POLICY "cargos_select_isolado" ON public.cargos
  FOR SELECT USING (
    public.is_superadmin_by_uid()
    OR secretaria_id IS NULL
    OR public.tem_acesso_a_secretaria(secretaria_id)
  );

-- ─── 6. Ajustar RLS para evitar vazamento de Comunicados por secretaria ──────
DROP POLICY IF EXISTS "comunicados_select" ON public.comunicados;
CREATE POLICY "comunicados_select" ON public.comunicados
  FOR SELECT USING (
    public.is_superadmin_by_uid()
    OR secretaria_id IS NULL
    OR public.tem_acesso_a_secretaria(secretaria_id)
  );
