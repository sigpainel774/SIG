'use client'

import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  UserCog, 
  UserPlus, 
  Edit3, 
  CalendarCheck, 
  ShieldCheck, 
  ScanLine, 
  BookOpen, 
  ArrowLeftRight, 
  MessageSquareWarning,
  ChevronDown,
  Pin,
  Lock,
  FileCheck,
  Archive,
  Stethoscope,
  Users,
  Activity,
  FileBarChart,
  UserCheck,
  FileText,
  Settings,
  HelpCircle,
  QrCode,
  GraduationCap,
  Sparkles
} from 'lucide-react'
import { ModalReport } from '@/components/modals/modal-report'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { cn } from '@/lib/utils'

interface ManualItem {
  id: string
  icon: LucideIcon
  categoria: string
  titulo: string
  keywords: string[]
  apenasNivel1?: boolean
  conteudo: () => React.ReactNode
}

// Helper para normalização de acentos e diacríticos na busca insensível
const normalizeStr = (str: string) => 
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// ==========================================
// 1. CATÁLOGO DA SECRETARIA DE SAÚDE (14 MANUAIS)
// ==========================================
const ajudaSaude: ManualItem[] = [
  {
    id: 's1',
    icon: BookOpen,
    categoria: 'Início',
    titulo: 'Primeiros passos no SIG',
    keywords: ['primeiros passos', 'entrar', 'login', 'unidade', 'unidade de saude', 'trocar unidade', 'sincronizar', 'painel', 'saude'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Bem-vindo à Central de Ajuda da Secretaria de Saúde. Confira os passos iniciais para navegar no painel:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Entrar no sistema:</strong> Acesse com seu e-mail e senha cadastrados. Em caso de dúvidas sobre suas credenciais, contate a coordenação administrativa da Saúde.</li>
          <li><strong>Selecionar uma Unidade de Saúde:</strong> No menu do topo ou lateral, selecione a unidade hospitalar, UBS ou setor onde você está lotado.</li>
          <li><strong>Trocar de Unidade:</strong> Para servidores com vínculos múltiplos em diferentes unidades, utilize o seletor no cabeçalho para alternar o contexto de trabalho.</li>
          <li><strong>Atualizar ou Sincronizar o Painel:</strong> Utilize o botão <em>Atualizar</em> na barra lateral para recarregar os dados mais recentes de escalas e atestados.</li>
        </ul>
      </div>
    )
  },
  {
    id: 's2',
    icon: Activity,
    categoria: 'Início',
    titulo: 'Painel da Unidade de Saúde',
    keywords: ['painel', 'indicadores', 'profissionais ativos', 'escalas do dia', 'atestados do mes', 'documentos', 'solicitacoes'],
    conteudo: () => (
      <div className="space-y-4">
        <p>O painel inicial consolida os indicadores gerenciais da sua unidade em tempo real:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Profissionais Ativos:</strong> Total de servidores de saúde com vínculo ativo e lotação confirmada na unidade.</li>
          <li><strong>Escalas do Dia:</strong> Resumo dos plantonistas e equipes de serviço escalados para o dia vigente.</li>
          <li><strong>Atestados do Mês:</strong> Contagem de licenças e atestados médicos registrados no período.</li>
          <li><strong>Documentos e Solicitações:</strong> Atalhos para emissão de ofícios e consulta de solicitações pendentes.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's3',
    icon: Users,
    categoria: 'Gestão de Pessoal',
    titulo: 'Servidores da Saúde',
    keywords: ['servidores', 'funcionarios', 'pesquisar', 'cadastrar', 'ficha funcional', 'anexar documentos', 'inativar', 'historico'],
    conteudo: () => (
      <div className="space-y-4">
        <p>O módulo de Servidores permite gerenciar o quadro funcional da Secretaria de Saúde:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Consultar e Pesquisar:</strong> Busque servidores por nome, CPF, cargo ou especialidade médica na barra de pesquisa rápida.</li>
          <li><strong>Ficha Funcional:</strong> Acesse e atualize dados pessoais, registro profissional (ex: CRM, COREN) e lotação.</li>
          <li><strong>Anexar Documentos:</strong> Faça upload de diplomas, certidões e termos de compromisso diretamente na ficha do servidor.</li>
          <li><strong>Inativação de Registro:</strong> Servidores desligados devem ser inativados no sistema, garantindo a preservação integral do histórico administrativo e de auditoria.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's4',
    icon: Shield,
    categoria: 'Segurança & Perfis',
    titulo: 'Acessos e Permissões do Sistema',
    keywords: ['acessos', 'permissoes', 'perfis', 'administrador', 'gestor', 'chefe', 'operacional', 'corrigir acesso'],
    conteudo: () => (
      <div className="space-y-4">
        <p>O acesso às rotas e recursos é estruturado de acordo com as responsabilidades funcionais de cada servidor:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Administrador Geral:</strong> Gestão completa de cadastros, parametrizações globais da Secretaria de Saúde e concessão de acessos.</li>
          <li><strong>Gestor da Unidade:</strong> Administração da unidade de saúde, gestão de escalas, atestados, relatórios e documentos locais.</li>
          <li><strong>Chefe de Equipe / Plantão:</strong> Controle de escalas de serviço e acompanhamento de registros de ponto e rondas dos subordinados.</li>
          <li><strong>Operacional Mobile:</strong> Focado no registro de ponto e batida de rondas com geolocalização pelo celular.</li>
        </ul>
        <div className="bg-surface-2 p-4 border-l-4 border-sky-500 rounded-xl text-xs text-muted-foreground mt-3">
          <strong>Correção de Acesso:</strong> Se o seu perfil não exibir os menus da sua função, solicite a atualização de acesso ao Gestor da Unidade ou ao Administrador da Saúde.
        </div>
      </div>
    ),
  },
  {
    id: 's5',
    icon: UserCheck,
    categoria: 'Escalas & Plantões',
    titulo: 'Escalas e Plantões de Serviço',
    keywords: ['escalas', 'plantoes', 'equipes', 'profissionais', 'registros', 'cargo', 'equipe', 'permissao'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Gerencie a disponibilidade das equipes médicas e operacionais na rotina da unidade:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Consultar Equipes:</strong> Visualize o quadro de profissionais por especialidade, turno e setor.</li>
          <li><strong>Acompanhamento por Cargo:</strong> Filtre as escalas por enfermeiros, médicos, plantonistas e vigilantes.</li>
          <li><strong>Restrição de Informações:</strong> As escalas são exibidas estritamente conforme a unidade e cargo autorizados no seu perfil.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's6',
    icon: Stethoscope,
    categoria: 'Saúde & Afastamentos',
    titulo: 'Atestados Médicos de Servidores',
    keywords: ['atestados', 'medicos', 'afastamento', 'comprovantes', 'licenca', 'arquivar', 'corrigir'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Controle de licenças de saúde e atestados apresentados pelos servidores:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Registrar Atestado:</strong> Informe o servidor, a data de início, o período de afastamento e o CID quando aplicável.</li>
          <li><strong>Anexar Comprovante:</strong> Faça o upload do documento digitalizado ou foto nítida do atestado original.</li>
          <li><strong>Correção e Arquivamento:</strong> Gestores podem retificar datas ou arquivar registros inválidos respeitando os níveis de permissão.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's7',
    icon: FileText,
    categoria: 'Documentos',
    titulo: 'Documentos Oficiais da Saúde',
    keywords: ['documentos', 'oficios', 'secretaria de saude', 'destinatario', 'assunto', 'conteudo', 'assinatura', 'imprimir', 'arquivar'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Emissão e arquivamento de ofícios e comunicações formais da Secretaria de Saúde:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Criar Ofício:</strong> Defina o destinatário, assunto, texto do documento e setor de origem.</li>
          <li><strong>Assinatura Digital:</strong> Aplique a assinatura cadastrada do responsável legal antes da finalização.</li>
          <li><strong>Visualizar e Imprimir:</strong> Gere o documento em formato oficial padronizado para impressão ou envio digital.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's8',
    icon: FileBarChart,
    categoria: 'Relatórios & KPIs',
    titulo: 'Relatórios e Indicadores Gerenciais',
    keywords: ['relatorios', 'indicadores', 'kpi', 'servidores', 'presenca', 'ponto', 'atividade', 'filtros', 'impressao'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Geração de relatórios operacionais para acompanhamento e tomada de decisão:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Relatório de Servidores:</strong> Listagem com dados funcionais, lotações e contatos atualizados.</li>
          <li><strong>Registros de Presença e Atividade:</strong> Consolidação de horas trabalhadas e ocorrências funcionais.</li>
          <li><strong>Filtros Avançados:</strong> Refine a consulta por período, unidade de saúde ou cargo específico antes de imprimir.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's9',
    icon: Activity,
    categoria: 'Relatórios & KPIs',
    titulo: 'Central de Atividades Administrativas',
    keywords: ['central de atividades', 'atividades', 'periodo', 'unidade', 'responsaveis', 'relatorio administrativo'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Rastreamento detalhado das ações executadas na unidade:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Consultar por Período:</strong> Acompanhe a entrega de relatórios e registros administrativos da equipe.</li>
          <li><strong>Identificar Responsáveis:</strong> Visualize quem executou e atualizou cada registro no sistema.</li>
          <li><strong>Impressão de Auditoria:</strong> Imprima o extrato de atividades para conferência do setor de RH/Administração.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's10',
    icon: ScanLine,
    categoria: 'Ponto & Rondas',
    titulo: 'Ponto Eletrônico e Rondas com GPS',
    keywords: ['ponto', 'ponto eletronico', 'rondas', 'gps', 'qr code', 'camera', 'localizacao', 'entrada', 'intervalo', 'retorno', 'saida'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Registro de frequência e vigilância via leitor móvel de QR Code com validação geográfica:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Permissões de Câmera e GPS:</strong> Ao abrir o coletor móvel no celular, autorize a localização precisa e a câmera.</li>
          <li><strong>Registrar Entrada/Saída:</strong> Escaneie o QR Code fixado na unidade de saúde dentro do raio geográfico permitido.</li>
          <li><strong>Resolução de Falhas:</strong> Caso a mensagem de GPS fora do raio apareça, certifique-se de que a localização do celular está em alta precisão e refaça a leitura.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's11',
    icon: Pin,
    categoria: 'Comunicação',
    titulo: 'Mural de Avisos e Notificações',
    keywords: ['mural', 'notificacoes', 'comunicados', 'avisos', 'publicar', 'historico', 'alertas'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Comunicação direta entre a coordenação e os profissionais de saúde:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Consultar Comunicados:</strong> Fique atento às orientações publicadas no Mural na página inicial.</li>
          <li><strong>Publicar Avisos:</strong> Servidores autorizados podem publicar informativos com escopo geral ou por unidade.</li>
          <li><strong>Histórico de Notificações:</strong> Acompanhe o registro de alertas e lembretes do sistema pelo ícone de notificações.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's12',
    icon: Archive,
    categoria: 'Arquivo & Auditoria',
    titulo: 'Arquivo Geral de Documentos e Registros',
    keywords: ['arquivo geral', 'pesquisar', 'documentos arquivados', 'inativacao', 'exclusao', 'auditoria', 'historico'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Consulta a registros históricos e documentos arquivados da Secretaria de Saúde:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Pesquisa no Arquivo:</strong> Localize prontuários funcionais, portarias e registros de servidores desvinculados.</li>
          <li><strong>Inativação vs Exclusão:</strong> Registros nunca são deletados sem rastro; a inativação preserva a integridade legal para auditorias.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's13',
    icon: Edit3,
    categoria: 'Preferências',
    titulo: 'Configurações Pessoais e Assinatura Digital',
    keywords: ['configuracoes', 'perfil', 'senha', 'assinatura digital', 'notificacoes', 'permissoes disponiveis'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Gerenciamento da sua conta de usuário e preferências de uso:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Atualizar Perfil e Senha:</strong> Altere seus dados de contato e mantenha sua senha de acesso protegida.</li>
          <li><strong>Cadastrar Assinatura Digital:</strong> Desenhe ou faça upload da sua assinatura para uso na emissão de documentos formais.</li>
          <li><strong>Consultar Permissões:</strong> Visualize quais cargos e unidades estão vinculados ao seu perfil de acesso.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 's14',
    icon: MessageSquareWarning,
    categoria: 'Suporte',
    titulo: 'Reporte de Problemas e Chamados de Suporte',
    keywords: ['problemas', 'suporte', 'bug', 'reportar', 'erro', 'mensagem', 'chamado'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Como relatar divergências de dados ou falhas no sistema:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Botão de Reporte:</strong> Utilize o botão <em>Reportar um Problema ou Bug no SIG</em> no rodapé da página de ajuda.</li>
          <li><strong>Informações Úteis:</strong> Especifique a tela acessada, a ação executada e a mensagem de erro exibida.</li>
          <li><strong>Proteção de Privacidade:</strong> Não é necessário incluir dados pessoais sensíveis de pacientes no relato do chamado.</li>
        </ul>
      </div>
    ),
  }
]

// ==========================================
// 2. CATÁLOGO DA SECRETARIA DE EDUCAÇÃO
// ==========================================
const ajudaEducacao: ManualItem[] = [
  {
    id: 'd1',
    icon: Shield,
    categoria: 'Segurança & Perfis',
    titulo: 'Níveis de Acesso (Hierarquia Escolar)',
    keywords: ['root','superadmin','nivel 1','nivel 2','nivel 3','nivel 4','nivel 5','nivel 6','administrador','diretor','secretario','coordenador','professor','chefe','operacional','mobile','rbac','abac','rls','hierarquia','permissao'],
    conteudo: () => (
      <div className="space-y-4">
        <p>O SIG possui uma arquitetura de controle de acessos integrada às políticas de segurança do banco de dados:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>ROOT (Super Admin):</strong> Acesso administrativo global irrestrito a todas as unidades de ensino, logs do sistema e configurações.</li>
          <li><strong>Nível 1 (Administrador Global):</strong> Gestão ampla do painel, cadastro de funcionários e alocação de acessos na Secretaria de Educação.</li>
          <li><strong>Nível 2 (Diretor Escolar):</strong> Gestão total de sua respectiva unidade. Possui autoridade exclusiva para aprovar solicitações de desbloqueio de matrículas.</li>
          <li><strong>Nível 3 (Secretário / Coordenador):</strong> Controle operacional de secretaria, gerenciamento de cadastros e homologação diária de matrículas.</li>
          <li><strong>Nível 4 (Professor):</strong> Acesso restrito ao Diário de Classe. Visualiza e lança notas/frequência apenas das turmas nas quais está vinculado.</li>
          <li><strong>Nível 5 (Chefe de Equipe):</strong> Controle focado apenas nas profissões/cargos subordinados designados (ex: Vigias), sem acesso aos dados escolares gerais.</li>
          <li><strong>Nível 6 (Operacional Mobile):</strong> Acesso estritamente restrito à interface móvel para registro de Ponto e Rondas geolocalizadas.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd2',
    icon: Lock,
    categoria: 'Matrículas & Assinatura',
    titulo: 'Assinatura Eletrônica e Trava de Integridade',
    keywords: ['assinatura','assinatura eletronica','hash','sha-256','sha256','qr code','qrcode','pdf','integridade','trava','homologacao','responsavel','desbloqueio','codigo temporario','4 digitos','5 minutos','ip','user agent','geolocalizacao','storage'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Para eliminar o uso de papéis e garantir a autenticidade jurídica, o SIG utiliza um fluxo completo de Assinatura Eletrônica de Matrículas:</p>
        
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">1. Captura pelo Celular</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O funcionário gera um código temporário de 4 dígitos no painel. O responsável lê o QR Code na tela usando o celular e assina na tela móvel. O sistema valida os limites de tempo e coleta evidências de auditoria.
        </p>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">2. Homologação e Trava de Segurança</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ao salvar a matrícula com ambas as assinaturas, o sistema compila automaticamente o PDF oficial e calcula seu Hash SHA-256, bloqueando a ficha do aluno para edições diretas.
        </p>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 p-4 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-sm leading-relaxed">
          <strong className="flex items-center gap-1.5 mb-1 font-extrabold uppercase text-indigo-950 dark:text-indigo-100 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Desbloqueio pelo Diretor (Auditoria)
          </strong>
          Se for necessário fazer qualquer alteração em uma matrícula já homologada, o funcionário deve enviar solicitação com justificativa para aprovação exclusiva do Diretor (Nível 2) ou Admin.
        </div>
      </div>
    )
  },
  {
    id: 'd3',
    icon: FileCheck,
    categoria: 'Documentos & Autenticidade',
    titulo: 'Portal de Verificação de Autenticidade',
    keywords: ['verificar','verificacao','autenticidade','qr code','qrcode','token','hash','sha-256','sha256','comprovante','noindex','nofollow','privacidade','google','bing','ip','evidencia','trilha'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Qualquer comprovante emitido possui uma tarja digital de integridade que permite a validação jurídica por terceiros:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>QR Code e Chave Única:</strong> O rodapé do comprovante impresso contém um QR Code que aponta para o endereço público de verificação.</li>
          <li><strong>Trilha Completa de Evidências:</strong> Apresenta nomes das partes, momento exato das assinaturas, IPs dos dispositivos e Hash SHA-256 do arquivo.</li>
          <li><strong>Garantia de Privacidade:</strong> Páginas de verificação possuem metadados noindex/nofollow para evitar a exposição de estudantes em mecanismos de busca.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd12',
    icon: UserPlus,
    categoria: 'Acessos & Contas',
    titulo: 'Criação de Contas e Conciliação por E-mail',
    keywords: ['conta','criar conta','email','e-mail','supabase','auth','login','reconciliacao','conciliacao','ficha','trigger','automatico','primeiro acesso','primeiro login','rls'],
    conteudo: () => (
      <div className="space-y-4">
        <p>A unificação entre contas de autenticação e fichas funcionais baseia-se no e-mail do servidor:</p>
        <div className="bg-surface-2 p-4 border-l-4 border-blue-500 rounded-xl space-y-2">
          <h5 className="text-foreground font-bold text-sm">Caminho 1: Ficha criada ANTES do login (Recomendado)</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O gestor cadastra a ficha informando o E-mail. Ao criar a conta de autenticação com o mesmo e-mail, a atribuição de acessos ocorre de forma transparente.
          </p>
        </div>
        <div className="bg-surface-2 p-4 border-l-4 border-emerald-500 rounded-xl space-y-2">
          <h5 className="text-foreground font-bold text-sm">Caminho 2: Login criado ANTES da ficha</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Se a conta for criada primeiro no login, uma ficha inicial vazia vinculada àquele e-mail é gerada para preenchimento posterior pelo gestor.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'd4',
    icon: BookOpen,
    categoria: 'Lotação & Vínculos',
    titulo: 'Vínculos de Diretores e Professores',
    keywords: ['vinculo','lotacao','diario','diario de classe','professor','diretor','nivel 2','nivel 4','escola','turma','disciplina','vazio','rls','permissao','cargo','acesso'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Para garantir que professores acessem o Diário de Classe e diretores tenham controle sobre a sua unidade, atente-se às regras de lotação:</p>
        <ul className="list-disc pl-5 space-y-2 leading-relaxed">
          <li><strong>Diretores (Nível 2):</strong> Devem ser lotados fisicamente na respectiva escola (menu Funcionários) e ter a permissão vinculada à mesma escola.</li>
          <li><strong>Professores (Nível 4):</strong> A escola atribuída nas lotações e no menu de Permissões precisa coincidir rigorosamente para liberação das turmas.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd2_edit',
    icon: Edit3,
    categoria: 'Segurança & Edição',
    titulo: 'Interruptor do Modo de Edição',
    keywords: ['modo edicao','edicao','editar','senha','confirmacao','visualizacao','protecao','toggle','interruptor','acidental','professor','nota','falta','diario'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Por padrão, os usuários acessam a interface administrativa em Modo Visualização para proteção contra alterações acidentais:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Para realizar alterações de matrículas ou vínculos, ative a chave Modo Edição no topo do painel superior.</li>
          <li>O sistema exigirá a confirmação digitando sua senha pessoal de acesso.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd3_lanc',
    icon: CalendarCheck,
    categoria: 'Avaliações & Notas',
    titulo: 'Lançamento de Faltas, Decimais e Médias',
    keywords: ['nota','falta','frequencia','decimal','media','float','8.5','arredondamento','string','lancamento','trimestre','unidade','log','rastreabilidade','auditoria'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Os registros escolares de notas e frequência são monitorados em tempo real:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Digitação de Decimais:</strong> Notas fracionadas (ex: 8.5) são tratadas no estado de formulário como string e salvas como decimal no banco, evitando arredondamentos automáticos.</li>
          <li><strong>Rastreabilidade:</strong> Todo lançamento registra o ID e nome do responsável nos logs de auditoria.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd6',
    icon: ShieldCheck,
    categoria: 'Gestão de Equipes',
    titulo: 'Módulo ABAC: Gestão de Equipes (Chefe)',
    keywords: ['abac','chefe','chefe de equipe','nivel 5','vigia','servicos gerais','cargo','subordinado','escala','ronda','ponto','consolidado','rede','gestao','equipe'],
    conteudo: () => (
      <div className="space-y-4">
        <p>A permissão de Chefe de Equipe (Nível 5) é configurada por escopo de cargos subordinados:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Definição Global:</strong> O Chefe gerencia os cargos subordinados (ex: Vigias, Serviços Gerais) atribuídos na concessão do seu acesso.</li>
          <li><strong>Cruzamento de Dados:</strong> O painel consolida escalas, logs de rondas e pontos batidos pelos funcionários subordinados na rede.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd7',
    icon: ScanLine,
    categoria: 'Ponto & Rondas',
    titulo: 'Ponto Eletrônico e Rondas com GPS',
    keywords: ['ponto','ronda','gps','geolocalizacao','qr code','qrcode','mobile','celular','camera','raio','tolerancia','latitude','longitude','coordenadas','nivel 6','operacional','vigia'],
    conteudo: () => (
      <div className="space-y-4">
        <p>A validação do Ponto e das Rondas é executada via dispositivo móvel por leitura de QR Code:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Geolocalização Obrigatória:</strong> O app móvel exige GPS ativado para habilitação da câmera.</li>
          <li><strong>Raio de Tolerância:</strong> O ponto é confirmado somente se as coordenadas do GPS indicarem que o funcionário está dentro da área autorizada.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd11',
    icon: Pin,
    categoria: 'Comunicação',
    titulo: 'Mural de Comunicados e Avisos',
    keywords: ['mural','comunicado','aviso','publicar','post','pode_mural','superadmin','nivel 1','nivel 2','nivel 3','nivel 4','nivel 5','nivel 6','permissao','home','dashboard'],
    conteudo: () => (
      <div className="space-y-4">
        <p>A publicação de avisos institucionais na página inicial segue regras de permissão:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Superadmins:</strong> Permissão nativa para gerenciar comunicados.</li>
          <li><strong>Outros Perfis:</strong> Podem publicar comunicados se o atributo <em>pode_mural</em> estiver habilitado em suas permissões.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd13_transf_arq',
    icon: ArrowLeftRight,
    categoria: 'Secretaria & Alunos',
    titulo: 'Fluxo de Transferências e Arquivo Escolar',
    keywords: ['transferencia','arquivo','arquivamento','historico','aluno','funcionario','recebimento','submissao','aceitar','rejeitar','diretor','transferido','copia','ficha','vinculo','arquivologia'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Gestão unificada do fluxo de movimentação de alunos e funcionários:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Central de Transferências:</strong> Permite avaliar recebimentos pendentes, submissões enviadas e histórico geral.</li>
          <li><strong>Arquivologia Histórica:</strong> Ao aceitar uma transferência, a ficha ativa migra para a escola de destino e uma cópia histórica fica arquivada na origem.</li>
          <li><strong>Arquivo Escolar:</strong> Permite pesquisar fichas acadêmicas históricas de alunos desvinculados ou transferidos.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd14_gestao_diretores',
    icon: UserCog,
    apenasNivel1: true,
    categoria: 'Gestão Central',
    titulo: 'Gestão, Inativação e Substituição de Diretores (Nível 1 / Root)',
    keywords: ['diretor', 'gestao', 'inativar', 'remover', 'trocar', 'transferir', 'assinatura', 'diretor_id', 'lotacao', 'oficial', 'nivel 1', 'root'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Guia exclusivo de nível administrativo central para substituição e transferência de gestores escolares:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Integridade dos Dados:</strong> Ao inativar ou substituir um diretor, nenhum dado de estudante ou turma é removido.</li>
          <li><strong>Diretor Responsável:</strong> Selecione o novo diretor nas <em>Configurações da Escola</em> para que atestados e comprovantes emitidos atualizem automaticamente.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd15_criacao_funcionario_eja',
    icon: GraduationCap,
    apenasNivel1: true,
    categoria: 'Gestão Central',
    titulo: 'Cadastro e Configuração de Funcionário Especial EJA (Nível 1 / Root)',
    keywords: ['eja', 'especial eja', 'conta especial', 'funcionario especial', 'coordenador eja', 'professor eja', 'portal eja', 'is_conta_eja', 'is_conta_especial', 'permissoes', 'nivel 1', 'root'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Roteiro oficial para cadastro, liberação de acesso e configuração de servidores da modalidade EJA (Educação de Jovens e Adultos) na rede municipal:</p>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2 text-sm">
          <strong className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-bold">
            <Sparkles className="w-4 h-4" /> O que é uma Conta Especial EJA?
          </strong>
          <p className="text-xs text-muted-foreground leading-relaxed">
            É uma conta com privilégios automáticos de visualização e lançamento (via políticas RLS do banco de dados) em todas as turmas, alunos, notas, frequências e diários da modalidade EJA em toda a rede municipal, sem necessidade de vinculação manual a cada escola física individualmente.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div className="bg-muted/60 p-3.5 border-l-4 border-blue-500 rounded-xl space-y-1.5">
            <h5 className="text-foreground font-bold text-xs uppercase tracking-wider">Passo 1: Cadastrar a Ficha do Servidor</h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acesse o menu <strong>Funcionários</strong> (<code className="text-foreground font-mono">/funcionarios</code>) e clique em <strong>+ Novo Funcionário</strong>. Preencha os dados cadastrais (Nome Completo, CPF, E-mail oficial e Cargo, ex: <em>Coordenador EJA</em> ou <em>Professor EJA</em>) e salve o registro.
            </p>
          </div>

          <div className="bg-muted/60 p-3.5 border-l-4 border-indigo-500 rounded-xl space-y-1.5">
            <h5 className="text-foreground font-bold text-xs uppercase tracking-wider">Passo 2: Vincular o Acesso / Login</h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Certifique-se de que o usuário possua conta criada no Supabase Auth (<code className="text-foreground font-mono">auth.users</code>) com o mesmo e-mail cadastrado na ficha funcional.
            </p>
          </div>

          <div className="bg-muted/60 p-3.5 border-l-4 border-amber-500 rounded-xl space-y-1.5">
            <h5 className="text-foreground font-bold text-xs uppercase tracking-wider">Passo 3: Ativar o Status de Conta Especial EJA</h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acesse o menu <strong>Permissões</strong> (<code className="text-foreground font-mono">/permissoes</code>) e selecione a aba <strong>Contas Especiais</strong>. Ative o <em>Modo de Edição</em> (com a senha gerencial), localize o servidor na busca e marque a caixa de seleção <strong>Conta especial EJA</strong> (<code className="text-foreground font-mono">is_conta_eja = true</code>).
            </p>
          </div>

          <div className="bg-muted/60 p-3.5 border-l-4 border-emerald-500 rounded-xl space-y-1.5">
            <h5 className="text-foreground font-bold text-xs uppercase tracking-wider">Passo 4: Opções Adicionais e Comportamento</h5>
            <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
              <li><strong>Marcar como Especial:</strong> Opcional. Se ativado, oculta a conta das listagens de equipes de escolas regulares físicas.</li>
              <li><strong>Redirecionamento Automático:</strong> Ao efetuar login, o servidor é direcionado diretamente para o <strong>Portal EJA</strong> (<code className="text-foreground font-mono">/eja</code>).</li>
              <li><strong>Menu Lateral Customizado:</strong> A barra lateral se adapta automaticamente exibindo turmas, alunos, notas e relatórios restritos ao escopo EJA.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }
]

// ==========================================
// 3. CATÁLOGO GERAL (SEM SELEÇÃO DE CONTEXTO)
// ==========================================
const ajudaGeral: ManualItem[] = [
  {
    id: 'g1',
    icon: BookOpen,
    categoria: 'Início',
    titulo: 'Primeiros passos no SIG',
    keywords: ['primeiros passos', 'entrar', 'login', 'unidade', 'secretaria', 'navegacao', 'painel'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Orientações gerais para navegação na plataforma SIG:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Seleção de Contexto:</strong> No cabeçalho superior do painel, selecione a sua Unidade ou Secretaria de atuação para habilitar os catálogos e módulos específicos.</li>
          <li><strong>Menu Lateral:</strong> Acesse as ferramentas administrativas de acordo com os privilégios atribuídos à sua conta.</li>
          <li><strong>Atualização de Dados:</strong> Clique em <em>Atualizar</em> no menu lateral para sincronizar informações recentes.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'g2',
    icon: Shield,
    categoria: 'Segurança & Perfis',
    titulo: 'Acessos e Permissões Gerais',
    keywords: ['acessos', 'permissoes', 'perfis', 'nivel', 'administrador', 'gestor', 'chefe', 'operacional'],
    conteudo: () => (
      <div className="space-y-4">
        <p>As rotas disponíveis no sistema são liberadas conforme o perfil do servidor:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Perfil Administrativo:</strong> Gestão de cadastros, relatórios e controle de acessos da unidade.</li>
          <li><strong>Perfil Operacional / Mobile:</strong> Focado em rotinas de registro por QR Code, ponto e rondas.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'g3',
    icon: ScanLine,
    categoria: 'Ponto & Rondas',
    titulo: 'Ponto Eletrônico e Coleta Local com GPS',
    keywords: ['ponto', 'rondas', 'gps', 'qr code', 'mobile', 'celular', 'camera', 'coleta local'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Validação móvel de presença e rondas operacionais:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Localização e Câmera:</strong> Conceda permissão de GPS e câmera no navegador do seu smartphone.</li>
          <li><strong>Leitura de QR Code:</strong> Realize a leitura do código fixado no local autorizando seu registro de entrada/saída.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'g4',
    icon: Pin,
    categoria: 'Comunicação',
    titulo: 'Mural de Avisos Institucionais',
    keywords: ['mural', 'comunicados', 'avisos', 'publicar', 'notificacoes'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Acompanhamento de avisos e comunicados da administração:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Consulte as notícias e informativos oficiais publicados na tela inicial.</li>
          <li>Servidores com autorização no perfil podem publicar novos comunicados institucionais.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'g5',
    icon: Edit3,
    categoria: 'Preferências',
    titulo: 'Configurações de Conta e Senha',
    keywords: ['configuracoes', 'perfil', 'senha', 'assinatura', 'preferencias'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Ajustes de perfil de acesso:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Acesse a página de Configurações para alterar sua senha de acesso ou cadastrar sua assinatura digital.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'g6',
    icon: MessageSquareWarning,
    categoria: 'Suporte',
    titulo: 'Reporte de Problemas no SIG',
    keywords: ['problemas', 'suporte', 'bug', 'reportar', 'erro'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Em caso de falhas ou comportamentos inesperados:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Clique no botão <em>Reportar um Problema ou Bug no SIG</em> no rodapé para enviar o chamado diretamente à equipe de suporte.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'g7_criacao_funcionario_eja',
    icon: GraduationCap,
    apenasNivel1: true,
    categoria: 'Gestão Central',
    titulo: 'Cadastro e Configuração de Funcionário Especial EJA (Nível 1 / Root)',
    keywords: ['eja', 'especial eja', 'conta especial', 'funcionario especial', 'coordenador eja', 'professor eja', 'portal eja', 'is_conta_eja', 'is_conta_especial', 'permissoes', 'nivel 1', 'root'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Roteiro oficial para cadastro, liberação de acesso e configuração de servidores da modalidade EJA (Educação de Jovens e Adultos) na rede municipal:</p>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-2 text-sm">
          <strong className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-bold">
            <Sparkles className="w-4 h-4" /> O que é uma Conta Especial EJA?
          </strong>
          <p className="text-xs text-muted-foreground leading-relaxed">
            É uma conta com privilégios automáticos de visualização e lançamento (via políticas RLS do banco de dados) em todas as turmas, alunos, notas, frequências e diários da modalidade EJA em toda a rede municipal, sem necessidade de vinculação manual a cada escola física individualmente.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <div className="bg-muted/60 p-3.5 border-l-4 border-blue-500 rounded-xl space-y-1.5">
            <h5 className="text-foreground font-bold text-xs uppercase tracking-wider">Passo 1: Cadastrar a Ficha do Servidor</h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acesse o menu <strong>Funcionários</strong> (<code className="text-foreground font-mono">/funcionarios</code>) e clique em <strong>+ Novo Funcionário</strong>. Preencha os dados cadastrais (Nome Completo, CPF, E-mail oficial e Cargo, ex: <em>Coordenador EJA</em> ou <em>Professor EJA</em>) e salve o registro.
            </p>
          </div>

          <div className="bg-muted/60 p-3.5 border-l-4 border-indigo-500 rounded-xl space-y-1.5">
            <h5 className="text-foreground font-bold text-xs uppercase tracking-wider">Passo 2: Vincular o Acesso / Login</h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Certifique-se de que o usuário possua conta criada no Supabase Auth (<code className="text-foreground font-mono">auth.users</code>) com o mesmo e-mail cadastrado na ficha funcional.
            </p>
          </div>

          <div className="bg-muted/60 p-3.5 border-l-4 border-amber-500 rounded-xl space-y-1.5">
            <h5 className="text-foreground font-bold text-xs uppercase tracking-wider">Passo 3: Ativar o Status de Conta Especial EJA</h5>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acesse o menu <strong>Permissões</strong> (<code className="text-foreground font-mono">/permissoes</code>) e selecione a aba <strong>Contas Especiais</strong>. Ative o <em>Modo de Edição</em> (com a senha gerencial), localize o servidor na busca e marque a caixa de seleção <strong>Conta especial EJA</strong> (<code className="text-foreground font-mono">is_conta_eja = true</code>).
            </p>
          </div>

          <div className="bg-muted/60 p-3.5 border-l-4 border-emerald-500 rounded-xl space-y-1.5">
            <h5 className="text-foreground font-bold text-xs uppercase tracking-wider">Passo 4: Opções Adicionais e Comportamento</h5>
            <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
              <li><strong>Marcar como Especial:</strong> Opcional. Se ativado, oculta a conta das listagens de equipes de escolas regulares físicas.</li>
              <li><strong>Redirecionamento Automático:</strong> Ao efetuar login, o servidor é direcionado diretamente para o <strong>Portal EJA</strong> (<code className="text-foreground font-mono">/eja</code>).</li>
              <li><strong>Menu Lateral Customizado:</strong> A barra lateral se adapta automaticamente exibindo turmas, alunos, notas e relatórios restritos ao escopo EJA.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }
]

export default function AjudaPage() {
  const [busca, setBusca] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const { isAdminGlobalOrRoot } = useAuthStore()
  const { selectedEscola, selectedSecretaria } = useSchoolStore()
  const isNivel1 = isAdminGlobalOrRoot()

  // Evita hydration mismatch guardando montagem do cliente
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Identificação reativa de contexto (mesmo critério da Sidebar.tsx)
  const secNome = selectedSecretaria?.nome || selectedEscola?.secretariaNome || (selectedEscola?.secretarias as any)?.nome || ''
  const temContexto = Boolean(selectedEscola || selectedSecretaria) && Boolean(secNome)

  const isSaude = temContexto && /sa[uú]de/i.test(secNome)
  const isEducacao = (temContexto && /educa/i.test(secNome)) || (selectedEscola !== null && !isSaude)
  const isGeral = !isSaude && !isEducacao

  const toggleDiretriz = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  // Seleção estrita do catálogo base dependendo do contexto ativo
  const catalogoAtivo = useMemo(() => {
    if (isSaude) return ajudaSaude
    if (isEducacao) return ajudaEducacao
    return ajudaGeral
  }, [isSaude, isEducacao])

  // Filtragem insensível a acentos e maiúsculas/minúsculas
  const diretrizesFiltradas = useMemo(() => {
    const q = normalizeStr(busca.trim())
    const disponiveis = catalogoAtivo.filter(d => !d.apenasNivel1 || isNivel1)
    
    if (!q) return disponiveis

    return disponiveis.filter(d => {
      const tituloNorm = normalizeStr(d.titulo)
      const catNorm = normalizeStr(d.categoria)
      const matchTitulo = tituloNorm.includes(q)
      const matchCat = catNorm.includes(q)
      const matchKeywords = d.keywords.some(kw => normalizeStr(kw).includes(q))
      
      return matchTitulo || matchCat || matchKeywords
    })
  }, [busca, catalogoAtivo, isNivel1])

  // Textos dinâmicos baseados no contexto ativo
  const headerTexts = useMemo(() => {
    if (isSaude) {
      return {
        titulo: 'Central de Ajuda — Secretaria de Saúde',
        subtitulo: 'Orientações para utilizar os recursos administrativos e operacionais do SIG Saúde.',
        placeholder: 'Buscar ajuda sobre servidores, escalas, atestados, documentos, ponto...'
      }
    }
    if (isEducacao) {
      return {
        titulo: 'Central de Ajuda — Secretaria de Educação',
        subtitulo: 'Manuais operacionais, fluxos oficiais de acesso e guias do SIG Escolar.',
        placeholder: 'Buscar manuais ou palavras-chave (ex: assinatura, ponto, professor, sha-256)...'
      }
    }
    return {
      titulo: 'Central de Ajuda',
      subtitulo: 'Orientações gerais de uso, suporte e acesso ao SIG.',
      placeholder: 'Buscar ajuda geral no sistema...'
    }
  }, [isSaude, isEducacao])

  return (
    <div className="space-y-6 max-w-4xl mx-auto selection:bg-primary/30 selection:text-foreground pb-12">
      {/* ModalReport carregado sob demanda */}
      {reportModalOpen && (
        <ModalReport open={reportModalOpen} onOpenChange={setReportModalOpen} />
      )}

      {/* Cabeçalho dinâmico por contexto */}
      <div className="pb-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>{headerTexts.titulo}</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {headerTexts.subtitulo}
          </p>
        </div>
      </div>

      {/* Input de Busca */}
      <div className="mb-6">
        <Input 
          type="text"
          placeholder={headerTexts.placeholder}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="bg-background border-border text-foreground focus-visible:ring-primary h-12 text-sm rounded-xl placeholder:text-muted-foreground"
        />
      </div>

      {/* Listagem de Manuais */}
      <div className="space-y-3">
        {diretrizesFiltradas.map((diretriz) => {
          const isExpanded = expandedId === diretriz.id
          const Icon = diretriz.icon

          return (
            <div 
              key={diretriz.id} 
              className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:border-primary/20"
            >
              <button 
                type="button"
                onClick={() => toggleDiretriz(diretriz.id)}
                className="w-full bg-transparent border-none text-foreground p-4 sm:p-4.5 text-left flex justify-between items-center cursor-pointer font-bold hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
              >
                <div className="flex items-center gap-3 text-sm tracking-tight min-w-0 pr-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0">
                    <span className="truncate">{diretriz.titulo}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border w-fit shrink-0">
                      {diretriz.categoria}
                    </span>
                  </div>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300 shrink-0", isExpanded && "rotate-180 text-foreground")} />
              </button>
              
              {isExpanded && (
                <div className="p-5 pt-2 text-muted-foreground text-sm leading-relaxed border-t border-border bg-muted/10 animate-fadeIn">
                  {diretriz.conteudo()}
                </div>
              )}
            </div>
          )
        })}

        {diretrizesFiltradas.length === 0 && (
          <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-2xl shadow-sm space-y-3">
            <p>Nenhum manual encontrado para a busca especificada.</p>
            {busca && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setBusca('')}
                className="text-primary hover:text-primary/80 font-medium text-xs cursor-pointer"
              >
                Limpar filtro de busca
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Botão de Reportar Problema no SIG */}
      <div className="mt-8 text-center pt-8 border-t border-dashed border-border">
        <Button 
          type="button"
          onClick={() => setReportModalOpen(true)}
          variant="outline" 
          className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 hover:text-red-700 dark:hover:text-red-300 font-semibold h-12 px-6 rounded-xl transition-all cursor-pointer"
        >
          <MessageSquareWarning className="w-5 h-5 mr-2" />
          Reportar um Problema ou Bug no SIG
        </Button>
      </div>
    </div>
  )
}
