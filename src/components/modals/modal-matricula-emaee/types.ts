export interface ModalMatriculaEmaeeProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  escolaEmaeeId: string
  matriculaEditar?: any
  onSuccess?: () => void
}

export interface AlunoSearchData {
  id: string
  nome: string
  cpf: string | null
  rg: string | null
  nis: string | null
  cartao_sus?: string | null
  identif_unica_censo: string | null
  data_nascimento: string | null
  certidao_nascimento: string | null
  cor_raca: string | null
  sexo: string | null
  uf_nascimento: string | null
  municipio_nascimento: string | null
  nome_mae: string | null
  profissao_mae: string | null
  nome_pai: string | null
  profissao_pai: string | null
  endereco: string | null
  zona_residencial: string | null
  nome_contato_emergencia: string | null
  telefone: string | null
  latitude?: number | null
  longitude?: number | null
  foto_url?: string | null
  foto_avatar_path?: string | null
  foto_visualizacao_path?: string | null
  foto_updated_at?: string | null
  escola_id?: string | null
  escola_nome?: string | null
  turma_id?: string | null
  turma_nome?: string | null
  atendido_emaee?: boolean | null
  dados_matricula?: any
}
