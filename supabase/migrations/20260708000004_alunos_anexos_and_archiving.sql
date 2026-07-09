-- 1. Criar tabela de anexos dos alunos
CREATE TABLE IF NOT EXISTS public.alunos_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    arquivo_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    arquivado_por UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    motivo_arquivamento TEXT
);

-- 2. Habilitar RLS e criar política de dev
ALTER TABLE public.alunos_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_authenticated" ON public.alunos_anexos
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 3. Adicionar colunas de expurgo em arquivados
ALTER TABLE public.arquivados ADD COLUMN IF NOT EXISTS excluido_por UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL;
ALTER TABLE public.arquivados ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP WITH TIME ZONE;

-- 4. Registrar o bucket de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('alunos-anexos', 'alunos-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Criar políticas de leitura e escrita para o bucket no storage
CREATE POLICY "Acesso publico para leitura de alunos-anexos" ON storage.objects
    FOR SELECT USING (bucket_id = 'alunos-anexos');

CREATE POLICY "Acesso autenticado para insert de alunos-anexos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'alunos-anexos' AND auth.role() = 'authenticated');

CREATE POLICY "Acesso autenticado para update de alunos-anexos" ON storage.objects
    FOR UPDATE USING (bucket_id = 'alunos-anexos' AND auth.role() = 'authenticated');

CREATE POLICY "Acesso autenticado para delete de alunos-anexos" ON storage.objects
    FOR DELETE USING (bucket_id = 'alunos-anexos' AND auth.role() = 'authenticated');
