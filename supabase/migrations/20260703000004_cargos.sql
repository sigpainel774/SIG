-- Criação da tabela de cargos
CREATE TABLE IF NOT EXISTS public.cargos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  nivel_acesso integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;

-- Políticas para cargos
CREATE POLICY "Leitura de cargos para todos os autenticados" 
ON public.cargos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Gerenciamento de cargos apenas para superadmins" 
ON public.cargos FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE auth_user_id = auth.uid() AND is_superadmin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE auth_user_id = auth.uid() AND is_superadmin = true
  )
);

-- Políticas adicionais de Storage para logos-escolas e fotos-alunos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Acesso autenticado para update de documentos'
  ) THEN
    CREATE POLICY "Acesso autenticado para update de documentos" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id IN ('fotos-alunos', 'logos-escolas', 'documentos') AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Acesso autenticado para delete de documentos'
  ) THEN
    CREATE POLICY "Acesso autenticado para delete de documentos" 
    ON storage.objects FOR DELETE 
    USING (bucket_id IN ('fotos-alunos', 'logos-escolas', 'documentos') AND auth.role() = 'authenticated');
  END IF;
END $$;
