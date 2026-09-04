# 🏛️ Arquitetura do Sistema Integrado de Gestão (SIG)

> **Documento de Referência Arquitetural**  
> **Stack:** Next.js 16 (App Router + Turbopack) | React 19 | TypeScript 5 | Tailwind CSS v4 | Shadcn UI | Supabase SSR | Zustand | SWR | Capacitor 8 (Android)

---

## 🧭 Visão Geral & Filosofia

O SIG é uma plataforma municipal de gestão escolar e administrativa 360°, projetada para alta performance, operação offline-first (PWA + Capacitor) e segurança em camadas (Zero Trust + RBAC/ABAC).

```
                      ┌────────────────────────────────────────┐
                      │              Clientes / UI             │
                      │  • Web / Desktop (App Router)          │
                      │  • PWA Servidores (sw.js)              │
                      │  • PWA Pais/Alunos (/portal-aluno)     │
                      │  • App Nativo Android (Capacitor)      │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │         Middleware & Proxy Zero Trust  │
                      │  (Validação de Dispositivos / Headers) │
                      └───────────────────┬────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌─────────────────────────┐                     ┌─────────────────────────┐
     │  Client Components      │                     │  Server Handlers / API  │
     │  (@/lib/supabaseClient) │                     │  (supabaseAdmin / SSR)  │
     │  - State: Zustand + SWR │                     │  - Service Role restrito│
     │  - UI: Tailwind + Shadcn│                     │  - Validado com Zod     │
     └────────────┬────────────┘                     └────────────┬────────────┘
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          ▼
                      ┌────────────────────────────────────────┐
                      │         Supabase (PostgreSQL)          │
                      │  - Row Level Security (RLS)            │
                      │  - Triggers & RPCs (SECURITY DEFINER)  │
                      │  - Auth & Realtime                     │
                      └────────────────────────────────────────┘
```

---

## 📂 Estrutura de Diretórios & Responsabilidades

```
SIG/
├── src/
│   ├── app/                    # Next.js 16 App Router (Páginas, Layouts e APIs)
│   │   ├── (auth)/             # Login, recuperação, verificação e pareamento
│   │   ├── (dashboard)/        # Módulos administrativos e pedagógicos protegidos
│   │   │   ├── home/           # Dashboard inicial / Visão geral
│   │   │   ├── alunos/         # Gestão de alunos, cadastros e históricos
│   │   │   ├── matriculas/     # Matrículas e rematrículas
│   │   │   ├── turmas/         # Turmas, enturmação e grades horárias
│   │   │   ├── diario/         # Diário de classe, planos de aula e BNCC
│   │   │   ├── frequencia/     # Chamada digital e controle de faltas
│   │   │   ├── notas/          # Lançamento de notas, recuperações e boletins
│   │   │   ├── mural/          # Avisos, comunicados com confirmação de leitura
│   │   │   ├── funcionarios/   # Quadro funcional, lotações e ponto 671
│   │   │   ├── eja/            # Módulo de Educação de Jovens e Adultos
│   │   │   ├── emaee/          # Atendimento Multiprofissional e Educação Especial
│   │   │   ├── cursinho/       # Simulados, gabaritos e correção OMR por câmera
│   │   │   ├── transporte/     # Frotas escolares, rotas e paradas offline
│   │   │   ├── financeiro/     # Adicionais, termos e lançamentos
│   │   │   ├── seguranca/      # Central de defesa, logs, telemetria e replay
│   │   │   └── configuracoes/  # Parâmetros gerais e controle de acesso
│   │   ├── portal-aluno/       # PWA dedicado e isolado para pais e responsáveis
│   │   ├── api/                # Route Handlers (Webhooks, Cron, Push, RPCs seguras)
│   │   ├── globals.css         # Tokens de tema CSS e variáveis do Design System
│   │   ├── layout.tsx          # Root Layout com Providers (Theme, Auth, Telemetria)
│   │   └── proxy.ts            # Proxy Zero Trust para validação de nós escolares
│   ├── components/             # Componentes React/TSX reutilizáveis
│   │   ├── ui/                 # Primitivos Shadcn UI (button, dialog, card, etc.)
│   │   ├── alunos/             # Componentes específicos de alunos
│   │   ├── turmas/             # Componentes de turmas e horários
│   │   ├── mural/              # Cards de avisos e leituras
│   │   ├── cursinho/           # Leitor OMR e folha de respostas
│   │   ├── permissoes/         # Matriz de controle e simulador de acesso
│   │   ├── pwa/                # Modais de atualização e botões de instalação
│   │   ├── Header.tsx          # Cabeçalho global com seletor de escola e perfil
│   │   └── Sidebar.tsx         # Menu lateral dinâmico baseado em permissões
│   ├── hooks/                  # Custom Hooks (usePermissions, useSigSWR, etc.)
│   ├── lib/                    # Utilitários, serviços e clientes
│   │   ├── supabaseClient.ts   # Client Supabase para 'use client'
│   │   ├── supabaseServer.ts   # Client Supabase SSR para Server Components
│   │   ├── supabaseAdmin.ts    # Client Supabase Service Role (APIs e Server Actions)
│   │   ├── authGuard.ts        # Guardas de autenticação e validação de tokens
│   │   ├── rateLimit.ts        # Limitador de requisições por IP/usuário
│   │   ├── schemas/            # Schemas de validação Zod (index.ts)
│   │   ├── swr/                # Hooks e fetchers otimizados de SWR
│   │   └── omr/                # Motor de processamento de gabaritos por imagem
│   ├── store/                  # Estado global via Zustand
│   └── types/                  # Definições TypeScript e schema Supabase gerado
├── android/                    # Projeto nativo Android (Capacitor)
├── supabase/
│   └── migrations/             # Migrations SQL versionadas (ver MIGRATIONS_MAP.md)
├── AGENTS.md                   # Diretrizes estritas para agentes de IA
├── DESIGN_PREFERENCES.md       # Diretrizes visuais e tokens do Design System
├── DEPENDENCIES_AND_TOOLS.md   # Inventário completo de MCPs, CLI e bibliotecas
├── MIGRATIONS_MAP.md           # Mapeamento detalhado de banco e RPCs
└── ROADMAP.md                  # Status operacional e planejamento de entregas
```

---

## 🔒 Regras Fundamentais de Segurança & Clientes Supabase

1. **Client Components (`'use client'`):**
   - Importar SEMPRE `@/lib/supabaseClient` (`createBrowserClient`).
   - NUNCA importar `supabaseAdmin` em arquivos com `'use client'`.

2. **Server Components & API Routes:**
   - Server Components: Usar `supabaseServer.ts`.
   - API Routes (`src/app/api/`) e tarefas administrativas: Usar `supabaseAdmin.ts` com chave `service_role`.
   - A chave `SUPABASE_SERVICE_ROLE_KEY` nunca deve possuir prefixo `NEXT_PUBLIC_`.

3. **Autenticação e Permissões:**
   - O sistema utiliza matriz híbrida RBAC + ABAC (Níveis 1 a 6 + permissões granulares mapeadas em `PERMISSOES_ARQUITETURA.md`).
   - Acesso a dados sempre valida unidade escolar ativa (`escola_id`) e escopo do usuário.

---

## 🎨 Padrão de Tema e Estilização (Design System)

- **Suporte Obrigatório a Dark / Light Mode:**
  - Estilo padrão (sem prefixo): **Modo Claro** (ex: `bg-card`, `bg-background`, `text-foreground`).
  - Tema escuro: **Exclusivamente via prefixo `dark:`** (ex: `dark:bg-[#141416]`, `dark:border-[#26262a]`).
  - PROIBIDO usar cores hardcoded escuras soltas (ex: `bg-[#141416]`, `text-white` sem variante contextual).
- **Biblioteca de Ícones:** Estritamente `lucide-react`.

---

## ⚡ Validação e Qualidade de Código

- **Validação Rápida Local:**
  - TypeScript: `cmd /c "npx tsc --noEmit"`
  - Biome (Lint ultrarrápido): `npx biome check src`
  - Formatação: `npx biome format --write src`
- **Validação de Schemas:** Usar `zod` em formulários e APIs (`src/lib/schemas`).
