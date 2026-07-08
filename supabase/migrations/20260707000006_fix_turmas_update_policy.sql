-- Adicionar políticas de UPDATE e DELETE em turmas

CREATE POLICY "turmas_update"
ON public.turmas FOR UPDATE USING (
  public.tem_acesso_a_escola(escola_id) AND (
    public.is_admin_global()
    OR EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid() AND au.nivel <= 3 AND au.ativo = true
    )
  )
);

CREATE POLICY "turmas_delete"
ON public.turmas FOR DELETE USING (
  public.tem_acesso_a_escola(escola_id) AND (
    public.is_admin_global()
    OR EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid() AND au.nivel <= 3 AND au.ativo = true
    )
  )
);
