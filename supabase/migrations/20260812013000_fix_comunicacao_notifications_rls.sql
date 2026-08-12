-- Migration: 20260812013000_fix_comunicacao_notifications_rls.sql
-- Propósito: Liberar o envio de notificações in-app para todos os usuários autenticados e permitir que gestores com permissão pode_mural / mensagens globais possam publicar no mural de comunicados.

-- 1. NOTIFICAÇÕES: Adicionar política de INSERT para usuários autenticados
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public.notifications;
CREATE POLICY "notifications_insert_authenticated" ON public.notifications 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- 2. COMUNICADOS: Função auxiliar de segurança para validação de publicação sem recursão RLS
CREATE OR REPLACE FUNCTION public.pode_publicar_comunicado(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Superadmin raiz tem permissão nativa
  IF EXISTS (
    SELECT 1 FROM public.funcionarios f 
    WHERE f.auth_user_id = p_user_id AND f.is_superadmin = true
  ) THEN
    RETURN true;
  END IF;

  -- 2. Funcionário com atributo pode_mural ou permitir_mensagens_globais
  RETURN EXISTS (
    SELECT 1 
    FROM public.acessos_usuarios au
    JOIN public.funcionarios f ON f.id = au.funcionario_id
    WHERE f.auth_user_id = p_user_id
      AND f.deleted_at IS NULL
      AND (
        COALESCE(au.pode_mural, false) = true 
        OR COALESCE(f.permitir_mensagens_globais, false) = true
      )
  );
END;
$$;

-- Atualizar política RLS de escrita na tabela comunicados
DROP POLICY IF EXISTS "comunicados_abac_write" ON public.comunicados;
CREATE POLICY "comunicados_abac_write" ON public.comunicados 
  FOR ALL 
  USING (
    is_admin_global() OR public.pode_publicar_comunicado(auth.uid())
  ) 
  WITH CHECK (
    is_admin_global() OR public.pode_publicar_comunicado(auth.uid())
  );
