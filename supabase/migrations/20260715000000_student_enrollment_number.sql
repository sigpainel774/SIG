-- 1. Add codigo column to escolas table
ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS codigo integer;

-- 2. Populate existing schools with sequential codes 1..9
DO $$
DECLARE
  r RECORD;
  i INTEGER := 1;
BEGIN
  FOR r IN SELECT id FROM public.escolas ORDER BY created_at ASC, nome ASC LOOP
    UPDATE public.escolas SET codigo = i WHERE id = r.id;
    i := i + 1;
  END LOOP;
END $$;

-- 3. Make column codigo NOT NULL and UNIQUE, with CHECK constraint
ALTER TABLE public.escolas ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE public.escolas ADD CONSTRAINT escolas_codigo_check CHECK (codigo BETWEEN 1 AND 99);
ALTER TABLE public.escolas ADD CONSTRAINT escolas_codigo_unique UNIQUE (codigo);

-- 4. Add trigger/function to auto-assign school code
CREATE OR REPLACE FUNCTION public.set_next_escola_codigo()
RETURNS TRIGGER AS $$
DECLARE
  next_code integer;
BEGIN
  -- find the first unused integer between 1 and 99
  SELECT COALESCE(MAX(codigo), 0) + 1 INTO next_code FROM public.escolas;
  
  IF next_code > 99 THEN
    RAISE EXCEPTION 'Limite máximo de 99 escolas atingido.';
  END IF;
  
  NEW.codigo := next_code;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_set_escola_codigo
BEFORE INSERT ON public.escolas
FOR EACH ROW
WHEN (NEW.codigo IS NULL)
EXECUTE FUNCTION public.set_next_escola_codigo();

-- 5. Add numero_matricula to alunos
ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS numero_matricula text;
ALTER TABLE public.alunos ADD CONSTRAINT alunos_numero_matricula_unique UNIQUE (numero_matricula);

-- 6. Function to generate student enrollment number
CREATE OR REPLACE FUNCTION public.gerar_numero_matricula(aluno_id uuid, p_escola_id uuid, p_data_matricula date)
RETURNS text AS $$
DECLARE
  v_ano text;
  v_escola_codigo int;
  v_escola_codigo_str text;
  v_sequencial int;
  v_numero_matricula text;
BEGIN
  -- 1. Extract the year
  v_ano := to_char(COALESCE(p_data_matricula, CURRENT_DATE), 'YYYY');

  -- 2. Get school code
  SELECT codigo INTO v_escola_codigo FROM public.escolas WHERE id = p_escola_id;
  IF v_escola_codigo IS NULL THEN
    RAISE EXCEPTION 'Escola sem código numérico atribuído.';
  END IF;
  
  v_escola_codigo_str := lpad(v_escola_codigo::text, 2, '0');

  -- 3. Calculate sequential number for that year in that school.
  -- We look at MAX of the last 3 digits of those numbers and add 1.
  -- This is concurrent-safe within a database transaction.
  SELECT COALESCE(MAX(SUBSTRING(numero_matricula FROM 7 FOR 3)::integer), 0) + 1
  INTO v_sequencial
  FROM public.alunos
  WHERE numero_matricula LIKE (v_ano || v_escola_codigo_str || '%');

  -- 4. Check if sequence fits in 3 digits (1 to 999)
  IF v_sequencial > 999 THEN
    RAISE EXCEPTION 'Limite de 999 matrículas para esta escola no ano % atingido.', v_ano;
  END IF;

  v_numero_matricula := v_ano || v_escola_codigo_str || lpad(v_sequencial::text, 3, '0');

  RETURN v_numero_matricula;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger function for student enrollment number
CREATE OR REPLACE FUNCTION public.trigger_alunos_numero_matricula()
RETURNS TRIGGER AS $$
DECLARE
  v_data_matricula date;
BEGIN
  -- Only generate matricula if escola_id is not null AND numero_matricula is null
  IF NEW.escola_id IS NOT NULL AND NEW.numero_matricula IS NULL THEN
    -- Try to get date of matricula from dados_matricula JSON
    IF NEW.dados_matricula IS NOT NULL AND NEW.dados_matricula ? 'dataMatricula' AND (NEW.dados_matricula->>'dataMatricula') <> '' THEN
      BEGIN
        v_data_matricula := (NEW.dados_matricula->>'dataMatricula')::date;
      EXCEPTION WHEN OTHERS THEN
        v_data_matricula := CURRENT_DATE;
      END;
    ELSE
      v_data_matricula := CURRENT_DATE;
    END IF;

    NEW.numero_matricula := public.gerar_numero_matricula(NEW.id, NEW.escola_id, v_data_matricula);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_set_aluno_numero_matricula
BEFORE INSERT OR UPDATE ON public.alunos
FOR EACH ROW
EXECUTE FUNCTION public.trigger_alunos_numero_matricula();

-- 8. Run retrospective update on existing students
UPDATE public.alunos SET numero_matricula = NULL WHERE escola_id IS NOT NULL;
