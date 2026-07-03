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
<!-- END:vanilla-to-react-fidelity -->

