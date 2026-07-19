'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { usePessoaForm } from '@/hooks/usePessoaForm'
import { Cargo, Doencas, PosGraduacao, FuncionarioFormContextType, ModalFuncionarioProps } from '../types'

// Constante de sessão para cache-busting estável (evita flickering de imagem ao re-renderizar)
const sessionTimestamp = Date.now()

const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const sanitizeFileName = (name: string): { base: string; ext: string } => {
  const parts = name.split('.')
  const rawExt = parts.length > 1 ? parts.pop() : 'bin'
  const ext = String(rawExt).replace(/[^\w-]/g, '').toLowerCase()
  const base = parts.join('.').replace(/[^\w.-]/g, '_')
  return { base, ext }
}

interface UseFuncionarioFormStatesProps {
  props: ModalFuncionarioProps
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  activeTab: string
  setActiveTab: (tab: any) => void
}

export function useFuncionarioFormStates({
  props,
  isOpen,
  setIsOpen,
  activeTab,
  setActiveTab
}: UseFuncionarioFormStatesProps): FuncionarioFormContextType {
  const { funcionario, onSuccess, onOpenChange } = props
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const isEditing = !!funcionario
  const activeOpen = isOpen

  // Context/Form states
  const [empId, setEmpId] = useState('')
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  // Escola vinculada (auto-preenchida)
  const [escolaId, setEscolaId] = useState('')
  const [escolaNome, setEscolaNome] = useState('')
  const [escolaInep, setEscolaInep] = useState('')
  const [escolaLocalizacao, setEscolaLocalizacao] = useState('')

  // Hook para gerenciar os estados de dados pessoais e endereço
  const {
    nome, setNome,
    email, setEmail,
    cpf, setCpf,
    censo, setCenso,
    estadoCivil, setEstadoCivil,
    corRaca, setCorRaca,
    sexo, setSexo,
    nascimento, setNascimento,
    nacionalidade, setNacionalidade,
    nacionalidadeEspec, setNacionalidadeEspec,
    telefone, setTelefone,
    nomeMae, setNomeMae,
    nomePai, setNomePai,
    municipioNasc, setMunicipioNasc,
    ufNasc, setUfNasc,
    rg, setRg,
    nis, setNis,
    logradouro, setLogradouro,
    numero, setNumero,
    cep, setCep,
    bairro, setBairro,
    cidade, setCidade,
    ufResidencia, setUfResidencia,
    areaResidencia, setAreaResidencia,
    areaDiferenciada, setAreaDiferenciada,
    latitude, setLatitude,
    longitude, setLongitude,
    isCpfValid,
    isFetchingCep,
    consultarCep,
    resetPessoais,
    populatePessoais,
    formatCPF,
    formatCEP
  } = usePessoaForm({
    estadoCivilDefault: 'Não declarado',
    nacionalidadeDefault: 'Brasileira',
    ufNascDefault: '',
    sexoDefault: 'Não declarado',
    corRacaDefault: 'Não declarado',
    cidadeEndDefault: '',
    ufEndDefault: 'BA',
    areaLocalizacaoDefault: 'Urbana',
    areaDiferenciadaDefault: 'Não está em área diferenciada'
  })

  // Emprego
  const [cargo, setCargo] = useState('')
  const [funcaoEspec, setFuncaoEspec] = useState('')
  const [tipoVinculo, setTipoVinculo] = useState('Contratado')
  const [tipoVinculoEspec, setTipoVinculoEspec] = useState('')
  const [status, setStatus] = useState('ativo')

  // Saúde
  const [possuiDeficiencia, setPossuiDeficiencia] = useState(false)
  const [deficiencias, setDeficiencias] = useState<string[]>([])
  const [tea, setTea] = useState(false)
  const [altasHabilidades, setAltasHabilidades] = useState(false)

  // Doenças
  const [doencas, setDoencas] = useState<Doencas>({
    diabetes: false,
    convulsoes: false,
    asmaBronquite: false,
    infeccoes: false,
    cardiopatias: false,
    alergias: false,
    covid19: false,
    articulares: false,
    outra: ''
  })

  // Escolaridade
  const [escolaridadeNivel, setEscolaridadeNivel] = useState('Não concluiu o Ensino Fundamental')
  const [ensinoMedioTipo, setEnsinoMedioTipo] = useState('Formação Geral')

  // Superior
  const [superiorArea, setSuperiorArea] = useState('')
  const [superiorCodigo, setSuperiorCodigo] = useState('')
  const [superiorAno, setSuperiorAno] = useState('')
  const [superiorTipoInst, setSuperiorTipoInst] = useState('Pública')
  const [superiorGrau, setSuperiorGrau] = useState('Licenciatura')
  const [superiorInstituicao, setSuperiorInstituicao] = useState('')

  // Complementação pedagógica
  const [complementacaoPedagogica, setComplementacaoPedagogica] = useState('')

  // Pós-graduações (JSONB)
  const [posGraduacoes, setPosGraduacoes] = useState<PosGraduacao[]>([])

  // Outros cursos específicos
  const [outrosCursos, setOutrosCursos] = useState<string[]>([])

  // URLs de Documentos Anexados
  const [docIdentidadeUrl, setDocIdentidadeUrl] = useState('')
  const [docCpfUrl, setDocCpfUrl] = useState('')
  const [docCompResidenciaUrl, setDocCompResidenciaUrl] = useState('')
  const [docFundamentalUrl, setDocFundamentalUrl] = useState('')
  const [docMedioUrl, setDocMedioUrl] = useState('')
  const [docSuperiorUrl, setDocSuperiorUrl] = useState('')
  const [docPosUrl, setDocPosUrl] = useState('')
  const [docMestradoUrl, setDocMestradoUrl] = useState('')
  const [docDoutoradoUrl, setDocDoutoradoUrl] = useState('')

  // Observações
  const [observacoes, setObservacoes] = useState('')
  const [dataPreenchimento, setDataPreenchimento] = useState('')

  // Load cargos
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('cargos')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        if (data) setCargos(data)
      })
  }, [])

  // Load employee full details
  useEffect(() => {
    let active = true // Evita race conditions em cargas assíncronas concorrentes

    const fetchFuncionarioFull = async () => {
      if (activeOpen && funcionario?.id) {
        setLoadingData(true)
        const supabase = createClient()
        try {
          const { data, error } = await supabase
            .from('funcionarios')
            .select(`
              *,
              vinculos_funcionarios(
                escola_id,
                cargo,
                ativo,
                escolas(nome, inep, localizacao)
              )
            `)
            .eq('id', funcionario.id)
            .maybeSingle()

          if (error) throw error
          if (!active) return

          if (data) {
            setEmpId(data.id)
            setAuthUserId(data.auth_user_id || null)
            populatePessoais(data)
            setCargo(data.cargo ?? '')
            setFuncaoEspec(data.funcao_especifica ?? '')
            setTipoVinculo(data.tipo_vinculo ?? 'Contratado')
            setTipoVinculoEspec(data.tipo_vinculo_especificacao ?? '')
            setStatus(data.status ?? 'ativo')
            setPossuiDeficiencia(!!data.possui_deficiencia)
            setDeficiencias(data.deficiencias ?? [])
            setTea(!!data.tea)
            setAltasHabilidades(!!data.altas_habilidades)
            setDoencas({
              diabetes: !!data.doenca_diabetes,
              convulsoes: !!data.doenca_convulsoes,
              asmaBronquite: !!data.doenca_asma_bronquite,
              infeccoes: !!data.doenca_infeccoes,
              cardiopatias: !!data.doenca_cardiopatias,
              alergias: !!data.doenca_alergias,
              covid19: !!data.doenca_covid19,
              articulares: !!data.doenca_articulares,
              outra: data.doenca_outra ?? ''
            })
            setEscolaridadeNivel(data.escolaridade_nivel ?? 'Não concluiu o Ensino Fundamental')
            setEnsinoMedioTipo(data.ensino_medio_tipo ?? 'Formação Geral')
            setSuperiorArea(data.superior_area ?? '')
            setSuperiorCodigo(data.superior_codigo ?? '')
            setSuperiorAno(data.superior_ano_conclusao ? String(data.superior_ano_conclusao) : '')
            setSuperiorTipoInst(data.superior_tipo_instituicao ?? 'Pública')
            setSuperiorGrau(data.superior_grau ?? 'Licenciatura')
            setSuperiorInstituicao(data.superior_instituicao ?? '')
            setComplementacaoPedagogica(data.complementacao_pedagogica ?? '')
            setPosGraduacoes(Array.isArray(data.pos_graduacoes) ? (data.pos_graduacoes as any) : [])
            setOutrosCursos(data.outros_cursos ?? [])

            // Cache bust estável para foto
            const fotoComCacheBust = data.foto_url
              ? `${data.foto_url}${data.foto_url.includes('?') ? '&' : '?'}t=${sessionTimestamp}`
              : null
            setFotoPreview(fotoComCacheBust)

            setDocIdentidadeUrl(data.doc_identidade_url ?? '')
            setDocCpfUrl(data.doc_cpf_url ?? '')
            setDocCompResidenciaUrl(data.doc_comprovante_residencia_url ?? '')
            setDocFundamentalUrl(data.doc_ensino_fundamental_url ?? '')
            setDocMedioUrl(data.doc_ensino_medio_url ?? '')
            setDocSuperiorUrl(data.doc_curso_superior_url ?? '')
            setDocPosUrl(data.doc_pos_graduacao_url ?? '')
            setDocMestradoUrl(data.doc_mestrado_url ?? '')
            setDocDoutoradoUrl(data.doc_doutorado_url ?? '')
            setObservacoes(data.observacoes ?? '')
            setDataPreenchimento(data.data_preenchimento ?? '')

            // Escola vinculada ativa
            const activeVinc = (data.vinculos_funcionarios as any[])?.find((v) => v.ativo)
            if (activeVinc) {
              setEscolaId(activeVinc.escola_id)
              setEscolaNome(activeVinc.escolas?.nome ?? '')
              setEscolaInep(activeVinc.escolas?.inep ?? '')
              setEscolaLocalizacao(activeVinc.escolas?.localizacao ?? '')
            }
          }
        } catch (err) {
          console.error(err)
          toast.error('Erro ao buscar dados completos do funcionário.')
        } finally {
          if (active) setLoadingData(false)
        }
      } else if (activeOpen) {
        // Criando novo funcionário (UUID resiliente)
        const newUuid = generateUUID()
        setEmpId(newUuid)

        // Reset states
        resetPessoais()
        setCargo('')
        setFuncaoEspec('')
        setTipoVinculo('Contratado')
        setTipoVinculoEspec('')
        setStatus('ativo')
        setPossuiDeficiencia(false)
        setDeficiencias([])
        setTea(false)
        setAltasHabilidades(false)
        setDoencas({
          diabetes: false,
          convulsoes: false,
          asmaBronquite: false,
          infeccoes: false,
          cardiopatias: false,
          alergias: false,
          covid19: false,
          articulares: false,
          outra: ''
        })
        setEscolaridadeNivel('Não concluiu o Ensino Fundamental')
        setEnsinoMedioTipo('Formação Geral')
        setSuperiorArea('')
        setSuperiorCodigo('')
        setSuperiorAno('')
        setSuperiorTipoInst('Pública')
        setSuperiorGrau('Licenciatura')
        setSuperiorInstituicao('')
        setComplementacaoPedagogica('')
        setPosGraduacoes([])
        setOutrosCursos([])
        setFotoPreview(null)
        setFotoFile(null)
        setDocIdentidadeUrl('')
        setDocCpfUrl('')
        setDocCompResidenciaUrl('')
        setDocFundamentalUrl('')
        setDocMedioUrl('')
        setDocSuperiorUrl('')
        setDocPosUrl('')
        setDocMestradoUrl('')
        setDocDoutoradoUrl('')
        setObservacoes('')
        setDataPreenchimento(new Date().toISOString().split('T')[0])

        // Tentar autopreencher escola ativa logada
        const currentEscolaId = useAuthStore.getState().escolaAtivaId
        if (currentEscolaId) {
          const supabase = createClient()
          supabase
            .from('escolas')
            .select('id, nome, inep, localizacao')
            .eq('id', currentEscolaId)
            .single()
            .then(({ data }) => {
              if (!active) return
              if (data) {
                setEscolaId(data.id)
                setEscolaNome(data.nome)
                setEscolaInep(data.inep ?? '')
                setEscolaLocalizacao(data.localizacao ?? '')
              }
            })
        }
      }
    }

    fetchFuncionarioFull()

    return () => {
      active = false
    }
  }, [activeOpen, funcionario])

  // Foto handler
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setFotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Upload handler for documents
  const handleDocUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: string,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const supabase = createClient()
    try {
      const { ext } = sanitizeFileName(file.name)
      const path = `docs/${empId}/${docType}_${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(uploadData.path)

      setter(urlData.publicUrl)
      toast.success('Documento anexado com sucesso!')
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleDeficiencia = (val: string) => {
    if (deficiencias.includes(val)) {
      setDeficiencias(deficiencias.filter((d) => d !== val))
    } else {
      setDeficiencias([...deficiencias, val])
    }
  }

  const toggleOutroCurso = (val: string) => {
    if (outrosCursos.includes(val)) {
      setOutrosCursos(outrosCursos.filter((c) => c !== val))
    } else {
      if (val === 'Nenhum') {
        setOutrosCursos(['Nenhum'])
      } else {
        setOutrosCursos([...outrosCursos.filter((c) => c !== 'Nenhum'), val])
      }
    }
  }

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
    if (!val) {
      setFotoFile(null)
      setFotoPreview(null)
      setActiveTab('pessoais')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !email) {
      toast.error('Preencha os campos obrigatórios: Nome e E-mail.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      let foto_url: string | null = fotoPreview ? fotoPreview.split('?')[0] : null // Limpar timestamp se houver

      // Upload da foto 3x4 se houver arquivo novo
      if (fotoFile) {
        const { ext } = sanitizeFileName(fotoFile.name)
        const path = `${empId}/foto3x4_${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fotos-funcionarios')
          .upload(path, fotoFile, { upsert: true, cacheControl: '31536000' })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('fotos-funcionarios')
          .getPublicUrl(uploadData.path)

        foto_url = urlData.publicUrl
      }

      // Mitigação do Bug Silencioso de UX no Endereço: se os campos básicos de endereço estão vazios, limpa do banco (salva como null)
      const hasEnderecoPreenchido = !!(logradouro?.trim() || bairro?.trim() || cidade?.trim())
      const enderecoFinal = hasEnderecoPreenchido
        ? `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${ufResidencia}`
        : null

      const basePayload = {
        id: empId,
        nome,
        cpf: cpf || null,
        cargo: cargo || null,
        status,
        formacao: escolaridadeNivel || null,
        foto_url,
        data_nascimento: nascimento || null,
        endereco: enderecoFinal,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        censo: censo || null,
        estado_civil: estadoCivil || null,
        cor_raca: corRaca || null,
        sexo: sexo || null,
        nome_mae: nomeMae || null,
        nome_pai: nomePai || null,
        nacionalidade: nacionalidade || null,
        nacionalidade_especificacao: nacionalidadeEspec || null,
        municipio_nascimento: municipioNasc || null,
        uf_nascimento: ufNasc || null,
        rg: rg || null,
        nis: nis || null,
        logradouro: logradouro || null,
        numero: numero || null,
        cep: cep || null,
        bairro: bairro || null,
        cidade: cidade || null,
        uf_residencia: ufResidencia || null,
        area_residencia: areaResidencia || null,
        area_diferenciada: areaDiferenciada || null,
        funcao_especifica: funcaoEspec || null,
        tipo_vinculo: tipoVinculo || null,
        tipo_vinculo_especificacao: tipoVinculoEspec || null,
        possui_deficiencia: possuiDeficiencia,
        deficiencias: deficiencias.length > 0 ? deficiencias : null,
        tea,
        altas_habilidades: altasHabilidades,
        doenca_diabetes: doencas.diabetes,
        doenca_convulsoes: doencas.convulsoes,
        doenca_asma_bronquite: doencas.asmaBronquite,
        doenca_infeccoes: doencas.infeccoes,
        doenca_cardiopatias: doencas.cardiopatias,
        doenca_alergias: doencas.alergias,
        doenca_covid19: doencas.covid19,
        doenca_articulares: doencas.articulares,
        doenca_outra: doencas.outra || null,
        escolaridade_nivel: escolaridadeNivel || null,
        ensino_medio_tipo: ensinoMedioTipo || null,
        superior_area: superiorArea || null,
        superior_codigo: superiorCodigo || null,
        superior_ano_conclusao: superiorAno ? parseInt(superiorAno) : null,
        superior_tipo_instituicao: superiorTipoInst || null,
        superior_grau: superiorGrau || null,
        superior_instituicao: superiorInstituicao || null,
        complementacao_pedagogica: complementacaoPedagogica || null,
        pos_graduacoes: posGraduacoes as any,
        outros_cursos: outrosCursos.length > 0 ? outrosCursos : null,
        doc_identidade_url: docIdentidadeUrl || null,
        doc_cpf_url: docCpfUrl || null,
        doc_comprovante_residencia_url: docCompResidenciaUrl || null,
        doc_ensino_fundamental_url: docFundamentalUrl || null,
        doc_ensino_medio_url: docMedioUrl || null,
        doc_curso_superior_url: docSuperiorUrl || null,
        doc_pos_graduacao_url: docPosUrl || null,
        doc_mestrado_url: docMestradoUrl || null,
        doc_doutorado_url: docDoutoradoUrl || null,
        observacoes: observacoes || null,
        data_preenchimento: dataPreenchimento || null,
      }

      if (isEditing && funcionario) {
        const { error } = await supabase
          .from('funcionarios')
          .update(basePayload)
          .eq('id', funcionario.id)
        if (error) throw error
        toast.success('Funcionário atualizado com sucesso!')

        if (authUserId) {
          const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
          await invalidarCachePerfil(authUserId)
        }
      } else {
        const cleanEmail = email.trim().toLowerCase()
        const { error } = await supabase
          .from('funcionarios')
          .insert({ ...basePayload, email: cleanEmail, is_superadmin: false })
        if (error) throw error

        // Criar vínculo de funcionário na escola logada automaticamente
        if (escolaId) {
          const { error: vincError } = await supabase
            .from('vinculos_funcionarios')
            .insert({
              funcionario_id: empId,
              escola_id: escolaId,
              cargo: cargo || null,
              ativo: true,
              data_inicio: new Date().toISOString().split('T')[0]
            })
          if (vincError) console.error('Erro ao vincular escola:', vincError)
        }

        toast.success('Funcionário cadastrado e vinculado com sucesso!')
      }

      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar funcionário: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return {
    isEditing,
    funcionario,
    loading,
    loadingData,
    cargos,
    empId,
    authUserId,
    escolaId,
    setEscolaId,
    escolaNome,
    escolaInep,
    escolaLocalizacao,
    nome, setNome,
    email, setEmail,
    cpf, setCpf,
    censo, setCenso,
    estadoCivil, setEstadoCivil,
    corRaca, setCorRaca,
    sexo, setSexo,
    nascimento, setNascimento,
    nacionalidade, setNacionalidade,
    nacionalidadeEspec, setNacionalidadeEspec,
    telefone, setTelefone,
    nomeMae, setNomeMae,
    nomePai, setNomePai,
    municipioNasc, setMunicipioNasc,
    ufNasc, setUfNasc,
    rg, setRg,
    nis, setNis,
    logradouro, setLogradouro,
    numero, setNumero,
    cep, setCep,
    bairro, setBairro,
    cidade, setCidade,
    ufResidencia, setUfResidencia,
    areaResidencia, setAreaResidencia,
    areaDiferenciada, setAreaDiferenciada,
    latitude, setLatitude,
    longitude, setLongitude,
    formatCPF,
    formatCEP,
    isCpfValid,
    isFetchingCep,
    consultarCep,

    cargo, setCargo,
    funcaoEspec, setFuncaoEspec,
    tipoVinculo, setTipoVinculo,
    tipoVinculoEspec, setTipoVinculoEspec,
    status, setStatus,
    possuiDeficiencia, setPossuiDeficiencia,
    deficiencias, setDeficiencias,
    tea, setTea,
    altasHabilidades, setAltasHabilidades,
    doencas, setDoencas,
    toggleDeficiencia,
    escolaridadeNivel, setEscolaridadeNivel,
    ensinoMedioTipo, setEnsinoMedioTipo,
    superiorArea, setSuperiorArea,
    superiorCodigo, setSuperiorCodigo,
    superiorAno, setSuperiorAno,
    superiorTipoInst, setSuperiorTipoInst,
    superiorGrau, setSuperiorGrau,
    superiorInstituicao, setSuperiorInstituicao,
    complementacaoPedagogica, setComplementacaoPedagogica,
    posGraduacoes, setPosGraduacoes,
    outrosCursos, setOutrosCursos,
    toggleOutroCurso,
    docIdentidadeUrl, setDocIdentidadeUrl,
    docCpfUrl, setDocCpfUrl,
    docCompResidenciaUrl, setDocCompResidenciaUrl,
    docFundamentalUrl, setDocFundamentalUrl,
    docMedioUrl, setDocMedioUrl,
    docSuperiorUrl, setDocSuperiorUrl,
    docPosUrl, setDocPosUrl,
    docMestradoUrl, setDocMestradoUrl,
    docDoutoradoUrl, setDocDoutoradoUrl,
    observacoes, setObservacoes,
    dataPreenchimento, setDataPreenchimento,
    fotoFile, setFotoFile,
    fotoPreview, setFotoPreview,
    handleFotoChange,
    handleSubmit,
    handleDocUpload,
    handleOpenChange
  }
}
