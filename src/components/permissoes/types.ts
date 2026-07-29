// ─── Tipos compartilhados do módulo de Permissões ────────────────────────────

export interface Escola {
  id: string
  nome: string
}

export interface FuncionarioSimples {
  id: string
  nome: string
  email: string | null
  cargo?: string | null
  is_superadmin?: boolean | null
  is_conta_especial?: boolean | null
  auth_user_id?: string | null
}

export interface RegistroPermissao {
  id: string
  acessoId?: string
  nome: string
  email: string
  nivel: string
  nivelNum: number | null
  escola: string
  escolaId: string | null
  status: string
  cargo?: string | null
  is_superadmin?: boolean | null
  is_conta_especial?: boolean | null
}

