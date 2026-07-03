-- Migration 3: Trigger automática para novos usuários de Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_func_id UUID;
BEGIN
  INSERT INTO public.funcionarios (nome, email, auth_user_id, status, is_superadmin)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    new.id,
    'ativo',
    false
  )
  ON CONFLICT (email) DO UPDATE SET auth_user_id = new.id
  RETURNING id INTO new_func_id;

  IF new_func_id IS NOT NULL THEN
    INSERT INTO public.acessos_usuarios (funcionario_id, nivel, ativo)
    VALUES (new_func_id, 4, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
