-- Migration: Garantir no máximo 1 Diretor Ativo por Escola e sincronizar inativações

CREATE OR REPLACE FUNCTION public.check_diretor_unico_escola()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.diretor_id IS NOT NULL THEN
    IF OLD.diretor_id IS NOT NULL AND NEW.diretor_id != OLD.diretor_id THEN
      RAISE EXCEPTION 'A escola já possui um diretor ativo. Desvincule/inative o diretor atual antes de atribuir uma nova pessoa.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.escolas
      WHERE diretor_id = NEW.diretor_id
        AND id != NEW.id
        AND (deleted_at IS NULL)
    ) THEN
      RAISE EXCEPTION 'O funcionário selecionado já é o diretor ativo de outra unidade escolar.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_diretor_unico ON public.escolas;
CREATE TRIGGER trg_check_diretor_unico
  BEFORE INSERT OR UPDATE OF diretor_id ON public.escolas
  FOR EACH ROW
  EXECUTE FUNCTION public.check_diretor_unico_escola();

CREATE OR REPLACE FUNCTION public.clean_inactivated_diretor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'inativo' OR NEW.status = 'PAUSADO' OR NEW.deleted_at IS NOT NULL THEN
    UPDATE public.escolas
    SET diretor_id = NULL
    WHERE diretor_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_clean_inactivated_diretor ON public.funcionarios;
CREATE TRIGGER trg_clean_inactivated_diretor
  AFTER UPDATE OF status, deleted_at ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.clean_inactivated_diretor();
