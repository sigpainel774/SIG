# Plano de profissionalização — Desempenho e Auditoria ROOT

## Contexto

Os dois painéis já oferecem boa visibilidade operacional: o de desempenho reúne Web Vitals, tempos de navegação e dimensões de dispositivo; o de auditoria preserva antes/depois das alterações. O objetivo desta evolução é torná-los confiáveis para decisão, seguros para dados administrativos e escaláveis quando a base de usuários crescer.

Impacto atual mais relevante: a política `dev_all_authenticated` de `performance_metrics` permite que qualquer usuário autenticado leia e apague métricas pelo cliente. Além disso, o painel de desempenho pode refazer consultas em sequência porque instancia o cliente Supabase a cada render e o inclui na dependência de `loadData`.

## Erros silenciosos

| ID | Achado | Consequência |
| --- | --- | --- |
| ES-1 | `createClient()` é chamado durante o render de `/admin/desempenho`; `supabase` entra nas dependências de `useCallback`. | Se a instância não for estável, cada `setState` recria `loadData`, dispara `useEffect` e pode gerar recargas repetidas. |
| ES-2 | Score começa em `100` quando não há amostras. | Ausência de dados aparece como UX “Excelente”, induzindo decisão errada. |
| ES-3 | Score considera todas as métricas, enquanto P95/P99 e tabelas consideram somente `ROUTE_CHANGE_MS`. | O KPI principal não é comparável aos demais e pode variar por volume de CLS/FCP/LCP. |
| ES-4 | Rota é agregada pelo `pathname` bruto. | Parâmetros ou IDs dinâmicos fragmentam as amostras e escondem o gargalo da tela real. |
| ES-5 | A tela de auditoria lê `select('*')` antes de abrir o Diff. | JSONs completos — possivelmente com PII — trafegam e ficam na memória mesmo sem inspeção. |
| ES-6 | O “Diff” apenas mostra dois JSONs; não indica campos mudados, nem mascara campos sigilosos. | Revisão lenta e risco de exposição de CPF, endereço, tokens ou URLs privadas. |

## Mudanças propostas

### Fase 1 — Segurança, consistência e confiança (prioridade imediata)

1. Substituir a política de desenvolvimento de `performance_metrics` por RLS de produção: inserir somente a própria telemetria, leitura/agregação e exclusão somente para superadmin. Preferir Route Handler/Server Action para a limpeza, validando a autorização no servidor e registrando a ação em `audit_logs`.
2. Estabilizar o cliente Supabase nos dois painéis (singleton de browser ou `useMemo`) e separar o carregamento da página do estado de loading para impedir reconsultas involuntárias.
3. Trocar o score vazio por `null`/“Sem dados” e exibir cobertura: número de amostras, usuários distintos e aviso de baixa confiança abaixo de um limite definido (por exemplo, 30 navegações).
4. Definir explicitamente o contrato do score: inicialmente, calcular somente a partir de `ROUTE_CHANGE_MS`; numa evolução posterior, criar um score ponderado por métrica, com pesos e metas documentados.
5. Tornar `audit_logs` append-only: bloquear `UPDATE`/`DELETE` em banco, restringir leitura a ROOT, confirmar RLS e registrar ator, entidade, `entity_id`, tenant, IP e correlação de requisição.

### Fase 2 — Diagnóstico que leva a ação

1. Normalizar rotas para um identificador de tela (ex.: `/alunos/[id]`) e incluir filtros por rota, métrica, escola, navegador, tipo de rede e faixa de hardware.
2. Trocar a ordenação por média por uma visão combinada: P50, P75, P95, P99, amostras e taxa de “ruim”. Use média apenas como informação complementar, pois outliers a distorcem.
3. Adicionar série temporal (hora/dia) para P75/P95 e taxa de erro; destacar regressão versus período anterior e o horário de início.
4. Criar limites coerentes por métrica — CLS não é ms — e mostrar a definição da meta por tooltip. Atualizar FID para indicador legado e tratar INP como métrica principal de responsividade.
5. Adicionar amostragem, fila/batch e limite de taxa ao `PerformanceTracker`; evitar que picos de navegação façam um `insert` por métrica por sessão sem controle. Armazenar versão do app/build, navegador e dispositivo de forma normalizada, sem reter `user_agent` bruto se não for necessário.
6. No log de auditoria, carregar a lista com colunas resumidas e buscar os dados completos apenas ao abrir o detalhe. Implementar diff por campo, grupos “alterado/adicionado/removido”, busca, paginação cursor-based, período, ação, módulo e responsável.

### Fase 3 — Operação madura e governança (opcional, alto valor)

1. Configurar alertas acionáveis: regressão sustentada de P95, queda de score com cobertura suficiente e aumento de ações destrutivas por módulo/usuário. Cada alerta deve vincular à rota ou aos logs filtrados que o originaram.
2. Criar retenção em camadas: telemetria bruta curta (30–90 dias), agregados diários por mais tempo; auditoria com prazo legal definido, exportação e trilha de acesso à própria auditoria.
3. Oferecer exportação CSV/JSON respeitando filtros, com registro de quem exportou e marcação de dados sensíveis.
4. Criar um painel-resumo ROOT: saúde agora, regressões abertas, operações sensíveis recentes e links diretos para a investigação filtrada.

## Prioridade

| Item | Gargalo/ES | Fase | Impacto |
| --- | --- | --- | --- |
| RLS e limpeza no servidor | Acesso amplo e exclusão client-side de telemetria | 1 | Crítico |
| Auditoria imutável e leitura ROOT | Integridade e confidencialidade da trilha | 1 | Crítico |
| Cliente Supabase estável | ES-1, recargas/consultas repetidas | 1 | Alto |
| Score com cobertura e contrato único | ES-2 e ES-3 | 1 | Alto |
| Diff sob demanda com mascaramento | ES-5 e ES-6 | 2 | Alto |
| Percentis, tendências e regressão | Média não acionável | 2 | Alto |
| Normalização/filtros de rota | ES-4 | 2 | Médio |
| Amostragem e agregados de retenção | Escalabilidade/custo | 2–3 | Alto |
| Alertas e exportação auditável | Operação proativa | 3 | Médio |

## Plano de verificação

1. Executar `npx tsc --noEmit --incremental false` após cada fase de implementação.
2. Testar com conta comum e conta ROOT: a conta comum insere somente a própria telemetria e não consulta, apaga ou chama agregados globais; ROOT acessa o painel e a limpeza autorizada.
3. Validar que abrir `/admin/desempenho` gera uma única carga por mudança de período/página, sem novas chamadas após a tela ficar ociosa.
4. Conferir estados vazios, baixa amostragem, falha de rede, dados de navegador indisponíveis e páginas além do total.
5. Criar uma atualização de teste em um registro: validar resumo, diff por campo, máscara de dados sensíveis, link para o registro e imutabilidade do log.
6. Simular um aumento de latência e conferir tendência, comparação de período, alerta e navegação para a rota filtrada.
