# Preferencias de Design do SIG

Este projeto e um clone modernizado do painel antigo. As preferencias abaixo traduzem as regras originais para o stack atual: Next.js App Router, React/TSX, Tailwind CSS, shadcn/ui e lucide-react.

## Identidade Visual

- Manter o visual escuro, administrativo e denso do painel escolar.
- Usar fundo principal `bg-background`, superficies `bg-card`, entradas `bg-input`, bordas `border-borderCustom`, hover `hover:bg-hoverCustom`, texto `text-foregroundCustom` e acento `text-highlight` / `bg-highlight`.
- Evitar paletas aleatorias por pagina. Novas telas devem parecer parte do mesmo painel.
- Cards, paineis, tabelas e formularios devem usar bordas discretas, raio moderado e bom espacamento interno.
- Textos de interface devem ser diretos e funcionais, sem linguagem de landing page.

## Icones

- Nao usar emojis do sistema como icones de interface.
- Preferir sempre `lucide-react`, que ja e a biblioteca do projeto.
- Importar somente os icones usados pela pagina ou componente.
- Botoes de acao devem usar icone quando houver um simbolo claro, por exemplo `Plus`, `Search`, `Save`, `LogOut`, `RefreshCw`, `X`, `Printer`.

## Arquitetura de Telas

- Nao criar arquivos HTML separados nem injetar telas com `fetch`.
- Toda nova rota deve ser criada no App Router em `src/app`, normalmente dentro de `src/app/(dashboard)/nome-da-rota/page.tsx`.
- Toda tela nova deve ser TSX valido, usando `className`, componentes React e estado local quando necessario.
- Nao usar `onclick`, `oninput` ou scripts globais vindos dos HTMLs antigos. Converter para handlers React, por exemplo `onClick`, `onChange`, `useState` e `useMemo`.
- Usar `next/link` para navegacao entre rotas.
- Usar `next/navigation` apenas quando houver navegacao programatica real.

## Registro de Navegacao

Ao criar uma nova pagina ou modulo:

1. Criar a rota em `src/app/(dashboard)/.../page.tsx`.
2. Adicionar ou revisar o link correspondente em `src/components/Sidebar.tsx` quando a tela deve aparecer no menu lateral.
3. Verificar links internos em telas como `/home`, para evitar rotas 404.
4. Aplicar regras de visibilidade e permissao no mesmo ponto onde a navegacao e renderizada, ou em componente/helper proprio quando isso crescer.
5. Rodar build ou checagem de tipos para confirmar que a rota entra corretamente no pacote.

## Componentes e Integracao

- Preferir componentes existentes em `src/components/ui` antes de criar novos elementos do zero.
- Para formularios, usar `Input`, `Button`, `Card`, `Dialog`, `Select`, `Label` e tabelas existentes quando fizer sentido.
- Se uma tela precisar de modal, usar `Dialog` em React. Nao depender de listeners globais para fechar modal.
- Estados de carregamento, vazio e erro devem ser visiveis e consistentes.
- Evitar componentes "soltos": toda parte nova precisa estar conectada a rota, menu, permissao e fluxo esperado.

## Impressao e Relatorios

- Documentos imprimiveis, como boletins, fichas e relatorios, devem ter uma area de impressao controlada.
- Evitar que qualquer painel oculto apareca no `window.print()` por acidente.
- Usar classes de escopo no container ou no `body` antes de imprimir, e remover o estado depois da impressao.
- Em React, preferir estado local para controlar qual relatorio esta em modo de impressao.
- Estilos `@media print` devem ser especificos e nao afetar toda a aplicacao sem necessidade.

## Dados e Supabase

- Nao presumir nomes de colunas, chaves JSON ou formatos de dados.
- Antes de conectar uma tela ao banco, conferir `src/types/supabase.ts`, migrations em `supabase/migrations` e como a informacao e escrita.
- Quando uma migration mudar o schema, atualizar os tipos do Supabase para manter TSX e banco sincronizados.
- Dados mockados sao aceitaveis apenas como etapa temporaria. Marcar visualmente quando uma tela ainda estiver usando dados de exemplo.

## Codigo React/TSX

- Evitar template strings complexas quando uma estrutura de array/objeto for mais clara.
- Manter JSX legivel, com dados repetidos em arrays e renderizacao por `map`.
- Nao misturar CSS inline extenso com Tailwind. Inline style deve ser excecao pontual.
- Classes Tailwind devem reutilizar tokens do projeto, em vez de inventar uma paleta nova para cada tela.
- Validar novas telas com TypeScript e build antes de considerar o trabalho pronto.

## Checklist Para Nova Tela

- Rota criada no App Router.
- Link adicionado ou revisado na sidebar/home.
- Sem `onclick` legado ou script global.
- Icones em `lucide-react`.
- Visual coerente com `globals.css`.
- Estados basicos: vazio, carregando ou dados de exemplo quando aplicavel.
- Sem rotas 404 criadas por links internos.
- TypeScript passa.
- Build passa.
