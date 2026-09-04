# 🛠️ Inventário de Dependências, Ferramentas & Programas do SIG

> **Documento de Referência Rápida para o Agente e Desenvolvedores**  
> **Última Atualização:** Setembro de 2026  
> Consulte este documento antes de iniciar qualquer tarefa para saber exatamente quais ferramentas, MCP servers, utilitários e bibliotecas já estão disponíveis no ambiente.

---

## 🤖 1. Servidores MCP Globais Configurados (`~/.gemini/config/mcp_config.json`)

| Servidor MCP | Pacote / Comando | Finalidade no Projeto |
|---|---|---|
| **`supabase`** | `@supabase/mcp-server-supabase@latest` | Inspeção de schema, execução de queries SQL, advisors e migrations diretas no banco `nijjizpcodnjhvqwjuso`. |
| **`context7`** | `@upstash/context7-mcp` | Consulta de documentação técnica em tempo real de bibliotecas (Next.js 16, React 19, Supabase, Tailwind v4). |
| **`memory`** | `@modelcontextprotocol/server-memory` | Persistência de grafos de conhecimento e decisões arquiteturais entre conversas. |

---

## ⚡ 2. Ferramentas CLI & Ambientes de Execução

| Ferramenta | Comando de Uso | Função |
|---|---|---|
| **Biome** | `npm run lint:fast` / `npm run format` | Linter e formatador em Rust ultrarrápido (~30–60ms). |
| **TypeScript** | `cmd /c "npx tsc --noEmit"` | Verificador estrito de tipos e compatibilidade Vercel. |
| **Capacitor CLI** | `npm run cap:sync` / `npm run cap:open` | Sincronização e build do aplicativo nativo Android (`android/`). |
| **Puppeteer** | `npx puppeteer` / Scripts | Testes E2E, geração headless de PDFs e automações de browser. |
| **TS-Node** | `npm run analyze` | Execução de scripts utilitários e análises estáticas sem pré-build. |

---

## 📦 3. Dependências de Produção (`package.json`)

### 🏗️ Framework, Core & Roteamento
- **`next`** (`16.2.10`): Framework App Router com Turbopack nativo.
- **`react`** & **`react-dom`** (`19.2.4`): React 19 com suporte a Server Actions e React Hooks modernos.
- **`nextjs-toploader`** (`^3.9.17`): Barra de progresso visual em mudanças de rota.
- **`next-themes`** (`^0.4.6`): Gerenciador de tema Dark / Light mode sem flash de tela.

### 🔐 Supabase, Banco de Dados & Telemetria
- **`@supabase/supabase-js`** (`^2.110.0`): Cliente oficial do Supabase.
- **`@supabase/ssr`** (`^0.12.0`): Cliente otimizado para Server Components e Middleware Next.js.
- **`@vercel/analytics`** & **`@vercel/speed-insights`**: Coleta de Web Vitals e métricas de tráfego.

### 🎨 Design System, UI & Componentes
- **`tailwindcss`** (`^4`) & **`@tailwindcss/postcss`**: Tailwind CSS v4 tokenizado.
- **`lucide-react`** (`^1.23.0`): Biblioteca oficial de ícones do SIG.
- **`shadcn`** (`^4.12.0`): Primitivos de componentes acessíveis.
- **`@base-ui/react`** (`^1.6.0`): Primitivos headless complementares.
- **`framer-motion`** (`^12.42.2`): Animações declarativas e transições suaves.
- **`clsx`** & **`tailwind-merge`** & **`class-variance-authority`**: Utilitários de composição de classes CSS.
- **`sonner`** (`^2.0.7`): Sistema de notificações e alertas em Toast.
- **`tw-animate-css`** (`^1.4.0`): Efeitos e transições CSS pré-definidas.

### 🗺️ Mapas, Rotas & Geoprocessamento
- **`leaflet`** (`^1.9.4`) & **`react-leaflet`** (`^5.0.0`): Mapas interativos e marcadores.
- **`react-leaflet-cluster`** (`^4.1.3`): Agrupamento inteligente de múltiplos marcadores escolares.
- **`@turf/turf`** (`^7.4.0`): Cálculos geoespaciais avançados (distância em metros, geofencing do Ponto 671, polígonos).

### 📊 Gráficos, Nós & Fluxos Interativos
- **`recharts`** (`^3.10.1`): Gráficos estatísticos de barras, linhas, áreas e pizza para dashboards e BI.
- **`@xyflow/react`** (`^12.11.6`): Motor de nós e fluxos arrastáveis para o **Alpha Flow Studio**, organogramas e esteiras.

### 🔢 Cálculos, Estatística, Datas & Validação
- **`simple-statistics`** (`^7.11.0`): Cálculos estatísticos, TRI (Simulados Cursinho), desvio padrão e percentis.
- **`date-fns`** (`^4.4.0`): Manipulação precisa de datas letivas, turnos e jornadas de trabalho.
- **`zod`** (`^4.5.4`): Schemas de validação em runtime com inferência de tipos TypeScript (`src/lib/schemas`).
- **`diff`** (`^9.0.0`): Comparação de textos e logs de auditoria.

### 📄 Manipulação de Arquivos, Imagens, PDFs & Documentos
- **`pdf-lib`** (`^1.17.1`) & **`@pdf-lib/fontkit`**: Criação, edição e fusão de arquivos PDF.
- **`pdfjs-dist`** (`^6.2.108`): Renderização e leitura óptica de PDFs.
- **`mammoth`** (`^1.12.0`): Conversão e extração de documentos `.docx`.
- **`xlsx`** (`^0.18.5`): Leitura e geração de planilhas Excel.
- **`papaparse`** (`^5.7.0`): Leitura e exportação de CSV/TXT em alta velocidade com streaming (Censo Escolar / INEP).
- **`jszip`** (`^3.10.1`): Compactação e descompactação de arquivos ZIP.
- **`sharp`** (`^0.35.3`): Processamento e compressão de imagens em alta performance no backend.
- **`qrcode`** (`^1.5.4`) & **`jsqr`** (`^1.4.0`): Geração e leitura de QR Codes (pareamento de hardware e simulados).
- **`isomorphic-dompurify`** (`^3.22.0`): Sanitização de HTML contra vulnerabilidades XSS.

### 🔄 Estado, Cache & PWA / Mobile
- **`zustand`** (`^5.0.14`): Gerenciamento de estado global reativo.
- **`swr`** (`^2.4.2`): Cache otimista, deduplicação de requisições e sincronização em segundo plano.
- **`web-push`** (`^3.6.7`): Disparo de notificações Web Push.
- **`@capacitor/core`** & **`@capacitor/android`** (`^8.5.0`): Runtime híbrido para o app nativo Android.

---

## 🔧 4. Dependências de Desenvolvimento (`devDependencies`)

- **`@biomejs/biome`** (`2.5.12`): Toolchain de lint e formatação.
- **`typescript`** (`^5`): Compilador TypeScript 5.
- **`eslint`** (`^9`) & **`eslint-config-next`** (`16.2.10`): Linter Next.js compatível com CI/Vercel.
- **`@capacitor/cli`** (`^8.5.0`): CLI do Capacitor.
- **`puppeteer`** (`^25.10.0`): Controle headless de Chrome.
- **`dotenv`** (`^17.4.2`): Injeção de variáveis de ambiente.
- **`markdown-it`** (`^14.3.0`): Parser de Markdown para relatórios.
- **Tipagens:** `@types/react`, `@types/react-dom`, `@types/node`, `@types/leaflet`, `@types/papaparse`, `@types/jszip`, `@types/qrcode`, `@types/web-push`.

---

## 🚀 5. Scripts Disponíveis no `package.json`

| Script | Comando | Descrição |
|---|---|---|
| `dev` | `npm run dev` | Inicia o servidor local Next.js com Turbopack (`http://localhost:3000`). |
| `build` | `npm run build` | Executa o build de produção da aplicação. |
| `start` | `npm run start` | Inicia o servidor em modo de produção. |
| `lint:fast` | `npm run lint:fast` | Valida todo o código com Biome em milissegundos. |
| `format` | `npm run format` | Auto-formata o código em conformidade com o padrão do projeto. |
| `lint` | `npm run lint` | Executa validação padrão do ESLint. |
| `analyze` | `npm run analyze` | Executa o script `scripts/analyze_project.ts`. |
| `cap:sync` | `npm run cap:sync` | Sincroniza os assets web compilados com a pasta nativa `android/`. |
| `cap:open` | `npm run cap:open` | Abre o projeto no Android Studio. |
