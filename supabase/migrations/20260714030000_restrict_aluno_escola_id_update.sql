CREATE OR REPLACE FUNCTION public.check_aluno_escola_id_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for um UPDATE e o escola_id estiver sendo alterado
  IF TG_OP = 'UPDATE' AND OLD.escola_id IS DISTINCT FROM NEW.escola_id THEN
    -- Permitir se o escola_id anterior for nulo (primeira definição)
    IF OLD.escola_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Verificar se existe uma transferência com status 'ACEITA' do aluno para a escola de destino correspondente
    IF NOT EXISTS (
      SELECT 1 FROM public.transferencias_alunos
      WHERE aluno_id = NEW.id
        AND escola_destino_id = NEW.escola_id
        AND status = 'ACEITA'
    ) THEN
      RAISE EXCEPTION 'A escola do aluno não pode ser alterada diretamente por edição de ficha. Utilize o processo de transferência de aluno.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_aluno_escola_id_change ON public.alunos;

CREATE TRIGGER trigger_check_aluno_escola_id_change
BEFORE UPDATE ON public.alunos
FOR EACH ROW
EXECUTE FUNCTION public.check_aluno_escola_id_change();
