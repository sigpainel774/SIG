# Planos Futuros & Status de Implementação

Este arquivo armazena planos de implementação, ideias e melhorias estruturados para execução futura.
Atualizado automaticamente com o status real do repositório.

**Última atualização:** 2026-07-18

---

## 🗺️ Painel de Status Geral

| Plano | Status | Observação |
|-------|--------|------------|
| Integração Resend + Primeiro Acesso | ⏳ Pendente | Plano elaborado e salvo — código não iniciado; configuração SMTP é manual no Supabase |
| Portal do Aluno / Responsáveis | ⏳ Pendente | Plano aprovado e salvo — nenhum arquivo criado no repositório ainda |
| Otimização `/configuracoes` (40KB → 8-12KB) | 🔍 Diagnóstico Pronto | 8 erros silenciosos identificados — **aguardando aprovação do usuário para execução** |
| Tabs Geolocalização (Funcionários + Alunos) | ✅ Implementado | Sessão 2026-07-18 — `MapaAlunos.tsx` criado, `MapWrapper` e `relatorios/page.tsx` modificados |
| Otimização Página de Ajuda | ✅ Implementado | Sessão 2026-07-18 — 8 gargalos + 7 erros silenciosos corrigidos |
| Skill `otimizador` | ✅ Implementado | Sessão 2026-07-18 — skill criada em `.agents/skills/otimizador/` |

---

## 📌 Integração do Resend + Troca Obrigatória de Senha (Primeiro Acesso)

> **Status:** ⏳ Pendente — Código não iniciado  
> **Planejado em:** 2026-07-18  
> **Pré-requisitos de código:** `[NEW] src/app/api/auth/complete-first-access/route.ts` · `[NEW] src/components/modals/first-access-modal.tsx` · `[MODIFY] src/app/(dashboard)/layout.tsx`  
> **Pré-requisito do usuário:** Configuração manual do SMTP no painel Supabase (ver Passo 1 abaixo)

### Checklist de Execução
- [ ] Usuário configura SMTP com Resend no painel do Supabase
- [ ] Usuário executa SQL de isenção dos usuários atuais (`primeiro_acesso = false`)
- [ ] Criar Route Handler `complete-first-access`
- [ ] Criar modal `first-access-modal.tsx` (bloqueante, sem botão fechar)
- [ ] Integrar interceptação no `layout.tsx` do dashboard
- [ ] Verificar com `npx tsc --noEmit`

---

### 1. Integração do Resend (SMTP no Supabase)

Para direcionar os disparos de e-mail do Supabase através do Resend:

#### Passos de Configuração (Manual pelo Usuário):
1. **Criar conta no Resend**: Acessar [resend.com](https://resend.com) e criar uma conta gratuita.
2. **Adicionar e Verificar Domínio**: No painel do Resend, adicionar o domínio próprio da aplicação e configurar os registros DNS (SPF, DKIM, TXT) no provedor de domínio (ex: Registro.br, Cloudflare).
3. **Gerar API Key**: No Resend, gerar uma nova API Key com permissão de envio.
4. **Configurar no Supabase**: Acessar o Dashboard do Supabase -> *Project Settings* -> *Auth* -> *SMTP Settings*:
   - **Sender email**: `noreply@seu-dominio.com.br` (ou o remetente verificado no Resend)
   - **Sender name**: Nome do seu sistema (ex: `SIG - Portal Escolar`)
   - **SMTP Host**: `smtp.resend.com`
   - **SMTP Port**: `465` (SSL) ou `587` (TLS)
   - **SMTP Username**: `resend`
   - **SMTP Password**: A API Key gerada no Resend

---

### 2. Isenção dos Usuários Atuais

Para garantir que os usuários atuais **não** vejam o modal de alteração de senha:

#### Comando SQL (Executar no SQL Editor do Supabase)
Definiremos a coluna `primeiro_acesso` de todos os funcionários atuais como `false`.
```sql
UPDATE public.funcionarios
SET primeiro_acesso = false;
```
*Novos funcionários criados futuramente herdarão o default `true` definido na estrutura da tabela.*

---

### 3. Fluxo de Troca de Senha Obrigatória no Primeiro Acesso

#### Comportamento Esperado:
1. Quando um novo usuário fizer login, a aplicação carregará os dados do funcionário vinculado (`public.funcionarios`).
2. Se `primeiro_acesso` for `true`, a aplicação exibirá um modal interceptor (bloqueante) exigindo a alteração de senha.
3. O modal **não** terá botão de fechar (`X`), nem fechará ao clicar fora. A única saída será definir uma nova senha válida.
4. Ao submeter a nova senha com sucesso (via Supabase Auth API), atualizaremos a coluna `primeiro_acesso` para `false` na tabela `public.funcionarios` para o funcionário logado.

---

### 4. Varredura de Erros Silenciosos e Mitigações

Identificamos os seguintes riscos de erros lógicos, segurança ou UX (edge cases) e suas respectivas soluções preventivas:

#### A. Bypass de Modal via Inspecionar Elemento (Inspect Element / F12)
*   **Risco Silencioso:** Um usuário malicioso ou curioso pode abrir o console do navegador, inspecionar o modal do Shadcn e deletá-lo do DOM (ou alterar o CSS `display: none` / `pointer-events`) para navegar pelo dashboard sem trocar a senha padrão.
*   **Mitigação:** 
    1. A verificação de `primeiro_acesso` também será validada em nível de layout principal (`layout.tsx`). Se `primeiro_acesso === true`, não apenas o modal será renderizado, mas todo o conteúdo da dashboard abaixo dele ficará oculto/não renderizado na árvore do React (`{primeiroAcesso ? <FirstAccessModal /> : <DashboardContent />}`). Assim, mesmo excluindo o modal via F12, o usuário só verá uma tela cinza vazia e sem dados.

#### B. Falha de Permissão RLS ao Atualizar `primeiro_acesso`
*   **Risco Silencioso:** Se a RLS da tabela `funcionarios` estiver configurada para impedir atualizações por usuários de nível básico (ou apenas para RH/Admin), a tentativa do usuário logado de atualizar seu próprio campo `primeiro_acesso` falhará com erro `42501` (permissão negada) ou de forma silenciosa, fazendo com que ele fique preso no loop do modal.
*   **Mitigação:** Criaremos um Endpoint de API / Route Handler dedicado em `src/app/api/auth/complete-first-access/route.ts` que utiliza o `supabaseAdmin` (cliente com bypass de RLS via Service Role) para realizar essa atualização com segurança. O endpoint validará primeiro se a sessão do usuário é legítima e se o ID bate com o dele antes de realizar o update no banco.

#### C. Recarregamento de Página ou Abas em Paralelo
*   **Risco Silencioso:** Se o usuário abrir o sistema em duas abas do navegador ao mesmo tempo, trocar a senha na Aba A (o que define `primeiro_acesso = false`), mas a Aba B continuar aberta exibindo o modal interceptor.
*   **Mitigação:** O modal utilizará o estado de sincronização global ou fará uma validação rápida do status no estado do Zustand. No entanto, recarregar a página resolve instantaneamente. Também podemos escutar mudanças no localStorage ou recarregar os dados do perfil quando o componente focar novamente.

---

### 5. Arquivos Propostos a Alterar/Criar

- **[NEW] Route Handler:** `src/app/api/auth/complete-first-access/route.ts`
- **[NEW] Modal Component:** `src/components/modals/first-access-modal.tsx`
- **[MODIFY] Layout:** `src/app/(dashboard)/layout.tsx` (integração e interceptação)

---

## 📌 Portal do Aluno / Responsáveis

> **Status:** ⏳ Pendente — Nenhum arquivo criado no repositório  
> **Planejado em:** 2026-07-18  
> **Confirmado ausente:** `portal-aluno/`, `responsaveis/`, `ModalCadastroResponsavel`, Edge Functions `criar-responsavel` e `reset-senha-responsavel`  
> **Tabelas de banco pendentes:** `public.responsaveis`, `public.responsaveis_alunos`, `public.responsavel_audit_log`

### Checklist de Execução
- [ ] Criar tabelas no Supabase (SQL na seção "Camada de Banco de Dados" abaixo)
- [ ] Aplicar RLS em todas as tabelas novas
- [ ] Criar Edge Function `criar-responsavel`
- [ ] Criar Edge Function `reset-senha-responsavel`
- [ ] Criar rotas Next.js: `portal-aluno/login`, `trocar-senha`, `dashboard`, `dashboard/[alunoId]`
- [ ] Criar `ModalCadastroResponsavel.tsx`
- [ ] Atualizar `proxy.ts` com proteção das rotas do portal
- [ ] Verificar isolamento staff vs. portal (sem cross-access)
- [ ] Executar plano de verificação (9 cenários documentados abaixo)

> **Nota de versão:** Este plano substitui a versão anterior baseada em login CPF+OTP. O modelo de autenticação foi redesenhado para cadastro 100% presencial na secretaria, com login por email + senha via Supabase Auth.

### Infraestrutura

- **Front-end & Roteamento:** Next.js 16 (App Router) com TypeScript.
- **Segurança de Rotas:** `src/proxy.ts` (convenção do projeto).
- **Estilização:** Tailwind CSS + shadcn/ui + lucide-react. Tema escuro denso (#141416).
- **Banco de Dados:** Supabase (PostgreSQL) com RLS habilitado.
- **Estado:** Zustand (`useAuthStore`).

---

### Estratégia de Acesso

- **Modelo:** Cadastro presencial pela secretaria + login por email/senha.
- Não há self-signup. A conta é criada por um funcionário (nível 2 ou 3) dentro do painel admin.
- O responsável recebe uma **senha temporária** gerada na hora, repassada verbalmente pela secretaria.
- No primeiro login, é obrigado a trocar a senha (`must_change_password = true`).
- **Esqueci minha senha:** Fluxo padrão via `resetPasswordForEmail` do Supabase (e-mail validado no cadastro).
- **Reset por perda de e-mail:** Feito presencialmente pelo Diretor (nível 2), com log de auditoria.

---

### Fluxo de Cadastro — "Modal Responsável 1"

1. Secretaria abre o modal e digita o CPF do responsável.
2. Sistema consulta `public.responsaveis` pelo CPF:
   - Se **já existir**: carrega os dados (evita duplicar responsável com outro filho).
   - Se **não existir**: exibe campos para nome, email e telefone.
3. Campo de busca de aluno(s) — multi-select, permite associar 1 ou mais matrículas.
4. Ao salvar:
   - Cria o registro em `public.responsaveis` (se novo).
   - Cria o usuário em `auth.users` via Edge Function (service role) com senha temporária.
   - Insere as linhas de vínculo em `public.responsaveis_alunos`.
   - Grava evento em `public.responsavel_audit_log`.
   - Retorna a senha temporária **uma única vez** para exibição na tela da secretaria.

### Fluxo — "Adicionar segundo responsável"

- Mesmo modal, mas com `alunosPrePopulados` contendo os aluno_ids do primeiro responsável.
- A secretaria pode desmarcar algum aluno antes de salvar.
- Roda a mesma checagem de CPF existente.
- Não é implementado como vínculo rígido no banco (`grupo_familiar_id`) — é um atalho de UI.

---

### Camada de Banco de Dados

#### [NEW] `public.responsaveis`
```sql
CREATE TABLE public.responsaveis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id uuid REFERENCES auth.users(id),
    cpf text NOT NULL UNIQUE,
    nome text NOT NULL,
    email text NOT NULL,
    telefone text,
    must_change_password boolean DEFAULT true,
    criado_por uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
```

#### [NEW] `public.responsaveis_alunos`
```sql
CREATE TABLE public.responsaveis_alunos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    responsavel_id uuid NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
    aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
    parentesco text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(responsavel_id, aluno_id)
);
ALTER TABLE public.responsaveis_alunos ENABLE ROW LEVEL SECURITY;
```

#### [NEW] `public.responsavel_audit_log`
```sql
CREATE TABLE public.responsavel_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    responsavel_id uuid REFERENCES public.responsaveis(id),
    acao text NOT NULL, -- 'criacao', 'add_segundo_responsavel', 'reset_senha', 'vinculo_aluno', 'remocao_vinculo'
    executado_por uuid REFERENCES auth.users(id),
    detalhes jsonb,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.responsavel_audit_log ENABLE ROW LEVEL SECURITY;
```

---

### RLS — Leitura pelo responsável autenticado

> ⚠️ **Atenção ao padrão do projeto:** As policies de escrita do staff NÃO devem usar `user_metadata.role`. O SIG usa a tabela `public.acessos_usuarios` com níveis numéricos (1=Admin, 2=Diretor, 3=Secretaria). Ver correções abaixo.

```sql
-- Responsável lê apenas seus próprios dados (sem risco de recursão)
CREATE POLICY "responsavel_read_proprio" ON public.responsaveis
  FOR SELECT USING (auth_user_id = auth.uid());

-- Responsável lê apenas seus vínculos
CREATE POLICY "responsavel_read_vinculos" ON public.responsaveis_alunos
  FOR SELECT USING (
    responsavel_id IN (
      SELECT id FROM public.responsaveis WHERE auth_user_id = auth.uid()
    )
  );

-- Leitura de notas pelo responsável
CREATE POLICY "pais_read_notas" ON public.notas
  FOR SELECT USING (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );

-- Leitura de frequências pelo responsável
CREATE POLICY "pais_read_frequencias" ON public.frequencias
  FOR SELECT USING (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );

-- Leitura de ocorrências pelo responsável
CREATE POLICY "pais_read_ocorrencias" ON public.ocorrencias
  FOR SELECT USING (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );

-- UPDATE do campo status_pais nas ocorrências (botão "Ciente")
CREATE POLICY "pais_update_ciente_ocorrencias" ON public.ocorrencias
  FOR UPDATE USING (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    aluno_id IN (
      SELECT ra.aluno_id FROM public.responsaveis_alunos ra
      JOIN public.responsaveis r ON r.id = ra.responsavel_id
      WHERE r.auth_user_id = auth.uid()
    )
  );
```

### RLS — Escrita restrita à secretaria/diretor (via `acessos_usuarios`)

```sql
-- ✅ CORRETO para o projeto SIG: usa acessos_usuarios com níveis numéricos
-- Nível 1 = Admin Global, Nível 2 = Diretor, Nível 3 = Secretaria/Coord.
CREATE POLICY "staff_manage_responsaveis" ON public.responsaveis
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid()
        AND au.ativo = true
        AND au.nivel IN (1, 2, 3)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid()
        AND au.ativo = true
        AND au.nivel IN (1, 2, 3)
    )
  );

CREATE POLICY "staff_manage_responsaveis_alunos" ON public.responsaveis_alunos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid()
        AND au.ativo = true
        AND au.nivel IN (1, 2, 3)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid()
        AND au.ativo = true
        AND au.nivel IN (1, 2, 3)
    )
  );

-- Somente Diretor (nível 2) ou Admin (nível 1) pode consultar o audit_log
CREATE POLICY "diretor_manage_audit_log" ON public.responsavel_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid()
        AND au.ativo = true
        AND au.nivel IN (1, 2)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.acessos_usuarios au
      JOIN public.funcionarios f ON f.id = au.funcionario_id
      WHERE f.auth_user_id = auth.uid()
        AND au.ativo = true
        AND au.nivel IN (1, 2)
    )
  );
```

> ⚠️ **Não incluir policies de desenvolvimento amplas** (`USING (auth.role() = 'authenticated')`) em nenhuma tabela deste módulo. Qualquer policy de teste/dev deve ser explicitamente removida antes do deploy em produção.

---

### Camada de Back-end (Edge Functions)

#### [NEW] `supabase/functions/criar-responsavel/index.ts`
- Recebe: CPF, nome, email, telefone, lista de `aluno_id`, parentesco.
- Valida dígito verificador do CPF (client-side e server-side).
- Verifica se CPF já existe em `responsaveis` (retorna dados existentes se sim).
- Verifica se email já existe em `auth.users` (retorna erro tratável no modal).
- Gera senha temporária aleatória (10 caracteres, sem ambiguidade tipo 0/O, 1/l).
- Usa `service_role` para chamar `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { must_change_password: true } })`.
- Insere em `responsaveis`, `responsaveis_alunos`, `responsavel_audit_log`.
- Retorna a senha temporária **uma única vez** na resposta.
- A senha **nunca** é logada em texto puro (nem em audit_log, nem em logs da Vercel).

#### [NEW] `supabase/functions/reset-senha-responsavel/index.ts`
- Restrita a chamadas autenticadas com nível 1 ou 2 (`acessos_usuarios`).
- Recebe `responsavel_id` e `motivo` do reset.
- Gera nova senha temporária, chama `supabase.auth.admin.updateUserById(userId, { password })`.
- Seta `user_metadata.must_change_password = true`.
- Grava em `responsavel_audit_log` (ação `reset_senha`, `executado_por`, `detalhes = motivo`).

---

### Camada de Roteamento e Telas (Next.js)

| Arquivo | Descrição |
|---|---|
| [NEW] `src/app/(admin)/responsaveis/page.tsx` | Lista de responsáveis cadastrados, busca por CPF/nome, botão "Novo responsável" |
| [NEW] `src/app/(admin)/responsaveis/components/ModalCadastroResponsavel.tsx` | Modal reutilizável (prop `alunosPrePopulados` opcional) |
| [NEW] `src/app/portal-aluno/login/page.tsx` | Tela de login do portal dos pais (email + senha) |
| [NEW] `src/app/portal-aluno/trocar-senha/page.tsx` | Troca de senha obrigatória no primeiro acesso |
| [NEW] `src/app/portal-aluno/dashboard/page.tsx` | Lista os filhos vinculados ao responsável autenticado |
| [NEW] `src/app/portal-aluno/dashboard/[alunoId]/page.tsx` | Visão detalhada com 3 abas: Notas / Frequência / Ocorrências |

**Aba Ocorrências:** inclui botão "Ciente" que atualiza `status_pais` com timestamp.
**Empty States obrigatórios** em todas as abas quando arrays retornarem vazios.
**Inputs de nota:** armazenar como `string` localmente durante digitação; converter para `number` apenas ao salvar.

---

### Camada de Segurança — `src/proxy.ts`

- Proteger `/portal-aluno/dashboard/**` exigindo sessão com registro em `public.responsaveis`.
- Proteger `/(admin)/responsaveis/**` exigindo `acessos_usuarios.nivel IN (1, 2, 3)`.
- Redirecionar para `/portal-aluno/trocar-senha` se `must_change_password = true`.
- Garantir que usuários do painel admin não acessem `/portal-aluno/**` e vice-versa.

---

### Decisões de Design (Já Definidas)

| Pendência | Decisão |
|---|---|
| Role do staff | Usar `public.acessos_usuarios` com níveis numéricos (padrão SIG). **Não usar `user_metadata.role`**. |
| Tempo de expiração de sessão | **7 dias** (padrão Supabase) — balanceado para uso mobile dos responsáveis. |
| Alteração de e-mail pós-cadastro | Apenas nível 1 (Admin) ou nível 2 (Diretor), presencialmente, com registro em `audit_log`. |

---

### Plano de Verificação

1. **Cadastro do Responsável 1:** cadastrar CPF novo, associar 2 alunos, confirmar criação em `auth.users`, `responsaveis` e `responsaveis_alunos`, e conferir entrada em `responsavel_audit_log`.
2. **CPF já existente:** tentar cadastrar CPF já cadastrado e confirmar carregamento dos dados existentes.
3. **Adicionar segundo responsável:** verificar que os alunos vêm pré-marcados; desmarcar um e confirmar que o vínculo não é criado.
4. **Login e troca obrigatória:** logar com senha temporária e confirmar redirecionamento forçado para `/portal-aluno/trocar-senha`.
5. **Esqueci minha senha:** testar `resetPasswordForEmail` com o e-mail cadastrado.
6. **Reset pelo Diretor:** simular perda de acesso ao e-mail, reset pelo diretor e verificar o log de auditoria.
7. **Isolamento entre filhos:** tentar acessar `[alunoId]` de aluno não vinculado via URL — deve retornar acesso negado.
8. **Isolamento staff vs. portal:** confirmar que staff não acessa `/portal-aluno/**` e vice-versa.
9. **RLS de escrita:** tentar inserir/editar `responsaveis` autenticado como responsável comum — confirmar bloqueio.

---

### Varredura de Erros Silenciosos

| Risco | Mitigação |
|---|---|
| Recursão infinita em RLS na tabela `responsaveis` | Policy de leitura usa `auth_user_id = auth.uid()` diretamente, sem subconsulta recursiva |
| Senha temporária exposta em logs | Edge Function nunca loga a senha; retorna apenas na resposta HTTP (única vez) |
| Bypass de `trocar-senha` via URL direta | `proxy.ts` bloqueia o acesso ao dashboard inteiro enquanto `must_change_password = true` |
| Empty state em branco nas abas | Implementar componente de Empty State explícito em todas as abas |
| Input de nota perdendo decimal | Estado local como `string`; conversão para `number` apenas no `onSave` |
| Aluno acessível via ID na URL por outro responsável | RLS na tabela `notas`/`frequencias`/`ocorrencias` bloqueia no banco; proxy valida o vínculo |

---

## 📌 Otimização da Página `/configuracoes` (40KB → 8–12KB)

> **Status:** 🔍 Diagnóstico Pronto — **Aguardando aprovação do usuário para execução**
> **Planejado em:** 2026-07-18
> **Problema identificado:** Render médio de **512ms** — `page.tsx` com 1.010 linhas / 40KB totalmente marcado como `'use client'`

### Checklist de Execução
- [ ] Converter `page.tsx` em Server Component (shell estático leve)
- [ ] Criar `ConfiguracoesClient.tsx` com `'use client'` (apenas parte interativa)
- [ ] Extrair `GradeCurricularTab.tsx` como componente separado
- [ ] Extrair `PerfilTab.tsx` como componente separado
- [ ] Aplicar `dynamic(() => import(...), { ssr: false })` para `SignaturePad` e `GradeCurricularTab`
- [ ] Corrigir race condition no `useEffect` do `localFuncionario` (cleanup de desmontagem)
- [ ] Remover non-null assertion `funcionario!` — adicionar guard de null antes do render
- [ ] Corrigir `useEffect` do diretor: adicionar `activeTab` nas dependências
- [ ] Corrigir `publicUrl` salvo sem remover `?t=timestamp` antes de persistir no banco
- [ ] Verificar com `npx tsc --noEmit`

### Diagnóstico de Causas-Raiz

| # | Causa | Impacto |
|---|-------|---------|
| 1 | Bundle monolítico `'use client'` de 40KB | Next.js envia tudo ao cliente antes do primeiro render |
| 2 | `SignaturePad` carregado incondicionalmente | Canvas pesado no bundle inicial |
| 3 | `GradeCurricularTab` inline | Sub-tela com 3 queries inicializada junto com a página |
| 4 | `useEffect` de fetch redundante do funcionário | Query extra a cada montagem |

### Erros Silenciosos Identificados (8)

#### 🔴 Críticos (3)
1. **Race condition** — `setLocalFuncionario` chamado em componente desmontado (sem cleanup no `useEffect`). Pode causar warnings de memória e estado corrompido.
2. **Crash silencioso Zustand** — `funcionario!` non-null assertion quando o store ainda não hidratou no cliente. Causa `TypeError` silencioso em caso de acesso rápido.
3. **`useEffect` de diretor sem `activeTab`** — pode resetar a aba ativa do usuário inesperadamente ao recarregar dados.

#### 🟡 Moderados (5)
4. `import Card` não utilizado no bundle — contribui para o tamanho do chunk.
5. `modulesList` e `toggleModule` sem funcionalidade real — UI decorativa ocupando estados e lógica.
6. `publicUrl` salvo no banco **com** `?t=timestamp` (cache-buster contaminando a URL persistida).
7. `setState` sem tipagem explícita (`as any` no Zustand) — bugs silenciosos de tipagem.
8. Busca de matérias sem sanitização — vulnerável a input malicioso no `ilike`.

### Resultado Esperado Pós-Otimização
| Métrica | Antes | Depois |
|---------|-------|--------|
| Bundle enviado ao cliente | ~40KB | ~8–12KB |
| Render médio | ~512ms | ~80–150ms |
| Queries na montagem | 4+ | 1–2 (lazy nas abas) |

---

## ✅ Histórico de Implementações Concluídas


### 2026-07-18

#### Tabs de Geolocalização (Funcionários + Alunos)
- **O que foi feito:** Refatoração do relatório de geolocalização para incluir interface com abas, permitindo alternar entre dados de geolocalização de funcionários e de alunos dentro do mesmo componente de relatório.
- **Arquivos modificados:** Componente de relatório de geolocalização em `src/components/relatorios/`

#### Otimização da Página de Ajuda (`/ajuda`)
- **O que foi feito:** Auditoria completa com 8 gargalos e 7 erros silenciosos identificados e corrigidos.
- **Correções aplicadas:**
  - JSX pesado convertido para render functions `() => JSX` (lazy evaluation)
  - Busca com campo `keywords[]` e `useMemo` (antes só filtrava título)
  - `<ModalReport>` renderizado condicionalmente
  - `animate-fadeIn` definida no `globals.css` (estava inexistente)
  - Campo `escola` corrigido para usar `vinculos.find(v => v.ativo)?.escolaNome`
  - `toast.error` no `catch` (era `toast.success` — bug silencioso)
  - Formulário reseta ao fechar/cancelar
  - `localStorage` limitado a 30 itens
  - Estado fantasma `isOpen` removido
  - `DialogTrigger` com API inválida corrigido para Base UI
- **Arquivos modificados:** `src/app/(dashboard)/ajuda/page.tsx` · `src/components/modals/modal-report.tsx` · `src/app/globals.css`
- **Verificação:** `npx tsc --noEmit` → Exit code 0

#### Skill `otimizador` criada
- **O que foi feito:** Skill de auditoria de performance criada em `.agents/skills/otimizador/SKILL.md` com 235 linhas de protocolo, incluindo SOP de 4 etapas, catálogo de 8 categorias de gargalos, 7 padrões de erros silenciosos, tabela de fontes de dados corretas do SIG e 8 padrões de correção com exemplos `ANTES/DEPOIS`.
- **Ativada por:** "analisar gargalos", "otimizar", "auditar performance", "encontrar erros silenciosos"

#### Tabs de Geolocalização (Funcionários + Alunos)
- **O que foi feito:** Novo componente de mapa de alunos criado e integrado ao relatório de geolocalização com interface de abas.
- **Arquivos criados/modificados:**
  - `[NEW] src/components/map/MapaAlunos.tsx` — componente de mapa com filtro por escola/turma, DivIcon com iniciais/foto e popup com link Google Maps
  - `[MODIFY] src/components/map/MapWrapper.tsx` — adicionado import dinâmico de `MapaAlunos` (sem SSR)
  - `[MODIFY] src/app/(dashboard)/relatorios/page.tsx` — abas `funcionarios` / `alunos`, fetch de alunos geolocalizados por escola
