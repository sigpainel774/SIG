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
  Pin
} from 'lucide-react'
import { ModalReport } from '@/components/modals/modal-report'

const diretrizes = [
  {
    id: 'd1',
    icon: Shield,
    titulo: 'Níveis de Acesso',
    conteudo: (
      <div className="space-y-4">
        <p>O sistema possui 6 níveis hierárquicos de acesso, além do perfil de Super Admin:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>ROOT (Super Admin):</strong> Acesso global irrestrito a todas as escolas, configurações e módulos do sistema.</li>
          <li><strong>Nível 1 (Funcionário Base):</strong> Acesso restrito básico de leitura/escrita na escola à qual está alocado.</li>
          <li><strong>Nível 2 (Diretor Escolar):</strong> Acesso de gestão total apenas na escola onde o funcionário está alocado. Pode realizar qualquer alteração na sua unidade.</li>
          <li><strong>Nível 3 (Secretário Escolar / Coordenador):</strong> Acesso administrativo para controle de secretaria e matrículas na escola em que está alocado.</li>
          <li><strong>Nível 4 (Professor):</strong> Acesso restrito e inteligente. O professor só consegue visualizar e lançar notas/frequência das disciplinas e turmas nas quais está diretamente vinculado.</li>
          <li><strong>Nível 5 (Chefe de Equipe):</strong> Visão de gestão (ABAC) focada apenas nas profissões/cargos que gerencia de forma global (ronda, escalas e ponto da sua equipe).</li>
          <li><strong>Nível 6 (Operacional):</strong> Acesso estritamente voltado para o App Mobile. A interface é reduzida para uma tela de leitura de QR Code para bater o Ponto/Ronda utilizando GPS do dispositivo.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd9',
    icon: UserCog,
    titulo: 'Fluxo de Alocação de Diretores',
    conteudo: (
      <div className="space-y-4">
        <p>Para realizar a contratação e liberação de acesso de um novo Diretor Escolar, siga o fluxo padronizado e sequencial abaixo:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Etapa 1 - Criação da Escola:</strong> A unidade de ensino deve estar cadastrada no sistema. O cadastro pode ser realizado por um usuário de Nível 1 (Administrador Global) ou solicitado diretamente ao Administrador do Sistema.</li>
          <li><strong>Etapa 2 - Cadastro e E-mail Institucional:</strong> Cadastre o novo diretor no módulo de "Funcionários". Defina o e-mail cadastrado no padrão obrigatório <code>nomecompleto@sapeacu.gov.br</code> e solicite ao administrador a criação da conta correspondente com este mesmo e-mail.</li>
          <li><strong>Etapa 3 - Lotação de Funcionário:</strong> Acesse as configurações de vínculos do funcionário (no painel de Funcionários) e lote o diretor na escola para a qual foi designado.</li>
          <li><strong>Etapa 4 - Permissão de Acesso (Nível 2):</strong> Acesse o módulo de "Permissões", ative o <strong>Modo Edição</strong> e atribua ao usuário a permissão de <strong>Nível 2 - Diretor Escolar</strong>, vinculando-o exatamente à mesma escola de sua lotação física.</li>
          <li><strong>Etapa 5 - Primeiro Acesso e Nova Senha:</strong> O diretor efetuará o primeiro acesso usando o e-mail cadastrado e a senha temporária configurada pelo administrador. Ao entrar no sistema, o painel exigirá a definição de uma nova senha pessoal definitiva. Concluída essa etapa, o acesso estará totalmente liberado.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'd4',
    icon: UserPlus,
    titulo: 'Cadastro e Acesso de Professores',
    conteudo: (
      <div className="space-y-4">
        <p>Para garantir a segurança, o professor não cria a própria conta do zero. O fluxo oficial é:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Passo 1 (Cadastro):</strong> O Diretor acessa o menu "Funcionários", cadastra os dados do Professor incluindo o seu <strong>E-mail</strong>, e cria o vínculo na escola.</li>
          <li>
            <strong>Passo 2 (Permissão):</strong> O Diretor acessa o menu "Permissões", seleciona o funcionário e concede a ele o acesso de <strong>Nível 4 - Professor</strong>.
            <div className="bg-[#3f1818] text-[#fecaca] p-4 border-l-4 border-red-500 rounded-md text-sm mt-3 leading-relaxed">
              <strong className="text-red-300 flex items-center gap-2 mb-1">
                ⚠️ ATENÇÃO À ESCOLA SELECIONADA
              </strong> 
              Você DEVE certificar-se de que a escola selecionada no campo <strong>"Escola / Órgão"</strong> do formulário de permissão é EXATAMENTE a mesma escola em que a ficha do professor foi lotada no Passo 1.<br />
              <em>Se os nomes forem diferentes, o professor conseguirá fazer o login, mas seu painel de turmas ficará completamente vazio (pois o sistema tentará buscar turmas na escola errada).</em>
            </div>
          </li>
          <li><strong>Passo 3 (Primeiro Acesso):</strong> Quando o Professor fizer o login pela primeira vez usando aquele mesmo e-mail, o sistema fará o vínculo automático e seguro, liberando o Diário Eletrônico.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd2',
    icon: Edit3,
    titulo: 'Modo de Edição',
    conteudo: (
      <div className="space-y-4">
        <p>Por padrão, usuários administrativos (Níveis 1 a 3) acessam o sistema no <strong>Modo Visualização</strong> para evitar edições acidentais de dados críticos. Para modificar dados gerais:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Ative o interruptor do <strong>Modo Edição</strong> no painel superior.</li>
          <li>Confirme a ação digitando a sua <strong>senha pessoal</strong> de acesso.</li>
          <li><em>Exceção: O Professor (Nível 4) não precisa ativar o Modo Edição para lançar suas próprias notas e faltas no seu Diário.</em></li>
        </ul>
      </div>
    )
  },
  {
    id: 'd3',
    icon: CalendarCheck,
    titulo: 'Lançamentos Diários (Frequência e Notas)',
    conteudo: (
      <div className="space-y-4">
        <p>A manipulação de registros essenciais do aluno exige segurança e rastreabilidade:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Lançamentos por Gestores/Secretaria exigem o Modo de Edição ativo.</li>
          <li>Professores têm permissão nativa para lançar apenas na aba de Notas das disciplinas que ensinam e na Frequência das suas turmas.</li>
          <li>Todos os salvamentos gravam no banco de dados qual funcionário realizou a ação.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd5',
    icon: Map,
    titulo: 'Navegação do Professor',
    conteudo: (
      <div className="space-y-4">
        <p>O fluxo de navegação do professor foi otimizado para ir direto ao que interessa:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Módulos Administrativos:</strong> Ao clicar na escola na tela inicial, o professor verá que não tem acesso aos módulos gerais; isso é esperado, pois ele não é secretário ou gestor.</li>
          <li><strong>Menu Lateral Direto:</strong> Professores devem utilizar o menu <strong>"Turmas"</strong> na barra lateral esquerda (sidebar) para acessar diretamente suas disciplinas, frequência e alunos.</li>
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
        <p>A atribuição de um <strong>Chefe de Equipe (Nível 5)</strong> funciona baseada nas profissões que ele coordena (ABAC):</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Centralização de Cargos:</strong> A lista de cargos do sistema é gerenciada exclusivamente pela equipe do <strong>Super Painel Administrativo</strong>. Apenas os Super Admins podem cadastrar, editar ou remover um cargo do banco de dados global.</li>
          <li><strong>Atribuição:</strong> Ao conceder permissão de Nível 5 para um funcionário no menu "Permissões", o gestor deverá marcar nas caixinhas de seleção quais profissões oficiais ele poderá gerenciar (ex: Vigias, Garis, Inspetores).</li>
          <li>No <em>Painel do Chefe</em>, o sistema listará apenas os funcionários subordinados àquele chefe (ou seja, funcionários cujos vínculos na escola possuam os mesmos cargos que o chefe foi designado a controlar).</li>
          <li>O Chefe poderá acompanhar as informações da equipe, definir as escalas e consultar os logs de rondas ou ponto eletrônico de sua respectiva equipe, sem ter acesso aos módulos globais de secretaria.</li>
        </ul>
        <div className="bg-[#2a2a2a] p-4 border-l-4 border-highlight rounded-md mt-4">
          <h4 className="text-white font-bold text-sm mb-2">Passo a Passo: Como atribuir um Chefe de Equipe</h4>
          <ol className="list-decimal pl-5 space-y-1 mb-4 text-sm">
            <li>Acesse <strong>Permissões</strong> e clique em <strong>+ Nova Permissão</strong>.</li>
            <li>Selecione o funcionário e escolha <strong>Nível 5 - Chefe de Equipe</strong>.</li>
            <li><em>Nota:</em> O campo Escola/Órgão sumirá automaticamente, pois a chefia é global.</li>
            <li>Marque as caixas dos cargos subordinados (ex: Vigia, Porteiro) e clique em <strong>Salvar</strong>.</li>
          </ol>
          
          <h4 className="text-white font-bold text-sm mb-2">Passo a Passo: Como incluir um funcionário na equipe</h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            <li>Acesse <strong>Funcionários</strong> e crie/edite um cadastro.</li>
            <li>Em <strong>Escola / Lotação</strong>, defina a escola física (para o Diretor poder vê-lo).</li>
            <li>Em <strong>Cargo / Função</strong>, escolha exatamente o mesmo cargo gerenciado pelo chefe (ex: Vigia).</li>
            <li>Clique em <strong>Salvar</strong>. O cruzamento é automático!</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: 'd7',
    icon: ScanLine,
    titulo: 'Ponto Eletrônico e GPS (Operacional)',
    conteudo: (
      <div className="space-y-4">
        <p>Para usuários <strong>Nível 6 (Operacional)</strong> o foco é realizar as verificações de ronda e o ponto através de um dispositivo móvel:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>O sistema abrirá automaticamente a tela do App Mobile <strong>"Bater Ponto"</strong> na inicialização.</li>
          <li>O navegador obrigatoriamente solicitará permissão de Geolocalização (GPS). Se a permissão for negada, o sistema não autoriza a ativação do leitor de QR Code.</li>
          <li>Ao aceitar o GPS e escanear o Código QR (colado nas escolas ou postos de trabalho), a posição exata é conferida para atestar que o operacional está presencialmente no local e a rota é registrada no banco de logs.</li>
        </ul>
      </div>
    )
  },
  {
    id: 'd8',
    icon: BookOpen,
    titulo: 'Roteiro Completo: Criação de Vigias e Rondas',
    conteudo: (
      <div className="space-y-4">
        <div className="bg-[#2a2a2a] p-4 border-l-4 border-highlight rounded-md mt-4">
          <h4 className="text-white font-bold text-sm mb-2">1. Criando Pontos de Ronda (Super Administrador)</h4>
          <ol className="list-decimal pl-5 space-y-1 mb-4 text-sm">
            <li>Acesse o <strong>Super Painel</strong> Administrativo na aba lateral.</li>
            <li>Clique em <strong>Controle de Rondas</strong>.</li>
            <li>Preencha o formulário informando: nome do ponto, escola na qual ele fica, raio de tolerância (em metros), e Latitude/Longitude exatas.</li>
          </ol>

          <h4 className="text-white font-bold text-sm mb-2">2. Criando o Chefe de Vigias (Acesso: Diretor)</h4>
          <ol className="list-decimal pl-5 space-y-1 mb-4 text-sm">
            <li>Em <strong>Funcionários</strong>, crie a ficha do chefe da segurança.</li>
            <li>Em <strong>Permissões</strong>, selecione <strong>Nível 5 - Chefe de Equipe</strong>.</li>
            <li>Nas caixas de cargos subordinados, marque ou escreva <strong>Vigia</strong>. Isso habilitará a aba 'Meu Setor' no painel dele exclusivamente para controlar os vigias.</li>
          </ol>

          <h4 className="text-white font-bold text-sm mb-2">3. Criando o Vigia Operacional</h4>
          <ol className="list-decimal pl-5 space-y-1 text-sm">
            <li>Em <strong>Funcionários</strong>, cadastre o vigia escrevendo <strong>Vigia</strong> exatamente no campo Cargo/Função.</li>
            <li>Em <strong>Permissões</strong>, atribua <strong>Nível 6 - Operacional Mobile</strong>, garantindo que a escola selecionada é a mesma escola da sua lotação física.</li>
            <li>Ao fazer login, este usuário enxergará somente a tela de Ponto/QR Code. O chefe dele poderá ver seus logs em tempo real na aba Meu Setor.</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: 'd10',
    icon: ArrowLeftRight,
    titulo: 'Transferência de Funcionários (Lotação)',
    conteudo: (
      <div className="space-y-4">
        <p>Para transferir ou mover um funcionário (como um Auxiliar de Classe, Secretário ou Vigia) de uma escola para outra na rede municipal, utilize a funcionalidade de <strong>Gestão de Lotações</strong>:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Acesse o módulo de Funcionários:</strong> No menu lateral esquerdo do Painel Escolar, clique em <strong>Funcionários</strong>.</li>
          <li><strong>Abra a Gestão de Lotações:</strong> No canto superior direito, clique no botão <strong>"Gestão de Lotações"</strong> (identificado com um ícone de rede/conexões). <em>Nota: Esta funcionalidade exige nível administrativo (Nível 1 - Administrador Global).</em></li>
          <li><strong>Selecione o Funcionário:</strong> Na lista à esquerda, procure e clique no nome do funcionário que deseja mover (você pode utilizar a barra de pesquisa para filtrar pelo nome).</li>
          <li><strong>Indique Origem e Destino:</strong> Na seção à direita <strong>"Mover Lotação Existente (Transferir)"</strong>, selecione a <strong>Lotação de Origem</strong> (o vínculo da escola atual do funcionário) e a <strong>Escola de Destino</strong> (a nova escola para a qual ele será alocado).</li>
          <li><strong>Confirme a Transferência:</strong> Clique no botão correspondente para salvar a mudança. O sistema arquivará a lotação anterior e criará o novo registro ativo para a nova escola automaticamente com o mesmo cargo.</li>
        </ol>
      </div>
    )
  },
  {
    id: 'd11',
    icon: Pin,
    titulo: 'Mural de Comunicados (Quem pode postar?)',
    conteudo: (
      <div className="space-y-4">
        <p>A publicação de comunicados e avisos no mural é regulada de acordo com as seguintes permissões:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Superadmins (ROOT / <code>is_superadmin = true</code>):</strong> Possuem permissão irrestrita e automática para postar, editar e visualizar todos os comunicados.</li>
          <li><strong>Outros Níveis (1 a 6):</strong> Podem postar no mural apenas se a flag <strong>pode_mural</strong> estiver ativada como <code>true</code> no seu registro de permissão (na tabela <code>acessos_usuarios</code>). Caso contrário, a interface de publicação é oculta por segurança.</li>
        </ul>
        <p><em>Nota:</em> Os comunicados podem ser direcionados para públicos-alvo específicos (Geral / Toda a Rede, Professores, Alunos e Pais, Equipe Administrativa ou Equipe de Cozinha / Limpeza).</p>
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
    d.titulo.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <ModalReport open={reportModalOpen} onOpenChange={setReportModalOpen} />

      <div className="pb-4 border-b border-[#3f3f46]">
        <h2 className="text-2xl font-bold text-white">Central de Ajuda</h2>
      </div>

      <div className="mb-6">
        <Input 
          type="text"
          placeholder="Buscar conteúdos de ajuda..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="bg-[#1a1a1a] border-[#333] text-white focus-visible:ring-highlight h-12 text-base"
        />
      </div>

      <div className="space-y-3">
        {diretrizesFiltradas.map((diretriz) => {
          const isExpanded = expandedId === diretriz.id
          const Icon = diretriz.icon

          return (
            <div key={diretriz.id} className="bg-[#1f1f1f] border border-[#333] rounded-lg overflow-hidden">
              <button 
                onClick={() => toggleDiretriz(diretriz.id)}
                className="w-full bg-transparent border-none text-white p-4 text-left flex justify-between items-center cursor-pointer font-medium hover:bg-[#252525] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-highlight" />
                  {diretriz.titulo}
                </span>
                <ChevronDown className={`w-5 h-5 text-[#aaa] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {isExpanded && (
                <div className="p-4 pt-0 text-[#aaa] text-sm leading-relaxed border-t border-[#333]">
                  {diretriz.conteudo}
                </div>
              )}
            </div>
          )
        })}
        {diretrizesFiltradas.length === 0 && (
          <div className="text-center text-[#aaa] py-8">Nenhum resultado encontrado.</div>
        )}
      </div>

      <div className="mt-8 text-center pt-8 border-t border-dashed border-[#333]">
        <Button 
          onClick={() => setReportModalOpen(true)}
          variant="outline" 
          className="bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20 hover:text-red-500 font-semibold h-12 px-6"
        >
          <MessageSquareWarning className="w-5 h-5 mr-2" />
          Reportar um Problema ou Bug
        </Button>
      </div>
    </div>
  )
}
