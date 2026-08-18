-- Migration: 20260818020000_emaee_numero_matricula.sql
-- Proposito: Criar e ativar o sistema de atribuicao automatica do Numero de Matricula EMAEE (ex: 202616001), com funcao sequenciadora por unidade/ano, trigger automatico e preenchimento retroativo nos prontuarios existentes.

-- 1. Adiciona a coluna numero_matricula_emaee na tabela emaee_matriculas
ALTER TABLE public.emaee_matriculas ADD COLUMN IF NOT EXISTS numero_matricula_emaee text;

-- 2. Garante constraint de unicidade (se nao existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'emaee_matriculas_numero_matricula_unique'
  ) THEN
    ALTER TABLE public.emaee_matriculas ADD CONSTRAINT emaee_matriculas_numero_matricula_unique UNIQUE (numero_matricula_emaee);
  END IF;
END $$;

-- 3. Funcao para gerar o numero de matricula sequencial do EMAEE
CREATE OR REPLACE FUNCTION public.gerar_numero_matricula_emaee(
  p_escola_atendimento_id uuid,
  p_data_matricula date
)
RETURNS text AS $$
DECLARE
  v_ano text;
  v_escola_codigo int;
  v_escola_codigo_str text;
  v_sequencial int;
  v_numero_matricula text;
BEGIN
  -- Extrai o ano da matricula ou do ano corrente
  v_ano := to_char(COALESCE(p_data_matricula, CURRENT_DATE), 'YYYY');

  -- Recupera o codigo da escola de atendimento EMAEE
  SELECT codigo INTO v_escola_codigo 
  FROM public.escolas 
  WHERE id = p_escola_atendimento_id;

  -- Se a escola nao tiver codigo definido, usa o codigo padrao 16 do EMAEE
  IF v_escola_codigo IS NULL THEN
    v_escola_codigo := 16;
  END IF;
  
  v_escola_codigo_str := lpad(v_escola_codigo::text, 2, '0');

  -- Calcula o proximo sequencial unico para o ano e a unidade
  SELECT COALESCE(MAX(SUBSTRING(numero_matricula_emaee FROM 7 FOR 3)::integer), 0) + 1
  INTO v_sequencial
  FROM public.emaee_matriculas
  WHERE numero_matricula_emaee LIKE (v_ano || v_escola_codigo_str || '%');

  IF v_sequencial > 999 THEN
    RAISE EXCEPTION 'Limite de 999 matriculas para a unidade EMAEE no ano % atingido.', v_ano;
  END IF;

  v_numero_matricula := v_ano || v_escola_codigo_str || lpad(v_sequencial::text, 3, '0');

  RETURN v_numero_matricula;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Funcao de trigger para atribuicao antes de INSERT ou UPDATE
CREATE OR REPLACE FUNCTION public.trigger_emaee_numero_matricula()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o numero de matricula nao foi informado ou esta vazio, gera automaticamente
  IF NEW.numero_matricula_emaee IS NULL OR TRIM(NEW.numero_matricula_emaee) = '' THEN
    NEW.numero_matricula_emaee := public.gerar_numero_matricula_emaee(
      NEW.escola_atendimento_id,
      NEW.data_matricula
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criacao do Trigger
DROP TRIGGER IF EXISTS trigger_set_emaee_numero_matricula ON public.emaee_matriculas;

CREATE TRIGGER trigger_set_emaee_numero_matricula
BEFORE INSERT OR UPDATE ON public.emaee_matriculas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_emaee_numero_matricula();

-- 6. Atualizacao retroativa nos prontuarios ja existentes no banco de dados
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT id, escola_atendimento_id, data_matricula 
    FROM public.emaee_matriculas 
    WHERE numero_matricula_emaee IS NULL OR TRIM(numero_matricula_emaee) = ''
    ORDER BY created_at ASC
  LOOP
    UPDATE public.emaee_matriculas 
    SET numero_matricula_emaee = public.gerar_numero_matricula_emaee(r.escola_atendimento_id, r.data_matricula)
    WHERE id = r.id;
  END LOOP;
END $$;
