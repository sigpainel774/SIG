# 📊 Acompanhamento de Supressão de Duplicações

Este documento serve para monitorar o progresso na eliminação de código duplicado no projeto SIG. À medida que as refatorações forem implementadas, o progresso e o impacto em linhas de código serão atualizados aqui.

## 💡 Benefício de Performance (Shared Chunks)

> [!NOTE]
> **Code-Splitting & Cache Reutilizável**: Ao centralizar as lógicas duplicadas em componentes ou hooks compartilhados, o compilador do Next.js (Webpack/Turbopack) gera *shared chunks* (pedaços compartilhados de código). O navegador baixa e faz cache desse código comum uma única vez. Quando o usuário navega entre rotas que usam o mesmo componente, o navegador reutiliza o cache em vez de baixar dados duplicados, reduzindo drasticamente o tempo de carregamento das telas.

---

## 📈 Status Geral
 
* **Percentual Inicial de Duplicação (Estimado):** ~28,5% (~10.000 linhas)
* **Percentual Atual de Duplicação:** ~13,8%
* **Linhas de Código Removidas/Otimizadas:** ~2062
* **Redução Acumulada do Projeto:** ~6,03%
 
---
 
## 🛠️ Progresso dos Grupos de Refatoração
 
| Grupo | Descrição | Status | Linhas Estimadas Economizadas | Impacto Real |
|---|---|---|---|---|
| **Grupo 1** | Estruturas de Dialog/Modal | ✅ Concluído | ~650 | ~630 linhas puras removidas. Lógicas de estilização de modal escura densa, breakpoints responsivos e controle de Dialog unificados via componente `<StandardDialog>` (incluindo Aluno, Funcionário, Turma, Transferências, Anexos, Confirmação de Senha e Reset). |
| **Grupo 2** | `useState` de campos pessoais (Aluno ↔ Funcionário) | ✅ Concluído | ~400 | ~267 linhas puras removidas. Lógicas de inicialização, reset e masks centralizadas via hook `usePessoaForm`. |
| **Grupo 3** | Cabeçalho de Impressão Municipal | ✅ Concluído | ~360 | ~115 linhas puras removidas. Simetria física de logos da prefeitura/secretaria e cache-buster unificados via componente `<PrintHeader>`. |
| **Grupo 4** | Padrão de Busca/Filtro Local | ✅ Concluído | ~550 | ~75 linhas puras removidas. Lógica de busca case-insensitive e com normalização de acentos centralizada via hook `useLocalSearch` (incluindo alunos, funcionários, cargos e escolas). |
| **Grupo 5** | Boilerplate de Toasts (Try/Catch/Finally) | ✅ Concluído | ~650 | ~44 linhas puras removidas. Lógica de tratamento de erros assíncronos e loading unificada no utilitário `executeWithToast` (incluindo funcionários e solicitações de liberação). |
| **Grupo 6** | Verificações de Permissão por Cargo | ✅ Concluído | ~250 | ~12 linhas puras removidas. Lógicas de verificação de cargos (Professor/Coordenador) unificadas na store `useAuthStore`. |
| **Grupo 7** | Formatação de Data | ✅ Concluído | ~130 | ~8 linhas puras removidas. Padronização de formatação de data com correção automática de fuso horário via helper `formatDate`. |
| **Grupo 8** | Upload de Arquivo com Preview | ✅ Concluído (Parcial) | ~150 | ~65 linhas puras removidas. Migração do logo upload no modal de escola e unificação de upload/sanitização no modal de anexos do aluno. |
| **Grupo 9** | Estado de Loading | ✅ Concluído (Parcial) | ~300 | ~30 linhas puras removidas. Migração de loaders manuais para o `<LoadingSpinner>` em Cargos e Escolas. |
| **Grupo 10** | `useEffect` de Dados ao Abrir Modal | ✅ Concluído (Parcial) | ~280 | ~25 linhas puras economizadas no modal-aluno. Lógicas de consulta de tabelas auxiliares (turmas/escolas) migradas para hooks SWR, reduzindo código imperativo e requests repetidas. |
| **Grupo 11** | Empty State Genérico | ✅ Concluído (Parcial) | ~160 | ~28 linhas puras removidas. Migração de mensagens locais de lista vazia para o `<EmptyState>` em Cargos e Escolas. |
| **Grupo 12** | Scaffold de Tabelas standard | ✅ Concluído | ~1000 | ~446 linhas puras removidas. Lógicas de layout, cabeçalho, carregamento e empty state padronizadas via componente genérico `<StandardTable>` (incluindo atestados, ocorrências, transferências e caixa da escola). |
 
---
 
## 📝 Histórico de Alterações e Impacto Real
 
### [19/07/2026] - Refatoração de Cascas de Modais / Dialogs (Frente 2)
* Migração das cascas externas de 6 modais críticos (`ModalDetalhesAluno`, `ModalTurma`, `ModalAluno` (index), `ModalFuncionario` (index), `ModalTransferirAluno` e `ModalTransferirFuncionario`) para utilizarem o componente unificado `<StandardDialog>`.
* Padronização de botões de controle, títulos e fechamentos. Utilização de `form` HTML5 associado no footer externo para submissão dos formulários sem quebrar o lifecycle de sub-abas.
* Tratamento e mitigação de bugs silenciosos mapeados (evitado fechamento acidental em formulários extensos e removidos botões "X" duplicados de cabeçalho).
* Validação do build executada com 100% de sucesso.

### [19/07/2026] - Refatoração de Buscas, Toasts e Uploads (Frentes 3, 4 e 5) + Correção de Bugs
* Migração das listagens de Alunos e Funcionários para utilizarem a busca resiliente a acentos e case-insensitive por meio do hook centralizado `useLocalSearch`.
* Substituição de blocos try/catch e loaders manuais por chamadas unificadas no utilitário `executeWithToast` nas mutações de responder liberação e desligar funcionários.
* Centralização da sanitização de nomes de arquivos e extensão do Supabase Storage no modal de anexos do aluno e no formulário de dados do funcionário.
* Validação do build executada com 100% de sucesso.

### [19/07/2026] - Refatoração de Tabelas (Frente 1), Modais (Frente 2) e Correção de Bugs
* Migração das tabelas administrativas de Atestados (`atestados`), Ocorrências (`ocorrencias`), Transferências (`transferencias`) e Caixa Escolar (`financeiro`) para utilizarem o componente reutilizável `<StandardTable>`.
* Correção de bug silencioso de filtro fantasma no Caixa Escolar (`financeiro`), aplicando os filtros de conta e mês de forma funcional nos saldos e extratos.
* Inclusão de blocos `try/catch` robustos, toasts em caso de erro e proteção com `isMounted` contra memory leak nas chamadas assíncronas de ocorrências e atestados.
* Migração dos modais `ModalAlunosAnexos`, `ModalConfirmacaoSenha` e `ModalResetSenhaUser` para o componente unificado `<StandardDialog>`.
* Validação do build executada com 100% de sucesso.
 
### [19/07/2026] - Refatoração de Tabelas, Uploads, Loadings e Empty States (Cargos e Escolas)
* Migração das tabelas administrativas de Cargos (`admin/cargos`) e Escolas (`admin/escolas`) para utilizarem o componente reutilizável `<StandardTable>`.
* Eliminação de loaders (`animate-spin`) e blocos de listas vazias duplicados, substituídos pelos componentes genéricos `<LoadingSpinner>` e `<EmptyState>`.
* Refatoração do upload de logo no `ModalEscola` para utilizar o componente `<FileUpload>`, tratando ID específico de Toast para evitar dismiss geral e implementando constante de sessão com referência para cache-busting.
* Correção de bug sutil de avaliação falsy do salário base `0` na página de cargos.
* Validação do build executada com 100% de sucesso.

### [19/07/2026] - Refatoração dos Grupos 6 e 7 Concluída
* Centralização das permissões de cargo (`isProfessor` e `isCoordenador`) na store de autenticação global [useAuthStore](file:///c:/Users/Pc/Documents/GitHub/SIG/src/store/useAuthStore.ts). Refatoradas as páginas `turmas` e `alunos`.
* Criação do helper [formatDate](file:///c:/Users/Pc/Documents/GitHub/SIG/src/lib/utils.ts) com suporte a tratamento de fuso horário local em strings de data YYYY-MM-DD. Refatoradas as páginas `ocorrencias` e `admin/solicitacoes`.
* Validação do build executada com 100% de sucesso.

### [19/07/2026] - Refatoração do Grupo 5 Concluída
* Criação do utilitário [executeWithToast](file:///c:/Users/Pc/Documents/GitHub/SIG/src/lib/action-handler.ts) para padronizar try/catch/finally e feedback de Toasts.
* Refatoração de 4 rotinas assíncronas em: `cargos` (exclusão), `escolas` (exclusão) e `dispositivos` (exclusão e alteração de status).
* Validação do build executada com 100% de sucesso.

### [19/07/2026] - Refatoração do Grupo 4 Concluída
* Criação do hook de React reutilizável [useLocalSearch](file:///c:/Users/Pc/Documents/GitHub/SIG/src/hooks/useLocalSearch.ts) com normalização automática de acentos e prevenção de recomputação de callbacks.
* Refatoração de 5 listagens administrativas: `cargos`, `escolas`, `acessos`, `dispositivos` e `armazenamento`.
* Validação do build executada com 100% de sucesso.

### [19/07/2026] - Refatoração dos Grupos 1 e 3 Concluída
* Criação do componente reutilizável [StandardDialog](file:///c:/Users/Pc/Documents/GitHub/SIG/src/components/ui/standard-dialog.tsx) e refatoração de 5 modais: `ModalAtestado`, `ModalEscala`, `ModalLancamentoFinanceiro`, `ModalNovaOcorrencia` e `ModalAdicionalSalario`.
* Criação do componente reutilizável [PrintHeader](file:///c:/Users/Pc/Documents/GitHub/SIG/src/components/print/print-header.tsx) e refatoração de 5 layouts de impressão: `print-boletim-aluno`, `print-boletim-sapeacu`, `print-comprovante-matricula`, `print-documento-escolar` e `print-ficha-aluno`.
* Validação do build executada com 100% de sucesso.

### [19/07/2026] - Refatoração do Grupo 10 (Parcial) Concluída
* Eliminação de efeitos imperativos de carregamento de turmas/escolas em `AlunoFormContext.tsx` do modal do aluno, substituídos por hooks SWR reativos e declarativos.
* Adição de proteção com flag `active` no observer de assinatura do funcionário em `SecaoAssinaturas.tsx` para evitar vazamentos de memória (memory leaks) em fechamentos rápidos.
* Validação do build executada com 100% de sucesso.

### [18/07/2026] - Refatoração do Grupo 12 Concluída
* Criação do componente genérico `<StandardTable>` em `src/components/ui/table.tsx` com tratamento unificado de loading spinner, mensagens de empty state e estilos padrões.
* Refatoração e eliminação de tabelas cruas repetitivas nas telas `ponto-mobile/page.tsx`, `configuracoes/GradeCurricularTab.tsx` e `alunos/page.tsx`.
* Redução de código redundante e acoplamento nos renders de listagem.
* Validação do build executada com 100% de sucesso.

### [14/07/2026] - Refatoração do Grupo 2 Concluída
* Criação do hook `usePessoaForm` unificando mais de 30 states duplicados de informações pessoais e endereço.
* Refatorados os modais `modal-aluno.tsx` e `modal-funcionario.tsx`.
* Removidas máscaras redundantes de CPF e CEP.
* Validação do build executada com 100% de sucesso.

### [14/07/2026] - Criação do Relatório Inicial
* Criação do painel de acompanhamento e definição dos grupos prioritários.

---

## 🔍 Detalhamento das Metas e Arquivos Mais Afetados

### Arquivos Críticos de Foco:
1. `src/components/modals/modal-aluno.tsx` (1.888 linhas)
2. `src/components/modals/modal-funcionario.tsx` (1.518 linhas)
3. `src/components/ModalDetalhesTurma.tsx` (1.394 linhas)
4. `src/app/(dashboard)/funcionarios/page.tsx` (1.416 linhas)
5. `src/app/(dashboard)/configuracoes/page.tsx` (973 linhas)
