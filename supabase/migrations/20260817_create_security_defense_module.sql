-- Migration: 20260817_create_security_defense_module.sql
-- Propósito: Criação das tabelas de Defesa Cibernética, WAF, Logs de Ameaças, Blacklist de IPs e Configurações

-- 1. Tabela de Logs de Tentativas de Violação e Ameaças
CREATE TABLE IF NOT EXISTS public.security_threat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_ataque TEXT NOT NULL, -- 'SQL_INJECTION', 'BRUTE_FORCE', 'XSS', 'PATH_TRAVERSAL', 'SCANNER_BOT', 'TOKEN_TAMPERING', 'RATE_LIMIT_ABUSE', 'PROBING'
    severidade TEXT NOT NULL DEFAULT 'MEDIA', -- 'BAIXA', 'MEDIA', 'ALTA', 'CRITICA'
    status TEXT NOT NULL DEFAULT 'BLOQUEADO', -- 'BLOQUEADO', 'DETECTADO', 'MITIGADO', 'INVESTIGANDO'
    ip_origem TEXT NOT NULL,
    pais TEXT,
    cidade TEXT,
    user_agent TEXT,
    rota_alvo TEXT NOT NULL,
    metodo_http TEXT NOT NULL DEFAULT 'GET',
    payload_detectado TEXT,
    headers_snapshot JSONB DEFAULT '{}'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email_tentativa TEXT,
    detalhes_analise JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_threat_logs_created_at ON public.security_threat_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_logs_ip ON public.security_threat_logs (ip_origem);
CREATE INDEX IF NOT EXISTS idx_threat_logs_tipo ON public.security_threat_logs (tipo_ataque);
CREATE INDEX IF NOT EXISTS idx_threat_logs_severidade ON public.security_threat_logs (severidade);

-- 2. Tabela de Regras e Bloqueios de IP (Blacklist / Whitelist)
CREATE TABLE IF NOT EXISTS public.security_ip_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT UNIQUE NOT NULL,
    tipo_regra TEXT NOT NULL DEFAULT 'BLOCK', -- 'BLOCK', 'ALLOW', 'WATCH'
    motivo TEXT NOT NULL,
    bloqueado_ate TIMESTAMP WITH TIME ZONE, -- NULL se for bloqueio permanente
    criado_por_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    criado_por_nome TEXT DEFAULT 'Sistema WAF Automático',
    ativo BOOLEAN NOT NULL DEFAULT true,
    total_bloqueios_executados INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_ip_rules_ip ON public.security_ip_rules (ip_address);
CREATE INDEX IF NOT EXISTS idx_security_ip_rules_ativo ON public.security_ip_rules (ativo);

-- 3. Tabela de Configurações do Módulo de Defesa
CREATE TABLE IF NOT EXISTS public.security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modo_operacao TEXT NOT NULL DEFAULT 'ATIVO', -- 'ATIVO' (bloqueia requisição) ou 'MONITORAMENTO' (apenas loga)
    bloqueio_automatico_bruteforce BOOLEAN NOT NULL DEFAULT true,
    limite_tentativas_login INTEGER NOT NULL DEFAULT 5,
    janela_tempo_minutos INTEGER NOT NULL DEFAULT 15,
    duracao_ban_minutos INTEGER NOT NULL DEFAULT 60,
    notificar_superadmins_alertas_criticos BOOLEAN NOT NULL DEFAULT true,
    whitelist_ips_padrao TEXT[] DEFAULT ARRAY['127.0.0.1', '::1']::text[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir configuração padrão inicial caso não exista
INSERT INTO public.security_settings (modo_operacao, limite_tentativas_login, janela_tempo_minutos, duracao_ban_minutos)
SELECT 'ATIVO', 5, 15, 60
WHERE NOT EXISTS (SELECT 1 FROM public.security_settings LIMIT 1);

-- 4. Habilitação de RLS e Políticas Seguras
ALTER TABLE public.security_threat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_ip_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Política de Inserção de Logs de Ameaça (Permitida para registro anônimo e autenticado pelo motor WAF)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_threat_logs' AND policyname = 'security_threat_logs_insert_policy'
    ) THEN
        CREATE POLICY "security_threat_logs_insert_policy" ON public.security_threat_logs
            FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_threat_logs' AND policyname = 'security_threat_logs_select_policy'
    ) THEN
        CREATE POLICY "security_threat_logs_select_policy" ON public.security_threat_logs
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.funcionarios f 
                    WHERE f.auth_user_id = auth.uid() 
                      AND f.is_superadmin = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_threat_logs' AND policyname = 'security_threat_logs_delete_policy'
    ) THEN
        CREATE POLICY "security_threat_logs_delete_policy" ON public.security_threat_logs
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.funcionarios f 
                    WHERE f.auth_user_id = auth.uid() 
                      AND f.is_superadmin = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_ip_rules' AND policyname = 'superadmin_security_ip_rules'
    ) THEN
        CREATE POLICY "superadmin_security_ip_rules" ON public.security_ip_rules
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.funcionarios f 
                    WHERE f.auth_user_id = auth.uid() 
                      AND f.is_superadmin = true
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'security_settings' AND policyname = 'superadmin_security_settings'
    ) THEN
        CREATE POLICY "superadmin_security_settings" ON public.security_settings
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.funcionarios f 
                    WHERE f.auth_user_id = auth.uid() 
                      AND f.is_superadmin = true
                )
            );
    END IF;
END $$;
