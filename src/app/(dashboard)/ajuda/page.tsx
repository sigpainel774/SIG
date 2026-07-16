'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  UserCog, 
  UserPlus, 
  Edit3, 
  CalendarCheck, 
  Map, 
  ShieldCheck, 
  ScanLine, 
  BookOpen, 
  ArrowLeftRight, 
  MessageSquareWarning,
  ChevronDown,
  Pin,
  Lock,
  FileCheck,
  QrCode,
  Archive
} from 'lucide-react'
import { ModalReport } from '@/components/modals/modal-report'

const diretrizes = [
  {
    id: 'd1',
    icon: Shield,
    titulo: 'Níveis de Acesso (Hierarquia)',
    conteudo: (
      <div className="space-y-4">
        <p>O SIG possui uma arquitetura de controle de acessos baseada em papéis (RBAC) e atributos (ABAC) integrada às políticas de segurança RLS do banco de dados:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>ROOT (Super Admin):</strong> Acesso administrativo global irrestrito a todas as unidades de ensino, logs do sistema, configurações de banco e chaves de segurança.</li>
          <li><strong>Nível 1 (Administrador Global):</strong> Gestão ampla do painel, cadastro de novos funcionários e alocação de acessos na Secretaria de Educação.</li>
          <li><strong>Nível 2 (Diretor Escolar):</strong> Gestão total de sua respectiva unidade. Possui autoridade exclusiva para aprovar solicitações de desbloqueio de matrículas.</li>
          <li><strong>Nível 3 (Secretário / Coordenador):</strong> Controle operacional de secretaria, gerenciamento de cadastros e homologação diária de matrículas.</li>
          <li><strong>Nível 4 (Professor):</strong> Acesso restrito ao Diário de Classe. Visualiza e lança notas/frequência apenas das turmas e disciplinas nas quais está vinculado.</li>
          <li><strong>Nível 5 (Chefe de Equipe):</strong> Controle focado apenas nas profissões/cargos subordinados designados (ex: Vigias), sem acesso aos dados escolares gerais.</li>
          <li><strong>Nível 6 (Operacional Mobile):</strong> Acesso estritamente restrito à interface móvel do leitor de QR Code para registro de Ponto e Rondas geolocalizadas.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd2',
    icon: Lock,
    titulo: 'Assinatura Eletrônica e Trava de Integridade',
    conteudo: (
      <div className="space-y-4">
        <p>Para eliminar o uso de papéis e garantir a autenticidade jurídica, o SIG utiliza um fluxo completo de **Assinatura Eletrônica de Matrículas**:</p>
        
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">1. Captura pelo Celular</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O funcionário gera um código temporário de 4 dígitos (válido por 5 minutos) no painel. O responsável lê o QR Code na tela usando o celular e assina diretamente na tela móvel. O sistema valida os limites de tempo e coleta evidências de auditoria (IP, User Agent e Geolocalização).
        </p>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">2. Homologação e Trava de Segurança</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ao salvar a matrícula com ambas as assinaturas (Responsável e Funcionário), o sistema compila automaticamente o PDF oficial e calcula seu **Hash SHA-256**. O arquivo é enviado para o storage e a ficha do aluno é **bloqueada permanentemente** para edições adicionais.
        </p>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 p-4 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-sm leading-relaxed">
          <strong className="flex items-center gap-1.5 mb-1 font-extrabold uppercase text-indigo-950 dark:text-indigo-100 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Desbloqueio pelo Diretor (Auditoria)
          </strong>
          Se for necessário fazer qualquer alteração em uma matrícula já homologada, o funcionário deve enviar uma solicitação com justificativa. Apenas o **Diretor (Nível 2)** ou **Admin** pode aprovar a solicitação na listagem de alunos. Ao aprovar, o sistema libera temporariamente a edição. Ao salvar novamente, um novo PDF e um novo Hash SHA-256 são gerados automaticamente.
        </div>
      </div>
    )
  },
  {
    id: 'd3',
    icon: FileCheck,
    titulo: 'Portal de Verificação de Autenticidade',
    conteudo: (
      <div className="space-y-4">
        <p>Qualquer comprovante emitido possui uma tarja digital de integridade que permite a validação jurídica por terceiros:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>QR Code e Chave Única:</strong> O rodapé do comprovante impresso contém um QR Code que aponta para o endereço público `/verificar/[token]`.</li>
          <li><strong>Trilha Completa de Evidências:</strong> No portal de validação, são apresentados os nomes das partes, o momento exato de cada assinatura, os IPs dos dispositivos utilizados, o navegador/sistema operacional e o Hash SHA-256 original do arquivo.</li>
          <li><strong>Garantia de Privacidade:</strong> As páginas de verificação pública são configuradas com cabeçalhos de metadados <code>noindex, nofollow</code> para garantir que dados de estudantes nunca sejam expostos em indexações de busca do Google ou Bing.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd12',
    icon: UserPlus,
    titulo: 'Criação de Contas e Conciliação por E-mail',
    conteudo: (
      <div className="space-y-4">
        <p>A unificação entre contas de autenticação do Supabase e as fichas funcionais do SIG baseia-se no <strong>e-mail do funcionário</strong>:</p>
        
        <div className="bg-surface-2 p-4 border-l-4 border-blue-500 rounded-xl space-y-2">
          <h5 className="text-foreground font-bold text-sm">Caminho 1: Ficha criada ANTES do login (Recomendado)</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O gestor cadastra a ficha do funcionário informando o E-mail. Ao criar a conta de autenticação correspondente no Supabase Auth com o mesmo e-mail, a reconciliação e atribuição das chaves de acesso RLS ocorrem de forma transparente no primeiro login.
          </p>
        </div>

        <div className="bg-surface-2 p-4 border-l-4 border-emerald-500 rounded-xl space-y-2">
          <h5 className="text-foreground font-bold text-sm">Caminho 2: Login criado ANTES da ficha</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Se a conta de login for criada primeiro na Auth do Supabase, o banco acionará uma trigger automática criando uma "ficha vazia" associada àquele e-mail. O gestor da unidade precisará apenas preencher os campos restantes da ficha posteriormente.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'd4',
    icon: BookOpen,
    titulo: 'Vínculos de Diretores e Professores',
    conteudo: (
      <div className="space-y-4">
        <p>Para garantir que professores acessem corretamente o Diário de Classe e diretores tenham controle sobre a sua unidade, atente-se às regras de lotação:</p>
        <ul className="list-disc pl-5 space-y-2 leading-relaxed">
          <li><strong>Diretores (Nível 2):</strong> Devem ser lotados fisicamente na respectiva escola (menu Funcionários) e ter sua permissão de Nível 2 vinculada <strong>exatamente à mesma escola</strong> no menu de Acessos.</li>
          <li><strong>Professores (Nível 4):</strong> A escola atribuída nas lotações e no menu de Permissões precisa coincidir rigorosamente. Caso contrário, embora consiga fazer o login, o painel de turmas e diários do docente será exibido vazio por razões de segurança RLS.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd2_edit',
    icon: Edit3,
    titulo: 'Interruptor do Modo de Edição',
    conteudo: (
      <div className="space-y-4">
        <p>Por padrão, usuários operacionais acessam a interface administrativa em <strong>Modo Visualização</strong> para proteção de registros contra toques acidentais:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Para realizar alterações de matrículas, vínculos ou dados escolares, ative a chave <strong>Modo Edição</strong> no topo do painel superior.</li>
          <li>O sistema exigirá a confirmação de segurança digitando a sua <strong>senha pessoal</strong> de acesso.</li>
          <li><em>Exceção:</em> Professores em seus respectivos diários eletrônicos não precisam ativar o Modo Edição para lançar faltas e notas do dia.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd3_lanc',
    icon: CalendarCheck,
    titulo: 'Lançamento de Faltas, Decimais e Médias',
    conteudo: (
      <div className="space-y-4">
        <p>Os registros escolares de notas e frequência são monitorados em tempo de execução:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Digitação de Decimais:</strong> Para evitar perda de dados e arredondamentos automáticos indesejados durante a escrita, as notas com frações decimais (ex: 8.5) são tratadas no estado de formulário local como strings, e convertidas para float de banco apenas na gravação final.</li>
          <li><strong>Rastreabilidade de Alteração:</strong> Todo lançamento registra nos metadados de logs o ID e nome do funcionário responsável pela ação.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd6',
    icon: ShieldCheck,
    titulo: 'Módulo ABAC: Gestão de Equipes (Chefe)',
    conteudo: (
      <div className="space-y-4">
        <p>A permissão de **Chefe de Equipe (Nível 5)** é configurada por escopo de cargos subordinados (ABAC):</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Definição Global:</strong> O Chefe não fica associado a uma única escola física; ele gerencia os cargos subordinados (ex: Vigias, Serviços Gerais) atribuídos na concessão do seu acesso.</li>
          <li><strong>Cruzamento de Dados:</strong> O painel do chefe consolida escalas, logs de rondas e pontos batidos pelos funcionários da rede inteira que pertençam aos cargos que ele gerencia.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd7',
    icon: ScanLine,
    titulo: 'Ponto Eletrônico e Rondas com GPS (Operacional)',
    conteudo: (
      <div className="space-y-4">
        <p>A validação do Ponto e das Rondas de segurança é executada estritamente via dispositivo móvel por leitura de QR Code:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Geolocalização Obrigatória:</strong> O App móvel exige acesso ao GPS do aparelho. Se a permissão geográfica for rejeitada pelo usuário, a ativação da câmera para escanear o QR Code é desabilitada.</li>
          <li><strong>Raio de Tolerância:</strong> O local do QR Code é cadastrado com coordenadas (Latitude/Longitude) e raio de tolerância. O ponto só é registrado se o GPS do celular indicar que o funcionário está dentro da área permitida.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd11',
    icon: Pin,
    titulo: 'Mural de Comunicados e Avisos',
    conteudo: (
      <div className="space-y-4">
        <p>A publicação de avisos institucionais na página inicial do SIG segue regras de acesso específicas:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Superadmins:</strong> Permissão nativa e irrestrita para gerenciar posts.</li>
          <li><strong>Outros Níveis (1 a 6):</strong> Podem publicar comunicados apenas se o interruptor <strong>pode_mural</strong> estiver marcado como ativado nas permissões do usuário no sistema.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd13_transf_arq',
    icon: ArrowLeftRight,
    titulo: 'Fluxo de Transferências e Arquivo Escolar',
    conteudo: (
      <div className="space-y-4">
        <p>O sistema conta com um módulo unificado para gerenciar o fluxo de movimentação de estudantes e pessoal, bem como seu arquivamento histórico:</p>
        
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">1. Central de Transferências</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Acessível pela página inicial da escola, permite solicitar e aprovar transferências de <strong>Alunos</strong> e <strong>Funcionários</strong>. É subdividida em:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
          <li><strong>Recebimentos:</strong> Triagem de pedidos pendentes vindos de outras escolas. O Diretor pode avaliar, aceitar ou rejeitar (fornecendo justificativa).</li>
          <li><strong>Submissões:</strong> Pedidos enviados pela sua escola para outras unidades ou para fora da rede.</li>
          <li><strong>Histórico Geral:</strong> Registro de todas as movimentações passadas concluídas na unidade.</li>
        </ul>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">2. Arquivologia Histórica Automática</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Para cumprir as normas de arquivologia pública, no momento em que uma transferência é **aceita**:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
          <li>A ficha ativa do aluno ou funcionário migra eletronicamente para a escola de destino (mudando seu vínculo ativo).</li>
          <li>Uma **cópia da ficha completa** contendo todos os dados e arquivos anexos no momento exato da transferência é arquivada eletronicamente na escola de origem, sob o status <code>TRANSFERIDO</code>.</li>
        </ul>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">3. Arquivo Escolar</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O módulo **Arquivo** na Home da escola permite pesquisar e inspecionar a ficha cadastral histórica de qualquer aluno ou funcionário que tenha sido desvinculado, arquivado ou transferido daquela escola.
        </p>
      </div>
    )
  }
]

export default function AjudaPage() {
  const [busca, setBusca] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  const toggleDiretriz = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const diretrizesFiltradas = diretrizes.filter(d => 
    d.titulo.toLowerCase().includes(busca.toLowerCase()) ||
    d.id.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto selection:bg-primary/30 selection:text-foreground pb-12">
      <ModalReport open={reportModalOpen} onOpenChange={setReportModalOpen} />

      <div className="pb-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <span>Central de Ajuda</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manuais operacionais, fluxos oficiais de acesso e guias do SIG Escolar.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <Input 
          type="text"
          placeholder="Buscar manuais ou palavras-chave (ex: assinatura, ponto, professor)..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="bg-background border-border text-foreground focus-visible:ring-primary h-12 text-sm rounded-xl placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-3">
        {diretrizesFiltradas.map((diretriz) => {
          const isExpanded = expandedId === diretriz.id
          const Icon = diretriz.icon

          return (
            <div key={diretriz.id} className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:border-primary/20">
              <button 
                onClick={() => toggleDiretriz(diretriz.id)}
                className="w-full bg-transparent border-none text-foreground p-4.5 text-left flex justify-between items-center cursor-pointer font-bold hover:bg-muted/50 transition-colors"
              >
                <span className="flex items-center gap-3 text-sm tracking-tight">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Icon className="w-4 h-4" />
                  </div>
                  {diretriz.titulo}
                </span>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180 text-foreground' : ''}`} />
              </button>
              
              {isExpanded && (
                <div className="p-5 pt-1 text-muted-foreground text-sm leading-relaxed border-t border-border bg-muted/10 animate-fadeIn">
                  {diretriz.conteudo}
                </div>
              )}
            </div>
          )
        })}
        {diretrizesFiltradas.length === 0 && (
          <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-2xl shadow-sm">
            Nenhum manual encontrado para a busca especificada.
          </div>
        )}
      </div>

      <div className="mt-8 text-center pt-8 border-t border-dashed border-border">
        <Button 
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
