-- Migration: Criar auditoria automática de assinaturas digitais por trigger
CREATE OR REPLACE FUNCTION public.log_aluno_signature_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_dm JSONB;
  new_dm JSONB;
  old_resp_url TEXT;
  new_resp_url TEXT;
  old_func_url TEXT;
  new_func_url TEXT;
  client_ip TEXT;
  user_agent TEXT;
  user_id UUID;
  user_name TEXT;
  user_email TEXT;
  user_cargo TEXT;
  student_name TEXT;
  sig_action TEXT;
BEGIN
  -- Definir payloads antigos e novos baseados na operação
  IF TG_OP = 'INSERT' THEN
    old_dm := '{}'::jsonb;
  ELSE
    old_dm := COALESCE(OLD.dados_matricula::jsonb, '{}'::jsonb);
  END IF;
  new_dm := COALESCE(NEW.dados_matricula::jsonb, '{}'::jsonb);

  old_resp_url := old_dm->>'assinatura_responsavel_url';
  new_resp_url := new_dm->>'assinatura_responsavel_url';
  old_func_url := old_dm->>'assinatura_funcionario_url';
  new_func_url := new_dm->>'assinatura_funcionario_url';

  -- Capturar cabeçalhos HTTP da requisição (PostgREST)
  BEGIN
    client_ip := (current_setting('request.headers', true)::json->>'x-forwarded-for');
    user_agent := (current_setting('request.headers', true)::json->>'user-agent');
  EXCEPTION WHEN OTHERS THEN
    client_ip := NULL;
    user_agent := NULL;
  END;

  -- Obter informações do usuário conectado (se logado)
  user_id := auth.uid();
  IF user_id IS NOT NULL THEN
    SELECT nome, email, 'Funcionário'
    INTO user_name, user_email, user_cargo
    FROM public.funcionarios
    WHERE auth_user_id = user_id;

    -- Fallback se o usuário não constar na tabela de funcionários (ex: superadmin ROOT)
    IF user_name IS NULL THEN
      user_name := 'Admin/Sistema';
      user_email := COALESCE(nullif(current_setting('request.jwt.claim.email', true), ''), 'admin@sig.gov');
      user_cargo := 'Superadmin';
    END IF;
  ELSE
    user_name := 'Responsável (Celular)';
    user_email := NEW.nome_mae; -- Fallback para nome da mãe do aluno
    user_cargo := 'Responsável Legal';
  END IF;

  student_name := NEW.nome;

  -- 1. Auditar alteração de Assinatura do Responsável
  IF (new_resp_url IS DISTINCT FROM old_resp_url) THEN
    sig_action := CASE WHEN new_resp_url IS NULL THEN 'DELETE' ELSE 'UPDATE' END;
    INSERT INTO public.audit_logs (
      tenant_id,
      user_id,
      user_name,
      user_email,
      user_cargo,
      action,
      entity,
      entity_id,
      old_data,
      new_data,
      ip_address
    ) VALUES (
      NEW.escola_id,
      user_id,
      user_name,
      user_email,
      user_cargo,
      sig_action,
      'alunos_assinatura_responsavel',
      NEW.id,
      jsonb_build_object('url', old_resp_url, 'student_name', student_name),
      jsonb_build_object('url', new_resp_url, 'student_name', student_name, 'user_agent', user_agent),
      client_ip
    );
  END IF;

  -- 2. Auditar alteração de Assinatura do Funcionário
  IF (new_func_url IS DISTINCT FROM old_func_url) THEN
    sig_action := CASE WHEN new_func_url IS NULL THEN 'DELETE' ELSE 'UPDATE' END;
    INSERT INTO public.audit_logs (
      tenant_id,
      user_id,
      user_name,
      user_email,
      user_cargo,
      action,
      entity,
      entity_id,
      old_data,
      new_data,
      ip_address
    ) VALUES (
      NEW.escola_id,
      user_id,
      user_name,
      user_email,
      user_cargo,
      sig_action,
      'alunos_assinatura_funcionario',
      NEW.id,
      jsonb_build_object('url', old_func_url, 'student_name', student_name),
      jsonb_build_object('url', new_func_url, 'student_name', student_name, 'user_agent', user_agent),
      client_ip
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Ativar a trigger na tabela alunos
DROP TRIGGER IF EXISTS trigger_log_aluno_signature_update ON public.alunos;
CREATE TRIGGER trigger_log_aluno_signature_update
AFTER INSERT OR UPDATE ON public.alunos
FOR EACH ROW
EXECUTE FUNCTION public.log_aluno_signature_update();
