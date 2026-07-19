# 📊 Acompanhamento de Supressão de Duplicações

Este documento serve para monitorar o progresso na eliminação de código duplicado no projeto SIG. À medida que as refatorações forem implementadas, o progresso e o impacto em linhas de código serão atualizados aqui.

## 💡 Benefício de Performance (Shared Chunks)

> [!NOTE]
> **Code-Splitting & Cache Reutilizável**: Ao centralizar as lógicas duplicadas em componentes ou hooks compartilhados, o compilador do Next.js (Webpack/Turbopack) gera *shared chunks* (pedaços compartilhados de código). O navegador baixa e faz cache desse código comum uma única vez. Quando o usuário navega entre rotas que usam o mesmo componente, o navegador reutiliza o cache em vez de baixar dados duplicados, reduzindo drasticamente o tempo de carregamento das telas.

---

## 📈 Status Geral

* **Percentual Inicial de Duplicação (Estimado):** ~28,5% (~10.000 linhas)
* **Percentual Atual de Duplicação:** ~23,2%
* **Linhas de Código Removidas/Otimizadas:** ~917
* **Redução Acumulada do Projeto:** ~2,60%

---

## 🛠️ Progresso dos Grupos de Refatoração

| Grupo | Descrição | Status | Linhas Estimadas Economizadas | Impacto Real |
|---|---|---|---|---|
| **Grupo 1** | Estruturas de Dialog/Modal | ✅ Concluído | ~570 | ~360 linhas puras removidas. Lógicas de estilização de modal escura densa, breakpoints responsivos e controle de Dialog unificados via componente `<StandardDialog>`. |
| **Grupo 2** | `useState` de campos pessoais (Aluno ↔ Funcionário) | ✅ Concluído | ~400 | ~267 linhas puras removidas. Lógicas de inicialização, reset e masks centralizadas via hook `usePessoaForm`. |
| **Grupo 3** | Cabeçalho de Impressão Municipal | ✅ Concluído | ~360 | ~115 linhas puras removidas. Simetria física de logos da prefeitura/secretaria e cache-buster unificados via componente `<PrintHeader>`. |
| **Grupo 4** | Padrão de Busca/Filtro Local | ⏳ Pendente | ~500 | - |
| **Grupo 5** | Boilerplate de Toasts (Try/Catch/Finally) | ⏳ Pendente | ~600 | - |
| **Grupo 6** | Verificações de Permissão por Cargo | ⏳ Pendente | ~250 | - |
| **Grupo 7** | Formatação de Data | ⏳ Pendente | ~130 | - |
| **Grupo 8** | Upload de Arquivo com Preview | ⏳ Pendente | ~120 | - |
| **Grupo 9** | Estado de Loading | ⏳ Pendente | ~300 | - |
| **Grupo 10** | `useEffect` de Dados ao Abrir Modal | ✅ Concluído (Parcial) | ~280 | ~25 linhas puras economizadas no modal-aluno. Lógicas de consulta de tabelas auxiliares (turmas/escolas) migradas para hooks SWR, reduzindo código imperativo e requests repetidas. |
| **Grupo 11** | Empty State Genérico | ⏳ Pendente | ~160 | - |
| **Grupo 12** | Scaffold de Tabelas standard | ✅ Concluído | ~800 | ~150 linhas puras removidas. Lógicas de layout, cabeçalho, carregamento e empty state padronizadas via componente genérico `<StandardTable>`. |

---

## 📝 Histórico de Alterações e Impacto Real

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
