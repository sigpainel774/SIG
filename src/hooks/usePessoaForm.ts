'use client'

import { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

export interface PessoaFormOptions {
  estadoCivilDefault?: string
  nacionalidadeDefault?: string
  sexoDefault?: string
  corRacaDefault?: string
  ufNascDefault?: string
  cidadeEndDefault?: string
  ufEndDefault?: string
  areaLocalizacaoDefault?: string
  areaDiferenciadaDefault?: string
}

export function validateCPF(cpfValue: string): boolean {
  const clean = cpfValue.replace(/\D/g, '')
  if (clean.length === 0) return true // Vazio/opcional é considerado neutro/válido
  if (clean.length !== 11) return false
  if (/^(\d)\1{10}$/.test(clean)) return false // Impede CPFs com 11 números idênticos (111.111.111-11, etc.)

  let soma = 0
  let resto = 0

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(clean.substring(i - 1, i)) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(clean.substring(9, 10))) return false

  soma = 0
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(clean.substring(i - 1, i)) * (12 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(clean.substring(10, 11))) return false

  return true
}

export function usePessoaForm(options?: PessoaFormOptions) {
  // Dados Pessoais / Identificação
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [censo, setCenso] = useState('')
  const [estadoCivil, setEstadoCivil] = useState(options?.estadoCivilDefault ?? 'Não declarado')
  const [corRaca, setCorRaca] = useState(options?.corRacaDefault ?? 'Não declarado')
  const [sexo, setSexo] = useState(options?.sexoDefault ?? 'Não declarado')
  const [nascimento, setNascimento] = useState('')
  const [nacionalidade, setNacionalidade] = useState(options?.nacionalidadeDefault ?? 'Brasileira')
  const [nacionalidadeEspec, setNacionalidadeEspec] = useState('')
  const [telefone, setTelefone] = useState('')

  // Filiação
  const [mae, setMae] = useState('')
  const [telMae, setTelMae] = useState('')
  const [pai, setPai] = useState('')
  const [telPai, setTelPai] = useState('')

  // Documentação e Nascimento
  const [rg, setRg] = useState('')
  const [nis, setNis] = useState('')
  const [cidadeNasc, setCidadeNasc] = useState('')
  const [ufNasc, setUfNasc] = useState(options?.ufNascDefault ?? '')

  // Endereço e Localização
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [cep, setCep] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidadeEnd, setCidadeEnd] = useState(options?.cidadeEndDefault ?? 'SAPE AÇU')
  const [ufEnd, setUfEnd] = useState(options?.ufEndDefault ?? 'BA')
  const [areaLocalizacao, setAreaLocalizacao] = useState(options?.areaLocalizacaoDefault ?? 'Urbana')
  const [areaDiferenciada, setAreaDiferenciada] = useState(options?.areaDiferenciadaDefault ?? 'Não está em área diferenciada')

  // GPS (usamos strings internas para a digitação fluida de decimais, e expomos conversores)
  const [latitudeStr, setLatitudeStr] = useState('')
  const [longitudeStr, setLongitudeStr] = useState('')

  // Estado de carregamento do CEP
  const [isFetchingCep, setIsFetchingCep] = useState(false)

  // Máscaras utilitárias
  const formatCPF = useCallback((value: string) => {
    const clean = value.replace(/\D/g, '')
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14)
  }, [])

  const formatCEP = useCallback((value: string) => {
    const clean = value.replace(/\D/g, '')
    return clean
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9)
  }, [])

  const formatTelefone = useCallback((value: string) => {
    const clean = value.replace(/\D/g, '')
    if (clean.length > 10) {
      return clean
        .replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
        .substring(0, 15)
    }
    return clean
      .replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3')
      .substring(0, 14)
  }, [])

  // Validação em tempo real do CPF
  const isCpfValid = useMemo(() => {
    return validateCPF(cpf)
  }, [cpf])

  // Handler seguro para mudanças no CPF
  const handleCpfChange = (val: string) => {
    setCpf(formatCPF(val))
  }

  // Consulta assíncrona ao ViaCEP
  const consultarCep = useCallback(async (cepInput?: string) => {
    const targetCep = cepInput ?? cep
    const cleanCep = targetCep.replace(/\D/g, '')
    if (cleanCep.length !== 8) return

    setIsFetchingCep(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      if (!response.ok) throw new Error('Falha na requisição ao ViaCEP')
      const data = await response.json()

      if (data.erro === true || data.erro === 'true') {
        toast.error('CEP não encontrado nos Correios')
        return
      }

      if (data.logradouro) setRua(data.logradouro)
      if (data.bairro) setBairro(data.bairro)
      if (data.localidade) setCidadeEnd(data.localidade)
      if (data.uf) setUfEnd(data.uf)
      toast.success('Endereço localizado via CEP!')
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
      toast.error('Erro ao consultar CEP. Preencha o endereço manualmente.')
    } finally {
      setIsFetchingCep(false)
    }
  }, [cep])

  // Handler seguro para mudanças no CEP (dispara busca automática quando completa 8 dígitos)
  const handleCepChange = (val: string) => {
    const formatted = formatCEP(val)
    setCep(formatted)
    const clean = formatted.replace(/\D/g, '')
    if (clean.length === 8) {
      consultarCep(formatted)
    }
  }

  // Função para limpar todos os estados do formulário
  const resetPessoais = () => {
    setNome('')
    setEmail('')
    setCpf('')
    setCenso('')
    setEstadoCivil(options?.estadoCivilDefault ?? 'Não declarado')
    setCorRaca(options?.corRacaDefault ?? 'Não declarado')
    setSexo(options?.sexoDefault ?? 'Não declarado')
    setNascimento('')
    setNacionalidade(options?.nacionalidadeDefault ?? 'Brasileira')
    setNacionalidadeEspec('')
    setTelefone('')
    setMae('')
    setTelMae('')
    setPai('')
    setTelPai('')
    setRg('')
    setNis('')
    setCidadeNasc('')
    setUfNasc(options?.ufNascDefault ?? '')
    setRua('')
    setNumero('')
    setCep('')
    setBairro('')
    setCidadeEnd(options?.cidadeEndDefault ?? 'SAPE AÇU')
    setUfEnd(options?.ufEndDefault ?? 'BA')
    setAreaLocalizacao(options?.areaLocalizacaoDefault ?? 'Urbana')
    setAreaDiferenciada(options?.areaDiferenciadaDefault ?? 'Não está em área diferenciada')
    setLatitudeStr('')
    setLongitudeStr('')
  }

  // Função para popular com dados arbitrários
  const populatePessoais = (data: any) => {
    if (!data) return
    setNome(data.nome ?? '')
    setEmail(data.email ?? '')
    setCpf(data.cpf ? formatCPF(data.cpf) : '')
    setCenso(data.censo ?? data.inep ?? '')
    setEstadoCivil(data.estado_civil ?? data.estadoCivilAluno ?? options?.estadoCivilDefault ?? 'Não declarado')
    setCorRaca(data.cor_raca ?? data.corRacaAluno ?? options?.corRacaDefault ?? 'Não declarado')
    setSexo(data.sexo ?? data.sexoAluno ?? options?.sexoDefault ?? 'Não declarado')
    setNascimento(data.data_nascimento ?? data.nascimentoAluno ?? '')
    setNacionalidade(data.nacionalidade ?? data.nacionalidadeAluno ?? options?.nacionalidadeDefault ?? 'Brasileira')
    setNacionalidadeEspec(data.nacionalidade_especificacao ?? '')
    setTelefone(data.telefone ? formatTelefone(data.telefone) : '')
    setMae(data.nome_mae ?? data.maeAluno ?? '')
    setTelMae(data.telMaeAluno ? formatTelefone(data.telMaeAluno) : '')
    setPai(data.nome_pai ?? data.paiAluno ?? '')
    setTelPai(data.telPaiAluno ? formatTelefone(data.telPaiAluno) : '')
    setRg(data.rg ?? data.rgAluno ?? '')
    setNis(data.nis ?? data.nisAluno ?? '')
    setCidadeNasc(data.municipio_nascimento ?? data.cidadeNascAluno ?? '')
    setUfNasc(data.uf_nascimento ?? data.ufNascAluno ?? options?.ufNascDefault ?? '')
    setRua(data.logradouro ?? data.ruaAluno ?? data.rua ?? '')
    setNumero(data.numero ?? data.numeroAluno ?? '')
    setCep(data.cep ? formatCEP(data.cep) : (data.cepAluno ? formatCEP(data.cepAluno) : ''))
    setBairro(data.bairro ?? data.bairroAluno ?? '')
    setCidadeEnd(data.cidade ?? data.cidadeEndAluno ?? options?.cidadeEndDefault ?? 'SAPE AÇU')
    setUfEnd(data.uf_residencia ?? data.ufEndAluno ?? options?.ufEndDefault ?? 'BA')
    setAreaLocalizacao(data.area_residencia ?? data.areaLocalizacaoAluno ?? options?.areaLocalizacaoDefault ?? 'Urbana')
    setAreaDiferenciada(data.area_diferenciada ?? data.areaDiferenciadaAluno ?? options?.areaDiferenciadaDefault ?? 'Não está em área diferenciada')
    
    // Converte números de latitude e longitude do DB para string amigável no input
    setLatitudeStr(data.latitude !== undefined && data.latitude !== null ? String(data.latitude) : '')
    setLongitudeStr(data.longitude !== undefined && data.longitude !== null ? String(data.longitude) : '')
  }

  // Getters para obter valores numéricos para salvar no Supabase de forma segura
  const getLatitudeNumber = (): number | null => {
    if (!latitudeStr.trim()) return null
    const num = parseFloat(latitudeStr.replace(',', '.'))
    return isNaN(num) ? null : num
  }

  const getLongitudeNumber = (): number | null => {
    if (!longitudeStr.trim()) return null
    const num = parseFloat(longitudeStr.replace(',', '.'))
    return isNaN(num) ? null : num
  }

  // Mapeamentos de Compatibilidade (Aliases)
  return {
    // Estados básicos e setters
    nome, setNome,
    email, setEmail,
    cpf, setCpf: handleCpfChange,
    censo, setCenso,
    estadoCivil, setEstadoCivil,
    corRaca, setCorRaca,
    sexo, setSexo,
    nascimento, setNascimento,
    nacionalidade, setNacionalidade,
    nacionalidadeEspec, setNacionalidadeEspec,
    telefone, setTelefone: (val: string) => setTelefone(formatTelefone(val)),
    mae, setMae,
    telMae, setTelMae: (val: string) => setTelMae(formatTelefone(val)),
    pai, setPai,
    telPai, setTelPai: (val: string) => setTelPai(formatTelefone(val)),
    rg, setRg,
    nis, setNis,
    cidadeNasc, setCidadeNasc,
    ufNasc, setUfNasc,
    rua, setRua,
    numero, setNumero,
    cep, setCep: handleCepChange,
    bairro, setBairro,
    cidadeEnd, setCidadeEnd,
    ufEnd, setUfEnd,
    areaLocalizacao, setAreaLocalizacao,
    areaDiferenciada, setAreaDiferenciada,
    
    // Validações e CEP
    isCpfValid,
    isFetchingCep,
    consultarCep,

    // GPS
    latitudeStr, setLatitudeStr,
    longitudeStr, setLongitudeStr,
    getLatitudeNumber,
    getLongitudeNumber,

    // Lógica geral
    resetPessoais,
    populatePessoais,
    formatCPF,
    formatCEP,
    formatTelefone,
    validateCPF,

    // ALIASES DE COMPATIBILIDADE (para evitar alterar JSX existente)
    // modal-funcionario aliases
    nomeMae: mae, setNomeMae: setMae,
    nomePai: pai, setNomePai: setPai,
    municipioNasc: cidadeNasc, setMunicipioNasc: setCidadeNasc,
    logradouro: rua, setLogradouro: setRua,
    cidade: cidadeEnd, setCidade: setCidadeEnd,
    ufResidencia: ufEnd, setUfResidencia: setUfEnd,
    areaResidencia: areaLocalizacao, setAreaResidencia: setAreaLocalizacao,
    latitude: getLatitudeNumber(), setLatitude: (val: number | null) => setLatitudeStr(val !== null ? String(val) : ''),
    longitude: getLongitudeNumber(), setLongitude: (val: number | null) => setLongitudeStr(val !== null ? String(val) : ''),
  }
}
