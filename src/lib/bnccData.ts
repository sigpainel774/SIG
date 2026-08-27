// src/lib/bnccData.ts
// Base de dados oficial da BNCC (Base Nacional Comum Curricular) para Educação Infantil e Ensino Fundamental

export interface HabilidadeBNCC {
  codigo: string
  descricao: string
}

export interface ObjetoConhecimentoBNCC {
  objeto: string
  habilidades: HabilidadeBNCC[]
}

export interface UnidadeTematicaBNCC {
  unidade: string
  objetos: ObjetoConhecimentoBNCC[]
}

export interface ComponenteCurricularBNCC {
  nome: string
  area: string
  unidades: UnidadeTematicaBNCC[]
}

export interface CompetenciaGeralBNCC {
  numero: number
  titulo: string
  descricao: string
}

// 1. Competências Gerais da Educação Básica (1 a 10)
export const COMPETENCIAS_GERAIS_BNCC: CompetenciaGeralBNCC[] = [
  {
    numero: 1,
    titulo: 'Conhecimento',
    descricao: 'Valorizar e utilizar os conhecimentos historicamente construídos sobre o mundo físico, social, cultural e digital.'
  },
  {
    numero: 2,
    titulo: 'Pensamento Científico, Crítico e Criativo',
    descricao: 'Exercitar a curiosidade intelectual e recorrer à abordagem própria das ciências, incluindo a investigação e reflexão.'
  },
  {
    numero: 3,
    titulo: 'Repertório Cultural',
    descricao: 'Desenvolver o senso estético para reconhecer, valorizar e fruir as diversas manifestações artísticas e culturais.'
  },
  {
    numero: 4,
    titulo: 'Comunicação',
    descricao: 'Utilizar diferentes linguagens – verbal, corporal, visual, sonora e digital – para expressar-se e partilhar informações.'
  },
  {
    numero: 5,
    titulo: 'Cultura Digital',
    descricao: 'Compreender, utilizar e criar tecnologias digitais de informação e comunicação de forma crítica, significativa e ética.'
  },
  {
    numero: 6,
    titulo: 'Trabalho e Projeto de Vida',
    descricao: 'Valorizar a diversidade de saberes e vivências culturais e apropriar-se de conhecimentos e experiências.'
  },
  {
    numero: 7,
    titulo: 'Argumentação',
    descricao: 'Argumentar com base em fatos, dados e informações confiáveis para formular, negociar e defender ideias e pontos de vista.'
  },
  {
    numero: 8,
    titulo: 'Autoconhecimento e Autocuidado',
    descricao: 'Conhecer-se, apreciar-se e cuidar de sua saúde física e emocional, compreendendo-se na diversidade humana.'
  },
  {
    numero: 9,
    titulo: 'Empatia e Cooperação',
    descricao: 'Exercitar a empatia, o diálogo, a resolução de conflitos e a cooperação, fazendo-se respeitar e promovendo os direitos humanos.'
  },
  {
    numero: 10,
    titulo: 'Responsabilidade e Cidadania',
    descricao: 'Agir pessoal e coletivamente com autonomia, responsabilidade, flexibilidade, resiliência e determinação.'
  }
]

// 2. Estrutura da Educação Infantil
export const DIREITOS_APRENDIZAGEM_INFANTIL = [
  { nome: 'Conviver', descricao: 'Conviver com outras crianças e adultos em pequenos e grandes grupos.' },
  { nome: 'Brincar', descricao: 'Brincar cotidianamente de diversas formas, em diferentes espaços e tempos.' },
  { nome: 'Participar', descricao: 'Participar ativamente, com adultos e outras crianças, do planejamento da gestão da escola.' },
  { nome: 'Explorar', descricao: 'Explorar movimentos, gestos, sons, formas, texturas, cores, palavras, emoções e transformações.' },
  { nome: 'Expressar', descricao: 'Expressar, como sujeito dialógico, criativo e sensível, suas necessidades, emoções e sentimentos.' },
  { nome: 'Conhecer-se', descricao: 'Construir sua identidade pessoal, social e cultural, constituindo uma imagem positiva de si.' }
]

export const CAMPOS_EXPERIENCIA_INFANTIL = [
  {
    codigo: 'EO',
    nome: 'O eu, o outro e o nós',
    objetivos: [
      { codigo: 'EI01EO01', descricao: 'Perceber que suas ações têm efeitos nas outras crianças e nos adultos.' },
      { codigo: 'EI01EO02', descricao: 'Perceber as possibilidades e os limites de seu corpo nas brincadeiras e interações.' },
      { codigo: 'EI02EO01', descricao: 'Demonstrar atitudes de cuidado e solidariedade na interação com crianças e adultos.' },
      { codigo: 'EI02EO02', descricao: 'Demonstrar imagem positiva de si e confiança em sua capacidade para enfrentar dificuldades.' },
      { codigo: 'EI03EO01', descricao: 'Demonstrar empatia pelos outros, percebendo que as pessoas têm diferentes sentimentos e necessidades.' },
      { codigo: 'EI03EO02', descricao: 'Agir de maneira independente, com confiança em suas capacidades, reconhecendo suas conquistas.' }
    ]
  },
  {
    codigo: 'CG',
    nome: 'Corpo, gestos e movimentos',
    objetivos: [
      { codigo: 'EI01CG01', descricao: 'Movimentar as partes do corpo para exprimir corporalmente emoções e necessidades.' },
      { codigo: 'EI02CG01', descricao: 'Apropriar-se de gestos e movimentos de sua cultura no cuidado de si e nos jogos.' },
      { codigo: 'EI02CG02', descricao: 'Deslocar seu corpo no espaço, orientando-se por noções como em frente, atrás, no alto, embaixo.' },
      { codigo: 'EI03CG01', descricao: 'Criar com o corpo formas diversificadas de expressão de sentimentos, sensações e emoções.' },
      { codigo: 'EI03CG02', descricao: 'Demonstrar controle e adequação do uso de seu corpo em brincadeiras e jogos desafiadores.' }
    ]
  },
  {
    codigo: 'TS',
    nome: 'Traços, sons, cores e formas',
    objetivos: [
      { codigo: 'EI01TS01', descricao: 'Explorar sons produzidos com o próprio corpo e com objetos do ambiente.' },
      { codigo: 'EI02TS01', descricao: 'Criar sons com materiais, objetos e instrumentos musicais para acompanhar brincadeiras.' },
      { codigo: 'EI02TS02', descricao: 'Utilizar materiais variados com possibilidades de manipulação (argila, massa de modelar, tintas).' },
      { codigo: 'EI03TS01', descricao: 'Utilizar sons produzidos por materiais, objetos e instrumentos musicais em criações artísticas.' },
      { codigo: 'EI03TS02', descricao: 'Expressar-se livremente por meio de desenho, pintura, colagem, dobradura e escultura.' }
    ]
  },
  {
    codigo: 'EF',
    nome: 'Escuta, fala, pensamento e imaginação',
    objetivos: [
      { codigo: 'EI01EF01', descricao: 'Reconhecer quando é chamado por seu nome e reconhecer os nomes de pessoas com quem convive.' },
      { codigo: 'EI02EF01', descricao: 'Dialogar com crianças e adultos, expressando seus desejos, necessidades, sentimentos e opiniões.' },
      { codigo: 'EI02EF02', descricao: 'Identificar e criar diferentes sons e reconhecer rimas e aliterações em cantigas de roda e textos poéticos.' },
      { codigo: 'EI03EF01', descricao: 'Expressar ideias, desejos e sentimentos sobre suas vivências, por meio da linguagem oral e escrita.' },
      { codigo: 'EI03EF02', descricao: 'Inventar brincadeiras cantadas, poemas e canções, criando rimas, aliterações e ritmos.' }
    ]
  },
  {
    codigo: 'ET',
    nome: 'Espaços, tempos, quantidades, relações e transformações',
    objetivos: [
      { codigo: 'EI01ET01', descricao: 'Explorar e descobrir as propriedades de objetos e materiais (odor, cor, sabor, temperatura).' },
      { codigo: 'EI02ET01', descricao: 'Explorar e descrever semelhanças e diferenças entre as características e propriedades dos objetos.' },
      { codigo: 'EI02ET02', descricao: 'Identificar relações espaciais (dentro e fora, em cima, embaixo, acima, abaixo, entre e do lado).' },
      { codigo: 'EI03ET01', descricao: 'Estabelecer relações de comparação entre objetos, observando suas propriedades.' },
      { codigo: 'EI03ET02', descricao: 'Observar e descrever mudanças em diferentes materiais resultantes de ações sobre eles.' }
    ]
  }
]

// 3. Estrutura do Ensino Fundamental (Anos Iniciais e Finais)
export const ESTRUTURA_FUNDAMENTAL_BNCC: Record<string, ComponenteCurricularBNCC> = {
  'Matemática': {
    nome: 'Matemática',
    area: 'Matemática',
    unidades: [
      {
        unidade: 'Números',
        objetos: [
          {
            objeto: 'Sistema de numeração decimal: leitura, escrita e ordenação de números naturais',
            habilidades: [
              { codigo: 'EF01MA01', descricao: 'Utilizar números naturais como indicador de quantidade ou de ordem em diferentes situações cotidianas.' },
              { codigo: 'EF02MA01', descricao: 'Comparar e ordenar números naturais até a ordem de centenas pela compreensão de características do sistema de numeração decimal.' },
              { codigo: 'EF03MA01', descricao: 'Ler, escrever e comparar números naturais de até a ordem de unidade de milhar.' },
              { codigo: 'EF04MA01', descricao: 'Ler, escrever e ordenar números naturais até a ordem de dezenas de milhar.' },
              { codigo: 'EF05MA01', descricao: 'Ler, escrever e ordenar números naturais até a ordem das centenas de milhar com compreensão das principais características do sistema de numeração decimal.' },
              { codigo: 'EF06MA01', descricao: 'Comparar, ordenar, ler e escrever números naturais e números racionais cuja representação decimal é finita.' }
            ]
          },
          {
            objeto: 'Operações com números naturais (adição, subtração, multiplicação e divisão)',
            habilidades: [
              { codigo: 'EF01MA06', descricao: 'Construir fatos básicos da adição e utilizá-los em procedimentos de cálculo para resolver problemas.' },
              { codigo: 'EF02MA05', descricao: 'Construir fatos básicos da adição e subtração e utilizá-los no cálculo mental ou escrito.' },
              { codigo: 'EF03MA05', descricao: 'Utilizar diferentes procedimentos de cálculo mental e escrito para resolver problemas significativos envolvendo adição e subtração.' },
              { codigo: 'EF04MA04', descricao: 'Utilizar as relações entre adição e subtração, bem como entre multiplicação e divisão, para ampliar as estratégias de cálculo.' },
              { codigo: 'EF05MA07', descricao: 'Resolver e elaborar problemas de adição e subtração com números naturais e com números racionais.' }
            ]
          }
        ]
      },
      {
        unidade: 'Geometria',
        objetos: [
          {
            objeto: 'Figuras geométricas espaciais e planas: reconhecimento e características',
            habilidades: [
              { codigo: 'EF01MA13', descricao: 'Relacionar figuras geométricas espaciais (cones, cilindros, esferas e blocos retangulares) a objetos familiares do mundo físico.' },
              { codigo: 'EF02MA14', descricao: 'Reconhecer, nomear e comparar figuras geométricas espaciais (cubo, bloco retangular, pirâmide, cone, cilindro e esfera).' },
              { codigo: 'EF03MA13', descricao: 'Associar figuras geométricas espaciais a suas planificações e analisar suas características.' },
              { codigo: 'EF04MA17', descricao: 'Associar prismas e pirâmides a suas planificações e identificar elementos como faces, vértices e arestas.' },
              { codigo: 'EF04MA19', descricao: 'Reconhecer simetria de reflexão em figuras e em pares de figuras geométricas planas e utilizá-la na construção de figuras congruentes.' },
              { codigo: 'EF05MA16', descricao: 'Associar figuras espaciais a suas planificações e analisar, nomear e comparar seus atributos.' }
            ]
          }
        ]
      },
      {
        unidade: 'Grandezas e Medidas',
        objetos: [
          {
            objeto: 'Medidas de comprimento, massa, capacidade, tempo e temperatura',
            habilidades: [
              { codigo: 'EF01MA15', descricao: 'Comparar comprimentos, capacidades ou massas, utilizando termos como mais alto, mais baixo, mais comprido.' },
              { codigo: 'EF02MA16', descricao: 'Estimar, medir e comparar comprimentos de lados de salas e polígonos, utilizando unidades de medida não padronizadas e padronizadas.' },
              { codigo: 'EF03MA17', descricao: 'Reconhecer que o resultado de uma medida depende da unidade de medida utilizada.' },
              { codigo: 'EF04MA20', descricao: 'Medir e estimar comprimentos incluindo perímetros, massas e capacidades, utilizando unidades padronizadas usuais.' }
            ]
          }
        ]
      },
      {
        unidade: 'Probabilidade e Estatística',
        objetos: [
          {
            objeto: 'Leitura, interpretação e representação de dados em tabelas e gráficos',
            habilidades: [
              { codigo: 'EF01MA21', descricao: 'Ler dados expressos em tabelas e em gráficos de colunas simples.' },
              { codigo: 'EF02MA22', descricao: 'Comparar informações de pesquisas apresentadas por meio de tabelas de dupla entrada e gráficos de colunas.' },
              { codigo: 'EF03MA26', descricao: 'Resolver problemas cujos dados estão apresentados em tabelas de dupla entrada, gráficos de barras ou de colunas.' },
              { codigo: 'EF04MA27', descricao: 'Analisar dados apresentados em tabelas simples ou de dupla entrada e em gráficos de colunas ou pictóricos.' }
            ]
          }
        ]
      }
    ]
  },
  'Língua Portuguesa': {
    nome: 'Língua Portuguesa',
    area: 'Linguagens',
    unidades: [
      {
        unidade: 'Leitura/Escuta (compartilhada e autônoma)',
        objetos: [
          {
            objeto: 'Decodificação, fluência de leitura e compreensão de textos',
            habilidades: [
              { codigo: 'EF15LP01', descricao: 'Identificar a função social de textos que circulam em campos da vida social dos quais participa cotidianamente.' },
              { codigo: 'EF15LP02', descricao: 'Estabelecer expectativas em relação ao texto que vai ler a partir de conhecimentos prévios e pistas textuais.' },
              { codigo: 'EF15LP03', descricao: 'Localizar informações explícitas em textos de diferentes gêneros.' },
              { codigo: 'EF35LP01', descricao: 'Ler e compreender, silenciosamente e em voz alta, com autonomia e fluência, textos curtos com nível de textualidade adequado.' },
              { codigo: 'EF35LP03', descricao: 'Identificar a ideia central do texto, demonstrando compreensão global.' }
            ]
          }
        ]
      },
      {
        unidade: 'Produção de Textos (escrita compartilhada e autônoma)',
        objetos: [
          {
            objeto: 'Construção do sistema alfabético e da ortografia; planejamento e produção textual',
            habilidades: [
              { codigo: 'EF15LP05', descricao: 'Planejar, com a ajuda do professor, o texto que será produzido, considerando a situação comunicativa e os interlocutores.' },
              { codigo: 'EF15LP06', descricao: 'Reler e revisar o texto produzido com a ajuda do professor e a colaboração dos colegas.' },
              { codigo: 'EF35LP07', descricao: 'Utilizar, ao produzir um texto, conhecimentos linguísticos e gramaticais: pontuação, concordância e paragrafação.' }
            ]
          }
        ]
      },
      {
        unidade: 'Oralidade',
        objetos: [
          {
            objeto: 'Participação em conversações e debates; escuta atenta e respeito aos turnos de fala',
            habilidades: [
              { codigo: 'EF15LP09', descricao: 'Expressar-se em situações de intercâmbio oral com clareza, preocupando-se em ser compreendido pelo interlocutor.' },
              { codigo: 'EF15LP10', descricao: 'Escutar, com atenção, falas de professores e colegas, formulando perguntas pertinentes ao tema.' }
            ]
          }
        ]
      },
      {
        unidade: 'Análise Linguística/Semiótica (Ortografização)',
        objetos: [
          {
            objeto: 'Consciência fonológica, pontuação, acentuação e classes gramaticais',
            habilidades: [
              { codigo: 'EF01LP01', descricao: 'Reconhecer que textos são lidos e escritos da esquerda para a direita e de cima para baixo da página.' },
              { codigo: 'EF02LP01', descricao: 'Utilizar, ao produzir o texto, grafia correta de palavras com correspondências regulares contextuais.' },
              { codigo: 'EF03LP01', descricao: 'Ler e escrever palavras com correspondências regulares contextuais entre grafemas e fonemas.' },
              { codigo: 'EF04LP01', descricao: 'Grafar palavras utilizando regras de correspondência fonema-grafema regulares diretas e contextuais.' },
              { codigo: 'EF05LP01', descricao: 'Grafar palavras utilizando regras de correspondência fonema-grafema e acentuação gráfica regular.' }
            ]
          }
        ]
      }
    ]
  },
  'Ciências': {
    nome: 'Ciências',
    area: 'Ciências da Natureza',
    unidades: [
      {
        unidade: 'Matéria e Energia',
        objetos: [
          {
            objeto: 'Propriedades dos materiais, misturas e transformações químicas e físicas',
            habilidades: [
              { codigo: 'EF01CI01', descricao: 'Comparar características de diferentes materiais presentes em objetos de uso cotidiano.' },
              { codigo: 'EF02CI01', descricao: 'Identificar de que materiais são feitos os objetos que fazem parte da vida cotidiana e como são utilizados.' },
              { codigo: 'EF04CI01', descricao: 'Identificar misturas na vida diária, com base em suas propriedades observáveis.' },
              { codigo: 'EF05CI01', descricao: 'Explorar fenômenos da vida cotidiana que evidenciem propriedades físicas dos materiais.' }
            ]
          }
        ]
      },
      {
        unidade: 'Vida e Evolução',
        objetos: [
          {
            objeto: 'Corpo humano, seres vivos, ecossistemas e cadeias alimentares',
            habilidades: [
              { codigo: 'EF01CI02', descricao: 'Localizar, nomear e representar graficamente partes do corpo humano e explicar suas funções.' },
              { codigo: 'EF02CI04', descricao: 'Descrever características de plantas e animais que fazem parte de seu cotidiano e relacioná-las ao ambiente.' },
              { codigo: 'EF03CI04', descricao: 'Identificar características sobre o modo de vida de animais mais comuns em seu ambiente próximo.' },
              { codigo: 'EF04CI04', descricao: 'Analisar e construir cadeias alimentares simples, reconhecendo a posição dos produtores e consumidores.' }
            ]
          }
        ]
      },
      {
        unidade: 'Terra e Universo',
        objetos: [
          {
            objeto: 'Escalas de tempo, movimentos da Terra, Lua e fases, solo e clima',
            habilidades: [
              { codigo: 'EF01CI05', descricao: 'Identificar e nomear diferentes escalas de tempo: os períodos do dia (manhã, tarde, noite) e a sucessão dos dias.' },
              { codigo: 'EF03CI07', descricao: 'Identificar características da Terra (como seu formato esférico e a presença de água e solo).' },
              { codigo: 'EF05CI10', descricao: 'Identificar algumas constelações no céu, com o apoio de recursos (como mapas celestes e aplicativos).' }
            ]
          }
        ]
      }
    ]
  },
  'História': {
    nome: 'História',
    area: 'Ciências Humanas',
    unidades: [
      {
        unidade: 'Mundo Pessoal: Meu Lugar no Mundo',
        objetos: [
          {
            objeto: 'A comunidade e seus registros; a família e a escola ao longo do tempo',
            habilidades: [
              { codigo: 'EF01HI01', descricao: 'Identificar aspectos do seu crescimento por meio do registro das lembranças particulares ou de sua família.' },
              { codigo: 'EF02HI01', descricao: 'Reconhecer espaços de sociabilidade e distinguir os significados das relações de parentesco e convivência.' },
              { codigo: 'EF03HI01', descricao: 'Identificar os grupos populacionais que formam a cidade, o município e a região.' },
              { codigo: 'EF04HI01', descricao: 'Reconhecer a história como resultado da ação de homens e mulheres em diferentes tempos e espaços.' },
              { codigo: 'EF05HI01', descricao: 'Identificar os processos de formação das culturas e dos povos, relacionando-os com o espaço geográfico ocupado.' }
            ]
          }
        ]
      }
    ]
  },
  'Geografia': {
    nome: 'Geografia',
    area: 'Ciências Humanas',
    unidades: [
      {
        unidade: 'O Sujeito e seu Lugar no Mundo',
        objetos: [
          {
            objeto: 'O modo de vida das crianças em diferentes lugares; paisagens naturais e antrópicas',
            habilidades: [
              { codigo: 'EF01GE01', descricao: 'Descrever características observadas de seus lugares de vivência (moradia, escola etc.) e identificar semelhanças e diferenças.' },
              { codigo: 'EF02GE01', descricao: 'Descrever a história das migrações e sua contribuição para a formação da população local.' },
              { codigo: 'EF03GE01', descricao: 'Identificar e comparar aspectos culturais dos grupos sociais de seu município e região.' },
              { codigo: 'EF04GE01', descricao: 'Selecionar, em diferentes fontes, informações sobre processos de ocupação da terra e formação territorial.' },
              { codigo: 'EF05GE01', descricao: 'Descrever e analisar dinâmicas populacionais na Unidade da Federação em que vive.' }
            ]
          }
        ]
      }
    ]
  },
  'Arte': {
    nome: 'Arte',
    area: 'Linguagens',
    unidades: [
      {
        unidade: 'Artes Visuais, Música, Dança e Teatro',
        objetos: [
          {
            objeto: 'Elementos da linguagem visual e musical; patrimônio cultural e materialidade',
            habilidades: [
              { codigo: 'EF15AR01', descricao: 'Identificar e apreciar formas distintas das artes visuais tradicionais e contemporâneas.' },
              { codigo: 'EF15AR13', descricao: 'Identificar e apreciar criticamente diversas formas e gêneros de expressão musical.' },
              { codigo: 'EF15AR08', descricao: 'Experimentar e apreciar formas distintas de manifestações da dança presentes em diferentes contextos.' }
            ]
          }
        ]
      }
    ]
  },
  'Educação Física': {
    nome: 'Educação Física',
    area: 'Linguagens',
    unidades: [
      {
        unidade: 'Brincadeiras e Jogos, Esportes e Danças',
        objetos: [
          {
            objeto: 'Jogos populares do contexto comunitário e regional; corpo e saúde',
            habilidades: [
              { codigo: 'EF12EF01', descricao: 'Experimentar, fruir e recriar diferentes brincadeiras e jogos da cultura popular presentes no contexto comunitário.' },
              { codigo: 'EF35EF01', descricao: 'Experimentar e fruir brincadeiras e jogos populares do Brasil e do mundo, valorizando a importância desse patrimônio.' }
            ]
          }
        ]
      }
    ]
  },
  'Ensino Religioso': {
    nome: 'Ensino Religioso',
    area: 'Ensino Religioso',
    unidades: [
      {
        unidade: 'Identidades e Alteridades; Manifestações Religiosas',
        objetos: [
          {
            objeto: 'O eu, o outro e o nós; ritos, símbolos e diversidade cultural',
            habilidades: [
              { codigo: 'EF01ER01', descricao: 'Identificar e acolher as semelhanças e diferenças entre o eu, o outro e o nós.' },
              { codigo: 'EF02ER01', descricao: 'Reconhecer os diferentes espaços de convivência e a importância do respeito à diversidade.' }
            ]
          }
        ]
      }
    ]
  }
}

// Helpers
export function getComponentesPorArea(areaNome?: string): string[] {
  if (!areaNome) return Object.keys(ESTRUTURA_FUNDAMENTAL_BNCC)
  return Object.values(ESTRUTURA_FUNDAMENTAL_BNCC)
    .filter(c => c.area.toLowerCase() === areaNome.toLowerCase())
    .map(c => c.nome)
}

export function getAreasDoConhecimento(): string[] {
  const set = new Set<string>()
  Object.values(ESTRUTURA_FUNDAMENTAL_BNCC).forEach(c => set.add(c.area))
  return Array.from(set)
}
