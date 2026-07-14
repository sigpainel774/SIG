# 📊 Acompanhamento de Supressão de Duplicações

Este documento serve para monitorar o progresso na eliminação de código duplicado no projeto SIG. À medida que as refatorações forem implementadas, o progresso e o impacto em linhas de código serão atualizados aqui.

---

## 📈 Status Geral

* **Percentual Inicial de Duplicação (Estimado):** ~28,5% (~10.000 linhas)
* **Percentual Atual de Duplicação:** ~27,7%
* **Linhas de Código Removidas/Otimizadas:** ~267
* **Redução Acumulada do Projeto:** ~0,76%

---

## 🛠️ Progresso dos Grupos de Refatoração

| Grupo | Descrição | Status | Linhas Estimadas Economizadas | Impacto Real |
|---|---|---|---|---|
| **Grupo 1** | Estruturas de Dialog/Modal | ⏳ Pendente | ~570 | - |
| **Grupo 2** | `useState` de campos pessoais (Aluno ↔ Funcionário) | ✅ Concluído | ~400 | ~267 linhas puras removidas. Lógicas de inicialização, reset e masks centralizadas via hook `usePessoaForm`. |
| **Grupo 3** | Cabeçalho de Impressão Municipal | ⏳ Pendente | ~360 | - |
| **Grupo 4** | Padrão de Busca/Filtro Local | ⏳ Pendente | ~500 | - |
| **Grupo 5** | Boilerplate de Toasts (Try/Catch/Finally) | ⏳ Pendente | ~600 | - |
| **Grupo 6** | Verificações de Permissão por Cargo | ⏳ Pendente | ~250 | - |
| **Grupo 7** | Formatação de Data | ⏳ Pendente | ~130 | - |
| **Grupo 8** | Upload de Arquivo com Preview | ⏳ Pendente | ~120 | - |
| **Grupo 9** | Estado de Loading | ⏳ Pendente | ~300 | - |
| **Grupo 10** | `useEffect` de Dados ao Abrir Modal | ⏳ Pendente | ~280 | - |
| **Grupo 11** | Empty State Genérico | ⏳ Pendente | ~160 | - |
| **Grupo 12** | Scaffold de Tabelas standard | ⏳ Pendente | ~800 | - |

---

## 📝 Histórico de Alterações e Impacto Real

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
