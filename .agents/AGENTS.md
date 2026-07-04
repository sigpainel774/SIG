# Regras do Projeto (Git & Workflow)

- **Git Workflow**: O Antigravity deve APENAS alterar os arquivos na pasta local do projeto. O fluxo de deploy e versionamento (commit e push para o GitHub) deve ser feito ESTRITAMENTE e MANUALMENTE pelo usuÃ¡rio atravÃ©s do GitHub Desktop. A Vercel puxarÃ¡ os arquivos diretamente do GitHub.
- **Git Push**: NÃ£o executar o comando `git push` automaticamente em segundo plano ou no terminal. O usuÃ¡rio farÃ¡ o `git push` manualmente quando desejar.

# Next.js 16 Convention (Proxy vs Middleware)

- **Proxy.ts**: No Next.js 16, a convenção mudou. O arquivo de proteção de rotas deve obrigatoriamente se chamar `proxy.ts` (em vez de middleware.ts), e a função exportada deve se chamar `proxy`. NUNCA renomeie o proxy.ts de volta para middleware.ts.

# Capacidades do Agente no Projeto

- **Tridente Tecnológico**: O agente possui acesso total e direto às três camadas do sistema: 1) O Código (Next.js/Front/Back), 2) O Banco de Dados (Supabase via MCP), 3) A Infraestrutura (Vercel via CLI autenticado).
- **Prevenção de Falhas (Vercel)**: A qualquer momento que for necessário checar se um deploy vai falhar antes do usuário subir pro GitHub, o agente DEVE oferecer ou rodar um build simulado da Vercel (`npx vercel build`). O agente também pode puxar logs de erro ou gerenciar variáveis de ambiente diretamente.
