# Relatório de desempenho geral — SIG

## Escopo e método

Auditoria estática do App Router, layouts globais, PWA, telemetria, páginas de maior tamanho e rotas de dashboard/API. Não foram alterados componentes de produção nem executado benchmark contra dados reais; portanto, os achados descrevem custo e risco comprováveis no código, não tempos absolutos em milissegundos.

## Resumo executivo

O sistema já tem boas bases: mapa carregado dinamicamente, buscas com debounce em partes importantes, cancelamento de algumas requisições de tela e consultas paralelas no painel administrativo. Os maiores ganhos virão de:

1. restaurar cache seguro para shell e dados pouco mutáveis;
2. quebrar páginas/recursos pesados em carregamento sob demanda;
3. substituir listas e `select('*')` por consultas paginadas com campos explícitos;
4. reduzir vários round-trips de Supabase a RPCs/consultas agregadas por tela;
5. adotar cache local e fila de operações para rede lenta.

## Críticos

### C-1 — Cache global está desabilitado

`src/app/layout.tsx` aplica `force-dynamic`, `force-no-store` e `revalidate = 0` no layout raiz. Isso torna cada navegação dependente do servidor/rede e remove oportunidades de cache do Next para shell e dados que poderiam tolerar alguns segundos/minutos de defasagem.

**Recomendação:** retirar as diretivas globais. Definir dinamismo e `no-store` só nas rotas que realmente dependem de sessão/dados em tempo real. Usar revalidação curta, tags e invalidação após mutações.

### C-2 — PWA não acelera internet lenta

O service worker usa `Network First` e armazena apenas ícones, SVG e manifest. Quando a rede existe, mas está lenta, HTML, chunks JavaScript, fontes e dados continuam esperando a rede. O botão “Atualizar” ainda remove todos os caches e força reload.

**Recomendação:** cache-first para assets versionados (`/_next/static/*`, fontes e imagens de interface); stale-while-revalidate para imagens públicas; network-first com timeout e fallback para páginas. Não cachear respostas autenticadas do Supabase sem chave por usuário/tenant e expiração clara.

### C-3 — Código pesado é enviado antes de ser usado

`/documentos` importa estaticamente quatro geradores de impressão. Eles aparecem só de forma condicional, mas suas dependências entram no chunk da rota. `/admin/escolas` importa cinco modais, incluindo o importador DOCX; `/admin/transporte` concentra página, formulários e fluxos de manutenção/abastecimento em 1.294 linhas.

**Recomendação:** `next/dynamic` para impressão/modal pesado, carregado somente ao clique. Separar transporte por abas e carregar aba/modal sob demanda, preservando estado do formulário e exibindo skeleton curto.

### C-4 — Payload excessivo em consultas

A varredura encontrou 39 arquivos com `select('*')`, inclusive listas, histórico, lixeira e modais. Em tabelas como alunos, auditoria e arquivos, isso transfere campos grandes/privados que a interface não mostra e aumenta JSON, memória e trabalho de renderização.

**Recomendação:** listas devem solicitar colunas visíveis + identificadores, ter paginação por cursor/intervalo e buscar detalhe completo só ao abrir o registro. Prioridade: lixeira/auditoria, alunos, relatórios, financeiro e listas administrativas.

## Moderados

### M-1 — Muitos round-trips para um único painel

O endpoint do professor executa etapas dependentes em série (`vinculos_turmas`, alunos, agenda, frequências e atividades). O endpoint multi-escola executa até três consultas por unidade. Para professores com várias lotações, a quantidade cresce com o número de vínculos.

**Recomendação:** RPC/consulta agregada que devolva o dashboard completo em uma viagem ao banco; buscar blocos independentes em paralelo apenas quando necessário. Criar índices compostos após medir as queries reais com `EXPLAIN ANALYZE`.

### M-2 — Hidratação grande no navegador

Há 189 arquivos client-side e 45 páginas de rota client-side. Não é erro por si só, mas páginas extensas como transporte, documentos, avaliações, relatórios e indicadores levam UI, regras e consultas para o navegador de uma vez. Em celulares modestos, hidratação concorre com pintura e interação.

**Recomendação:** página/carregamento inicial como Server Component quando possível; deixar no cliente apenas filtros, formulários, tabelas e modais. Para telas client-side inevitáveis, dividir por aba e usar transições/skeletons locais.

### M-3 — Montagem condicional sem code-splitting

Diversas telas montam os modais somente quando abertos, o que é positivo. Porém, o Header e 16 páginas importam estáticamente modais; três páginas fazem o mesmo com impressão. Isso evita render/consulta quando fechado, mas não o download inicial do módulo.

**Recomendação:** manter a condição de montagem e acrescentar import dinâmico. Para modais de dados, iniciar busca só após abrir e cancelar no fechamento.

### M-4 — Transporte carrega conjuntos completos

As abas de transporte carregam conjuntos completos e `loadRotas` busca todos os vínculos de alunos para contar passageiros no navegador. Isso degrada gradualmente com o crescimento da rede.

**Recomendação:** paginação, busca server-side e RPC/view que devolva rota com `total_alunos`; carregar só a aba atual e pré-buscar somente a próxima ação provável.

### M-5 — Geocodificação automática sem cache/abort

O mini-mapa geocodifica após 1,2 s de digitação. Em rede lenta, múltiplas edições podem manter requisições antigas em voo para o Nominatim, somadas ao carregamento de tiles.

**Recomendação:** geocodificar por botão ou com pausa maior + `AbortController`; memoizar endereço normalizado/resultado e iniciar o mapa somente quando a seção estiver visível.

## Erros silenciosos e UX

| ID | Achado | Efeito |
| --- | --- | --- |
| ES-1 | Listas sem limite/paginação em telas administrativas. | Degradação gradual, sem erro visível. |
| ES-2 | `Network First` sem timeout para navegação. | Espera longa mesmo com conteúdo reaproveitável. |
| ES-3 | “Atualizar” apaga Cache Storage antes do reload. | A recuperação piora a próxima experiência em rede lenta. |
| ES-4 | Dashboard do professor e multi-escola em múltiplas consultas. | Mais espera e maior chance de estado parcial. |
| ES-5 | Import estático de impressão/modais pesados. | A página transfere código que talvez nunca seja usado. |

## Duplicações e desperdícios

- O carregamento de escolas ocorre em mais de um ponto (`SchoolSelector`, Home e store). Centralizar em fonte SWR/Zustand com deduplicação e TTL evita pedidos repetidos.
- Há múltiplas variantes de impressão e importação estática. Um registro de documentos e carregador dinâmico por tipo reduz importações repetidas.
- A lógica “carregar tudo + filtrar/renderizar no cliente” reaparece em módulos administrativos. Um `DataTable` paginado reutilizável reduz código e impõe limites consistentes.

## Roteiro recomendado

### Fase 1 — maior ganho perceptível

1. Corrigir política global de cache e revalidar após escrita.
2. Implementar cache de assets no PWA, timeout/fallback de navegação; remover limpeza total de cache do fluxo normal.
3. Converter impressões, importador DOCX e modais pesados em imports dinâmicos.
4. Trocar `select('*')` das cinco telas mais acessadas por projeções explícitas, limite e paginação.

### Fase 2 — reduzir tempo de dados

1. Criar RPCs para home do professor, estatísticas multi-escola, transporte e indicadores.
2. Adicionar índices somente após medir queries reais.
3. Usar SWR para catálogos (escolas, turmas, motoristas), com deduplicação e revalidação em foco.

### Fase 3 — resiliência para rede ruim

1. Fila local para rascunhos e ações não conflitantes, com estado “pendente de sincronização”.
2. Retentativas com backoff, abort ao trocar tela, feedback de conexão e salvamento otimista apenas onde seguro.
3. Página offline útil e últimas listas visualizadas, isoladas por usuário/escola.

## Verificação antes de publicar

1. Rodar `npx tsc --noEmit --incremental false`.
2. Medir Web Vitals e chunks antes/depois em build de produção.
3. Simular Fast 3G/Slow 4G, CPU reduzida e offline; testar navegação, busca, impressão e reabertura.
4. Conferir isolamento de cache por usuário/escola e invalidar dados após escrita.
5. Medir cada RPC e índice em clone de dados representativo antes de substituir queries.
