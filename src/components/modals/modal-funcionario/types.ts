export interface FuncionarioBasico {
  id: string
  nome: string
  email: string
  cpf?: string | null
  cargo?: string | null
  status: string
  formacao?: string | null
  foto_url?: string | null
  data_nascimento?: string | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface ModalFuncionarioProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
  /** Se fornecido, abre em modo edição */
  funcionario?: FuncionarioBasico | null
}

export interface Cargo {
  id: string
  nome: string
}

export interface Doencas {
  diabetes: boolean
  convulsoes: boolean
  asmaBronquite: boolean
  infeccoes: boolean
  cardiopatias: boolean
  alergias: boolean
  covid19: boolean
  articulares: boolean
  outra: string
}

export interface PosGraduacao {
  tipo: string
  area: string
  ano: string
}

export interface FuncionarioFormContextType {
  // Config
  isEditing: boolean
  funcionario: FuncionarioBasico | null | undefined
  loading: boolean
  loadingData: boolean
  cargos: Cargo[]

  // Identificação Básica
  empId: string
  authUserId: string | null
  escolaId: string
  setEscolaId: (v: string) => void
  escolaNome: string
  escolaInep: string
  escolaLocalizacao: string

  // Dados Pessoais & Endereço (Hook usePessoaForm)
  nome: string
  setNome: (v: string) => void
  email: string
  setEmail: (v: string) => void
  cpf: string
  setCpf: (v: string) => void
  censo: string
  setCenso: (v: string) => void
  estadoCivil: string
  setEstadoCivil: (v: string) => void
  corRaca: string
  setCorRaca: (v: string) => void
  sexo: string
  setSexo: (v: string) => void
  nascimento: string
  setNascimento: (v: string) => void
  nacionalidade: string
  setNacionalidade: (v: string) => void
  nacionalidadeEspec: string
  setNacionalidadeEspec: (v: string) => void
  telefone: string
  setTelefone: (v: string) => void
  nomeMae: string
  setNomeMae: (v: string) => void
  nomePai: string
  setNomePai: (v: string) => void
  municipioNasc: string
  setMunicipioNasc: (v: string) => void
  ufNasc: string
  setUfNasc: (v: string) => void
  rg: string
  setRg: (v: string) => void
  nis: string
  setNis: (v: string) => void
  logradouro: string
  setLogradouro: (v: string) => void
  numero: string
  setNumero: (v: string) => void
  cep: string
  setCep: (v: string) => void
  bairro: string
  setBairro: (v: string) => void
  cidade: string
  setCidade: (v: string) => void
  ufResidencia: string
  setUfResidencia: (v: string) => void
  areaResidencia: string
  setAreaResidencia: (v: string) => void
  areaDiferenciada: string
  setAreaDiferenciada: (v: string) => void
  latitude: number | null
  setLatitude: (v: number | null) => void
  longitude: number | null
  setLongitude: (v: number | null) => void
  formatCPF: (v: string) => string
  formatCEP: (v: string) => string

  // Emprego
  cargo: string
  setCargo: (v: string) => void
  funcaoEspec: string
  setFuncaoEspec: (v: string) => void
  tipoVinculo: string
  setTipoVinculo: (v: string) => void
  tipoVinculoEspec: string
  setTipoVinculoEspec: (v: string) => void
  status: string
  setStatus: (v: string) => void

  // Saúde & Deficiências
  possuiDeficiencia: boolean
  setPossuiDeficiencia: (v: boolean) => void
  deficiencias: string[]
  setDeficiencias: (v: string[]) => void
  tea: boolean
  setTea: (v: boolean) => void
  altasHabilidades: boolean
  setAltasHabilidades: (v: boolean) => void
  doencas: Doencas
  setDoencas: React.Dispatch<React.SetStateAction<Doencas>>
  toggleDeficiencia: (val: string) => void

  // Escolaridade & Formação
  escolaridadeNivel: string
  setEscolaridadeNivel: (v: string) => void
  ensinoMedioTipo: string
  setEnsinoMedioTipo: (v: string) => void
  superiorArea: string
  setSuperiorArea: (v: string) => void
  superiorCodigo: string
  setSuperiorCodigo: (v: string) => void
  superiorAno: string
  setSuperiorAno: (v: string) => void
  superiorTipoInst: string
  setSuperiorTipoInst: (v: string) => void
  superiorGrau: string
  setSuperiorGrau: (v: string) => void
  superiorInstituicao: string
  setSuperiorInstituicao: (v: string) => void
  complementacaoPedagogica: string
  setComplementacaoPedagogica: (v: string) => void
  posGraduacoes: PosGraduacao[]
  setPosGraduacoes: React.Dispatch<React.SetStateAction<PosGraduacao[]>>
  outrosCursos: string[]
  setOutrosCursos: (v: string[]) => void
  toggleOutroCurso: (val: string) => void

  // Documentos Anexados
  docIdentidadeUrl: string
  setDocIdentidadeUrl: (v: string) => void
  docCpfUrl: string
  setDocCpfUrl: (v: string) => void
  docCompResidenciaUrl: string
  setDocCompResidenciaUrl: (v: string) => void
  docFundamentalUrl: string
  setDocFundamentalUrl: (v: string) => void
  docMedioUrl: string
  setDocMedioUrl: (v: string) => void
  docSuperiorUrl: string
  setDocSuperiorUrl: (v: string) => void
  docPosUrl: string
  setDocPosUrl: (v: string) => void
  docMestradoUrl: string
  setDocMestradoUrl: (v: string) => void
  docDoutoradoUrl: string
  setDocDoutoradoUrl: (v: string) => void

  // Observações e Finais
  observacoes: string
  setObservacoes: (v: string) => void
  dataPreenchimento: string
  setDataPreenchimento: (v: string) => void

  // Foto 3x4
  fotoFile: File | null
  setFotoFile: (v: File | null) => void
  fotoPreview: string | null
  setFotoPreview: (v: string | null) => void
  handleFotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void

  // Métodos Globais
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleDocUpload: (e: React.ChangeEvent<HTMLInputElement>, docType: string, setter: (url: string) => void) => Promise<void>
  handleOpenChange: (val: boolean) => void
}
