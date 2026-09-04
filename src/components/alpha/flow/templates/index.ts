import type { Edge, Node } from "@xyflow/react";

export interface FlowTemplate {
  id: string;
  titulo: string;
  descricao: string;
  categoria: "processos" | "organograma" | "pedagogico";
  nodes: Node[];
  edges: Edge[];
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: "transferencia-alunos",
    titulo: "Trâmite de Transferência Escolar",
    descricao: "Fluxo oficial de transferência entre unidades com protocolo de saída e aceite",
    categoria: "processos",
    nodes: [
      {
        id: "origem",
        type: "escola",
        position: { x: 50, y: 150 },
        data: {
          label: "E.M. Prof. Darcy Ribeiro",
          codigo: "ESC-001",
          turnos: "Matutino / Vespertino",
          alunos: "420 Alunos",
        },
      },
      {
        id: "solicitacao",
        type: "processo",
        position: { x: 340, y: 150 },
        data: {
          label: "Emissão de Protocolo de Transferência",
          descricao: "Secretaria gera termo com histórico provisório",
          status: "Concluído",
        },
      },
      {
        id: "verificacao",
        type: "condicao",
        position: { x: 630, y: 130 },
        data: {
          label: "Há Vaga no Destino?",
          condicao: "Checagem por ano letivo e turno",
        },
      },
      {
        id: "destino",
        type: "escola",
        position: { x: 930, y: 60 },
        data: {
          label: "E.M. Cecília Meireles",
          codigo: "ESC-004",
          turnos: "Integral / Matutino",
          alunos: "310 Alunos",
        },
      },
      {
        id: "fila-espera",
        type: "processo",
        position: { x: 930, y: 240 },
        data: {
          label: "Inclusão em Fila de Espera",
          descricao: "Notificação automática à Central de Matrículas",
          status: "Alerta",
        },
      },
      {
        id: "efetivacao",
        type: "processo",
        position: { x: 1220, y: 60 },
        data: {
          label: "Matrícula Efetivada",
          descricao: "Enturmação e encerramento do protocolo",
          status: "Concluído",
        },
      },
    ],
    edges: [
      {
        id: "e1",
        source: "origem",
        target: "solicitacao",
        animated: true,
        style: { strokeWidth: 2 },
      },
      {
        id: "e2",
        source: "solicitacao",
        target: "verificacao",
        animated: true,
        style: { strokeWidth: 2 },
      },
      {
        id: "e3",
        source: "verificacao",
        sourceHandle: "sim",
        target: "destino",
        label: "Sim (Com Vaga)",
        style: { stroke: "#10b981", strokeWidth: 2 },
      },
      {
        id: "e4",
        source: "verificacao",
        sourceHandle: "nao",
        target: "fila-espera",
        label: "Não (Sem Vaga)",
        style: { stroke: "#ef4444", strokeWidth: 2 },
      },
      {
        id: "e5",
        source: "destino",
        target: "efetivacao",
        animated: true,
        style: { strokeWidth: 2 },
      },
    ],
  },
  {
    id: "organograma-escola",
    titulo: "Organograma da Unidade Escolar",
    descricao: "Estrutura hierárquica e distribuição de lideranças na escola",
    categoria: "organograma",
    nodes: [
      {
        id: "direcao",
        type: "cargo",
        position: { x: 450, y: 50 },
        data: {
          label: "Direção Escolar",
          responsavel: "Gestor Titular (Portaria 2026)",
          nivel: "Nível 2",
        },
      },
      {
        id: "coord-pedag",
        type: "cargo",
        position: { x: 220, y: 220 },
        data: {
          label: "Coordenação Pedagógica",
          responsavel: "Orientador Pedagógico",
          nivel: "Nível 3",
        },
      },
      {
        id: "secretaria",
        type: "cargo",
        position: { x: 680, y: 220 },
        data: {
          label: "Secretaria Escolar",
          responsavel: "Secretário / Escriturário",
          nivel: "Nível 5",
        },
      },
      {
        id: "docentes",
        type: "cargo",
        position: { x: 100, y: 380 },
        data: {
          label: "Corpo Docente / Professores",
          responsavel: "Professores Regentes & Especiais",
          nivel: "Nível 4",
        },
      },
      {
        id: "apoio",
        type: "cargo",
        position: { x: 340, y: 380 },
        data: {
          label: "Atendimento Especializado (AEE)",
          responsavel: "Prof. Educação Inclusiva",
          nivel: "Nível 4",
        },
      },
      {
        id: "operacional",
        type: "cargo",
        position: { x: 680, y: 380 },
        data: {
          label: "Serviços Gerais & Transporte",
          responsavel: "Motoristas e Merendeiras",
          nivel: "Nível 6",
        },
      },
    ],
    edges: [
      { id: "o1", source: "direcao", target: "coord-pedag", style: { strokeWidth: 2 } },
      { id: "o2", source: "direcao", target: "secretaria", style: { strokeWidth: 2 } },
      { id: "o3", source: "coord-pedag", target: "docentes", style: { strokeWidth: 2 } },
      { id: "o4", source: "coord-pedag", target: "apoio", style: { strokeWidth: 2 } },
      { id: "o5", source: "secretaria", target: "operacional", style: { strokeWidth: 2 } },
    ],
  },
  {
    id: "triagem-emaee",
    titulo: "Fluxo de Atendimento Multiprofissional EMAEE",
    descricao: "Esteira de encaminhamento, fila de espera e parecer multiprofissional",
    categoria: "pedagogico",
    nodes: [
      {
        id: "escola-req",
        type: "escola",
        position: { x: 50, y: 150 },
        data: {
          label: "Escola Solicitante",
          codigo: "ORIGEM",
          turnos: "Ensino Regular",
          alunos: "Relatório Pedagógico",
        },
      },
      {
        id: "triagem-doc",
        type: "processo",
        position: { x: 340, y: 150 },
        data: {
          label: "Triagem e Parecer Inicial",
          descricao: "Avaliação da ficha de encaminhamento",
          status: "Concluído",
        },
      },
      {
        id: "avaliacao-multi",
        type: "cargo",
        position: { x: 630, y: 150 },
        data: {
          label: "Equipe Multidisciplinar",
          responsavel: "Psicologia & Fonoaudiologia",
          nivel: "EMAEE",
        },
      },
      {
        id: "plano-pdi",
        type: "processo",
        position: { x: 920, y: 150 },
        data: {
          label: "Elaboração do PDI",
          descricao: "Plano de Desenvolvimento Individualizado",
          status: "Concluído",
        },
      },
    ],
    edges: [
      {
        id: "em1",
        source: "escola-req",
        target: "triagem-doc",
        animated: true,
        style: { strokeWidth: 2 },
      },
      {
        id: "em2",
        source: "triagem-doc",
        target: "avaliacao-multi",
        animated: true,
        style: { strokeWidth: 2 },
      },
      {
        id: "em3",
        source: "avaliacao-multi",
        target: "plano-pdi",
        animated: true,
        style: { strokeWidth: 2 },
      },
    ],
  },
];
