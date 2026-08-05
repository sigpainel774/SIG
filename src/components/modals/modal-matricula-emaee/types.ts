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
  data_nascimento: string | null
  certidao_nascimento: string | null
  cor_raca: string | null
  sexo: string | null
  nome_mae: string | null
  nome_pai: string | null
  endereco: string | null
}
