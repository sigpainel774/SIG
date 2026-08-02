-- Migration: Sincronizar is_superadmin → JWT app_metadata (raw_app_meta_data)
-- Executada automaticamente via trigger sempre que o campo is_superadmin ou auth_user_id mudar.

-- 1. Função que atualiza raw_app_meta_data no auth.users
CREATE OR REPLACE FUNCTION public.sync_superadmin_jwt_claim()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só sincroniza se o funcionário já tiver um auth_user_id vinculado
  IF NEW.auth_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET raw_app_meta_data =
      coalesce(raw_app_meta_data, '{}'::jsonb) ||
      jsonb_build_object('is_superadmin', COALESCE(NEW.is_superadmin, false))
    WHERE id = NEW.auth_user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Trigger que dispara após INSERT ou UPDATE relevante em funcionarios
DROP TRIGGER IF EXISTS trg_sync_superadmin_claim ON public.funcionarios;
CREATE TRIGGER trg_sync_superadmin_claim
AFTER INSERT OR UPDATE OF is_superadmin, auth_user_id
ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.sync_superadmin_jwt_claim();

-- 3. Backfill: sincroniza todos os funcionários existentes que já têm auth_user_id
-- Isso dispara a trigger para cada linha existente.
UPDATE public.funcionarios
SET is_superadmin = is_superadmin
WHERE auth_user_id IS NOT NULL;
