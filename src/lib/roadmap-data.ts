// Dados estruturados extraídos do ROADMAP.md
// Mantidos como constantes TypeScript para evitar parsing de markdown em runtime
// e garantir tipagem estrita e SSR estável.

export type RoadmapStatus = 'done' | 'in-progress' | 'planned'

export interface RoadmapItem {
  title: string
  detail?: string
}

export interface RoadmapGroup {
  id: string
  label: string
  emoji: string
  items: RoadmapItem[]
}

export interface RoadmapSection {
  id: string
  status: RoadmapStatus
  title: string
  groups?: RoadmapGroup[]  // usado em status='done' (sub-accordion por categoria)
  items?: RoadmapItem[]    // usado em status='in-progress' e 'planned'
}

export const ROADMAP_LAST_UPDATE = 'Setembro de 2026'
export const ROADMAP_STATUS_GERAL =
  'Estável, 100% migrado para Next.js 16 App Router (Turbopack + React 19 + TypeScript + Tailwind CSS v4) e em operação.'

export const roadmapSections: RoadmapSection[] = [
  /* ──────────────────────────────────────────────────────
   * 1. Módulos Concluídos & Operacionais em Produção
   * ────────────────────────────────────────────────────── */
  {
    id: 'done',
    status: 'done',
    title: 'Módulos Concluídos & Operacionais em Produção',
    groups: [
      {
        id: 'arquitetura',
        label: 'Arquitetura, Core & Experiência Visual',
        emoji: '🏗️',
        items: [
          {
            title: 'Migração Completa para Next.js 16 App Router',
            detail:
              'Todo o ecossistema legado (HTML/JS Vanilla) foi 100% portado para React 19, TypeScript estrito, Shadcn UI e ícones lucide-react.',
          },
          {
            title: 'Design System Semântico (Suporte Estrito a Tema Claro e Escuro)',
            detail:
              'Conformidade total com tokens semânticos (bg-background, bg-card, text-foreground, border-border). Zero cores hardcoded em modo claro.',
          },
          {
            title: 'PWA Nativo Multi-perfil',
            detail:
              'PWA para servidores/administração com suporte offline e Service Worker. PWA dedicado para o Portal do Aluno/Responsáveis com manifest independente.',
          },
          {
            title: 'Segurança e Separação de Clientes Supabase',
            detail:
              'Client Components usam createBrowserClient. Rotas de API, Server Actions e Middlewares usam supabaseAdmin com service_role protegido.',
          },
        ],
      },
      {
        id: 'gestao-escolar',
        label: 'Gestão Escolar & Estrutural (Secretaria 360°)',
        emoji: '👥',
        items: [
          {
            title: 'Multi-Escolas e Tenants',
            detail:
              'Gestão de múltiplas unidades escolares com turnos (matutino, vespertino, noturno, integral) e etapas de ensino.',
          },
          {
            title: 'Matrículas Automáticas com Travamento Seguro',
            detail:
              'Função gerar_numero_matricula com sequencial único por unidade escolar e ano letivo, blindada com SECURITY DEFINER.',
          },
          {
            title: 'Transferências de Alunos',
            detail:
              'Módulo completo de trâmite de transferência entre escolas municipais com protocolo de saída e aceite de destino.',
          },
          {
            title: 'Quadro Funcional e Gestão de Lotações',
            detail:
              'Vínculo de servidores a uma ou mais escolas com definição de funções, cargas horárias e cargos gerenciados.',
          },
          {
            title: 'Gestão de Turmas e Enturmação',
            detail:
              'Criação de turmas por ano letivo, atribuição de professores por disciplina e movimentação de alunos.',
          },
        ],
      },
      {
        id: 'controle-acesso',
        label: 'Controle de Acesso e Governança (Híbrido RBAC + ABAC)',
        emoji: '🔐',
        items: [
          {
            title: 'Níveis de Acesso Hierárquicos (1 a 6)',
            detail:
              'Nível 1: Administrador Geral | Nível 2: Diretor | Nível 3: Coordenador | Nível 4: Professor | Nível 5: Secretário Escolar | Nível 6: Operacional.',
          },
          {
            title: 'Matriz de Permissões Granulares',
            detail:
              'Mais de 40 permissões atômicas configuráveis por cargo/perfil (ver PERMISSOES_ARQUITETURA.md).',
          },
          {
            title: 'Simulador Visual de Permissões',
            detail:
              'Ferramenta interativa no painel administrativo para testar visualização de telas como se fosse qualquer usuário ou cargo.',
          },
          {
            title: 'Contas Especiais',
            detail:
              'Suporte a perfis dedicados para portais específicos (EJA, EMAEE, Gestão de Usuários).',
          },
        ],
      },
      {
        id: 'pedagogico',
        label: 'Pedagógico, Frequência & Avaliações',
        emoji: '📖',
        items: [
          {
            title: 'Diário de Conteúdo / BNCC',
            detail:
              'Registro de planos de aula integrado à taxonomia oficial da BNCC (Fundamental e Infantil). Bloqueio por chamada pendente (RN01).',
          },
          {
            title: 'Chamada Digital & Gestão de Frequência',
            detail:
              'Lançamento rápido de presenças/faltas/justificativas por aula ou dia letivo com travas configuráveis de prazo retroativo.',
          },
          {
            title: 'Sistema Dinâmico de Avaliações e Notas',
            detail:
              'Avaliações flexíveis com pesos, fórmulas e períodos configuráveis por escola e ano letivo. Suporte a Recuperação Paralela e Recuperação Final (LDB).',
          },
          {
            title: 'Conselho de Classe e Ata Final',
            detail:
              'Deliberação colegiada com parecer individualizado por aluno. Emissão formal da Ata de Resultados Finais com bloqueio de edição após homologação.',
          },
        ],
      },
      {
        id: 'modulos-especiais',
        label: 'Módulos Educacionais Especiais',
        emoji: '🌟',
        items: [
          {
            title: 'Módulo EJA (Educação de Jovens e Adultos)',
            detail:
              'Módulo completo e independente com ativação via toggle-eja. Gestão de turmas modulares, alunos, matrículas, ocorrências e avaliações específicas.',
          },
          {
            title: 'EMAEE (Educação Especial & Atendimento Multiprofissional)',
            detail:
              'Prontuário e histórico de atendimentos, fila de espera inteligente, triagem multiprofissional e vinculação de equipe multidisciplinar.',
          },
          {
            title: 'Cursinho Pré-Universitário & Simulados OMR',
            detail:
              'Correção automatizada via OMR (leitura óptica de marcas) pela câmera do painel ou celular do estudante via token público. Relatório estatístico de acertos, TRI e ranking.',
          },
        ],
      },
      {
        id: 'comunicacao',
        label: 'Comunicação, Mural & Portal da Família',
        emoji: '📢',
        items: [
          {
            title: 'Mural de Avisos & Comunicados',
            detail:
              'Comunicados com fixação no topo (is_pinned), segmentação por turmas/escolas, expiração obrigatória, confirmação de leitura com pop-up e telemetria temporal.',
          },
          {
            title: 'Portal do Aluno / Responsáveis (/portal-aluno)',
            detail:
              'PWA dedicado para pais e responsáveis. Consulta de boletins, frequência, ocorrências disciplinares, solicitações de documentos e canal de mensagens.',
          },
        ],
      },
      {
        id: 'defesa',
        label: 'Defesa Ativa, Zero Trust & Telemetria',
        emoji: '🛡️',
        items: [
          {
            title: 'Arquitetura Zero Trust',
            detail:
              'Homologação de dispositivos com validação em camada de proxy (src/proxy.ts). Pareamento de notificações Push via QR Code temporário (sem token no aparelho pessoal).',
          },
          {
            title: 'Central de Defesa & Detecção de Ameaças',
            detail:
              'Registro de tentativas suspeitas, limitação de requisições e bloqueio manual/automático de IPs maliciosos.',
          },
          {
            title: 'Telemetria de Uso com Session Replay',
            detail:
              'Gravação de eventos de navegação (session_events) com sanitização de campos confidenciais e player de reprodução visual para auditoria.',
          },
          {
            title: 'Painel de Desempenho Global',
            detail:
              'Coleta e validação estatística de Web Vitals (LCP, FID, CLS, INP, TTFB) com percentis (P50, P75, P95) via RPC analítica.',
          },
        ],
      },
      {
        id: 'operacional',
        label: 'Operacional & Ferramentas Alpha',
        emoji: '🛠️',
        items: [
          {
            title: 'Ponto Mobile (Portaria 671/MTE)',
            detail:
              'Registro de ponto com cerca eletrônica (geofencing) e validação de biometria/dispositivo.',
          },
          {
            title: 'Transporte Escolar & Rondas',
            detail:
              'Gestão de frotas escolares, roteirização de paradas, alocação de alunos e rondas com suporte a cache offline de tiles de mapas.',
          },
          {
            title: 'Alpha Suite',
            detail:
              'Conversores e compressores de imagens, manipulador de PDFs e ferramentas utilitárias de carga e validação de planilhas.',
          },
        ],
      },
    ],
  },

  /* ──────────────────────────────────────────────────────
   * 2. Módulos em Expansão & Refinamento Contínuo
   * ────────────────────────────────────────────────────── */
  {
    id: 'in-progress',
    status: 'in-progress',
    title: 'Módulos em Expansão & Refinamento Contínuo',
    items: [
      {
        title: 'Estratégia de Cache e Performance SWR',
        detail:
          'Ampliação da cobertura de cache otimista e deduplicação de requisições via useSigSWR em tabelas de alto tráfego (Alunos, Frequências e Turmas).',
      },
      {
        title: 'Painéis de Business Intelligence (BI) para Secretaria',
        detail:
          'Consolidação de dashboards analíticos com taxas históricas de evasão, distribuição demográfica de matrículas e comparativos bimestrais de rendimento.',
      },
      {
        title: 'Módulo Financeiro & Folha Municipal',
        detail:
          'Refinamento do cálculo de adicionais salariais, lançamentos financeiros vinculados a cargos e controle de termos de rescisão/desligamento.',
      },
      {
        title: 'Sincronização Nativa Android (Capacitor)',
        detail:
          'Manutenção e alinhamento dos builds nativos Android (android/) com as atualizações recentes de PWA e push notifications.',
      },
    ],
  },

  /* ──────────────────────────────────────────────────────
   * 3. Planejamento Futuro & Próximas Frentes
   * ────────────────────────────────────────────────────── */
  {
    id: 'planned',
    status: 'planned',
    title: 'Planejamento Futuro & Próximas Frentes',
    items: [
      {
        title: 'Exportação Oficial para o Censo Escolar (Educacenso / INEP)',
        detail:
          'Gerador automatizado de arquivos .txt no layout padrão do INEP/MEC para exportação direta de cadastros de escolas, turmas, docentes e alunos.',
      },
      {
        title: 'Inteligência Artificial Preditiva contra Evasão Escolar',
        detail:
          'Modelo preditivo baseado em machine learning para identificar padrões de ausências consecutivas e queda brusca de rendimento, disparando alertas à equipe pedagógica.',
      },
      {
        title: 'Canal Omnichannel Integrado via WhatsApp (API Oficial)',
        detail:
          'Disparo de notificações automatizadas aos pais: aviso de ausência na primeira aula, alerta de boletim liberado e convites de reunião escolar.',
      },
      {
        title: 'Assinatura Digital Qualificada com Certificado ICP-Brasil',
        detail:
          'Assinatura digital em lote de atas de conselho de classe, históricos escolares e certificados de conclusão de ensino.',
      },
    ],
  },
]
