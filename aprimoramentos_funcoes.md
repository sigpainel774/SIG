# Prevenção de Recursão Infinita em RLS (PostgreSQL/Supabase)

Este documento explica detalhadamente como e quando podem ocorrer travamentos de segurança por **Recursão Infinita** no Row Level Security (RLS) ao utilizar funções configuradas no modo padrão `SECURITY INVOKER`, usando como exemplo as funções do projeto SIG: `gerar_agenda_ano_letivo`, `set_next_escola_codigo` e `gerar_numero_matricula`.

---

## 💡 O Conceito de SECURITY INVOKER vs SECURITY DEFINER

No PostgreSQL, as funções possuem dois modos de execução de privilégios:

1. **`SECURITY INVOKER` (Padrão)**: A função é executada com os privilégios do usuário que a chamou. Se esse usuário estiver sujeito a políticas RLS nas tabelas consultadas dentro da função, o Postgres aplicará o RLS a essas consultas internas.
2. **`SECURITY DEFINER`**: A função é executada com os privilégios do usuário que a **criou** (geralmente o superusuário `postgres`). O RLS das tabelas consultadas dentro da função é completamente ignorado durante sua execução.

---

## ⚠️ Cenários de Risco para Recursão Infinita

Para que um travamento ou erro de recursão infinita ocorra com funções `SECURITY INVOKER`, são necessários dois fatores simultâneos:
1. A função ser chamada direta ou indiretamente de dentro de uma política RLS.
2. A função realizar operações (SELECT, INSERT, UPDATE, DELETE) na própria tabela protegida pela política.

Abaixo estão os cenários hipotéticos de como esse bug se manifestaria nas funções do sistema:

### 1. `gerar_numero_matricula` (Tabela: `public.alunos`)
Esta função gera a matrícula de novos alunos. Ela realiza um `SELECT COUNT(*)` na tabela `alunos` para computar a numeração sequencial.

* **Cenário de Falha:**
  Se criássemos uma política de escrita (`INSERT`) em `alunos` para validar se a matrícula enviada segue o padrão correto gerado pela função:
  ```sql
  CREATE POLICY "alunos_insert_policy" ON public.alunos
  FOR INSERT WITH CHECK (
    numero_matricula = gerar_numero_matricula(id, escola_id, NOW()::date)
  );
  ```
* **Fluxo do Travamento:**
  1. O sistema tenta inserir um novo aluno na tabela `alunos`.
  2. O Postgres intercepta a ação e avalia a política RLS `alunos_insert_policy`.
  3. A política executa a função `gerar_numero_matricula` sob o contexto de `SECURITY INVOKER` (sujeito ao RLS).
  4. Dentro de `gerar_numero_matricula`, é executado um `SELECT` na tabela `alunos`.
  5. Como o `SELECT` é feito em `alunos`, o Postgres intercepta a consulta e aplica a política de leitura (`SELECT`) de `alunos`.
  6. Se a política de leitura também depender de validações na mesma tabela, gera-se um loop circular infinito. O banco detecta a recursividade e aborta a operação com o erro:
     `ERROR: infinite recursion detected in row-level security policy`

---

### 2. `set_next_escola_codigo` (Tabela: `public.escolas`)
Esta função calcula o próximo sequencial numérico identificador de escolas fazendo um `SELECT MAX(codigo) FROM escolas`.

* **Cenário de Falha:**
  Se criássemos uma política RLS restritiva na tabela `escolas` dizendo que um usuário só pode visualizar escolas cujo código seja menor ou igual ao próximo código de escola disponível:
  ```sql
  CREATE POLICY "escolas_read_policy" ON public.escolas
  FOR SELECT USING (
    codigo <= set_next_escola_codigo()
  );
  ```
* **Fluxo do Travamento:**
  1. O usuário tenta ler a listagem de escolas: `SELECT * FROM escolas`.
  2. O RLS intercepta a leitura e avalia a política `escolas_read_policy`.
  3. A política chama `set_next_escola_codigo()`.
  4. Como a função roda em modo `SECURITY INVOKER`, o `SELECT MAX(codigo) FROM escolas` de dentro dela sofre a intervenção do RLS.
  5. O Postgres reaplica a política `escolas_read_policy` para validar a consulta da função.
  6. A política chama novamente `set_next_escola_codigo()`, gerando um loop infinito imediato.

---

### 3. `gerar_agenda_ano_letivo` (Tabela: `public.agenda_aulas`)
Esta função lê a grade escolar e insere múltiplos registros de aulas em lote na tabela `agenda_aulas` para preencher o ano letivo.

* **Cenário de Falha:**
  Se uma política de segurança para inserção na tabela `agenda_aulas` exigisse o recálculo ou validação em tempo real chamando a função geradora:
  ```sql
  CREATE POLICY "agenda_insert_policy" ON public.agenda_aulas
  FOR INSERT WITH CHECK (
     EXISTS (
        SELECT 1 FROM gerar_agenda_ano_letivo(...) WHERE data_aula = data
     )
  );
  ```
* **Fluxo do Travamento:**
  1. Uma inserção é feita na tabela `agenda_aulas`.
  2. A política RLS `agenda_insert_policy` é ativada e invoca a função `gerar_agenda_ano_letivo()`.
  3. Por sua vez, a função `gerar_agenda_ano_letivo()` executa vários comandos `INSERT INTO agenda_aulas`.
  4. Cada `INSERT` interno da função dispara novamente a política `agenda_insert_policy`.
  5. A política executa novamente `gerar_agenda_ano_letivo()`, causando um transbordamento de pilha de chamadas (Stack Overflow) e derrubando a transação.

---

## 🛡️ Como Prevenir e Corrigir

Se em algum momento do desenvolvimento for indispensável usar uma função que consulta dados de tabelas dentro de uma política de RLS, siga estes passos para blindar o sistema:

### 1. Modificar para SECURITY DEFINER
Altere a assinatura de criação da função para utilizar `SECURITY DEFINER` e garantir que ela rode no contexto do superusuário do banco de dados (ignorando o RLS nas suas consultas internas):
```sql
ALTER FUNCTION public.gerar_numero_matricula(uuid, uuid, date) SECURITY DEFINER;
```

### 2. Definir search_path Seguro
Ao utilizar `SECURITY DEFINER`, é mandatório configurar explicitamente o `search_path` para evitar que usuários maliciosos criem tabelas ou operadores falsificados em outros schemas para sequestrar a execução da função:
```sql
CREATE OR REPLACE FUNCTION public.gerar_numero_matricula(...)
...
SECURITY DEFINER
SET search_path = public
AS $$
...
$$;
```
