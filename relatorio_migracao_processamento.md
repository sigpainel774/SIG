# Relatório de Migração de Processamento (Front-end ➔ Back-end)

Este documento mapeia os cálculos e processamentos densos de dados que atualmente rodam no navegador (Front-end) do usuário no projeto SIG, apresentando propostas de migração para o banco de dados Supabase/PostgreSQL (Back-end) para otimizar desempenho, segurança e consumo de dados de rede.

---

## 1. Cálculo de Médias Trimestrais e Situação do Aluno (`calculosNotas`)

*   **Localização Atual:** [useTurmaDetalhes.ts](file:///c:/Users/Pc/Documents/GitHub/SIG/src/hooks/useTurmaDetalhes.ts) e [TabNotasTurma.tsx](file:///c:/Users/Pc/Documents/GitHub/SIG/src/components/turmas/TabNotasTurma.tsx).
*   **Descrição:** Realiza a leitura e parsing das 4 notas bimestrais/unidades e nota de recuperação, calcula as médias trimestrais e define se o aluno está aprovado, reprovado, cursando ou em recuperação, varrendo em loop todas as combinações de alunos e disciplinas da turma.
*   **Problema:** Alta carga de CPU no navegador do usuário ao abrir turmas grandes (ex: 45 alunos e 12 matérias = 540 iterações densas). Lógica duplicada se for necessário exibir boletins em outros locais ou gerar PDF de impressão.
*   **Solução Proposta:** Criar uma **PostgreSQL View** que realize o cálculo matemático e a lógica de status utilizando SQL nativo. O Front-end passará a consumir apenas a view consolidada:
    ```sql
    CREATE VIEW public.boletins_consolidados AS
    SELECT 
        aluno_id,
        materia_id,
        -- Lógica de médias aritméticas/ponderadas aqui
        -- Lógica de Situação (Aprovado, Cursando, Reprovado)
    FROM public.notas;
    ```

---

## 2. Filtragem de Alunos com Necessidades Educacionais Especiais (NEE)

*   **Localização Atual:** [RelatorioNecessidades.tsx](file:///c:/Users/Pc/Documents/GitHub/SIG/src/components/relatorios/RelatorioNecessidades.tsx) (linhas 99-103).
*   **Descrição:** Baixa a lista inteira de alunos da escola trazendo o JSONB `dados_matricula` e executa um `.filter()` em memória JavaScript buscando por atributos como `neeAluno === 'Sim'` e `deficienciaAluno === 'Sim'`.
*   **Problema:** Desperdício de tráfego de rede (baixa dados confidenciais de alunos que não necessitam constar no relatório) e violação de princípios de privacidade (LGPD) por expor dados de saúde desnecessariamente ao Front-end antes do filtro.
*   **Solução Proposta:** Executar a filtragem diretamente no PostgreSQL utilizando queries com operadores JSONB:
    ```typescript
    const { data } = await supabase
      .from('alunos')
      .select('id, nome, dados_matricula, turmas(nome)')
      .or('dados_matricula->>neeAluno.eq.Sim,dados_matricula->>deficienciaAluno.eq.Sim')
      .is('deleted_at', null);
    ```

---

## 3. Consolidação Geral de Frequência Diária da Escola (KPI da Home)

*   **Localização Atual:** [home/page.tsx](file:///c:/Users/Pc/Documents/GitHub/SIG/src/app/%28dashboard%29/home/page.tsx).
*   **Descrição:** Faz o download de todos os registros de presença de alunos do dia corrente de toda a escola e usa uma estrutura `new Set()` no JavaScript para cruzar e encontrar as turmas ativas que já preencheram a frequência.
*   **Problema:** Escalabilidade comprometida. Se uma escola tem 1.000 alunos, o dashboard inicial tentará baixar milhares de linhas de presença individuais do dia apenas para desenhar uma barra de progresso no cabeçalho.
*   **Solução Proposta:** Mover a contagem agregada para uma **Remote Procedure Call (RPC)** no Supabase ou uma View resumida de estatísticas diárias:
    ```sql
    CREATE OR REPLACE FUNCTION public.obter_kpi_presenca_hoje(p_escola_id UUID)
    RETURNS TABLE (turmas_com_presenca INT, total_turmas INT) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            COUNT(DISTINCT f.turma_id)::INT,
            COUNT(DISTINCT t.id)::INT
        FROM public.turmas t
        LEFT JOIN public.frequencias f ON f.turma_id = t.id AND f.data = CURRENT_DATE
        WHERE t.escola_id = p_escola_id AND t.deleted_at IS NULL;
    END;
    $$ LANGUAGE plpgsql;
    ```
