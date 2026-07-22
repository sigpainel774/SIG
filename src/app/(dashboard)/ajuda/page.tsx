'use client'

import { useState, useMemo } from 'react'
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
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

// Gargalo #1 corrigido: conteudo como render function () => JSX.
// O JSX so e avaliado/alocado quando o usuario expande o painel.
// Gargalo #2 corrigido: campo keywords[] para busca no conteudo real dos manuais.
interface Diretriz {
  id: string
  icon: LucideIcon
  titulo: string
  keywords: string[]
  apenasNivel1?: boolean
  conteudo: () => React.ReactNode
}

const diretrizes: Diretriz[] = [
  {
    id: 'd1',
    icon: Shield,
    titulo: 'Niveis de Acesso (Hierarquia)',
    keywords: ['root','superadmin','nivel 1','nivel 2','nivel 3','nivel 4','nivel 5','nivel 6','administrador','diretor','secretario','coordenador','professor','chefe','operacional','mobile','rbac','abac','rls','hierarquia','permissao'],
    conteudo: () => (
      <div className="space-y-4">
        <p>O SIG possui uma arquitetura de controle de acessos baseada em papeis (RBAC) e atributos (ABAC) integrada as politicas de seguranca RLS do banco de dados:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>ROOT (Super Admin):</strong> Acesso administrativo global irrestrito a todas as unidades de ensino, logs do sistema, configuracoes de banco e chaves de seguranca.</li>
          <li><strong>Nivel 1 (Administrador Global):</strong> Gestao ampla do painel, cadastro de novos funcionarios e alocacao de acessos na Secretaria de Educacao.</li>
          <li><strong>Nivel 2 (Diretor Escolar):</strong> Gestao total de sua respectiva unidade. Possui autoridade exclusiva para aprovar solicitacoes de desbloqueio de matriculas.</li>
          <li><strong>Nivel 3 (Secretario / Coordenador):</strong> Controle operacional de secretaria, gerenciamento de cadastros e homologacao diaria de matriculas.</li>
          <li><strong>Nivel 4 (Professor):</strong> Acesso restrito ao Diario de Classe. Visualiza e lanca notas/frequencia apenas das turmas e disciplinas nas quais esta vinculado.</li>
          <li><strong>Nivel 5 (Chefe de Equipe):</strong> Controle focado apenas nas profissoes/cargos subordinados designados (ex: Vigias), sem acesso aos dados escolares gerais.</li>
          <li><strong>Nivel 6 (Operacional Mobile):</strong> Acesso estritamente restrito a interface movel do leitor de QR Code para registro de Ponto e Rondas geolocalizadas.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd2',
    icon: Lock,
    titulo: 'Assinatura Eletronica e Trava de Integridade',
    keywords: ['assinatura','assinatura eletronica','hash','sha-256','sha256','qr code','qrcode','pdf','integridade','trava','homologacao','responsavel','desbloqueio','codigo temporario','4 digitos','5 minutos','ip','user agent','geolocalizacao','storage'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Para eliminar o uso de papeis e garantir a autenticidade juridica, o SIG utiliza um fluxo completo de Assinatura Eletronica de Matriculas:</p>
        
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">1. Captura pelo Celular</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O funcionario gera um codigo temporario de 4 digitos (valido por 5 minutos) no painel. O responsavel le o QR Code na tela usando o celular e assina diretamente na tela movel. O sistema valida os limites de tempo e coleta evidencias de auditoria (IP, User Agent e Geolocalizacao).
        </p>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">2. Homologacao e Trava de Seguranca</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ao salvar a matricula com ambas as assinaturas (Responsavel e Funcionario), o sistema compila automaticamente o PDF oficial e calcula seu Hash SHA-256. O arquivo e enviado para o storage e a ficha do aluno e bloqueada permanentemente para edicoes adicionais.
        </p>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 p-4 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-sm leading-relaxed">
          <strong className="flex items-center gap-1.5 mb-1 font-extrabold uppercase text-indigo-950 dark:text-indigo-100 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Desbloqueio pelo Diretor (Auditoria)
          </strong>
          Se for necessario fazer qualquer alteracao em uma matricula ja homologada, o funcionario deve enviar uma solicitacao com justificativa. Apenas o Diretor (Nivel 2) ou Admin pode aprovar a solicitacao na listagem de alunos. Ao aprovar, o sistema libera temporariamente a edicao. Ao salvar novamente, um novo PDF e um novo Hash SHA-256 sao gerados automaticamente.
        </div>
      </div>
    )
  },
  {
    id: 'd3',
    icon: FileCheck,
    titulo: 'Portal de Verificacao de Autenticidade',
    keywords: ['verificar','verificacao','autenticidade','qr code','qrcode','token','hash','sha-256','sha256','comprovante','noindex','nofollow','privacidade','google','bing','ip','evidencia','trilha'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Qualquer comprovante emitido possui uma tarja digital de integridade que permite a validacao juridica por terceiros:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>QR Code e Chave Unica:</strong> O rodape do comprovante impresso contem um QR Code que aponta para o endereco publico /verificar/[token].</li>
          <li><strong>Trilha Completa de Evidencias:</strong> No portal de validacao, sao apresentados os nomes das partes, o momento exato de cada assinatura, os IPs dos dispositivos utilizados, o navegador/sistema operacional e o Hash SHA-256 original do arquivo.</li>
          <li><strong>Garantia de Privacidade:</strong> As paginas de verificacao publica sao configuradas com cabecalhos de metadados noindex, nofollow para garantir que dados de estudantes nunca sejam expostos em indexacoes de busca do Google ou Bing.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd12',
    icon: UserPlus,
    titulo: 'Criacao de Contas e Conciliacao por E-mail',
    keywords: ['conta','criar conta','email','e-mail','supabase','auth','login','reconciliacao','conciliacao','ficha','trigger','automatico','primeiro acesso','primeiro login','rls'],
    conteudo: () => (
      <div className="space-y-4">
        <p>A unificacao entre contas de autenticacao do Supabase e as fichas funcionais do SIG baseia-se no e-mail do funcionario:</p>
        
        <div className="bg-surface-2 p-4 border-l-4 border-blue-500 rounded-xl space-y-2">
          <h5 className="text-foreground font-bold text-sm">Caminho 1: Ficha criada ANTES do login (Recomendado)</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            O gestor cadastra a ficha do funcionario informando o E-mail. Ao criar a conta de autenticacao correspondente no Supabase Auth com o mesmo e-mail, a reconciliacao e atribuicao das chaves de acesso RLS ocorrem de forma transparente no primeiro login.
          </p>
        </div>

        <div className="bg-surface-2 p-4 border-l-4 border-emerald-500 rounded-xl space-y-2">
          <h5 className="text-foreground font-bold text-sm">Caminho 2: Login criado ANTES da ficha</h5>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Se a conta de login for criada primeiro na Auth do Supabase, o banco acionara uma trigger automatica criando uma "ficha vazia" associada aquele e-mail. O gestor da unidade precisara apenas preencher os campos restantes da ficha posteriormente.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'd4',
    icon: BookOpen,
    titulo: 'Vinculos de Diretores e Professores',
    keywords: ['vinculo','lotacao','diario','diario de classe','professor','diretor','nivel 2','nivel 4','escola','turma','disciplina','vazio','rls','permissao','cargo','acesso'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Para garantir que professores acessem corretamente o Diario de Classe e diretores tenham controle sobre a sua unidade, atente-se as regras de lotacao:</p>
        <ul className="list-disc pl-5 space-y-2 leading-relaxed">
          <li><strong>Diretores (Nivel 2):</strong> Devem ser lotados fisicamente na respectiva escola (menu Funcionarios) e ter sua permissao de Nivel 2 vinculada exatamente a mesma escola no menu de Acessos.</li>
          <li><strong>Professores (Nivel 4):</strong> A escola atribuida nas lotacoes e no menu de Permissoes precisa coincidir rigorosamente. Caso contrario, embora consiga fazer o login, o painel de turmas e diarios do docente sera exibido vazio por razoes de seguranca RLS.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd2_edit',
    icon: Edit3,
    titulo: 'Interruptor do Modo de Edicao',
    keywords: ['modo edicao','edicao','editar','senha','confirmacao','visualizacao','protecao','toggle','interruptor','acidental','professor','nota','falta','diario'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Por padrao, usuarios operacionais acessam a interface administrativa em Modo Visualizacao para protecao de registros contra toques acidentais:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Para realizar alteracoes de matriculas, vinculos ou dados escolares, ative a chave Modo Edicao no topo do painel superior.</li>
          <li>O sistema exigira a confirmacao de seguranca digitando a sua senha pessoal de acesso.</li>
          <li><em>Excecao:</em> Professores em seus respectivos diarios eletronicos nao precisam ativar o Modo Edicao para lancar faltas e notas do dia.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd3_lanc',
    icon: CalendarCheck,
    titulo: 'Lancamento de Faltas, Decimais e Medias',
    keywords: ['nota','falta','frequencia','decimal','media','float','8.5','arredondamento','string','lancamento','trimestre','unidade','log','rastreabilidade','auditoria'],
    conteudo: () => (
      <div className="space-y-4">
        <p>Os registros escolares de notas e frequencia sao monitorados em tempo de execucao:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Digitacao de Decimais:</strong> Para evitar perda de dados e arredondamentos automaticos indesejados durante a escrita, as notas com fracoes decimais (ex: 8.5) sao tratadas no estado de formulario local como strings, e convertidas para float de banco apenas na gravacao final.</li>
          <li><strong>Rastreabilidade de Alteracao:</strong> Todo lancamento registra nos metadados de logs o ID e nome do funcionario responsavel pela acao.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd6',
    icon: ShieldCheck,
    titulo: 'Modulo ABAC: Gestao de Equipes (Chefe)',
    keywords: ['abac','chefe','chefe de equipe','nivel 5','vigia','servicos gerais','cargo','subordinado','escala','ronda','ponto','consolidado','rede','gestao','equipe'],
    conteudo: () => (
      <div className="space-y-4">
        <p>A permissao de Chefe de Equipe (Nivel 5) e configurada por escopo de cargos subordinados (ABAC):</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Definicao Global:</strong> O Chefe nao fica associado a uma unica escola fisica; ele gerencia os cargos subordinados (ex: Vigias, Servicos Gerais) atribuidos na concessao do seu acesso.</li>
          <li><strong>Cruzamento de Dados:</strong> O painel do chefe consolida escalas, logs de rondas e pontos batidos pelos funcionarios da rede inteira que pertencam aos cargos que ele gerencia.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd7',
    icon: ScanLine,
    titulo: 'Ponto Eletronico e Rondas com GPS (Operacional)',
    keywords: ['ponto','ronda','gps','geolocalizacao','qr code','qrcode','mobile','celular','camera','raio','tolerancia','latitude','longitude','coordenadas','nivel 6','operacional','vigia'],
    conteudo: () => (
      <div className="space-y-4">
        <p>A validacao do Ponto e das Rondas de seguranca e executada estritamente via dispositivo movel por leitura de QR Code:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Geolocalizacao Obrigatoria:</strong> O App movel exige acesso ao GPS do aparelho. Se a permissao geografica for rejeitada pelo usuario, a ativacao da camera para escanear o QR Code e desabilitada.</li>
          <li><strong>Raio de Tolerancia:</strong> O local do QR Code e cadastrado com coordenadas (Latitude/Longitude) e raio de tolerancia. O ponto so e registrado se o GPS do celular indicar que o funcionario esta dentro da area permitida.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd11',
    icon: Pin,
    titulo: 'Mural de Comunicados e Avisos',
    keywords: ['mural','comunicado','aviso','publicar','post','pode_mural','superadmin','nivel 1','nivel 2','nivel 3','nivel 4','nivel 5','nivel 6','permissao','home','dashboard'],
    conteudo: () => (
      <div className="space-y-4">
        <p>A publicacao de avisos institucionais na pagina inicial do SIG segue regras de acesso especificas:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Superadmins:</strong> Permissao nativa e irrestrita para gerenciar posts.</li>
          <li><strong>Outros Niveis (1 a 6):</strong> Podem publicar comunicados apenas se o interruptor pode_mural estiver marcado como ativado nas permissoes do usuario no sistema.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd13_transf_arq',
    icon: ArrowLeftRight,
    titulo: 'Fluxo de Transferencias e Arquivo Escolar',
    keywords: ['transferencia','arquivo','arquivamento','historico','aluno','funcionario','recebimento','submissao','aceitar','rejeitar','diretor','transferido','copia','ficha','vinculo','arquivologia'],
    conteudo: () => (
      <div className="space-y-4">
        <p>O sistema conta com um modulo unificado para gerenciar o fluxo de movimentacao de estudantes e pessoal, bem como seu arquivamento historico:</p>
        
        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">1. Central de Transferencias</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Acessivel pela pagina inicial da escola, permite solicitar e aprovar transferencias de Alunos e Funcionarios. E subdividida em:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
          <li><strong>Recebimentos:</strong> Triagem de pedidos pendentes vindos de outras escolas. O Diretor pode avaliar, aceitar ou rejeitar (fornecendo justificativa).</li>
          <li><strong>Submissoes:</strong> Pedidos enviados pela sua escola para outras unidades ou para fora da rede.</li>
          <li><strong>Historico Geral:</strong> Registro de todas as movimentacoes passadas concluidas na unidade.</li>
        </ul>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">2. Arquivologia Historica Automatica</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Para cumprir as normas de arquivologia publica, no momento em que uma transferencia e aceita:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
          <li>A ficha ativa do aluno ou funcionario migra eletronicamente para a escola de destino (mudando seu vinculo ativo).</li>
          <li>Uma copia da ficha completa contendo todos os dados e arquivos anexos no momento exato da transferencia e arquivada eletronicamente na escola de origem, sob o status TRANSFERIDO.</li>
        </ul>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">3. Arquivo Escolar</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O modulo Arquivo na Home da escola permite pesquisar e inspecionar a ficha cadastral historica de qualquer aluno ou funcionario que tenha sido desvinculado, arquivado ou transferido daquela escola.
        </p>
      </div>
    )
  },
  {
    id: 'd14_gestao_diretores',
    icon: UserCog,
    apenasNivel1: true,
    titulo: 'Gestão, Inativação e Substituição de Diretores (Nível 1 / Root)',
    keywords: ['diretor', 'gestao', 'inativar', 'remover', 'trocar', 'transferir', 'assinatura', 'diretor_id', 'lotacao', 'oficial', 'nivel 1', 'root'],
    conteudo: () => (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Guia exclusivo de nível administrativo central para substituição, inativação e transferência de diretores escolares:
        </p>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">1. Integridade dos Dados da Escola</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Ao inativar ou substituir um diretor, <strong>nenhum dado de estudante, turma, nota ou frequência é perdido</strong>. Todos os registros pertencem à unidade escolar (ID da Escola) e permanecem 100% preservados.
        </p>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">2. Inativação vs Exclusão</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          No menu <em>Servidores/Funcionários</em> ou no painel de <em>Acessos</em>, utilize a opção de <strong>Pausar/Inativar</strong> o diretor antigo. Isso revoga imediatamente o acesso dele ao painel, mantendo toda a trilha de auditoria dos documentos assinados por ele no passado.
        </p>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">3. Definição do Diretor Oficial e Assinaturas Automatizadas</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O sistema não promove automaticamente o próximo diretor por antiguidade. Para que os comprovantes e atestados passem a sair com o nome e assinatura do novo gestor:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
          <li>Acesse <strong>Configurações da Escola</strong>.</li>
          <li>No campo <strong>Diretor Responsável</strong>, selecione o novo diretor da unidade.</li>
          <li>Cadastre a imagem da assinatura em <strong>Assinatura do Diretor</strong>.</li>
        </ul>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">4. Transferência de Lotação entre Escolas</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Para mover um diretor de uma escola para outra:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-xs text-muted-foreground">
          <li>Acesse <strong>Gestão de Lotações / Transferências</strong> e transfira a lotação do servidor para a escola de destino.</li>
          <li>Nas <strong>Configurações</strong> de ambas as escolas, atualize o campo <em>Diretor Responsável</em>: na escola antiga, vincule o substituto; na escola nova, vincule o diretor transferido.</li>
        </ol>

        <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mt-4">5. Desvinculação Automática do Diretor Responsável</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Para evitar que escolas continuem associadas a gestores inativos ou transferidos:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-muted-foreground">
          <li>Ao <strong>Pausar</strong> ou <strong>Excluir</strong> o acesso de um diretor no painel <em>Admin &gt; Acessos</em>, a chave <em>diretor_id</em> da escola é zerada automaticamente.</li>
          <li>Ao <strong>Remover</strong> ou <strong>Mover</strong> a lotação do diretor na <em>Gestão de Lotações</em>, o vínculo com a escola de origem é limpo automaticamente.</li>
          <li>No modal de edição da escola, o seletor <em>Diretor Responsável</em> volta automaticamente para <strong>"-- Nenhum Diretor Selecionado --"</strong> até que um novo gestor Nível 2 seja atribuído.</li>
        </ul>
      </div>
    )
  }
]

export default function AjudaPage() {
  const [busca, setBusca] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reportModalOpen, setReportModalOpen] = useState(false)

  const { isAdminGlobalOrRoot } = useAuthStore()
  const isNivel1 = isAdminGlobalOrRoot()

  const toggleDiretriz = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const diretrizesFiltradas = useMemo(() => {
    const q = busca.toLowerCase().trim()
    const disponiveis = diretrizes.filter(d => !d.apenasNivel1 || isNivel1)
    if (!q) return disponiveis
    return disponiveis.filter(d =>
      d.titulo.toLowerCase().includes(q) ||
      d.keywords.some(kw => kw.includes(q))
    )
  }, [busca, isNivel1])

  return (
    <div className="space-y-6 max-w-4xl mx-auto selection:bg-primary/30 selection:text-foreground pb-12">
      {/* Gargalo #3 corrigido: ModalReport so montado quando necessario */}
      {reportModalOpen && (
        <ModalReport open={reportModalOpen} onOpenChange={setReportModalOpen} />
      )}

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
          placeholder="Buscar manuais ou palavras-chave (ex: assinatura, ponto, professor, sha-256)..."
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
              
              {/* Gargalo #1 corrigido: conteudo() so e invocado/avaliado aqui, ao expandir */}
              {isExpanded && (
                <div className="p-5 pt-1 text-muted-foreground text-sm leading-relaxed border-t border-border bg-muted/10 animate-fadeIn">
                  {diretriz.conteudo()}
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
