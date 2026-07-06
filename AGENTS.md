<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:sig-design-preferences -->
# SIG Design Preferences

Before creating or changing UI, read `DESIGN_PREFERENCES.md`. The old project used standalone HTML files and global JavaScript; in this repository, convert that intent to Next.js App Router pages, React/TSX components, Tailwind CSS tokens, shadcn/ui primitives, and `lucide-react` icons.
<!-- END:sig-design-preferences -->

<!-- BEGIN:vanilla-to-react-fidelity -->
# Fidelidade Visual do Projeto Legado

Ao converter recursos do projeto antigo (Vanilla HTML/CSS/JS) para este repositório SIG:
- **Visual & Layout**: Mantenha o visual, cores, botões, modais, tabelas e disposições fiéis às imagens e telas originais do projeto legado.
- **Arquitetura de Código**: Reescreva totalmente a lógica em React/TSX com Next.js App Router, Tailwind CSS, componentes shadcn/ui, ícones `lucide-react` e Supabase. Nunca importe scripts imperativos ou manipulação direta de DOM do legado.

<!-- BEGIN:supabase-client-rules -->
# Separação de Clientes Supabase & Segurança

- **Client Components ('use client')**: Usar `@/lib/supabaseClient` (`createBrowserClient`) exclusivamente em componentes do lado do cliente.
- **Server Components & API Routes**: Usar `supabaseAdmin` ou `createServerClient` apenas em Server Components, Route Handlers (`app/api/`) ou Server Actions.
- **Segurança**: Nunca expor `SUPABASE_SERVICE_ROLE_KEY` em código cliente ou variáveis prefixadas com `NEXT_PUBLIC_`.
<!-- END:supabase-client-rules -->

<!-- BEGIN:nextjs-app-router-rules -->
# Next.js App Router & React Best Practices

- **Diretiva 'use client'**: Declarar `'use client'` no topo de qualquer componente React que utilize React Hooks (`useState`, `useEffect`, `useMemo`), Zustand stores ou manipuladores de eventos (`onClick`, `onChange`).
- **Navegação**: Importar `useRouter` e `usePathname` **sempre** de `next/navigation` (nunca de `next/router`). Preferir `<Link href="...">` de `next/link` para navegação declarativa.
- **Validação de Build**: Validar a compilação local com TypeScript (`cmd /c "npx tsc --noEmit"`) antes de considerar tarefas concluídas, garantindo zero erros de tipagem na Vercel.
<!-- END:nextjs-app-router-rules -->

<!-- BEGIN:vercel-env-rules -->
# Vercel & Variáveis de Ambiente

- **Configuração de Env**: Garantir que todas as chaves iniciadas em `NEXT_PUBLIC_` estejam cadastradas no Dashboard do projeto na Vercel (*Settings > Environment Variables*).
- **Tratamento de Rotas Dinâmicas**: Garantir que chamadas assíncronas em Server Components ou rotas API tratem estados `null` / `undefined` sem quebrar a renderização SSR.
<!-- END:vercel-env-rules -->

<!-- BEGIN:sig-design-system-rules -->
# Design & Fidelidade Visual (SIG Design System)

- **Visual Legado Modernizado**: Manter o tema escuro denso, administrativo e funcional (`bg-background`, `bg-[#141416]`, bordas suaves `#26262a`, cartões arredondados `rounded-2xl`).
- **Ícones e Primitivos**: Utilizar exclusivamente ícones da biblioteca `lucide-react` e componentes primitivos `shadcn/ui`.
<!-- END:sig-design-system-rules -->

<!-- BEGIN:sig-project-urls -->
# URLs do Projeto SIG

- **Produção (Vercel)**: https://sig-six-kappa.vercel.app
- **Login de Produção**: https://sig-six-kappa.vercel.app/login
- **Repositório GitHub**: github.com/sigpainel774/SIG (branch: main)
- **Projeto Supabase**: https://nijjizpcodnjhvqwjuso.supabase.co
<!-- END:sig-project-urls -->

