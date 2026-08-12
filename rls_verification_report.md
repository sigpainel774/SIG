# Relatório de Diagnóstico: Impacto das Novas Políticas de RLS no SIG

**Data da Auditoria**: 12 de Agosto de 2026  
**Ambiente**: Supabase (Produção / Desenvolvimento)  
**Status**: ⚠️ **ATENÇÃO REQUERIDA — 45 Tabelas com Bloqueio Silencioso Encontradas**

---

## 🎯 EXECUTIVE SUMMARY

Após a execução da migration `20260812003000_abac_rls_production.sql` (que removeu a política global `dev_all_authenticated` para implantar o controle de acesso ABAC), **45 tabelas do sistema permaneceram com o RLS Habilitado (`rls_enabled = true`), porém SEM NENHUMA POLÍTICA RLS associada (`has_policies = false`)**.

No PostgreSQL/Supabase, quando uma tabela tem RLS ativo mas nenhuma política definida:
1. Consultas de leitura (**`SELECT`**) efetuadas via cliente front-end (`@/lib/supabaseClient` por usuários autenticados não-superadmin) **retornam 0 linhas em silêncio (`data = []`, sem erro no console)**.
2. Inserções (**`INSERT`**) falham imediatamente com o erro `new row violates row-level security policy`.
3. Alterações e exclusões (**`UPDATE` / `DELETE`**) afetam 0 registros em silêncio.

---

## 🔍 MÓDULOS E RECURSOS AFETADOS NO FRONT-END

A auditoria identificou que as seguintes telas e componentes React estão diretamente impactados quando acessados por servidores, diretores, secretários ou professores (usuários autenticados não-superadmin):

| Módulo / Tela | Tabela Afetada | Sintoma no Sistema |
|---|---|---|
| **Anexos e Documentos de Alunos** (`ModalAlunosAnexos.tsx`, `useTransferencias.ts`) | `alunos_anexos` | Lista de documentos do aluno aparece vazia e uploads de laudos/RG falham com erro de RLS. |
| **Ocorrências Escolares** (`ModalDetalhesAluno.tsx`, `ModalNovaOcorrencia.tsx`, `RelatorioOcorrencias.tsx`) | `ocorrencias` | Histórico de ocorrências do aluno não carrega (retorna `[]`) e novos registros são bloqueados. |
| **Transferências de Alunos** (`modal-transferir-aluno.tsx`, `useTransferencias.ts`) | `transferencias_alunos` | Solicitações de transferência pendentes não aparecem no painel e novas solicitações falham ao enviar. |
| **Módulo EMAEE (AEE)** (`emaee/fila-espera`, `emaee/pacientes`, `modal-matricula-emaee`) | `emaee_matriculas`, `emaee_evolucoes`, `emaee_especialidades_vinculadas`, `emaee_solicitacoes_relatorios` | Fila de espera e prontuários do EMAEE aparecem totalmente vazios para os profissionais de AEE. |
| **Controle de Atestados** (`atestados/page.tsx`) | `atestados` | Atestados de servidores não são listados e envio de novos atestados é rejeitado pelo Postgres. |
| **Atividades e Diários de Classe** (`atividades_secretaria`) | `atividades_secretaria`, `atividades_secretaria_historico` | Entregas de diários e planejamentos para a secretaria não são listadas. |
| **Grade de Horários e Agenda** | `grade_semanal`, `horarios_aulas_slots`, `grade_curricular_escola`, `agenda_aulas` | Consultas diretas da grade de aulas falham silenciosamente se feitas via cliente browser. |
| **Transporte Escolar** | `rotas_transporte`, `veiculos`, `alunos_transporte`, `manutencoes_veiculos`, `abastecimentos_veiculos` | Consultas de rotas e veículos retornam vazio para usuários da rede. |
| **Ronda de Segurança e Serviços** | `rotas_ronda`, `registros_ronda`, `pontos_ronda`, `escalas_servico` | Pontos de patrulha e escalas de serviço bloqueados no client. |

---

## 🛡️ RESULTADOS DOS TESTES DE LEITURA E ESCRITA (NÃO-DESTRUTIVOS)

Realizamos testes de leitura e escrita simulados via transação SQL (`BEGIN; ... ROLLBACK;`) sob a role `authenticated` com o JWT do servidor `Carine Nascimento Macedo` (`auth_user_id`: `256b129e-359f-4034-a8f7-ff87ffa4bbd0`):

### 1. Tabelas com Políticas ABAC Ativas (APROVADAS ✅)
- **`alunos`**: `311` registros visíveis conforme a escola da usuária.
- **`funcionarios`**: `49` servidores visíveis.
- **`escolas`**: `16` escolas visíveis.
- **`turmas`**: `15` turmas visíveis.
- **`materias`**: `339` disciplinas visíveis.
- **`bug_reports`**: Testes de `INSERT`, `UPDATE` e `DELETE` concluídos com sucesso (e desfeitos via ROLLBACK).

### 2. Tabelas com RLS Ativo mas 0 Políticas (REJEITADAS ❌)
- **`alunos_anexos`**: `INSERT` rejeitado com `new row violates row-level security policy for table "alunos_anexos"`.
- **`transferencias_alunos`**: `INSERT` rejeitado com `new row violates row-level security policy for table "transferencias_alunos"`.
- **`ocorrencias`**: `INSERT` rejeitado com `new row violates row-level security policy for table "ocorrencias"`.
- **`emaee_matriculas`**: `INSERT` rejeitado com `new row violates row-level security policy for table "emaee_matriculas"`.
- **`atestados`**: `INSERT` rejeitado com `new row violates row-level security policy for table "atestados"`.

---

## 🔧 ANÁLISE DE HELPER FUNCTIONS (RECURSÃO INFINITA)

Auditamos a declaração das funções utilitárias do RLS em `public`:
- `is_admin_global` -> **`SECURITY DEFINER`** ✅
- `get_meu_funcionario_id` -> **`SECURITY DEFINER`** ✅
- `get_minhas_escolas_ids` -> **`SECURITY DEFINER`** ✅
- `get_meu_nivel_maximo` -> **`SECURITY DEFINER`** ✅
- `tem_acesso_a_escola` -> **`SECURITY DEFINER`** ✅
- `is_superadmin_by_uid` -> **`SECURITY DEFINER`** ✅
- `pode_ler_funcionario` -> **`SECURITY DEFINER`** ✅

**Conclusão sobre Recursão**: Todas as funções auxiliares utilizam `SECURITY DEFINER`. Não há risco de loop de recursão infinita no Postgres.

---

## 💡 RECOMENDAÇÃO E SOLUÇÃO

Para resolver os bloqueios mantendo o alto nível de segurança do sistema, deve ser criada uma nova migration (ex: `20260812010000_fix_sec_tables_rls.sql`) criando políticas RLS para essas 45 tabelas operacionais.

---
*Relatório gerado automaticamente pela ferramenta de diagnóstico de RLS do Antigravity.*
