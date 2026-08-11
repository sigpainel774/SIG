-- Migration: 20260811000000_add_permissao_rh_rede.sql
-- Propósito: Adicionar a permissão 'pode_rh_rede' na tabela public.acessos_usuarios para suporte ao perfil 'RH/ Servidores da rede'

ALTER TABLE public.acessos_usuarios 
ADD COLUMN IF NOT EXISTS pode_rh_rede boolean DEFAULT false;

-- Atualizar política RLS para consulta de funcionários por usuários RH da Rede
DROP POLICY IF EXISTS "rh_rede_select_funcionarios" ON public.funcionarios;
CREATE POLICY "rh_rede_select_funcionarios" ON public.funcionarios
FOR SELECT USING (
  auth.role() = 'authenticated' AND (
    EXISTS (
      SELECT 1 FROM public.acessos_usuarios au 
      WHERE au.funcionario_id = public.funcionarios.id 
        AND (au.nivel = 1 OR au.pode_rh_rede = true)
        AND au.ativo = true
    )
  )
);
