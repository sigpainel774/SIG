export type StatusSimulado = 'rascunho' | 'ativo' | 'encerrado' | 'arquivado'

export interface AreaConhecimento {
  nome: string
  inicio: number
  fim: number
  peso?: number
}

export interface Simulado {
  id: string
  escola_id: string
  titulo: string
  descricao?: string | null
  ano_letivo: string
  data_aplicacao: string
  turmas_ids: string[]
  qtd_questoes: number
  alternativas_por_questao: number // 4 ou 5
  gabarito_oficial: Record<string, string> // ex: { "1": "A", "2": "C" }
  areas_conhecimento?: AreaConhecimento[]
  token_publico: string
  auto_correcao_ativa: boolean
  auto_correcao_limite?: string | null
  caderno_questoes?: string | null
  incluir_questoes_impressao?: boolean
  possui_lingua_estrangeira?: boolean
  lingua_estrangeira_inicio?: number
  lingua_estrangeira_fim?: number
  gabarito_ingles?: Record<string, string>
  gabarito_espanhol?: Record<string, string>
  status: StatusSimulado
  created_by?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
  // Joins ou métricas calculadas
  total_respostas?: number
  media_nota?: number
}

export interface SimuladoResposta {
  id: string
  simulado_id: string
  aluno_id?: string | null
  turma_id?: string | null
  nome_identificado: string
  lingua_estrangeira?: 'ingles' | 'espanhol' | null
  cpf_aluno?: string | null
  data_nascimento_aluno?: string | null
  nome_mae_aluno?: string | null
  respostas: Record<string, string | null> // "A", "B", "C", "D", "E", "ANULADA", "BRANCO"
  total_acertos: number
  total_erros: number
  total_em_branco: number
  total_anuladas: number
  nota_final: number
  percentual_acerto: number
  canal_correcao: 'camera_painel' | 'celular_aluno' | 'manual' | 'manual_painel'
  imagem_captura_url?: string | null
  data_correcao: string
  ip_origem?: string | null
  created_at: string
  updated_at: string
  // Joins
  aluno?: {
    id: string
    nome: string
    numero_matricula?: string
    cpf?: string | null
    data_nascimento?: string | null
    nome_mae?: string | null
    foto?: string | null
  } | null
  turma?: {
    id: string
    nome: string
  } | null
}
