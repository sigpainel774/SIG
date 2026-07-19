export interface ModalAlunoProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  alunoEditar?: any
  onSuccess?: () => void
}

export interface AlunoFormContextType {
  alunoEditar?: any
  isEditMode: boolean
  isFichaBloqueada: boolean
  loading: boolean
  escolas: any[]
  turmas: any[]
  
  // Escola
  escolaId: string
  setEscolaId: (val: string) => void

  // Identificação Básica
  fotoUrl: string
  setFotoUrl: (val: string) => void

  // Turma
  turmaId: string
  setTurmaId: (val: string) => void

  // Documentação
  sus: string
  setSus: (val: string) => void
  certidao: string
  setCertidao: (val: string) => void

  // Endereço e Matricula
  endereco: string
  setEndereco: (val: string) => void
  tipoMatricula: string
  setTipoMatricula: (val: string) => void
  dataMatricula: string
  setDataMatricula: (val: string) => void
  localizacao: string
  setLocalizacao: (val: string) => void
  serie: string
  setSerie: (val: string) => void
  turno: string
  setTurno: (val: string) => void
  turmaLetra: string
  setTurmaLetra: (val: string) => void

  // Transporte e Saúde
  transporte: boolean
  setTransporte: (val: boolean) => void
  rotaTransporte: string
  setRotaTransporte: (val: string) => void
  situacaoVacinal: string
  setSituacaoVacinal: (val: string) => void
  restricoesSaude: string
  setRestricoesSaude: (val: string) => void

  // Recursos SAEB
  recursosEspeciais: string
  setRecursosEspeciais: (val: string) => void
  recursosSelecionados: string[]
  setRecursosSelecionados: (val: string[]) => void

  // Ficha de Saúde / Anamnese
  diabete: string
  setDiabete: (val: string) => void
  convulsoes: string
  setConvulsoes: (val: string) => void
  asma: string
  setAsma: (val: string) => void
  infeccoes: string
  setInfeccoes: (val: string) => void
  restricaoExercicio: string
  setRestricaoExercicio: (val: string) => void
  covid: string
  setCovid: (val: string) => void
  covidQuando: string
  setCovidQuando: (val: string) => void
  situacaoVacinalCovid: string
  setSituacaoVacinalCovid: (val: string) => void
  alergiaMed: string
  setAlergiaMed: (val: string) => void
  alergiaMedQuais: string
  setAlergiaMedQuais: (val: string) => void
  motivoNaoVacinacaoGeral: string
  setMotivoNaoVacinacaoGeral: (val: string) => void
  motivoNaoVacinacaoCovid: string
  setMotivoNaoVacinacaoCovid: (val: string) => void
  restricaoAlimentar: string
  setRestricaoAlimentar: (val: string) => void
  restricaoAlimentarQuais: string
  setRestricaoAlimentarQuais: (val: string) => void

  // NEE
  nee: string
  setNee: (val: string) => void
  neeSelecionadas: string[]
  setNeeSelecionadas: (val: string[]) => void

  // Deficiências
  deficiencia: string
  setDeficiencia: (val: string) => void
  deficienciasSelecionadas: string[]
  setDeficienciasSelecionadas: (val: string[]) => void

  // Imagem/Voz & Assinatura
  autorizaImagemVoz: string
  setAutorizaImagemVoz: (val: string) => void
  assinaturaResponsavelUrl: string | null
  setAssinaturaResponsavelUrl: (val: string | null) => void
  assinaturaFuncionarioUrl: string | null
  setAssinaturaFuncionarioUrl: (val: string | null) => void
  newSignatureResponsavel: string | null
  setNewSignatureResponsavel: (val: string | null) => void
  newSignatureFuncionario: string | null
  setNewSignatureFuncionario: (val: string | null) => void

  // Assinatura Celular Polling
  celularSigningField: 'resp' | 'func' | null
  setCelularSigningField: (val: 'resp' | 'func' | null) => void
  celularSigningCode: string | null
  setCelularSigningCode: (val: string | null) => void

  // Edição/Bloqueio
  isEdicaoLiberada: boolean
  solicitandoLibere: boolean
  setSolicitandoLibere: (val: boolean) => void
  solicitacaoPendente: boolean
  setSolicitacaoPendente: (val: boolean) => void
  justificativaSolicitacao: string
  setJustificativaSolicitacao: (val: string) => void
  justificativaPendente: string
  setJustificativaPendente: (val: string) => void

  // Refs e Handlers
  signatureSectionRef: React.RefObject<HTMLDivElement | null>
  handleEnviarSolicitacaoEdicao: () => Promise<void>
  iniciarAssinaturaCelular: (tipo: 'resp' | 'func') => Promise<void>
  cancelarAssinaturaCelular: () => Promise<void>
  clearDatabaseCodes: (fieldToClear?: 'resp' | 'func' | null) => Promise<void>
  handleFotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  toggleArrayItem: (list: string[], item: string, setter: (val: string[]) => void) => void
  handleSubmit: (e: React.FormEvent) => Promise<void>

  // Dados do PessoaForm Hook
  nome: string
  setNome: (val: string) => void
  nascimento: string
  setNascimento: (val: string) => void
  censo: string
  setCenso: (val: string) => void
  cpf: string
  setCpf: (val: string) => void
  telefone: string
  setTelefone: (val: string) => void
  estadoCivil: string
  setEstadoCivil: (val: string) => void
  corRaca: string
  setCorRaca: (val: string) => void
  sexo: string
  setSexo: (val: string) => void
  rg: string
  setRg: (val: string) => void
  nis: string
  setNis: (val: string) => void
  nacionalidade: string
  setNacionalidade: (val: string) => void
  cidadeNasc: string
  setCidadeNasc: (val: string) => void
  ufNasc: string
  setUfNasc: (val: string) => void
  mae: string
  setMae: (val: string) => void
  telMae: string
  setTelMae: (val: string) => void
  pai: string
  setPai: (val: string) => void
  telPai: string
  setTelPai: (val: string) => void
  rua: string
  setRua: (val: string) => void
  numero: string
  setNumero: (val: string) => void
  cep: string
  setCep: (val: string) => void
  bairro: string
  setBairro: (val: string) => void
  cidadeEnd: string
  setCidadeEnd: (val: string) => void
  ufEnd: string
  setUfEnd: (val: string) => void
  latitude: number | null
  setLatitude: (val: number | null) => void
  longitude: number | null
  setLongitude: (val: number | null) => void
  areaLocalizacao: string
  setAreaLocalizacao: (val: string) => void
  areaDiferenciada: string
  setAreaDiferenciada: (val: string) => void
  resetPessoais: () => void
  populatePessoais: (data: any) => void
}
