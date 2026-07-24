# Relatório atualizado de desempenho — SIG

Data da reavaliação: 24/07/2026. Comparação feita contra a auditoria anterior e contra o código atual. Não há benchmark de produção nesta análise; os percentuais abaixo representam mudanças de arquitetura/código, não tempo de carregamento medido.

## Resultado geral

As alterações tiveram impacto estrutural alto. Os quatro pontos mais relevantes do relatório anterior foram atacados: cache global, cache de assets do PWA, carregamento sob demanda e waterfall de consultas do dashboard docente.

O sistema deve estar perceptivelmente mais leve depois da primeira visita, especialmente ao abrir Documentos, Transporte, Escolas e modais do cabeçalho. Ainda não está pronto para operação plenamente resiliente em rede lenta porque os dados autenticados continuam dependendo da rede e várias listas continuam sem paginação.

## O que foi feito e o ganho esperado

| Área | Antes | Estado atual | Ganho técnico |
| --- | --- | --- | --- |
| Cache do Next | Layout raiz forçava conteúdo dinâmico e sem cache. | As três diretivas globais foram removidas. | Alto: permite que cada rota volte a escolher sua própria estratégia de cache. |
| PWA | Network First e cache só de ícones/manifest. | SW v7 usa SWR para assets Next/imagens/fontes e timeout para navegação. | Alto após a primeira visita: JavaScript e assets deixam de depender sempre da rede. |
| Documentos | Quatro impressões importadas no carregamento da rota. | Quatro imports dinâmicos com `ssr: false`. | Alto: impressão deixa de pesar na abertura normal da tela. |
| Transporte | Página de 1.294 linhas carregava abas e modais juntos. | Página-orquestradora de 196 linhas, cinco abas e cinco modais dinâmicos. | Muito alto no carregamento inicial; código pesado passa a ser pago somente pela aba/ação usada. |
| Escolas e Header | Modais importados estaticamente. | Modais administrativos e do Header passaram a `dynamic()`. | Médio/alto: reduz o custo pago por todo dashboard. |
| Busca de alunos | Maior payload e menos restrição de busca. | Campos explícitos, mínimo de dois caracteres, debounce de 300 ms e limite de 15. | Alto para rede e banco. |
| Rotas de transporte | Consulta extra trazia todos os vínculos de alunos para contar passageiros. | A contagem passou a vir no relacionamento da consulta de rotas. | Médio: reduz uma viagem e processamento no cliente. |
| Dashboard docente | Cadeia de consultas majoritariamente serial. | Quatro blocos independentes em paralelo; contagem de alunos só depois dos IDs. | Alto: aproximadamente de cinco ondas de espera para duas. |
| Multi-escola | Três consultas sequenciais por escola. | Três consultas paralelas por escola. | Médio: mesma quantidade de queries, porém menor tempo crítico. |
| `select('*')` | 39 arquivos identificados. | 32 arquivos identificados. | Redução de 7 ocorrências (cerca de 18%). |
| Persistência local | Risco de crescimento ilimitado. | Relatórios e lista de suspensos têm limites de 30 e 50 itens. | Baixo/médio, mas elimina crescimento contínuo. |

### Leitura honesta do tamanho da melhora

Não é correto prometer “X% mais rápido” sem Web Vitals e tamanho de chunks em produção. Ainda assim, a melhoria de arquitetura é forte: foram criadas 19 fronteiras explícitas de carregamento dinâmico somente em Documentos, Transporte e Escolas; a maior tela deixou de transferir todas as abas e modais no primeiro acesso. Em rede lenta, esse tipo de mudança normalmente pesa mais que micro-otimizações de renderização.

## Críticos restantes

### C-1 — Dados autenticados ainda não têm estratégia para conexão lenta

O PWA agora acelera assets, mas ignora `/api` e Supabase — decisão correta para evitar vazamento de dados. O efeito é que navegações e consultas autenticadas ainda esperam a rede; não há cache de dados por usuário/escola, fila de ações ou tela com último estado conhecido.

**Próximo passo:** SWR/Zustand para catálogos e listas recentes, chaveado por usuário + escola; invalidação após mutações. Para formulários de baixo conflito, fila local com sincronização e status visível. Nunca compartilhar cache entre usuários/tenants.

### C-2 — Ainda há 32 `select('*')`

Os remanescentes incluem store de escolas, detalhes de aluno, grade/horários, transferências, relatórios e telas administrativas. `select('*')` em detalhe completo pode ser aceitável, mas em listas e chamadas frequentes mantém custo desnecessário.

**Próximo passo:** priorizar `useSchoolStore`, `GradeSemanalSection`, `HorariosSlotsSection`, relatórios, transferências e lixeira. Para cada lista, adotar projeção explícita, `limit` e paginação.

### C-3 — Listas de transporte continuam sem paginação

As abas ficaram bem separadas e as colunas foram reduzidas, mas Veículos, Rotas e Alunos ainda carregam todos os registros. Isto voltará a ser lento conforme a rede municipal crescer.

**Próximo passo:** paginação no servidor, busca por nome/placa/rota e contagem total. A consulta de rotas já está preparada para manter a contagem de alunos no banco.

## Moderados restantes

### M-1 — Alguns dashboards ainda fazem muitas requisições

`admin-kpis` continua fazendo sete operações paralelas, incluindo duas leituras de turmas que podem ser consolidadas. O dashboard multi-escola reduziu a latência por paralelismo, mas ainda gera `3 × número de escolas` consultas.

**Próximo passo:** RPC única por dashboard, com agregações por escola no PostgreSQL. Isto reduz conexões, tráfego e variação de resposta em 3G/4G.

### M-2 — Emissão de boletim ainda é uma cascata de consultas

Na tela Documentos, turma, escola, matérias, notas e recuperações são buscadas em sequência, embora quatro delas já possam ser iniciadas com os IDs conhecidos do aluno.

**Próximo passo:** `Promise.all` imediato para consultas independentes, ou uma RPC de dados do boletim. A RPC é preferível por devolver um snapshot coerente e reduzir round-trips.

### M-3 — PWA mostra “offline” para rede apenas lenta

Após 3,5 s, a navegação recebe `offline.html`, mas páginas HTML não são adicionadas ao cache. Além disso, as transições RSC do App Router são explicitamente excluídas desse timeout. Isso melhora o abandono de espera, porém não permite continuar usando a tela que estava sendo solicitada.

**Próximo passo:** oferecer “Continuar aguardando” junto ao fallback e manter uma última tela/lista segura por usuário. Avaliar timeout maior ou adaptativo para evitar falso offline em redes rurais lentas.

### M-4 — Hidratação global ainda precisa de medição

O número de arquivos client-side passou de 189 para 196. A divisão de Transporte é uma melhoria, pois os novos componentes são dinâmicos; ainda assim, não há evidência de redução global de JavaScript/hidratação sem analisar o build de produção.

**Próximo passo:** gerar relatório de chunks e medir LCP/INP para Home, Alunos, Documentos, Transporte e Avaliações antes de novas divisões.

## Erros silenciosos (ES)

| ID | Achado | Impacto |
| --- | --- | --- |
| ES-1 | `admin-kpis` repete a leitura de turmas (contagem e lista). | Trabalho/rede duplicados em cada abertura da Home gerencial. |
| ES-2 | Páginas HTML não são gravadas pelo SW; após timeout, normalmente só há fallback offline. | A promessa de navegação resiliente é parcial. |
| ES-3 | Listas de transporte sem limite/paginação. | Degradação progressiva sem erro explícito. |
| ES-4 | Boletim executa consultas em sequência. | Espera acumulada em internet lenta. |
| ES-5 | Consultas amplas restantes podem trazer PII e JSON desnecessário. | Mais payload, renderização e risco de exposição. |

## Pontos positivos confirmados

- As mudanças mantêm montagem condicional e agora somam code-splitting; é a combinação correta.
- A busca de Documentos tem limite, debounce e projeção explícita.
- O transporte passou a carregar somente a aba ativa, sem regressão de funcionalidade aparente.
- O Header não baixa mais os módulos de notificação e senha no bundle inicial.
- O paralelismo do dashboard docente preserva validação de UUID e cancelamento de requisição no cliente.
- O PWA agora reaproveita chunks e fontes já visitados, o que melhora especialmente a segunda navegação.

## Prioridade de continuação

1. Paginar Transporte e eliminar `select('*')` de chamadas frequentes.
2. Criar RPC para `admin-kpis`, multi-escola e boletim.
3. Adicionar cache de dados autenticados por usuário/escola com invalidação.
4. Evoluir o fallback do PWA para rede lenta sem declarar offline cedo demais.
5. Medir build/chunks e Web Vitals para decidir onde vale dividir mais componentes.

## Verificação recomendada

1. Rodar `npx tsc --noEmit --incremental false`.
2. Gerar build de produção e comparar chunks de Documentos, Transporte, Escolas e Header com a versão anterior.
3. Em DevTools, testar primeira visita e segunda visita em Fast 3G/Slow 4G; observar cache de `/_next/static`.
4. Simular base grande de transporte e medir paginação antes de publicar.
5. Validar cache de dados com duas contas/escolas diferentes para garantir isolamento.
