# Regras do Projeto (Git & Workflow)

- **Git Workflow**: O Antigravity deve APENAS alterar os arquivos na pasta local do projeto. O fluxo de deploy e versionamento (commit e push para o GitHub) deve ser feito ESTRITAMENTE e MANUALMENTE pelo usuÃ¡rio atravÃ©s do GitHub Desktop. A Vercel puxarÃ¡ os arquivos diretamente do GitHub.
- **Git Push**: NÃ£o executar o comando `git push` automaticamente em segundo plano ou no terminal. O usuÃ¡rio farÃ¡ o `git push` manualmente quando desejar.

# Next.js 16 Convention (Proxy vs Middleware)

- **Proxy.ts**: No Next.js 16, a convenção mudou. O arquivo de proteção de rotas deve obrigatoriamente se chamar `proxy.ts` (em vez de middleware.ts), e a função exportada deve se chamar `proxy`. NUNCA renomeie o proxy.ts de volta para middleware.ts.

# Capacidades do Agente no Projeto

- **Tridente Tecnológico**: O agente possui acesso total e direto às três camadas do sistema: 1) O Código (Next.js/Front/Back), 2) O Banco de Dados (Supabase via MCP), 3) A Infraestrutura (Vercel via CLI autenticado).
- **Prevenção de Falhas (Vercel)**: A qualquer momento que for necessário checar se um deploy vai falhar antes do usuário subir pro GitHub, o agente DEVE oferecer ou rodar um build simulado da Vercel (`npx vercel build`). O agente também pode puxar logs de erro ou gerenciar variáveis de ambiente diretamente.

<!-- BEGIN:supabase-planning-rule -->
# Planejamento de ImplementaÃ§Ã£o & Supabase

- **VerificaÃ§Ã£o de Banco de Dados**: Sempre que elaborar um plano de implementaÃ§Ã£o, verifique ativamente a necessidade de criar ou alterar tabelas no Supabase.
- **Comandos SQL no Plano**: Planeje e inclua no documento do plano os comandos SQL exatos e/ou os passos de migration necessÃ¡rios (CREATE TABLE, ALTER TABLE, etc.) para que o plano nÃ£o "quebre" durante a execuÃ§Ã£o devido a tabelas inexistentes.
<!-- END:supabase-planning-rule -->

<!-- BEGIN:supabase-rls-recursion-rule -->
# Prevenção de Infinite Recursion em RLS (Supabase/Postgres)

- **Cuidado com Políticas Recursivas**: Ao criar ou modificar políticas de Row Level Security (RLS) no Supabase (Postgres), sempre certifique-se de que a política não cause o erro de infinite recursion. Isso ocorre frequentemente quando a política consulta a própria tabela na qual está sendo aplicada.
- **Uso de SECURITY DEFINER**: Se for necessário consultar a própria tabela para validar uma permissão, isole a lógica de consulta dentro de uma função SECURITY DEFINER e chame essa função na política. Isso garante que a RLS seja ignorada durante a verificação e evita o loop infinito.
<!-- END:supabase-rls-recursion-rule -->

<!-- BEGIN:mock-data-rule -->
# Dados Falsos e Mocks de Imagens

- **Não criar dados mockados de screenshots**: Nunca "embuta" ou crie dados falsos (hardcoded) no sistema a partir de textos ou registros visíveis em screenshots enviados pelo usuário. As imagens e screenshots servem apenas como referência visual de como os registros reais do banco de dados devem ser exibidos quando existirem. Sempre configure as interfaces para consumir os dados reais provenientes do backend ou banco de dados.
<!-- END:mock-data-rule -->

<!-- BEGIN:uuid-fallback-rule -->
# Fallbacks em Colunas UUID

- **Evitar strings inválidas como fallback**: Ao passar IDs para colunas do tipo UUID no banco de dados, nunca utilize strings de fallback descritivas como 'sys-admin', 'root' ou 'system' quando o ID original for indefinido ou o usuário não possuir um ID de registro (como pode ocorrer com o superadmin raiz). O Postgres rejeitará a inserção/atualização com erro de tipo (`invalid input syntax for type uuid`).
- **Evitar envio de Strings Vazias ("")**: Formulários e inputs não devem enviar strings vazias para colunas do tipo UUID. Certifique-se de tratar a string vazia convertendo-a para `null` ou um valor UUID válido antes de persistir no banco.
- **Validação de UUIDs em RPCs e Notificações**: Sempre valide o formato e a existência de UUIDs (ex: `solicitante_id` ou `destinatario_id`) antes de repassá-los a funções do Postgres (RPCs), sob o risco de travar a transação silenciosamente devido a erro de tipagem no Postgres.
- **Usar null**: Sempre utilize `null` como fallback seguro para UUIDs inexistentes (`id: funcionario?.id ?? null`), garantindo que o tipo da coluna no banco aceite valores nulos caso o registro não tenha dono específico.
<!-- END:uuid-fallback-rule -->

<!-- BEGIN:rls-cascade-rule -->
# Exclusões em Cascata e RLS

- **Verificar RLS em tabelas filhas**: Ao planejar ou executar a exclusão de registros que possuem relacionamentos `ON DELETE CASCADE`, sempre verifique se existem políticas de RLS ativas nas tabelas filhas. A exclusão em cascata aciona as políticas de exclusão (`DELETE` ou `ALL`) nas tabelas dependentes, e restrições nelas podem bloquear toda a transação ou causar erros inesperados (ex: infinite recursion).
- **Políticas de Update/Delete Indiretos (Anexos/Soft-deletes)**: Fluxos secundários (ex: atualizar/soft-deletar comprovantes em `alunos_anexos` durante aprovação de transferências) requerem permissões explícitas de RLS nas tabelas secundárias para o usuário executor. Certifique-se de que a política RLS da tabela secundária dê cobertura para atualizações acionadas em cadeia, ou isole em triggers/RPCs de segurança.
<!-- END:rls-cascade-rule -->

<!-- BEGIN:rls-creation-rule -->
# Criação de Tabelas e RLS (Supabase)

- **Habilitar RLS e Criar Policy de Desenvolvimento**: Ao criar uma nova tabela no Supabase durante o período de desenvolvimento, sempre habilite o RLS e crie imediatamente a policy `dev_all_authenticated` que libera leitura e escrita para todos os usuários autenticados. Isso previne bloqueios inesperados de RLS durante os testes.
- **SQL padrão para novas tabelas**:
  ```sql
  ALTER TABLE public.<nome_da_tabela> ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "dev_all_authenticated" ON public.<nome_da_tabela>
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  ```
- **Atenção para produção**: Antes de lançar em produção, as políticas `dev_all_authenticated` devem ser substituídas pelas políticas ABAC/RLS específicas do recurso (por escola, por cargo, por superadmin, etc.).
<!-- END:rls-creation-rule -->

<!-- BEGIN:list-init-rule -->
# Inicialização de Telas de Listagem

- **Sempre usar arrays vazios**: Ao construir telas de listagem de dados, sempre inicie o estado com um array vazio (`useState([])`) e carregue os dados exclusivamente do Supabase. 
- **Nunca pré-popular**: Jamais pré-popule o estado com dados estáticos "falsos", mesmo que seja para testar temporariamente o layout. Use os dados reais ou exiba o "Empty State" da tela (ex: "Nenhum registro encontrado").
<!-- END:list-init-rule -->

<!-- BEGIN:nullish-coalescing-rule -->
# Exibição de Campos Opcionais (Nullish Coalescing)

- **Sempre usar ?? ao invés de ||**: Ao exibir dados do banco que podem ser nulos (como nome, email, status), sempre utilize o operador de coalescência nula (`??`) acompanhado de um fallback legível (ex: `usuario.nome ?? 'Sem nome'`). O uso de `||` pode ocultar incorretamente valores `falsy` válidos (como `0`, `false` ou `""`), causando bugs visuais difíceis de rastrear.
<!-- END:nullish-coalescing-rule -->

<!-- BEGIN:optional-params-rule -->
# Tipagem de Parâmetros (Funções Reutilizáveis)

- **Aceitar null/undefined quando apropriado**: Ao criar ou modificar uma função utilitária que será chamada em múltiplos lugares do projeto, verifique sempre se os tipos dos parâmetros (ex: em TypeScript) devem aceitar `null` ou `undefined`. Isso previne que a função lance erros de *runtime* (como TypeError ao tentar ler propriedades de null) quando o contexto do usuário que a invocou estiver incompleto ou os dados do banco não possuírem valor para aquela coluna.
<!-- END:optional-params-rule -->

<!-- BEGIN:silent-errors-rule -->
# Varredura de Erros Silenciosos

- **Auditoria após Grandes Mudanças**: Ao implementar mudanças estruturais ou de larga escala (ex: configurações de PWA, refatorações de layout raiz, mudanças de roteamento), o agente DEVE proativamente realizar uma varredura (análise técnica) em busca de "erros silenciosos".
- **O que são Erros Silenciosos**: Casos extremos de UX (edge cases), rejeições não tratadas (unhandled rejections), ausência de meta tags importantes (ex: `theme-color`), problemas de ciclo de vida (ex: service workers presos em cache antigo) ou problemas de responsividade que não geram erro no console, mas degradam a experiência do usuário.
- **Ação Proativa**: Caso detecte potenciais erros silenciosos, o agente deve sugerir ou aplicar as correções (ex: adicionar evento `controllerchange` para SW, adicionar propriedades ausentes no `manifest.json`, ajustar bloqueios de zoom em `maximumScale`, etc) para garantir 100% de conformidade com as melhores práticas (ex: Google Lighthouse).
- **Etapa de Planejamento**: Ao elaborar um plano de implementação (`implementation_plan.md`), a última etapa obrigatória de elaboração e redação do documento deve ser a busca, identificação e mapeamento de potenciais "erros silenciosos" (erros lógicos, concorrência, UX, RLS Postgres, caches) e suas respectivas ações de mitigação antes de submeter o plano para aprovação do usuário.
- **Verificação Pós-Execução**: Após concluir a execução de qualquer plano de implementação, o agente deve realizar uma varredura de fechamento e documentar os resultados no arquivo `walkthrough.md` sob uma seção dedicada ("Varredura de Erros Silenciosos"), garantindo que todos os detalhes e impactos de UX colaterais foram validados antes da entrega.
<!-- END:silent-errors-rule -->

<!-- BEGIN:shadcn-dialog-rules -->
# Diretrizes para Modais Dialog (Shadcn/Radix)

- **Sem Botões Customizados de Fechar**: Não inclua botões de fechar manuais com classe absoluta (como um botão `X` absoluto) dentro de `DialogContent`, pois o componente base já renderiza e gerencia o botão de fechar nativo automaticamente.
- **Largura Máxima Responsiva**: Ao definir a largura máxima do modal, sempre use o mesmo breakpoint ou maior para sobrescrever o estilo padrão `sm:max-w-sm` (ex: use `sm:max-w-[700px]` ou `sm:max-w-4xl` em vez de apenas `max-w-[...]`).
- **Evitar classe relative no Content**: Nunca adicione a classe `relative` no `DialogContent` raiz, pois ela sobrescreve o posicionamento `fixed` do Radix e quebra a centralização do modal na viewport.
- **Ações de Escrita Condicionais**: Condicione a exibição de botões de edição, inserção e remoção (ex: `Plus`, `Trash2` e inputs de cadastro) ao estado `isEditMode` obtido de `@/store/useEditModeStore`.
<!-- END:shadcn-dialog-rules -->

<!-- BEGIN:ux-controlled-inputs-tabs-rules -->
# Regras de UX, Inputs Controlados e Abas

- **Empty States Obrigatórios**: Ao renderizar qualquer listagem ou mapeamento de dados vindos do banco (ex: alunos, matérias, notas, frequências), sempre implemente uma mensagem de "Empty State" amigável caso o array esteja vazio (`length === 0`). Nunca deixe a tela ou aba em branco.
- **Digitação de Decimais em Inputs Controlados**: Ao criar inputs controlados para valores numéricos decimais (como notas), nunca converta o valor para número (`Number`) no estado local em tempo real durante a digitação. Isso remove o ponto/vírgula decimal (ex: `8.` vira `8`) impedindo decimais. Em vez disso, armazene o valor como string no estado local, use validação por expressão regular (ex: `/^(10(\.0?)?|[0-9](\.[0-9]?)?|\.)$/`) e converta para número apenas no momento de salvar no banco ou calcular médias.
- **Evitar Reset de Navegação/Abas em useEffect**: Ao usar `useEffect` para carregar dados de tabelas ou sincronizar dados baseados em estados externos (como `isEditMode` ou IDs globais), garanta que a aba ativa (`activeTab`) ou a navegação do usuário não seja resetada forçadamente. Separe o reset da aba (que deve ocorrer apenas na abertura inicial da tela/modal) da lógica de atualização e sincronização dos dados.
<!-- END:ux-controlled-inputs-tabs-rules -->

<!-- BEGIN:base-ui-select-rules -->
# Resolução de IDs/UUIDs em Selects (Base UI)

- **Problema de Renderização Preguiçosa**: O componente `@base-ui/react/select` (ou semelhantes) renderiza suas opções de forma lazy (apenas quando o menu está aberto). Se o valor inicial selecionado for um ID/UUID vindo de banco de dados assíncrono, o componente exibirá o UUID cru na tela inicial se o menu nunca tiver sido aberto.
- **Solução de Lookup Dinâmico**: Ao lidar com valores dinâmicos de banco de dados (ex: escolaId, turmaId, funcionarioId), sempre implemente uma lógica de busca (lookup) diretamente no corpo de `<SelectValue>` buscando na lista correspondente. Trate também o estado de carregamento inicial (exibindo "Carregando..." enquanto a lista estiver vazia):
  ```tsx
  <SelectValue placeholder="Selecione a Escola">
    {escolaId 
      ? (escolas.find((esc) => esc.id === escolaId)?.nome || (escolas.length === 0 ? 'Carregando...' : escolaId))
      : undefined}
  </SelectValue>
  ```
<!-- END:base-ui-select-rules -->

<!-- BEGIN:print-view-best-practices -->
# Diretrizes para Telas e Modais de Impressão (Print Views)

- **Ocultação de Layout durante Impressão (Páginas em Branco)**: Ao criar ou editar qualquer tela/modal de impressão (documentos, fichas, comprovantes), sempre garanta que o container do portal de impressão possua uma classe identificadora (ex: `.print-portal-container`) e que a folha de estilo `@media print` oculte todos os elementos irmãos sob o body:
  ```css
  @media print {
    body > *:not(.print-portal-container) {
      display: none !important;
    }
  }
  ```
  Isso evita que o layout de fundo da aplicação (sidebar, dashboards, etc) gere páginas em branco extras ou desalinhe a impressão.
- **Resolução de Informações do Banco em Impressões**: Nunca confie apenas nas informações estáticas salvas no registro principal (como dados de alunos ou funcionários) para campos de relacionamento (escola, cargo, turma). Se estiverem ausentes no registro, realize uma busca ativa direta no Supabase usando o `escola_id`, `turma_id` ou `funcionario_id` no componente de impressão para exibir o nome correto.
- **Parsing de Padrões de Turma**: Na rede municipal, as turmas são cadastradas sob o padrão `"Ano - Letra"` ou `"Ano° Letra"` (ex: `"6 - A"`, `"6° A"`). Ao exibir em campos que separam "Ano" e "Turma", utilize expressões regulares para extrair o Ano (primeira parte formatada como ordinal, ex: `"6º ANO"`) e a Letra da Turma (segunda parte, ex: `"A"`).
- **Sintonia e Tamanho das Logos**: Em cabeçalhos de visualização de impressão e documentos oficiais, os dois logotipos posicionados nas extremidades superiores (Prefeitura e Secretaria/Escola) devem sempre possuir o mesmo tamanho físico (geralmente definidos com a mesma classe de altura como `doc-header-logo-prefeitura`) para manter a harmonia visual e o equilíbrio estético.
<!-- END:print-view-best-practices -->

<!-- BEGIN:supabase-storage-caching-rules -->
# Diretrizes para Assinaturas, Storage e RLS do Supabase

- **Busting de Cache de Imagens Dinâmicas**: Arquivos de imagem estáticos no Storage (como `aluno_{id}_responsavel.png` ou `escola_{id}_diretor.png`) possuem a mesma URL fixa, induzindo o navegador a usar versões obsoletas do cache. Ao renderizar essas imagens em componentes (ex: `SignaturePad`, visões de impressão ou perfis), sempre adicione um parâmetro query timestamp `?t=timestamp` dinâmico (ex: `${url}?t=${Date.now()}`), cuidando para não alterar dados em base64 (`data:image/...`). Se a propriedade `foto_url` ou equivalente for renderizada, implemente obrigatoriamente essa regra para evitar que atualizações na imagem de perfil pareçam silenciosamente não ter surtido efeito para o usuário.
- **Limpeza de URLs de Banco de Dados**: Ao salvar as URLs de imagens no banco de dados, certifique-se de remover os parâmetros de cache-buster (`url.split('?')[0]`) para que o banco contenha caminhos limpos e consistentes.
- **Relação de Políticas UPDATE de RLS Anônimas**: Ao criar políticas de RLS para comandos `UPDATE` que podem ser realizados de forma anônima (como o responsável assinando pelo celular sem login), sempre inclua a cláusula `WITH CHECK (true)` se o resultado da operação alterar as colunas usadas na condição `USING` (como zerar códigos temporários). Omitir o `WITH CHECK` fará com que o Postgres use a regra de `USING` no pós-update, bloqueando a gravação com um erro de violação de segurança.
- **Políticas de UPDATE em Storage Público**: Operações de upload com `upsert: true` que atualizam arquivos já existentes em buckets públicos executam um `UPDATE` no Postgres. Certifique-se de que a política de `UPDATE` da tabela `storage.objects` permita acesso público/anônimo caso a tela de destino (ex: página de assinatura mobile) seja pública.
<!-- END:supabase-storage-caching-rules -->

<!-- BEGIN:language-preference-rule -->
# Preferência de Idioma

- **Idioma de Comunicação**: O agente deve sempre se comunicar e explicar as alterações, diagnósticos e planos em português brasileiro (PT-BR).
<!-- END:language-preference-rule -->

<!-- BEGIN:project-map-rule -->
# Leitura Prévia de Mapeamento do Projeto

- **Uso do PROJECT_MAP.md**: O agente deve SEMPRE realizar a leitura do arquivo `PROJECT_MAP.md` localizado na raiz do projeto (`c:\Users\Pc\Documents\GitHub\SIG\PROJECT_MAP.md`) logo no início de qualquer nova iteração de prompt de alteração ou diagnóstico antes de realizar buscas ou varreduras nos diretórios.
<!-- END:project-map-rule -->

<!-- BEGIN:db-map-rule -->
# Leitura Prévia de Mapeamento do Banco de Dados

- **Uso do DB_MAP.md**: O agente deve SEMPRE realizar a leitura do arquivo `DB_MAP.md` localizado na raiz do projeto (`c:\Users\Pc\Documents\GitHub\SIG\DB_MAP.md`) antes de formular ou executar qualquer query SQL, insert, update ou delete, a fim de garantir a exatidão dos nomes de tabelas, colunas, chaves estrangeiras e tipos de dados sem a necessidade de varredura prévia de tabelas via API.
<!-- END:db-map-rule -->

<!-- BEGIN:refactoring-and-duplication-rules -->
# Diretrizes de Reutilização de Código e Supressão de Duplicações

- **Modais e Dialogs (StandardDialog)**: Novas estruturas de modais e caixas de diálogo administrativas devem obrigatoriamente utilizar o componente reutilizável `<StandardDialog>` (de `src/components/ui/standard-dialog.tsx`). Evite recriar estruturas cruas de `Dialog` para garantir consistência no visual escuro denso, breakpoints responsivos e tratamento nativo de fechamento.
- **Tabelas de Listagem (StandardTable)**: Novas listagens tabulares devem utilizar o componente genérico `<StandardTable>` (de `src/components/ui/table.tsx`). Ele já fornece spinners de carregamento, tratamento estilizado para estados vazios (Empty States) and design denso consistente.
- **Formulários de Dados Pessoais (usePessoaForm)**: Novas telas ou modais que lidem com cadastro ou edição de dados pessoais e endereço (alunos, funcionários, responsáveis, etc.) devem utilizar o hook `usePessoaForm` (de `src/hooks/usePessoaForm.ts`) para unificar os estados de controle, inicializações, resets e máscaras (ex: CPF e CEP).
- **Cabeçalhos de Documentos Oficiais (PrintHeader)**: Qualquer novo layout de visualização de impressão ou documento oficial deve utilizar o componente `<PrintHeader>` (de `src/components/print/print-header.tsx`), assegurando a correta simetria física das logomarcas da prefeitura/secretaria e aplicação automatizada de query param timestamp para evitar cache do navegador.
- **Prevenção de Memory Leaks & Race Conditions**: Ao implementar `useEffect` ou hooks customizados que realizam cargas assíncronas paralelas (como `Promise.all` buscando dados do Supabase) ou escutam canais em tempo real, sempre utilize uma flag de controle de montagem (`isMounted` via `useRef` ou flag local `active`) para evitar atualizações de estado (`setState`) em componentes desmontados ou fora de ordem. Isso previne warnings de memory leak e potenciais inconsistências de estado caso o componente seja fechado e reaberto rapidamente.
- **Race Conditions em URL Params e Roteamento**: Eventos de efeito (`useEffect`) que detectam alterações em query parameters e realizam fetches baseados neles devem validar se o componente ainda está ativo ao finalizar.
- **Sincronização em Guardas de Rota / Autenticação**: Validações assíncronas de nível de perfil (`is_superadmin`) seguidas de buscas automáticas por dados devem obrigatoriamente abortar execuções de estado subsequentes caso o usuário navegue para fora da rota antes da resolução da promise.
- **Uso Estrito de Coalescência Nula (??) para Fallbacks**: Para campos de banco de dados, variáveis de formulário ou dados de perfil que possam estar legítimos mas vazios, sempre prefira o operador `??` em vez de `||` para fallbacks de exibição ou atribuição de strings. O operador `||` sobrescreve indevidamente strings vazias `""` ou valores falsy válidos.
- **Tratamento Visível de Erros (Toasts de Erro no Catch)**: Todo bloco `catch` de carregamento de dados críticos ou de modificações (inserts/updates/deletes) no Supabase ou endpoints internos deve notificar visualmente o usuário através de um `toast.error('Erro amigável ao usuário')` além de registrar os detalhes técnicos no `console.error(err)`. Evite omitir toasts em blocos catch de chamadas secundárias.
<!-- END:refactoring-and-duplication-rules -->

<!-- BEGIN:blindagem-erros-silenciosos-recorrentes -->
# Blindagem contra Erros Silenciosos e Bugs Recorrentes

- **Prevenção de Flickering em Componentes com Imagens Dinâmicas**: Nunca gere timestamps dinâmicos (`Date.now()`) diretamente no corpo da renderização ou em `useEffect` locais para fazer o cache-busting de imagens que são recarregadas frequentemente no mesmo escopo (como logos e assinaturas). Isso causa flickering visual irritante ao usuário. Utilize uma constante de sessão (`sessionTimestamp`) definida no escopo do arquivo ou módulo para manter a URL idêntica entre re-renderizações.
- **Validação Estrita de UUIDs em Cadeia de Notificação/Eventos**: Antes de submeter dados a funções SQL ou disparar RPCs de notificação que esperam tipos UUID (`solicitante_id`, `destinatario_id`, etc.), valide ativamente se o ID é uma string UUID válida e não vazia.
- **Prevenção de Reset Involuntário de Abas e Estados de UX**: Ao sincronizar hooks ou componentes usando `useEffect`, certifique-se de que a aba ativa (`activeTab`) ou a navegação do usuário não seja resetada involuntariamente devido a efeitos colaterais de re-renderizadores do componente pai. Utilize referências (`useRef`) para verificar o estado anterior e execute resets de estado somente sob transições explícitas de abertura/fechamento.
- **Validação de Propriedades Interpoladas no JSX**: Evite strings hardcoded ou interpolações incorretas em tags JSX que possam renderizar chaves literais como texto (ex: `"{item.nome}"` em vez de `{item.nome}`).
<!-- END:blindagem-erros-silenciosos-recorrentes -->

