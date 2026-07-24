# Raio-X técnico — escala, desempenho e riscos invisíveis

Data da análise: 24/07/2026  
Escopo estático: aplicação Next.js, rotas de API, consultas Supabase, migrações SQL, service worker e fluxos de assinatura/documentos. Não foram alterados arquivos do produto nesta auditoria.

## Conclusão executiva

A meta de **3.000 alunos, 200 professores e 70 secretários** é compatível com PostgreSQL/Supabase e com a arquitetura atual, desde que o sistema trate dados pedagógicos e relatórios como conjuntos paginados/agregados. O número de cadastros não é grande para o banco. O risco real é a combinação de consultas sem limite, processamento no navegador e alguns caminhos de autorização que hoje aceitam identificadores enviados pelo cliente.

Há melhorias concretas já presentes: divisão dinâmica das abas e modais de Transporte, paginação na lista principal de alunos, buscas de documentos limitadas a 15 resultados, redução de parte dos `select('*')`, cache de perfil no servidor e consolidação de alguns KPIs em RPCs. Essas alterações reduzem bem a carga inicial e as idas ao banco.

Contudo, encontrei três problemas que devem ser tratados antes de ampliar o uso da rede:

1. A geração de comprovante de matrícula aceita um `alunoId` e usa a chave administrativa **sem autenticar nem autorizar** a requisição.
2. As RPCs novas de painel são `SECURITY DEFINER` e não verificam internamente se o usuário pode consultar a escola/funcionário informado; combinadas com as rotas que aceitam IDs na URL, podem contornar o isolamento por RLS.
3. A coleta de assinatura por código de quatro dígitos não tem unicidade, proteção contra tentativas ou token de servidor. Com muitos atendimentos simultâneos, pode colidir e, se a operação anônima estiver habilitada para fazê-la funcionar, abre uma superfície séria de exposição e alteração de dados.

## Capacidade esperada

| Cenário | Volume provável | Situação atual | Risco principal |
|---|---:|---|---|
| Cadastros | 3.000 alunos e 270 colaboradores | Tranquilo para o banco, com índices | Listagens e perfis excessivos no cliente |
| Frequência anual | 600 mil registros/ano se houver uma chamada diária por aluno; vários milhões se houver chamada por disciplina | Índices básicos já existem | Consultas por escola/data trazem todas as linhas e agregam em JavaScript |
| Pico de uso | dezenas de sessões simultâneas em início/fim de turno | Viável | PDFs, consultas amplas e notificações em sequência podem concentrar trabalho |
| Relatórios de rede | milhares de alunos + notas + frequência | Não está pronto para consulta bruta no navegador | Transferência de muitos dados e filtros com custo quadrático |
| Métricas de UX | várias inserções por sessão e por navegação | Retenção de 30 dias ajuda | Inserts unitários e índices não ideais para percentis por período |

Estimativa importante: não é necessário projetar para 3.270 pessoas conectadas ao mesmo tempo. Mesmo assim, a arquitetura deve suportar dezenas de usuários simultâneos sem que cada um baixe a rede inteira ou dispare consultas repetidas.

## Achados críticos

### C-1 — geração de comprovante permite acesso administrativo sem sessão

**Evidência:** `src/app/api/matricula/gerar-pdf/route.ts` recebe somente `alunoId`, consulta e atualiza `alunos` com `supabaseAdmin`, faz upload de PDF e grava a assinatura. Não há chamada a `auth.getUser()`, verificação de função nem vínculo com a escola do aluno.

**Impacto:** qualquer pessoa que alcance a rota e descubra/obtenha um UUID de aluno pode disparar geração de documento oficial, consumir CPU e Storage e receber a URL pública do PDF. Além de vazamento de dados, é um vetor de abuso que piora muito sob internet pública e volume maior.

**Correção recomendada (P0):** autenticar antes de ler o corpo; localizar o funcionário pelo `auth.uid`; validar cargo/permissão e acesso à escola do aluno; limitar taxa por usuário/aluno; tornar o bucket de comprovantes privado e devolver URL assinada temporária. Registrar falhas e sucesso na auditoria.

### C-2 — RPCs `SECURITY DEFINER` de dashboard podem ignorar o isolamento da escola

**Evidência:** `supabase/migrations/20260725000000_dashboard_and_boletim_rpcs.sql` cria `obter_admin_dashboard_kpis`, `obter_multi_escolas_stats` e `obter_dados_boletim` como `SECURITY DEFINER`, mas elas não verificam `auth.uid()`, cargo ou acesso à escola/aluno recebido. As rotas `src/app/api/home/admin-kpis/route.ts` e `school-stats/route.ts` confirmam apenas que existe sessão e aceitam `escolaId`, `funcionarioId` e `escolaIds` fornecidos pela URL.

**Impacto:** se a migração for aplicada com a permissão padrão de execução, um usuário autenticado pode solicitar estatísticas de outra unidade ou usar o ID de outro funcionário. Como a função roda com privilégios do dono, RLS deixa de ser a barreira final.

**Correção recomendada (P0):** dentro de cada RPC, derivar a identidade de `auth.uid()` e validar `tem_acesso_a_escola(...)`/superadmin antes de toda consulta. Não confiar no `funcionarioId` do cliente: encontrá-lo a partir do usuário autenticado. Revogar `EXECUTE` de `PUBLIC` e conceder somente a `authenticated` quando necessário. Acrescentar `SET search_path = public` às funções `SECURITY DEFINER`.

### C-3 — assinatura móvel: código curto, colisões e operações sensíveis no navegador

**Evidências:**

- `src/components/modals/modal-aluno/hooks/useAlunoSignaturePolling.ts` gera o código com `Math.random()` entre 1000 e 9999.
- `src/app/assinar/page.tsx` consulta `alunos` com `select('*')` usando o código e depois faz upload/atualização diretamente pelo cliente.
- O código não é único no banco, não é invalidado ao salvar pela página pública e não há limite de tentativas no código analisado.

**Impacto funcional:** com 70 atendimentos simultâneos, a probabilidade aproximada de pelo menos uma colisão em um espaço de 9.000 códigos é **cerca de 23%**. Quando há colisão, `maybeSingle()` pode falhar por múltiplos resultados e o código correto é apresentado como inválido.

**Impacto de segurança:** quatro dígitos oferecem somente 9.000 possibilidades. Se as políticas anônimas necessárias para a tela pública estiverem liberadas, tentativas automatizadas podem descobrir código ativo, retornar a ficha inteira (`select('*')`) e alterar assinatura. Se elas não estiverem liberadas, o fluxo público simplesmente não funciona de forma confiável. Em ambos os casos, a regra deve sair do cliente.

**Correção recomendada (P0):** criar uma tabela de desafios de assinatura com token criptograficamente aleatório (ao menos 128 bits), hash no banco, expiração, uso único, tipo de assinatura, aluno e contador de tentativas. Criar duas rotas de servidor mínimas: validar token e enviar assinatura. Elas devem retornar apenas o nome necessário à tela, nunca a ficha completa. Limitar tentativas por IP/token e limpar o desafio no sucesso.

### C-4 — dados completos de funcionário são serializados em todas as telas do painel

**Evidência:** `src/lib/profileCache.ts` faz `funcionarios.select('*')`; o layout em `src/app/(dashboard)/layout.tsx` entrega esse objeto a `AuthInitializer`, que o coloca na store do navegador.

**Impacto:** campos que não são necessários para montar menu e permissões (documentos, endereço, dados pessoais e campos futuros) viajam no HTML/RSC de cada entrada do painel. Isso aumenta transferência em redes lentas e amplia a exposição de dados pessoais no cliente.

**Correção recomendada (P0):** definir um tipo `PerfilSessao` mínimo e buscar apenas `id, nome, email, cargo, status, auth_user_id, is_superadmin, assinatura_url` e os atributos estritamente usados na sessão. Buscar dados completos somente na tela de perfil, sob permissão específica. Invalidar o cache de perfil ao mudar acesso/vínculo.

## Gargalos que aparecerão com crescimento

### G-1 — relatórios pedagógicos carregam a rede inteira e calculam no navegador

**Evidência:** `src/hooks/useRelatorioNotas.ts` carrega alunos, notas, turmas e frequências inteiras na visão de rede. Depois executa vários `filter()` para cada escola, repetindo varreduras sobre os mesmos vetores.

**Por que escala mal:** ao aumentar alunos e frequência, o custo é de rede + memória do navegador + processamento repetido. Só 3.000 alunos são administráveis; o histórico de frequência é que cresce para centenas de milhares/milhões de linhas. Em conexão 3G, o usuário ficará esperando transferência e poderá travar a aba.

**Correção (P1):** trocar por RPC/view materializada com `GROUP BY escola_id`, período e turma; devolver somente os indicadores e uma página de detalhes sob demanda. Aplicar período obrigatório e limite máximo. No cliente, usar mapas (`Map`) de agregação uma vez, nunca vários `filter()` sobre todos os registros.

### G-2 — detalhe de frequência traz todas as linhas da escola para uma data

**Evidência:** `src/app/api/home/frequencia-detalhes/route.ts` busca todos os alunos, matérias e todas as frequências da escola no dia e agrupa em memória do servidor. Depois, para cada turma, filtra todas as matérias novamente.

**Impacto:** para uma escola grande, uma chamada por disciplina pode resultar em milhares de linhas num único request. Com muitos gestores abrindo a Home no mesmo horário, a mesma agregação se repete.

**Correção (P1):** criar RPC que agregue `COUNT(*) FILTER (WHERE presenca)` por turma/matéria/data; retornar detalhes paginados apenas se solicitados. Validar acesso à escola no servidor. Adicionar índice compatível com o padrão real, como `(escola_id, data, turma_id, materia_id)` depois de confirmar com `EXPLAIN ANALYZE`.

### G-3 — KPIs do professor ainda carregam todas as frequências da escola/dia

**Evidência:** `src/app/api/home/teacher-kpis/route.ts` busca `frequencias` filtradas por escola e dia, sem limitar às turmas/aulas do professor.

**Impacto:** para decidir quais chamadas daquele professor estão pendentes, a rota lê registros dos demais professores. Isso cresce proporcionalmente à escola, não ao usuário que abriu a página.

**Correção (P1):** usar a agenda do professor como base e `NOT EXISTS`/agregação no banco, como a RPC de multi-escolas já tenta fazer. Conferir acesso do funcionário autenticado em vez de aceitar `funcionarioId` da URL.

### G-4 — listagens de Transporte ainda não têm paginação e uma delas tem custo quadrático

**Evidências:**

- `tabs/AlunosTab.tsx` busca todos os vínculos de `alunos_transporte` e renderiza todas as linhas.
- `CombustivelTab.tsx` busca todo o histórico e, para cada item, faz `filter()` da lista do veículo para calcular consumo. Isso tende a O(n²).
- `ManutencoesTab.tsx` também traz histórico completo.

**Impacto:** 3.000 alunos podem significar milhares de vínculos; históricos de combustível/manutenção só crescem. A aba dinâmica foi uma boa melhoria de bundle, mas o conteúdo da aba ainda fica pesado após abri-la.

**Correção (P1):** paginação por cursor/data, busca por nome/rota e filtros de período. Calcular consumo com função SQL de janela (`lag`) ou agrupamento linear no cliente somente sobre a página exibida.

### G-5 — alertas de frequência são enviados um a um, em sequência

**Evidência:** `src/app/(dashboard)/admin/indicadores/IndicadoresClient.tsx`, em `handleTriggerFrequenciaAlerts`, percorre cada pendência e faz até duas RPCs `criar_notificacoes`, usando `await` dentro do `for`.

**Impacto:** uma ação para muitas chamadas pode virar dezenas/centenas de idas em série ao banco. O usuário fica aguardando e uma falha no meio deixa o lote parcialmente enviado.

**Correção (P1):** enviar a lista de alertas em uma única RPC transacional, com deduplicação por destinatário/agenda e `grupo_id`. Retornar resumo de enviados, ignorados e erros. Aplicar limite por lote.

### G-6 — telemetria de UX grava evento por evento do navegador

**Evidência:** `src/components/PerformanceTracker.tsx` insere cada Web Vital e cada mudança de rota diretamente em `performance_metrics`.

**Estado positivo:** a normalização de URL e o descarte de CLS insignificante já diminuem cardinalidade e ruído. A política de retenção de 30 dias também é correta.

**Risco restante:** em rede lenta, essas inserções competem com as consultas úteis da pessoa. Em volume, os percentis do painel varrem muitas amostras por período.

**Correção (P2):** amostrar sessões (por exemplo, 10–25% inicialmente), enfileirar e enviar em lote ao ficar ocioso/ao sair da página, sem bloquear a navegação. Manter índices compostos para as consultas reais (`metric_name, created_at` e, se confirmado, `metric_name, pathname, created_at`). Não registrar o `user_agent` inteiro se a segmentação não precisar dele.

### G-7 — Storage administrativo enumera todos os objetos por solicitação

**Evidência:** `src/app/api/admin/armazenamento/route.ts` chama `get_storage_objects`, percorre todos os objetos na memória e mapeia ownership antes de devolver os 100 maiores.

**Impacto:** o endpoint só é ROOT, mas arquivos crescem continuamente (fotos, anexos, PDFs, assinaturas). Ele ficará caro e pode exceder tempo/memória mesmo que o usuário só queira o resumo.

**Correção (P2):** manter inventário de Storage no banco ou criar RPC paginada/agregada por bucket/escola. Carregar a lista dos maiores sob demanda, não no resumo inicial.

## Erros silenciosos e de consistência

| ID | Evidência | Consequência | Prioridade |
|---|---|---|---|
| ES-1 | `AuthInitializer` chama `setAuth` durante renderização e novamente no `useEffect`. | Renderizações/atualizações duplicadas da store em toda entrada do painel; é efeito colateral no render. | P2 |
| ES-2 | Cache do perfil dura uma hora em `profileCache.ts`. | Revogação de acesso, mudança de escola ou cargo pode levar até uma hora para surtir efeito, salvo invalidação externa. | P1 |
| ES-3 | `SchoolSelector` chama `loadEscolas()` ao montar; o estado é persistido e carrega `escolas.select('*')`. | Dados além do necessário no navegador e chamadas duplicadas em entradas específicas. | P3 |
| ES-4 | O service worker mostra offline após 3,5 s para navegações HTML, mas não aplica a mesma estratégia às transições RSC. | Uma resposta lenta pode virar tela offline falsa; transições internas continuam sem fallback de dados. | P2 |
| ES-5 | A página pública de assinatura ignora os erros retornados pela primeira/segunda busca e faz `select('*')`. | Falhas de RLS ou colisões se transformam em “código inválido”, dificultando diagnóstico e suporte. | P1 |
| ES-6 | `admin-kpis` e `school-stats` validam sessão, mas não vinculam parâmetros ao usuário. | Mesmo sem explorar a RPC, o contrato da API é inseguro e fácil de reutilizar incorretamente. | P0 |

## Índices: o que já ajuda e o que deve ser medido

Já existem índices úteis para `frequencias(escola_id, data)`, `frequencias(turma_id, data)`, `notas(turma_id)`, `alunos(turma_id, escola_id)` parcial, agenda e vínculos docentes. Isso é uma boa base e indica evolução positiva.

Antes de criar mais índices, medir no banco de produção/homologação com dados semelhantes ao ano letivo usando `EXPLAIN (ANALYZE, BUFFERS)`. Os candidatos mais prováveis, após medição, são:

- `frequencias (escola_id, data, turma_id, materia_id)` para detalhe/indicadores diários;
- `alunos (escola_id, nome)` parcial em `deleted_at IS NULL` para listagem e autocomplete por unidade;
- `notas (escola_id, turma_id, aluno_id)` para boletins e relatórios;
- `notifications (user_id, read)` para o contador do cabeçalho;
- `audit_logs (created_at DESC)` e, se o filtro for frequente, `(entity, created_at DESC)`;
- índices compostos guiados pelos filtros de transferências, ocorrências e atividades, não apenas índices de uma coluna.

## O que melhorou desde a auditoria anterior

- A raiz pública não está mais forçada a ser totalmente dinâmica/sem cache.
- As abas e modais de Transporte passaram a ser carregados sob demanda; isso reduz JavaScript inicial.
- A lista principal de alunos agora pagina no servidor em blocos de 20 e restringe professor às suas turmas.
- A busca de aluno na emissão de documentos usa debounce, limite de 15 resultados e seleção explícita de campos.
- O dashboard administrativo e as estatísticas multi-escola foram direcionados a RPCs, reduzindo fan-out de consultas no cliente.
- A telemetria normaliza rotas e evita parte do ruído de CLS.
- As migrações mais recentes reforçam RLS de métricas e auditoria.

Essas mudanças melhoram bastante o tempo percebido em rede lenta. O ganho maior vem da redução de bundle e do número de consultas em série. Ainda falta levar a mesma disciplina para relatórios, frequência agregada, transporte e fluxos de assinatura.

## Ordem de execução recomendada

### Antes de ampliar o uso (P0)

1. Bloquear e corrigir a rota de geração de PDF: autenticação, autorização por escola, limite de taxa e bucket privado.
2. Corrigir/retirar as RPCs `SECURITY DEFINER` até terem checagem de identidade e permissões dentro do SQL; validar a implantação da migração de 25/07 antes de usá-las.
3. Substituir o código de assinatura de quatro dígitos por desafio de uso único no servidor; não devolver `alunos.select('*')` à tela pública.
4. Reduzir o objeto de sessão do funcionário e invalidar cache de autorização quando acesso/vínculo mudar.

### Para operar bem na rede de 3.000 alunos (P1)

5. Migrar relatórios pedagógicos e detalhe de frequência para agregações SQL/RPC paginadas.
6. Alterar KPIs do professor para consultar somente aulas/turmas dele.
7. Paginar Transporte e transformar alertas de frequência em lote transacional.
8. Fazer teste de carga realista: 50 sessões simultâneas, com 20 professores lançando frequência, 10 secretários pesquisando/emitindo documentos e 5 gestores abrindo indicadores.

### Robustez contínua (P2/P3)

9. Amostrar e agrupar telemetria de UX; monitorar volume e tempo da RPC de percentis.
10. Corrigir atualizações duplicadas de `AuthInitializer`, aperfeiçoar fallback do service worker e paginar inventário de Storage.
11. Definir orçamento operacional: P95 de API, tamanho máximo de resposta, número de consultas por tela e máximo de linhas sem paginação.

## Validação realizada

- Leitura das rotas de API, consultas Supabase, componentes de dashboard/relatórios/transporte, service worker e migrações SQL relevantes.
- Busca estática por consultas amplas, paginação, timers, realtime e uso de cliente administrativo.
- `npx tsc --noEmit --incremental false` concluído sem erros de TypeScript.

## Limites desta auditoria

Esta é uma auditoria estática do repositório. Ela não confirma quais migrações estão aplicadas no projeto Supabase de produção, quais políticas RLS efetivamente estão ativas, nem os planos de execução reais. Antes de publicar correções, conferir o histórico de migrações no Supabase e testar as políticas com contas de professor, secretário, diretor e ROOT.
