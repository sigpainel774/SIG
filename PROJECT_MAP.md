# SIG - Mapa do Projeto (PROJECT_MAP.md)

Este arquivo serve como o mapa oficial da estrutura do projeto SIG. **Consulte este arquivo antes de realizar varreduras de arquivos no repositório** para economizar tokens de contexto e localizar rapidamente os componentes corretos.

---

## 📂 Estrutura de Diretórios Principal (`src/`)

```
src/
├── app/                  # Roteamento do Next.js (App Router)
│   ├── (auth)/           # Grupo de rotas de autenticação
│   │   └── login/        # Rota de Login (/login)
│   ├── (dashboard)/      # Grupo de rotas autenticadas do corpo docente e administrativo
│   │   ├── admin/        # Administração do sistema (Logs, dispositivos, lixeira, backup, etc.)
│   │   ├── ajuda/        # Ajuda e suporte do usuário
│   │   ├── alunos/       # Gestão de Alunos (Ficha, ocorrências, anexos, notas)
│   │   ├── arquivos/     # Arquivamento geral de registros
│   │   ├── atestados/    # Controle de Atestados médicos de funcionários
│   │   ├── avaliacoes/   # Lançamento de Notas, Frequências e boletins
│   │   ├── calendario-academico/ # Gestão do Calendário Letivo Oficial (Secretário de Educação & Admin)
│   │   ├── coleta-local/ # Recursos de ponto/coleta off-line
│   │   ├── configuracoes/# Preferências do sistema e níveis de notificações
│   │   ├── documentos/   # Emissão de documentos oficiais e comprovantes
│   │   ├── eja/          # Módulo EJA (Educação de Jovens e Adultos)
│   │   ├── emaee/        # Módulo EMAEE (Atendimento Educacional Especializado e Prontuários)
│   │   ├── financeiro/   # Lançamentos e transações financeiras (caixa/escola)
│   │   ├── funcionarios/ # Gestão de Funcionários, vínculos e lotações
│   │   ├── historico-notificacoes/ # Histórico de notificações recebidas pelo usuário
│   │   ├── home/         # Dashboard / Visão geral inicial pós-login
│   │   ├── matriculas/   # Novas matrículas e solicitações
│   │   ├── mural/        # Mural de avisos e comunicados da escola
│   │   ├── ocorrencias/  # Cadastro de ocorrências disciplinares
│   │   ├── painel-chefe/ # Painel de comando de escala/serviço (coordenadores)
│   │   ├── perfil/       # Dados do usuário logado e troca de senha
│   │   ├── permissoes/   # Gestão de permissões ABAC
│   │   ├── ponto-mobile/ # Ponto biométrico/escala mobile
│   │   ├── relatorios/   # Relatórios gerais de notas, frequências e auditoria
│   │   ├── responsaveis/ # Gestão e cadastro de contas de pais e responsáveis
│   │   ├── root/         # Painel de controle do Superadmin (Logs, IPs, Bugs)
│   │   ├── transferencias/# Transferências de alunos e funcionários entre unidades
│   │   └── turmas/       # Gestão de turmas, grade semanal e horários de aula
│   │
│   ├── portal-aluno/     # Portal dos Pais e Alunos (Acesso isolado: diários, recados, solicitações)
│   │   ├── ajuda/        # Ajuda ao responsável
│   │   ├── comunicacoes/ # Canal de recados e mensagens com professores
│   │   ├── dashboard/    # Visão acadêmica do estudante (boletim, médias, faltas)
│   │   ├── login/        # Login exclusivo para pais e responsáveis (/portal-aluno/login)
│   │   ├── ocorrencias/  # Visualização e confirmação de ciência de ocorrências
│   │   ├── solicitacoes/ # Pedido de documentos e declarações escolares
│   │   └── trocar-senha/ # Troca obrigatória de senha no primeiro acesso
│   │
│   ├── api/              # Route Handlers / Endpoints da API (Server-side)
│   │   ├── admin/        # Endpoints de admin (ações de logs, reset, hard-delete, export)
│   │   ├── auth/         # Autenticação, sessão e rotas de segurança
│   │   ├── get-ip/       # Utilitário de identificação de IP de acesso
│   │   └── matricula/    # Regras e hooks de submissão de matrículas
│   │
│   ├── assinar/          # Rota pública de assinaturas digitais por QRCode/Mobile
│   ├── verificar/        # Rota de verificação pública de assinaturas e crachás
│   ├── globals.css       # Estilos globais (Tailwind CSS)
│   ├── layout.tsx        # Layout raiz do projeto
│   └── page.tsx          # Página raiz do projeto (redireciona para login/dashboard)
│
├── components/           # Componentes React
│   ├── ui/               # Componentes primitivos do Shadcn/UI (e.g. Button, Dialog, SignaturePad)
│   ├── modals/           # Modais específicos de gestão (e.g. modal-aluno, modal-funcionario, modal-calendario-academico, modal-session-timeout)
│   ├── print/            # Visualizações e templates de impressão física (e.g. print-boletim, print-ficha)
│   ├── map/              # Componentes de mapa (Leaflet/MapWrapper)
│   ├── relatorios/       # Seções e componentes específicos de relatórios
│   ├── Sidebar.tsx       # Menu lateral de navegação
│   ├── Header.tsx        # Cabeçalho da dashboard
│   ├── SchoolSelector.tsx # Seletor global de Escolas no header
│   ├── SessionTimeoutWatcher.tsx # Observador de regras de encerramento de sessão
│   ├── theme-provider.tsx # Provedor de tema claro/escuro
│   ├── GradeSemanalSection.tsx # Grade de horários semanal das turmas
│   ├── HorariosSlotsSection.tsx # Slots de horários de aula da escola
│   └── PerformanceTracker.tsx # Rastreador de performance da aplicação
│
├── lib/                  # Bibliotecas auxiliares e conexões externas
│   ├── supabaseClient.ts # Conexão Supabase Browser Client (use client)
│   ├── supabaseServer.ts # Conexão Supabase Server Client (Server Components/API)
│   ├── supabaseAdmin.ts  # Conexão Supabase Admin Bypass (Apenas Server/API - usar Service Role)
│   ├── audit/            # Helpers para geração de logs de auditoria
│   ├── feriadosNacionais.ts # Algoritmo de cálculo de feriados nacionais e móveis
│   ├── profileCache.ts   # Sistema de cache local para perfis de funcionários
│   ├── invalidarCachePerfil.ts # Helper para invalidação manual do cache de perfil
│   ├── swrFetchers.ts    # Fetchers utilitários para uso com SWR
│   └── utils.ts          # Utilitários gerais do projeto (cn, etc.)
│
├── store/                # Estados globais controlados por Zustand
│   ├── useAuthStore.ts   # Estado de autenticação do usuário logado
│   ├── useSchoolStore.ts # Escola selecionada no seletor global do header
│   ├── useEditModeStore.ts # Gerencia o estado isEditMode (Modo de Edição)
│   ├── useSidebarStore.ts # Controla recolhimento da sidebar
│   └── useFolhaPagamentoStore.ts # Gerenciamento do estado da folha de pagamentos
│
├── hooks/                # Custom React Hooks reutilizáveis
│   ├── usePessoaForm.ts  # Hook utilitário para formulários de Alunos/Funcionários
│   └── useCalendarioAcademico.ts # Hook com regras de negócio e CRUD do Calendário Acadêmico
│
├── types/                # Definições de Tipos Globais TypeScript
└── proxy.ts              # Roteador de segurança (ex-middleware.ts do Next.js 16)
```

---

## 🗄️ Tabelas Principais do Banco de Dados (Supabase - RLS Ativo)

*   **`public.escolas`**: Cadastro das unidades escolares municipais e flags de ativação de módulos.
*   **`public.secretarias`**: Cadastro de órgãos e secretarias municipais estruturais.
*   **`public.funcionarios`**: Dados cadastrais dos servidores e funcionários do município.
*   **`public.vinculos_funcionarios`**: Relação de vínculos ativos de funcionários com escolas/órgãos.
*   **`public.acessos_usuarios`**: Perfis de usuário, e-mails de acesso e permissões (ABAC).
*   **`public.alunos`**: Cadastro principal de estudantes matriculados.
*   **`public.alunos_anexos`**: Documentos anexados às fichas dos alunos (Certidões, RG, Laudos).
*   **`public.turmas`**: Definição de salas e turmas criadas por ano/letra (ex: "6 - A").
*   **`public.vinculos_turmas`**: Associação de alunos e professores às suas respectivas turmas.
*   **`public.cargos`**: Tabela de funções e cargos disponíveis na rede de ensino.
*   **`public.materias`**: Componentes curriculares/disciplinas vinculadas às turmas.
*   **`public.notas`**: Lançamentos periódicos de notas por matéria/unidade de avaliação.
*   **`public.frequencias`**: Registros de presença e faltas diárias ou por aula.
*   **`public.ocorrencias`**: Registro de incidentes ou advertências de alunos com controle de ciência dos pais.
*   **`public.responsaveis`**: Cadastro de pais e responsáveis legais com acesso ao Portal do Aluno.
*   **`public.responsaveis_alunos`**: Vínculo de parentesco/responsabilidade entre responsáveis e estudantes.
*   **`public.responsavel_audit_log`**: Logs de auditoria para ações executadas sobre contas de responsáveis.
*   **`public.mensagens_responsaveis`**: Canal de comunicação e recados diretos entre professores e responsáveis.
*   **`public.solicitacoes_responsaveis`**: Solicitações de declarações e documentos enviadas pelos responsáveis.
*   **`public.emaee_matriculas`**: Prontuários clínicos, triagem e acolhimento especializado do EMAEE.
*   **`public.emaee_evolucoes`**: Histórico de atendimentos e evolução clínica dos pacientes do EMAEE.
*   **`public.emaee_especialidades_vinculadas`**: Agendamento de especialidades de atendimento no EMAEE.
*   **`public.emaee_solicitacoes_relatorios`**: Pareceres e solicitações pedagógicas entre escola e EMAEE.
*   **`public.atestados`**: Histórico de atestados e licenças de funcionários.
*   **`public.comunicados`**: Mensagens de texto publicadas no mural escolar por secretaria/escola.
*   **`public.comunicados_lidos`**: Rastreamento de confirmação de leitura individual de comunicados.
*   **`public.assinatura`**: Registro e tokens das assinaturas eletrônicas emitidas via QRCode.
*   **`public.transferencias_alunos`**: Histórico de movimentações e transferências de estudantes.
*   **`public.transferencias_funcionarios`**: Histórico de movimentações de funcionários.
*   **`public.audit_logs`**: Logs de auditoria de acessos e modificações de registros.
*   **`public.trash_bin`**: Lixeira virtual para exclusões lógicas com suporte a restauração.
*   **`public.configuracao_notificacoes_niveis`**: Níveis e patterns para notificações baseadas em cargo.
*   **`public.grade_semanal`**: Slots semanais de aulas vinculando professor, turma e matéria.
*   **`public.horarios_aulas_slots`**: Horários de início e fim dos períodos/aulas de cada escola.
*   **`public.orgaos`**: Setores ou departamentos administrativos das escolas.
*   **`public.pontos_ronda`**: Pontos de geolocalização cadastrados para rondas de vigilância.
*   **`public.blocked_ips`**: Endereços de IP bloqueados temporariamente por segurança.
*   **`public.access_logs`**: Logs brutos de requisições e acessos HTTP.
*   **`public.user_navigation_trail`**: Rastro de navegação e páginas acessadas pelos usuários.
*   **`public.ip_geolocation_cache`**: Cache de geolocalização de IPs para auditoria.
*   **`public.backup_registros`**: Histórico e auditoria de backups do banco de dados.
*   **`public.notifications`**: Notificações in-app disparadas aos usuários com suporte a `grupo_id`.
*   **`public.dispositivos`**: Dispositivos e coletores de ponto autorizados.
*   **`public.veiculos`**: Veículos da frota de transporte escolar.
*   **`public.abastecimentos_veiculos`**: Registro de abastecimentos e hodômetro da frota escolar.
*   **`public.manutencoes_veiculos`**: Histórico de manutenções e oficinas da frota escolar.
*   **`public.rotas_transporte`**: Rotas do transporte escolar municipal.
*   **`public.alunos_transporte`**: Relação de alunos enturmados em rotas de transporte.
*   **`public.rotas_ronda`**: Rotas planejadas de vigilância noturna/patrulha.
*   **`public.registros_ronda`**: Registros de passagens e checkpoints da ronda.
*   **`public.arquivados`**: Histórico de registros migrados para o arquivo permanente.
*   **`public.bug_reports`**: Relatórios de bugs e chamados enviados ao Superadmin.
*   **`public.transacoes_financeiras`**: Caixa escolar, receitas e despesas.
*   **`public.escalas_servico`**: Escalas de trabalho e plantões de funcionários.
*   **`public.movimentacoes_funcionarios`**: Histórico de portarias e lotações de RH.
*   **`public.solicitacoes_rh`**: Requerimentos de férias, licenças e serviços.
*   **`public.performance_metrics`**: Métricas de tempo de resposta e performance web.
*   **`public.recuperacoes_finais`**: Notas da recuperação final após o terceiro trimestre.
*   **`public.solicitacoes_edicao_aluno`**: Solicitações de alteração de ficha cadastral restrita.
*   **`public.prazos_unidades`**: Prazos limites para lançamentos de notas de cada trimestre.
*   **`public.atividades_secretaria`**: Controle de entrega de diários e planejamentos pedagógicos.
*   **`public.atividades_secretaria_historico`**: Histórico de alterações nos diários pedagógicos.
*   **`public.grade_curricular_escola`**: Disciplinas curriculares ativas por escola.
*   **`public.agenda_aulas`**: Aulas criadas dinamicamente com base na grade semanal.
*   **`public.folha_pagamento_config`**: Parâmetros de fechamento mensal da folha financeira.
*   **`public.desligamentos_programados`**: Agendamento de desligamentos futuros de vínculos de RH.
*   **`public.adicionais_salario`**: Lançamento de adicionais (horas extras, gratificações) na folha.
*   **`public.configuracoes_rede`**: Parâmetros e dados gerais da Secretaria de Educação.
*   **`public.session_timeout_rules`**: Regras de encerramento compulsório de sessões administrativas por horário.
*   **`public.calendarios_academicos`**: Calendário letivo anual oficial da Secretaria de Educação para a rede.
*   **`public.calendario_eventos`**: Feriados, pontos facultativos, recessos e sábados letivos do calendário anual.
*   **`public.calendario_historico`**: Trilha de auditoria das alterações no calendário letivo oficial.
*   **`public.notas_atividades`**: Lançamento de notas individuais de atividades escolares do trimestre.

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
