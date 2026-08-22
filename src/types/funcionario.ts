export interface Funcionario {
  id: string
  nome: string
  apelido?: string | null
  email: string
  cpf?: string | null
  cargo?: string | null
  cargo_origem?: string | null
  carga_horaria_efetiva?: number | null
  status: string
  orgao?: string | null
  data_nascimento?: string | null
  formacao?: string | null
  foto_url?: string | null
  foto_avatar_path?: string | null
  foto_visualizacao_path?: string | null
  foto_updated_at?: string | null
  is_superadmin?: boolean | null
  is_conta_especial?: boolean | null
  is_conta_eja?: boolean | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
  telefone?: string | null
  modalidade_ensino?: string | null
  tipo_vinculo?: string | null
}
