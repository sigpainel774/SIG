-- Migration: Sincronização Automática de Permissão de Diretor Escolar
-- Ao definir o cargo de um funcionário como 'Diretor Escolar' em uma lotação ativa,
-- cria automaticamente a permissão correspondente em acessos_usuarios.

CREATE OR REPLACE FUNCTION public.sincronizar_permissao_diretor()
RETURNS trigger AS $$
BEGIN
  -- 1. Se o vínculo foi ativado ou o cargo mudou para 'Diretor Escolar'
  IF (TG_OP = 'INSERT' AND NEW.ativo = true AND NEW.cargo ILIKE 'Diretor Escolar') OR
     (TG_OP = 'UPDATE' AND NEW.ativo = true AND NEW.cargo ILIKE 'Diretor Escolar' AND 
      (OLD.ativo = false OR OLD.cargo IS DISTINCT FROM NEW.cargo)) THEN
      
      -- Verifica se já existe um registro em acessos_usuarios para este funcionário nesta escola
      IF NOT EXISTS (
        SELECT 1 FROM public.acessos_usuarios
        WHERE funcionario_id = NEW.funcionario_id
          AND escola_id = NEW.escola_id
      ) THEN
        INSERT INTO public.acessos_usuarios (
          funcionario_id,
          escola_id,
          nivel,
          ativo,
          pode_mural,
          pode_turmas,
          pode_funcionarios,
          pode_matriculas,
          pode_alunos,
          pode_ocorrencias,
          pode_atestados
        ) VALUES (
          NEW.funcionario_id,
          NEW.escola_id,
          2, -- Nível 2 - Diretor
          true,
          true, -- pode_mural
          true, -- pode_turmas
          true, -- pode_funcionarios
          true, -- pode_matriculas
          true, -- pode_alunos
          true, -- pode_ocorrencias
          true  -- pode_atestados
        );
      ELSE
        -- Se já existia uma permissão (ativa ou inativa), garantimos que está ativa
        UPDATE public.acessos_usuarios
        SET ativo = true,
            nivel = 2
        WHERE funcionario_id = NEW.funcionario_id
          AND escola_id = NEW.escola_id;
      END IF;
  
  -- 2. Se o vínculo foi desativado, o cargo mudou, ou o vínculo foi deletado
  ELSIF (TG_OP = 'UPDATE' AND (OLD.ativo = true AND OLD.cargo ILIKE 'Diretor Escolar') AND 
        (NEW.ativo = false OR NEW.cargo NOT ILIKE 'Diretor Escolar' OR NEW.cargo IS NULL)) THEN
      
      -- Desativa o acesso nível 2 correspondente àquela escola
      UPDATE public.acessos_usuarios
      SET ativo = false
      WHERE funcionario_id = OLD.funcionario_id
        AND escola_id = OLD.escola_id
        AND nivel = 2;

  ELSIF (TG_OP = 'DELETE' AND OLD.ativo = true AND OLD.cargo ILIKE 'Diretor Escolar') THEN
      -- Desativa o acesso nível 2 correspondente àquela escola ao deletar
      UPDATE public.acessos_usuarios
      SET ativo = false
      WHERE funcionario_id = OLD.funcionario_id
        AND escola_id = OLD.escola_id
        AND nivel = 2;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar o Trigger associado
DROP TRIGGER IF EXISTS trg_sincronizar_permissao_diretor ON public.vinculos_funcionarios;
CREATE TRIGGER trg_sincronizar_permissao_diretor
AFTER INSERT OR UPDATE OR DELETE ON public.vinculos_funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_permissao_diretor();
