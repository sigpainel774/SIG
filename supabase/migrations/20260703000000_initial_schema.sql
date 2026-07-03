-- Milestone 0: Migration do banco de dados

-- Ativar extensões caso necessário (ex: uuid)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. `escolas` — `id` (PK), `nome`, `logo_url`, `plano`, `modulos_ativos`.
CREATE TABLE escolas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  logo_url TEXT,
  plano TEXT,
  modulos_ativos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. `orgaos` — `id` (PK), `nome`, `tipo`, `escola_id` (FK), `ativo`.
CREATE TABLE orgaos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. `funcionarios` — `id` (PK), `nome`, `email` (único), `auth_user_id` (FK → `auth.users.id`), `primeiro_acesso`, `is_superadmin`, `status`.
CREATE TABLE funcionarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  primeiro_acesso BOOLEAN DEFAULT true,
  is_superadmin BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'ativo',
  cargo TEXT, -- Adicionado para nível 5 usar
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. `vinculos_funcionarios` — lotação física: `funcionario_id` (FK), `escola_id` (FK).
CREATE TABLE vinculos_funcionarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(funcionario_id, escola_id)
);

-- 5. `acessos_usuarios` — controle RBAC/ABAC: `id`, `funcionario_id` (FK), `orgao_id` (FK → `orgaos.id`), `nivel` (1–6), `ativo`, `cargos_gerenciados` (`text[]`, só Nível 5), `pode_mural`, `pode_turmas`, `pode_funcionarios`, `pode_matriculas`, `pode_alunos`, `pode_ocorrencias`, `pode_atestados`.
CREATE TABLE acessos_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  orgao_id UUID REFERENCES orgaos(id) ON DELETE CASCADE,
  nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 6),
  ativo BOOLEAN DEFAULT true,
  cargos_gerenciados TEXT[], -- Nível 5
  pode_mural BOOLEAN DEFAULT false,
  pode_turmas BOOLEAN DEFAULT false,
  pode_funcionarios BOOLEAN DEFAULT false,
  pode_matriculas BOOLEAN DEFAULT false,
  pode_alunos BOOLEAN DEFAULT false,
  pode_ocorrencias BOOLEAN DEFAULT false,
  pode_atestados BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. `alunos` — `id`, `nome`, `foto_url`, `escola_id` (FK).
CREATE TABLE alunos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  foto_url TEXT,
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. `turmas` — `id`, `escola_id` (FK), `nome`, `ano_letivo`.
CREATE TABLE turmas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL,
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. `pontos_ronda` — `id`, `funcionario_id` (FK), `escola_id` (FK), `localizacao` (`jsonb`, `{latitude, longitude}` — **nunca colunas soltas**).
CREATE TABLE pontos_ronda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  escola_id UUID REFERENCES escolas(id) ON DELETE CASCADE,
  localizacao JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. `blocked_ips` — `ip_address` (PK), `blocked_until`, `reason`.
CREATE TABLE blocked_ips (
  ip_address TEXT PRIMARY KEY,
  blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT
);

-- 10. `access_logs` — `id`, `email`, `evento`, `ip_address`, `user_agent`, `detalhes` (`jsonb`).
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  evento TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgaos ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinculos_funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE acessos_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pontos_ronda ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- FUNÇÃO AUXILIAR: tem_acesso_a_escola
CREATE OR REPLACE FUNCTION public.tem_acesso_a_escola(escola_alvo UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM acessos_usuarios au
    JOIN funcionarios f ON f.id = au.funcionario_id
    JOIN orgaos o ON o.id = au.orgao_id
    WHERE f.auth_user_id = auth.uid()
      AND au.ativo = true
      AND o.escola_id = escola_alvo
  );
$$;

-- RLS: escolas
CREATE POLICY "select_escolas_permitidas"
ON escolas FOR SELECT
USING ( public.tem_acesso_a_escola(id) );

-- RLS: alunos
CREATE POLICY "select_alunos_por_escola"
ON alunos FOR SELECT
USING ( public.tem_acesso_a_escola(escola_id) );

CREATE POLICY "insert_update_alunos_com_permissao"
ON alunos FOR INSERT WITH CHECK (
  public.tem_acesso_a_escola(escola_id)
  AND EXISTS (
    SELECT 1 FROM acessos_usuarios au
    JOIN funcionarios f ON f.id = au.funcionario_id
    WHERE f.auth_user_id = auth.uid()
      AND au.ativo = true
      AND au.pode_alunos = true
  )
);

CREATE POLICY "update_alunos_com_permissao"
ON alunos FOR UPDATE USING (
  public.tem_acesso_a_escola(escola_id)
  AND EXISTS (
    SELECT 1 FROM acessos_usuarios au
    JOIN funcionarios f ON f.id = au.funcionario_id
    WHERE f.auth_user_id = auth.uid()
      AND au.ativo = true
      AND au.pode_alunos = true
  )
);

-- RLS: turmas (Nível 4)
CREATE POLICY "select_turmas_professor_lotado"
ON turmas FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM vinculos_funcionarios vf
    JOIN funcionarios f ON f.id = vf.funcionario_id
    WHERE f.auth_user_id = auth.uid()
      AND vf.escola_id = turmas.escola_id
  )
  AND public.tem_acesso_a_escola(turmas.escola_id)
);

-- RLS: pontos_ronda (Nível 6)
CREATE POLICY "insert_proprio_ponto"
ON pontos_ronda FOR INSERT WITH CHECK (
  funcionario_id = (
    SELECT id FROM funcionarios WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "select_proprio_ponto"
ON pontos_ronda FOR SELECT
USING (
  funcionario_id = (
    SELECT id FROM funcionarios WHERE auth_user_id = auth.uid()
  )
);

-- RLS: funcionarios (Nível 5 - chefe vê cargos gerenciados)
CREATE POLICY "chefe_ve_apenas_cargos_gerenciados"
ON funcionarios FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM acessos_usuarios au_chefe
    JOIN funcionarios chefe ON chefe.id = au_chefe.funcionario_id
    JOIN acessos_usuarios au_alvo ON au_alvo.funcionario_id = funcionarios.id
    WHERE chefe.auth_user_id = auth.uid()
      AND au_chefe.nivel = 5
      AND au_chefe.cargos_gerenciados && array[funcionarios.cargo]
  )
);
