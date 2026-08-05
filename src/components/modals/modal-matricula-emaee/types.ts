export interface ModalMatriculaEmaeeProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  escolaEmaeeId: string
  onSuccess?: () => void
}

export interface AlunoSearchData {
  id: string
  nome: string
  cpf: string | null
  rg: string | null
  nis: string | null
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
}
