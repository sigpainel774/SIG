-- Migration: 20260816100000_session_timeout_rules.sql
-- Descrição: Criação da tabela de regras de encerramento compulsório de sessão por horário e RPC get_session_timeout_rules_for_user (Nível 2 para baixo).

CREATE TABLE IF NOT EXISTS public.session_timeout_rules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                 text NOT NULL,
  ativo                boolean NOT NULL DEFAULT false, -- Desativado por padrão
  
  -- Escopo da regra: 'rede' | 'secretaria' | 'escola' | 'nivel'
  escopo               text NOT NULL DEFAULT 'rede' 
                       CHECK (escopo IN ('rede', 'secretaria', 'escola', 'nivel')),
  
  -- Relacionamentos opcionais de escopo
  secretaria_id        uuid REFERENCES public.secretarias(id) ON DELETE CASCADE,
  escola_id            uuid REFERENCES public.escolas(id) ON DELETE CASCADE,
  
  -- Nível específico alvo (somente níveis >= 2: 2, 3, 4, 5, 6)
  -- Se null, aplica a TODOS de Nível 2 para baixo
  nivel_acesso         integer CHECK (nivel_acesso IS NULL OR nivel_acesso >= 2),
  
  -- Array de horários em formato 'HH:MM' (ex: ARRAY['12:00', '18:00'])
  horarios             text[] NOT NULL DEFAULT '{}',
  
  -- Dias da semana (0=Domingo, 1=Segunda, ..., 6=Sábado; vazio = todos os dias)
  dias_semana          smallint[] DEFAULT '{}',
  
  -- Tolerância em minutos para captura após o horário (default: 5 min)
  tolerancia_minutos   integer NOT NULL DEFAULT 5,
  
  -- Metadados
  criado_por           uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at           timestamptz DEFAULT timezone('utc'::text, now())
);

-- Habilita RLS
ALTER TABLE public.session_timeout_rules ENABLE ROW LEVEL SECURITY;

-- Política de leitura: autenticados podem ler para que seus watchers funcionem
DROP POLICY IF EXISTS "session_timeout_select_authenticated" ON public.session_timeout_rules;
CREATE POLICY "session_timeout_select_authenticated"
  ON public.session_timeout_rules FOR SELECT
  USING (auth.role() = 'authenticated');

-- Política de escrita: somente Superadmin (ROOT) pode criar, editar ou excluir
DROP POLICY IF EXISTS "session_timeout_write_superadmin" ON public.session_timeout_rules;
CREATE POLICY "session_timeout_write_superadmin"
  ON public.session_timeout_rules FOR ALL
  USING (public.is_superadmin_by_uid())
  WITH CHECK (public.is_superadmin_by_uid());

-- Habilita Realtime na tabela para propagação instantânea de alterações aos navegadores
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_timeout_rules;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END $$;

-- RPC SECURITY DEFINER para filtrar regras do usuário atual
CREATE OR REPLACE FUNCTION public.get_session_timeout_rules_for_user()
RETURNS TABLE (
  id uuid,
  nome text,
  horarios text[],
  dias_semana smallint[],
  tolerancia_minutos integer,
  escopo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_func_id      uuid;
  v_is_super     boolean;
  v_min_nivel    integer;
  v_escola_ids   uuid[];
  v_sec_ids      uuid[];
BEGIN
  -- 1. Identifica funcionário logado
  SELECT f.id, COALESCE(f.is_superadmin, false)
    INTO v_func_id, v_is_super
    FROM public.funcionarios f
   WHERE f.auth_user_id = auth.uid()
     AND f.deleted_at IS NULL
   LIMIT 1;

  -- Se for Superadmin, retorna vazio (imune)
  IF v_is_super THEN
    RETURN;
  END IF;

  -- 2. Identifica o menor nível de acesso ativo do usuário (maior privilégio)
  SELECT MIN(a.nivel)
    INTO v_min_nivel
    FROM public.acessos_usuarios a
   WHERE a.funcionario_id = v_func_id
     AND a.ativo = true;

  -- Se o usuário for Nível 1 ou não tiver vínculos, está isento de logoff automático
  IF v_min_nivel IS NULL OR v_min_nivel < 2 THEN
    RETURN;
  END IF;

  -- 3. Coleta escolas e secretarias vinculadas não-teste
  SELECT 
    COALESCE(array_agg(DISTINCT a.escola_id), '{}'),
    COALESCE(array_agg(DISTINCT e.secretaria_id), '{}')
    INTO v_escola_ids, v_sec_ids
    FROM public.acessos_usuarios a
    LEFT JOIN public.escolas e ON e.id = a.escola_id
   WHERE a.funcionario_id = v_func_id
     AND a.ativo = true
     AND (e.is_teste IS NULL OR e.is_teste = false);

  -- 4. Retorna regras ativas aplicáveis
  RETURN QUERY
    SELECT 
      r.id, 
      r.nome, 
      r.horarios, 
      r.dias_semana, 
      r.tolerancia_minutos,
      r.escopo
    FROM public.session_timeout_rules r
   WHERE r.ativo = true
     AND (
       -- Regra para toda a rede (aplica a todos >= Nível 2)
       (r.escopo = 'rede' AND (r.nivel_acesso IS NULL OR r.nivel_acesso = v_min_nivel))
       -- Regra por secretaria
       OR (r.escopo = 'secretaria' AND r.secretaria_id = ANY(v_sec_ids) AND (r.nivel_acesso IS NULL OR r.nivel_acesso = v_min_nivel))
       -- Regra por unidade/escola
       OR (r.escopo = 'escola' AND r.escola_id = ANY(v_escola_ids) AND (r.nivel_acesso IS NULL OR r.nivel_acesso = v_min_nivel))
       -- Regra específica por nível
       OR (r.escopo = 'nivel' AND r.nivel_acesso = v_min_nivel)
     );
END;
$$;
