# SIG - Mapa do Projeto (PROJECT_MAP.md)

Este arquivo serve como o mapa oficial da estrutura do projeto SIG. **Consulte este arquivo antes de realizar varreduras de arquivos no repositório** para economizar tokens de contexto e localizar rapidamente os componentes corretos.

---

## 📂 Estrutura de Diretórios Principal (`src/`)

```
src/
├── app/                  # Roteamento do Next.js (App Router)
│   ├── (auth)/           # Grupo de rotas de autenticação
│   │   └── login/        # Rota de Login (/login)
│   ├── (dashboard)/      # Grupo de rotas autenticadas
│   │   ├── admin/        # Administração do sistema (Logs, dispositivos, trash_bin, etc.)
│   │   ├── ajuda/        # Ajuda e suporte do usuário
│   │   ├── alunos/       # Gestão de Alunos (Ficha, ocorrências, anexos, notas)
│   │   ├── arquivos/     # Arquivamento geral de registros
│   │   ├── atestados/    # Controle de Atestados médicos de funcionários
│   │   ├── avaliacoes/   # Lançamento de Notas, Frequências e boletins
│   │   ├── coleta-local/ # Recursos de ponto/coleta off-line
│   │   ├── configuracoes/# Preferências do sistema e níveis de notificações
│   │   ├── documentos/   # Emissão de documentos oficiais e comprovantes
│   │   ├── financeiro/   # Lançamentos e transações financeiras (caixa/escola)
│   │   ├── funcionarios/ # Gestão de Funcionários, vínculos e lotações
│   │   ├── home/         # Dashboard / Visão geral inicial pós-login
│   │   ├── matriculas/   # Novas matrículas e solicitações
│   │   ├── mural/        # Mural de avisos e comunicados da escola
│   │   ├── ocorrencias/  # Cadastro de ocorrências disciplinares
│   │   ├── painel-chefe/ # Painel de comando de escala/serviço (coordenadores)
│   │   ├── perfil/       # Dados do usuário logado e troca de senha
│   │   ├── permissoes/   # Gestão de permissões ABAC
│   │   ├── ponto-mobile/ # Ponto biométrico/escala mobile
│   │   ├── relatorios/   # Relatórios gerais de notas, frequências e auditoria
│   │   ├── root/         # Painel de controle do Superadmin
│   │   ├── transferencias/# Transferências de alunos e funcionários entre unidades
│   │   └── turmas/       # Gestão de turmas, grade semanal e horários de aula
│   │
│   ├── api/              # Route Handlers / Endpoints da API (Server-side)
│   │   ├── admin/        # Endpoints de admin (ações de logs, reset, etc.)
│   │   ├── auth/         # Autenticação, sessão e rotas de segurança
│   │   ├── get-ip/       # Utilitário de identificação de IP de acesso
│   │   └── matricula/    # Regras e hooks de submissão de matrículas
│   │
│   ├── assinar/          # Rota pública de assinaturas digitais por QRCode/Mobile
│   ├── verificar/        # Rota de verificação pública de assinaturas
│   ├── globals.css       # Estilos globais (Tailwind CSS)
│   ├── layout.tsx        # Layout raiz do projeto
│   └── page.tsx          # Página raiz do projeto (redireciona para login/dashboard)
│
├── components/           # Componentes React
│   ├── ui/               # Componentes primitivos do Shadcn/UI (e.g. Button, Dialog, SignaturePad)
│   ├── modals/           # Modais específicos de gestão (e.g. modal-aluno, modal-funcionario)
│   ├── print/            # Visualizações e templates de impressão física (e.g. print-boletim, print-ficha)
│   ├── map/              # Componentes de mapa (Leaflet/MapWrapper)
│   ├── Sidebar.tsx       # Menu lateral de navegação
│   ├── Header.tsx        # Cabeçalho da dashboard
│   └── SchoolSelector.tsx # Seletor global de Escolas no header
│
├── lib/                  # Bibliotecas auxiliares e conexões externas
│   ├── supabaseClient.ts # Conexão Supabase Browser Client (use client)
│   ├── supabaseServer.ts # Conexão Supabase Server Client (Server Components/API)
│   ├── supabaseAdmin.ts  # Conexão Supabase Admin Bypass (Apenas Server/API - usar Service Role)
│   └── audit/            # Helpers para geração de logs de auditoria
│
├── store/                # Estados globais controlados por Zustand
│   ├── useAuthStore.ts   # Estado de autenticação do usuário logado
│   ├── useSchoolStore.ts # Escola selecionada no seletor global do header
│   ├── useEditModeStore.ts # Gerencia o estado isEditMode (Modo de Edição)
│   └── useSidebarStore.ts # Controla recolhimento da sidebar
│
├── hooks/                # Custom React Hooks reutilizáveis
│   └── usePessoaForm.ts  # Hook utilitário para manipulação de formulários de Alunos/Funcionários
│
├── types/                # Definições de Tipos Globais TypeScript
└── proxy.ts              # Roteador de segurança (ex-middleware.ts do Next.js 16)
```

---

## 🗄️ Tabelas Principais do Banco de Dados (Supabase - RLS Ativo)

Esta referência evita a necessidade de listar as tabelas ou adivinhar suas estruturas no Supabase:

*   **`public.escolas`**: Cadastro das unidades escolares municipais.
*   **`public.funcionarios`**: Dados cadastrais dos servidores e funcionários do município.
*   **`public.vinculos_funcionarios`**: Relação de vínculos ativos de funcionários com escolas/órgãos.
*   **`public.acessos_usuarios`**: Perfis de usuário, e-mails de acesso e permissões (ABAC).
*   **`public.alunos`**: Cadastro principal de estudantes matriculados.
*   **`public.alunos_anexos`**: Documentos anexados às fichas dos alunos (Certidões, RG, etc.).
*   **`public.turmas`**: Definição de salas e turmas criadas por ano/letra (ex: "6 - A").
*   **`public.vinculos_turmas`**: Associação de alunos e professores às suas respectivas turmas.
*   **`public.cargos`**: Tabela de funções e cargos disponíveis na rede de ensino.
*   **`public.materias`**: Componentes curriculares/disciplinas vinculadas às turmas.
*   **`public.notas`**: Lançamentos periódicos de notas por matéria/unidade de avaliação.
*   **`public.frequencias`**: Registros de presença e faltas diárias ou por aula.
*   **`public.ocorrencias`**: Registro de incidentes ou advertências de alunos.
*   **`public.atestados`**: Histórico de atestados e licenças de funcionários.
*   **`public.comunicados`**: Mensagens de texto publicadas no mural escolar.
*   **`public.assinatura`**: Registro e tokens das assinaturas eletrônicas emitidas via QRCode.
*   **`public.transferencias_alunos`**: Histórico de movimentações de estudantes entre escolas.
*   **`public.audit_logs`**: Logs de auditoria de acessos e modificações de registros (compliance).
*   **`public.trash_bin`**: Lixeira virtual para exclusões lógicas com suporte a restauração.
*   **`public.configuracao_notificacoes_niveis`**: Definição de permissões de envio de e-mails/push por tipo de evento.
*   **`public.grade_semanal`**: Slots semanais de aulas vinculando professor, turma e matéria.
*   **`public.horarios_aulas_slots`**: Horários de início e fim dos períodos/aulas de cada escola.

---

## 🔒 Regras Críticas de Desenvolvimento

### 1. Separação de Clientes Supabase & Segurança
*   **Componentes de Cliente (`'use client'`)**: Importar exclusivamente `@/lib/supabaseClient`.
*   **Componentes de Servidor, Server Actions & API Routes**: Importar `@/lib/supabaseServer` ou `@/lib/supabaseAdmin`.
*   **Chave Admin**: Nunca expor `SUPABASE_SERVICE_ROLE_KEY` em código cliente (sem usar `NEXT_PUBLIC_`).

### 2. Next.js 16 Roteamento e Segurança
*   A proteção de rotas deve obrigatoriamente ocorrer em `src/proxy.ts` (em vez de `middleware.ts`), usando a função exportada `proxy`. **Nunca renomeie este arquivo.**

### 3. Modais Dialog (Shadcn/Radix)
*   Nunca adicionar a classe `relative` no `DialogContent` raiz (pois quebra o posicionamento `fixed` de centralização).
*   Não incluir botões customizados de fechar `X` no cabeçalho se o primitivo já fornece isso.
*   **Modo de Edição**: Condicionar a exibição de botões de edição, inserção e remoção ao estado `isEditMode` obtido de `@/store/useEditModeStore`.

### 4. Telas de Impressão (`components/print/`)
*   Sempre envolver no portal com a classe `.print-portal-container` e garantir que o CSS `@media print` no `globals.css` oculte os elementos irmãos (`body > *:not(.print-portal-container) { display: none !important; }`).
*   Busting de cache em assinaturas dinâmicas/imagens do Storage: Usar query param com timestamp `?t=${Date.now()}` nas tags `<img>` e remover antes de persistir no banco.

---

## 🛠️ Banco de Dados (Supabase via MCP)
*   **Políticas RLS**: Sempre ativar RLS em tabelas criadas. Durante desenvolvimento, adicione a policy `dev_all_authenticated`. Em produção, substitua pelas regras específicas ABAC (por Escola, Cargo ou Superadmin).
*   **Exclusão em Cascata**: Sempre conferir RLS de tabelas filhas ao aplicar `ON DELETE CASCADE`.
