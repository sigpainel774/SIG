-- Criação da tabela de logs de sistema (Erros Automáticos)
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    context TEXT NOT NULL,
    message TEXT NOT NULL,
    error_code TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policy: SuperAdmins podem ler, atualizar (marcar como resolvido) e deletar
CREATE POLICY "SuperAdmins gerenciam system_logs" ON public.system_logs
    FOR ALL
    USING (
      auth.uid() IN (SELECT funcionario_id FROM public.acessos_usuarios WHERE nivel = 0)
    );

-- Policy: Inserção liberada para todos (anon e authenticated)
-- Isso é crucial para capturar erros 401 de usuários deslogados (ES-3)
CREATE POLICY "Qualquer um pode inserir system_logs" ON public.system_logs
    FOR INSERT 
    TO authenticated, anon
    WITH CHECK (true);
