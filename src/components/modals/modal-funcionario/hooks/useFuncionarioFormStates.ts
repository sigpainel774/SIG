'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { usePessoaForm } from '@/hooks/usePessoaForm'
import { Cargo, Doencas, PosGraduacao, FuncionarioFormContextType, ModalFuncionarioProps } from '../types'
import { invalidarCacheFoto } from '@/lib/photoCache'
import { verificarEAtualizarRetornosAfastamentos } from '@/lib/afastamentosHelper'
import { getVisualizacaoUrl, getAvatarUrl } from '@/lib/photoHelper'

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
  const [fotoRemovidaManualmente, setFotoRemovidaManualmente] = useState(false)
  const [lotacoesModalOpen, setLotacoesModalOpen] = useState(false)

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
    apelido, setApelido,
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
    latitudeStr, setLatitudeStr,
    longitudeStr, setLongitudeStr,
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
  const [cargaHoraria, setCargaHoraria] = useState('')
  const [funcaoEspec, setFuncaoEspec] = useState('')
  const [tipoVinculo, setTipoVinculo] = useState('Contratado')
  const [tipoVinculoEspec, setTipoVinculoEspec] = useState('')
  const [modalidadeEnsino, setModalidadeEnsino] = useState('Regular')
  const [dataAdmissao, setDataAdmissao] = useState('')
  const [status, setStatus] = useState('ativo')
  const [isProfissionalAee, setIsProfissionalAee] = useState(false)

  // Licença Médica & Afastamento

  const [cid, setCid] = useState('')
  const [diasAfastamento, setDiasAfastamento] = useState('1')
  const [dataFimAfastamento, setDataFimAfastamento] = useState('')
  const [atestadoFile, setAtestadoFile] = useState<File | null>(null)
  const [atestadoAnexoExistenteUrl, setAtestadoAnexoExistenteUrl] = useState<string | null>(null)

  // Contato extra
  const [telefoneEmergencia, setTelefoneEmergencia] = useState('')
  const [registroProfissional, setRegistroProfissional] = useState('')

  // Saúde
  const [possuiDeficiencia, setPossuiDeficiencia] = useState(false)
  const [deficiencias, setDeficiencias] = useState<string[]>([])
  const [tea, setTea] = useState(false)
  const [altasHabilidades, setAltasHabilidades] = useState(false)
  const [tipoSanguineo, setTipoSanguineo] = useState('Não informado')

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

  // Superior & Graduações
  const [superiorArea, setSuperiorArea] = useState('')
  const [superiorCodigo, setSuperiorCodigo] = useState('')
  const [superiorAno, setSuperiorAno] = useState('')
  const [superiorTipoInst, setSuperiorTipoInst] = useState('Pública')
  const [superiorGrau, setSuperiorGrau] = useState('Licenciatura')
  const [superiorInstituicao, setSuperiorInstituicao] = useState('')
  const [graduacoes, setGraduacoes] = useState<import('../types').Graduacao[]>([])

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
    let isMounted = true
    const supabase = createClient()
    supabase
      .from('cargos')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        if (isMounted && data) setCargos(data)
      })
    return () => {
      isMounted = false
    }
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
                carga_horaria,
                modalidade_ensino,
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
            setTelefoneEmergencia(data.telefone_emergencia ?? '')
            setRegistroProfissional((data as any).registro_profissional ?? '')
            setDataAdmissao(data.data_admissao ?? '')
            setTipoSanguineo(data.tipo_sanguineo ?? 'Não informado')
            setCargo(data.cargo ?? '')
            setFuncaoEspec(data.funcao_especifica ?? '')
            setTipoVinculo(data.tipo_vinculo ?? 'Contratado')
            setTipoVinculoEspec(data.tipo_vinculo_especificacao ?? '')
            setModalidadeEnsino(data.modalidade_ensino ?? 'Regular')
            setStatus(data.status ?? 'ativo')
            setIsProfissionalAee(!!data.is_profissional_aee)
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

            // Carregamento resiliente de Graduações (Migração automática de legados)
            const rawGrads = Array.isArray(data.graduacoes) ? data.graduacoes : []
            if (rawGrads.length > 0) {
              setGraduacoes(rawGrads.map((g: any) => ({
                area: g.area ?? '',
                codigo: g.codigo ?? '',
                ano: g.ano ?? '',
                tipoInstituicao: g.tipoInstituicao ?? 'Pública',
                grau: g.grau ?? 'Licenciatura',
                instituicao: g.instituicao ?? '',
                situacao: g.situacao ?? 'Concluído'
              })))
            } else if (data.superior_area || data.superior_instituicao) {
              setGraduacoes([{
                area: data.superior_area ?? '',
                codigo: data.superior_codigo ?? '',
                ano: data.superior_ano_conclusao ? String(data.superior_ano_conclusao) : '',
                tipoInstituicao: data.superior_tipo_instituicao ?? 'Pública',
                grau: data.superior_grau ?? 'Licenciatura',
                instituicao: data.superior_instituicao ?? '',
                situacao: 'Concluído'
              }])
            } else {
              setGraduacoes([])
            }

            setComplementacaoPedagogica(data.complementacao_pedagogica ?? '')
            
            // Carregamento de Pós-Graduações com fallback de situação
            const rawPos = Array.isArray(data.pos_graduacoes) ? data.pos_graduacoes : []
            setPosGraduacoes(rawPos.map((p: any) => ({
              tipo: p.tipo ?? 'Especialização',
              area: p.area ?? '',
              ano: p.ano ?? '',
              situacao: p.situacao ?? 'Concluído'
            })))

            setOutrosCursos(data.outros_cursos ?? [])

            // Cache bust estável para foto (resolve via foto_visualizacao_path, foto_avatar_path ou foto_url)
            const rawFotoUrl = getVisualizacaoUrl(data) || getAvatarUrl(data) || data.foto_url || null
            const fotoComCacheBust = rawFotoUrl
              ? `${rawFotoUrl.split('?')[0]}?t=${sessionTimestamp}`
              : null
            setFotoPreview(fotoComCacheBust)
            setFotoRemovidaManualmente(false)

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

            // Carregar atestado mais recente vinculado ao funcionário
            const { data: latestAtestado } = await (supabase.from as any)('atestados')
              .select('*')
              .eq('funcionario_id', data.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (latestAtestado && active) {
              setCid(latestAtestado.cid ?? '')
              setDiasAfastamento(latestAtestado.dias_afastamento ? String(latestAtestado.dias_afastamento) : '1')
              if (latestAtestado.data_fim) {
                setDataFimAfastamento(latestAtestado.data_fim)
              } else if (latestAtestado.data_inclusao && latestAtestado.dias_afastamento) {
                const dt = new Date(latestAtestado.data_inclusao)
                dt.setDate(dt.getDate() + (latestAtestado.dias_afastamento - 1))
                setDataFimAfastamento(dt.toISOString().split('T')[0])
              } else {
                setDataFimAfastamento('')
              }
              setAtestadoAnexoExistenteUrl(latestAtestado.anexo_url ?? null)
            } else if (active) {
              setCid('')
              setDiasAfastamento('1')
              setDataFimAfastamento('')
              setAtestadoAnexoExistenteUrl(null)
            }
            setAtestadoFile(null)

            // Escola vinculada ativa (priorizando a escola atual ou primeira ativa)
            const activeVinc = (data.vinculos_funcionarios as any[])?.find((v) => v.ativo && v.escola_id === escolaId) || (data.vinculos_funcionarios as any[])?.find((v) => v.ativo)
            if (activeVinc) {
              setEscolaId(activeVinc.escola_id)
              setEscolaNome(activeVinc.escolas?.nome ?? '')
              setEscolaInep(activeVinc.escolas?.inep ?? '')
              setEscolaLocalizacao(activeVinc.escolas?.localizacao ?? '')
              setCargaHoraria(activeVinc.carga_horaria !== null && activeVinc.carga_horaria !== undefined ? String(activeVinc.carga_horaria) : '')
              if (activeVinc.modalidade_ensino) {
                setModalidadeEnsino(activeVinc.modalidade_ensino)
              }
            } else {
              setCargaHoraria('')
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
        setTelefoneEmergencia('')
        setRegistroProfissional('')
        setDataAdmissao('')
        setTipoSanguineo('Não informado')
        setCargo('')
        setCargaHoraria('')
        setFuncaoEspec('')
        setTipoVinculo('Contratado')
        setTipoVinculoEspec('')
        setModalidadeEnsino('Regular')
        setStatus('ativo')
        setIsProfissionalAee(false)
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
        setGraduacoes([])
        setComplementacaoPedagogica('')
        setPosGraduacoes([])
        setOutrosCursos([])
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
        setCid('')
        setDiasAfastamento('1')
        setDataFimAfastamento('')
        setAtestadoFile(null)
        setAtestadoAnexoExistenteUrl(null)

        // Tentar autopreencher escola ativa logada ou da secretaria ativa
        const currentEscolaId = useAuthStore.getState().escolaAtivaId || useSchoolStore.getState().selectedEscola?.id
        const escolasList = useSchoolStore.getState().escolas
        const selectedSec = useSchoolStore.getState().selectedSecretaria

        let targetIdToUse = currentEscolaId
        if (!targetIdToUse && selectedSec) {
          const secId = selectedSec.id
          const secNome = (selectedSec.nome || '').toLowerCase()
          const matching = escolasList.filter(e => {
            if (secId && e.secretaria_id === secId) return true
            if (secNome && (e.secretariaNome?.toLowerCase().includes(secNome) || (e.secretarias as any)?.nome?.toLowerCase().includes(secNome))) return true
            return false
          })
          if (matching.length > 0) {
            targetIdToUse = matching[0].id
          }
        } 
        
        // Fallback garantido se a secretaria não gerou match e ainda estivermos sem ID
        if (!targetIdToUse && escolasList.length > 0) {
          targetIdToUse = escolasList[0].id
        }

        if (targetIdToUse) {
          const found = escolasList.find(e => e.id === targetIdToUse)
          if (found) {
            setEscolaId(found.id)
            setEscolaNome(found.nome)
            setEscolaInep(found.inep ? String(found.inep) : '')
            setEscolaLocalizacao(found.localizacao ?? '')
          } else {
            const supabase = createClient()
            supabase
              .from('escolas')
              .select('id, nome, inep, localizacao')
              .eq('id', targetIdToUse)
              .single()
              .then(({ data }) => {
                if (!active) return
                if (data) {
                  setEscolaId(data.id)
                  setEscolaNome(data.nome)
                  setEscolaInep(data.inep ? String(data.inep) : '')
                  setEscolaLocalizacao(data.localizacao ?? '')
                }
              })
          }
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
    setFotoRemovidaManualmente(false)
    const reader = new FileReader()
    reader.onload = () => setFotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoverFoto = () => {
    setFotoFile(null)
    setFotoPreview(null)
    setFotoRemovidaManualmente(true)
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
      setFotoRemovidaManualmente(false)
      setActiveTab('pessoais')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()

    // Verificação de Restrição Global da Rede (< Nível 1)
    const { funcionario: usuarioLogado, acessos, isAdminGlobalOrRoot } = useAuthStore.getState()
    const isLevel1 = usuarioLogado?.is_superadmin || (isAdminGlobalOrRoot && isAdminGlobalOrRoot()) || acessos?.some((a: any) => a.nivel === 1 && a.ativo)

    if (!isLevel1) {
      try {
        const { data: configRede, error } = await supabase
          .from('configuracoes_rede')
          .select('bloquear_edicao_funcionarios_rede')
          .limit(1)
          .single()

        // Fail-open: se houver erro de rede/conexão, loga aviso mas NÃO bloqueia o usuário.
        // A query serve apenas para verificar se o sistema está BLOQUEADO = true.
        // Em caso de falha de conectividade, assume-se que não há bloqueio ativo.
        if (error) {
          console.warn('[useFuncionarioFormStates] Aviso: não foi possível verificar restrição global da rede. Continuando com o submit.', error)
        } else if (configRede?.bloquear_edicao_funcionarios_rede) {
          toast.error('A edição de ficha de funcionários foi temporariamente bloqueada pela gestão da rede.')
          return
        }
      } catch (err) {
        // Fail-open: erro inesperado também não bloqueia
        console.warn('[useFuncionarioFormStates] Aviso inesperado ao verificar restrição global. Continuando.', err)
      }
    }

    if (!nome || !email) {
      toast.error('Preencha os campos obrigatórios: Nome e E-mail.')
      return
    }

    setLoading(true)

    try {
      // A foto só é zerada do banco se o usuário tiver removido manualmente a imagem prévia
      const isFotoRemoved = fotoRemovidaManualmente && !fotoFile

      // Mitigação do Bug Silencioso de UX no Endereço: se os campos básicos de endereço estão vazios, limpa do banco (salva como null)
      const hasEnderecoPreenchido = !!(logradouro?.trim() || bairro?.trim() || cidade?.trim())
      const enderecoFinal = hasEnderecoPreenchido
        ? `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${ufResidencia}`
        : null

      const cleanEmail = email.trim().toLowerCase()

      const basePayload: any = {
        nome,
        email: cleanEmail,
        cpf: cpf || null,
        cargo: cargo || null,
        registro_profissional: registroProfissional || null,
        status,
        is_profissional_aee: isProfissionalAee,
        formacao: escolaridadeNivel || null,

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
        apelido: apelido?.trim() || null,
        telefone: telefone?.trim() || null,
        telefone_emergencia: telefoneEmergencia?.trim() || null,
        data_admissao: dataAdmissao || null,
        tipo_sanguineo: tipoSanguineo || null,
        modalidade_ensino: modalidadeEnsino || 'Regular',
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

        // Graduações (JSONB e espelhamento em superior_*)
        graduacoes: graduacoes as any,
        superior_area: graduacoes[0]?.area || superiorArea || null,
        superior_codigo: graduacoes[0]?.codigo || superiorCodigo || null,
        superior_ano_conclusao: graduacoes[0]?.ano ? parseInt(graduacoes[0].ano) : (superiorAno ? parseInt(superiorAno) : null),
        superior_tipo_instituicao: graduacoes[0]?.tipoInstituicao || superiorTipoInst || null,
        superior_grau: graduacoes[0]?.grau || superiorGrau || null,
        superior_instituicao: graduacoes[0]?.instituicao || superiorInstituicao || null,

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
        is_superadmin: false,
        data_preenchimento: dataPreenchimento || null
      } as any

      if (isFotoRemoved) {
        basePayload.foto_url = null
        basePayload.foto_avatar_path = null
        basePayload.foto_visualizacao_path = null
        basePayload.foto_original_path = null
      }

      // Verificar se o e-mail já existe no banco de dados
      const { data: existingFunc } = await supabase
        .from('funcionarios')
        .select('id, email, auth_user_id')
        .eq('email', cleanEmail)
        .maybeSingle()

      const foundExistingId = (existingFunc as any)?.id as string | undefined

      if (isEditing && funcionario) {
        // Se estiver editando e o e-mail pertencer a OUTRO funcionário
        if (existingFunc && (existingFunc as any).id !== funcionario.id) {
          toast.error('Este e-mail já está cadastrado para outro funcionário no sistema.')
          setLoading(false)
          return
        }

        const { error } = await supabase
          .from('funcionarios')
          .update(basePayload)
          .eq('id', funcionario.id)
        if (error) throw error

        // Sincronizar o cargo, carga horária (ex: 20h) e modalidade no vínculo de lotação ativo
        const rawCargaDigits = cargaHoraria ? String(cargaHoraria).replace(/\D/g, '') : ''
        const parsedCarga = rawCargaDigits.length > 0 && !isNaN(Number(rawCargaDigits))
          ? parseInt(rawCargaDigits, 10)
          : null

        const currentEscolaId = escolaId || useAuthStore.getState().escolaAtivaId || null

        if (currentEscolaId) {
          const { data: existingVinc } = await supabase
            .from('vinculos_funcionarios')
            .select('id')
            .eq('funcionario_id', funcionario.id)
            .eq('escola_id', currentEscolaId)
            .maybeSingle()

          if (existingVinc) {
            await supabase
              .from('vinculos_funcionarios')
              .update({
                cargo: cargo || null,
                carga_horaria: parsedCarga,
                modalidade_ensino: modalidadeEnsino || 'Regular',
                ativo: true
              })
              .eq('id', existingVinc.id)
          } else {
            await supabase
              .from('vinculos_funcionarios')
              .insert({
                funcionario_id: funcionario.id,
                escola_id: currentEscolaId,
                cargo: cargo || null,
                carga_horaria: parsedCarga,
                modalidade_ensino: modalidadeEnsino || 'Regular',
                ativo: true,
                data_inicio: new Date().toISOString().split('T')[0]
              })
          }
        } else {
          await supabase
            .from('vinculos_funcionarios')
            .update({
              cargo: cargo || null,
              carga_horaria: parsedCarga,
              modalidade_ensino: modalidadeEnsino || 'Regular'
            })
            .eq('funcionario_id', funcionario.id)
            .eq('ativo', true)
        }

        const loggedUser = useAuthStore.getState().funcionario
        fetch('/api/audit/log-e-notificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escolaId: escolaId || null,
            titulo: 'Ficha de Funcionário Alterada',
            mensagem: `${loggedUser?.nome ?? 'Secretaria'} editou a ficha do funcionário ${nome}.`,
            tipoNotificacao: 'edicao_ficha',
            entidade: 'funcionarios',
            entidadeId: funcionario.id,
            acao: 'UPDATE',
            executadoPor: {
              id: loggedUser?.id ?? null,
              name: loggedUser?.nome ?? 'Usuário',
              email: loggedUser?.email ?? 'sem-email@sig.com',
              cargo: loggedUser?.cargo ?? undefined
            },
            oldData: { nome: funcionario.nome },
            newData: { nome, cargo }
          })
        }).catch(err => console.error('Erro ao notificar diretor:', err))

        // --- INÍCIO UPLOAD OTIMIZADO DE FOTO (FASE 3 - EDIÇÃO) ---
        if (fotoFile) {
          const resUrl = await fetch(`/api/fotos/presigned-url?entity=funcionarios&fileName=${encodeURIComponent(fotoFile.name)}`)
          const dataUrl = await resUrl.json()
          if (!resUrl.ok) throw new Error(dataUrl.error || 'Erro ao gerar permissão de upload da foto.')

          const uploadRes = await fetch(dataUrl.signedUrl, {
            method: 'PUT',
            body: fotoFile,
            headers: { 'Content-Type': fotoFile.type }
          })
          if (!uploadRes.ok) throw new Error('Erro ao enviar o arquivo de foto.')

          const processRes = await fetch('/api/fotos/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'funcionarios', id: funcionario.id, originalPath: dataUrl.path })
          })
          if (!processRes.ok) throw new Error('Erro ao otimizar e salvar as variações da foto.')

          // Invalida o cache local do navegador para que a nova foto apareça imediatamente
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
          await invalidarCacheFoto(`${supabaseUrl}/storage/v1/object/public/fotos-avatar/${funcionario.foto_avatar_path}`)
          await invalidarCacheFoto(`${supabaseUrl}/storage/v1/object/public/fotos-visualizacao/${funcionario.foto_visualizacao_path}`)
          await invalidarCacheFoto(funcionario.foto_url)
        }
        // --- FIM UPLOAD OTIMIZADO ---

        toast.success('Funcionário atualizado com sucesso!')

        if (authUserId) {
          const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
          await invalidarCachePerfil(authUserId)
        }

        // Sincronizar store global em tempo real se o usuário alterou o próprio perfil
        if (loggedUser && loggedUser.id === funcionario.id) {
          useAuthStore.getState().setAuth(
            { ...loggedUser, nome, email: cleanEmail, cargo, foto_url: basePayload.foto_url ?? loggedUser.foto_url },
            useAuthStore.getState().acessos,
            useAuthStore.getState().vinculos
          )
        }

      } else {
        // Se não estiver editando (novo cadastro), mas o funcionário já existir no Supabase por e-mail
        const targetId = foundExistingId || empId

        if (foundExistingId) {
          // Atualiza a ficha do funcionário que já havia sido criado no Supabase
          const { error } = await supabase
            .from('funcionarios')
            .update(basePayload)
            .eq('id', targetId)
          if (error) throw error
        } else {
          // Cria novo registro de funcionário
          const { error } = await supabase
            .from('funcionarios')
            .insert({ ...basePayload, id: empId, is_superadmin: false })
          if (error) throw error
        }

        // --- INÍCIO UPLOAD OTIMIZADO DE FOTO (FASE 3) ---
        if (fotoFile) {
          const idParaFoto = targetId
          
          // 1. Solicita a Signed URL do bucket privado
          const resUrl = await fetch(`/api/fotos/presigned-url?entity=funcionarios&fileName=${encodeURIComponent(fotoFile.name)}`)
          const dataUrl = await resUrl.json()
          if (!resUrl.ok) throw new Error(dataUrl.error || 'Erro ao gerar permissão de upload da foto.')

          // 2. Faz o upload direto
          const uploadRes = await fetch(dataUrl.signedUrl, {
            method: 'PUT',
            body: fotoFile,
            headers: { 'Content-Type': fotoFile.type }
          })
          if (!uploadRes.ok) throw new Error('Erro ao enviar o arquivo de foto.')

          // 3. Manda processar e atualizar o banco
          const processRes = await fetch('/api/fotos/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'funcionarios', id: idParaFoto, originalPath: dataUrl.path })
          })
          if (!processRes.ok) throw new Error('Erro ao otimizar e salvar as variações da foto.')

          // Invalida o cache local do navegador para que a nova foto apareça imediatamente (cadastro novo)
          // Para cadastro novo o funcionário ainda não tem foto antiga, mas limpamos por precaução
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nijjizpcodnjhvqwjuso.supabase.co'
          const oldAvatarPath = (funcionario as any)?.foto_avatar_path
          const oldVisPath = (funcionario as any)?.foto_visualizacao_path
          const oldFotoUrl = (funcionario as any)?.foto_url
          if (oldAvatarPath) await invalidarCacheFoto(`${supabaseUrl}/storage/v1/object/public/fotos-avatar/${oldAvatarPath}`)
          if (oldVisPath) await invalidarCacheFoto(`${supabaseUrl}/storage/v1/object/public/fotos-visualizacao/${oldVisPath}`)
          if (oldFotoUrl) await invalidarCacheFoto(oldFotoUrl)
        }
        // --- FIM UPLOAD OTIMIZADO ---

        // Criar ou garantir vínculo de funcionário na escola logada automaticamente
        if (escolaId) {
          const parsedCarga = cargaHoraria.trim() !== '' && !isNaN(Number(cargaHoraria.trim())) ? parseInt(cargaHoraria.trim(), 10) : null

          const { data: existingVinc } = await supabase
            .from('vinculos_funcionarios')
            .select('id')
            .eq('funcionario_id', targetId)
            .eq('escola_id', escolaId)
            .maybeSingle()

          if (!existingVinc) {
            const { error: vincError } = await supabase
              .from('vinculos_funcionarios')
              .insert({
                funcionario_id: targetId,
                escola_id: escolaId,
                cargo: cargo || null,
                carga_horaria: parsedCarga,
                ativo: true,
                data_inicio: new Date().toISOString().split('T')[0]
              })
            if (vincError) console.error('Erro ao vincular escola:', vincError)
          } else {
            await supabase
              .from('vinculos_funcionarios')
              .update({ ativo: true, cargo: cargo || null, carga_horaria: parsedCarga })
              .eq('id', existingVinc.id)
          }
        }

        const loggedUser = useAuthStore.getState().funcionario
        fetch('/api/audit/log-e-notificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escolaId: escolaId || null,
            titulo: 'Novo Funcionário Vinculado',
            mensagem: `${loggedUser?.nome ?? 'Secretaria'} cadastrou/vinculou o funcionário ${nome}.`,
            tipoNotificacao: 'funcionario_matriculado',
            entidade: 'funcionarios',
            entidadeId: targetId,
            acao: 'CREATE',
            executadoPor: {
              id: loggedUser?.id ?? null,
              name: loggedUser?.nome ?? 'Usuário',
              email: loggedUser?.email ?? 'sem-email@sig.com',
              cargo: loggedUser?.cargo ?? undefined
            },
            newData: { nome, cargo }
          })
        }).catch(err => console.error('Erro ao notificar diretor:', err))

        // Se o status for afastado e CID tiver sido preenchido, salva/atualiza o atestado médico
        const targetIdForAtestado = (funcionario as any)?.id || targetId
        if (status === 'afastado' && cid.trim()) {
          let anexoUrl = atestadoAnexoExistenteUrl
          let anexoNome = atestadoAnexoExistenteUrl ? 'Atestado Anexado' : null

          if (atestadoFile) {
            const fileExt = atestadoFile.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `atestados/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('anexos')
              .upload(filePath, atestadoFile, { upsert: true })

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('anexos')
                .getPublicUrl(filePath)

              anexoUrl = publicUrl
              anexoNome = atestadoFile.name
            }
          }

          const parsedDias = parseInt(diasAfastamento, 10) || 1
          const escolaAtestadoId = escolaId || useAuthStore.getState().escolaAtivaId || null

          // Verificar se já existe atestado para este funcionário
          const { data: existingAtestado } = await (supabase.from as any)('atestados')
            .select('id')
            .eq('funcionario_id', targetIdForAtestado)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const atestadoPayload = {
            funcionario_id: targetIdForAtestado,
            cid: cid.trim().toUpperCase(),
            dias_afastamento: parsedDias,
            data_fim: dataFimAfastamento || null,
            escola_id: escolaAtestadoId,
            status: 'Pendente',
            anexo_url: anexoUrl,
            anexo_nome: anexoNome
          }

          if (existingAtestado) {
            await (supabase.from as any)('atestados')
              .update(atestadoPayload)
              .eq('id', (existingAtestado as any).id)
          } else {
            await (supabase.from as any)('atestados')
              .insert(atestadoPayload)
          }
        }

        // Executar rotina de verificação de retorno à ativa
        verificarEAtualizarRetornosAfastamentos(supabase).catch((e) => console.error(e))

        const temAfastamento = status === 'afastado' && Boolean(cid.trim())
        if (existingFunc || isEditing) {
          toast.success(temAfastamento ? 'Ficha cadastral e dados de afastamento atualizados com sucesso!' : 'Ficha cadastral atualizada com sucesso!')
        } else {
          toast.success(temAfastamento ? 'Funcionário cadastrado e afastamento registrado com sucesso!' : 'Funcionário cadastrado com sucesso!')
        }
      }

      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Erro ao salvar funcionário:', err)
      if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('funcionarios_email_key')) {
        toast.error('Este e-mail já está cadastrado para outro funcionário no sistema.')
      } else {
        toast.error(`Erro ao salvar funcionário: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEscolaChange = (selectedId: string) => {
    setEscolaId(selectedId)
    const escolasList = useSchoolStore.getState().escolas
    const found = escolasList.find((e) => e.id === selectedId)
    if (found) {
      setEscolaNome(found.nome)
      setEscolaInep(found.inep ? String(found.inep) : '')
      setEscolaLocalizacao(found.localizacao ?? '')
    } else {
      setEscolaNome('')
      setEscolaInep('')
      setEscolaLocalizacao('')
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
    handleEscolaChange,
    nome, setNome,
    apelido, setApelido,
    email, setEmail,
    cpf, setCpf,
    registroProfissional, setRegistroProfissional,
    censo, setCenso,
    estadoCivil, setEstadoCivil,
    corRaca, setCorRaca,
    sexo, setSexo,
    nascimento, setNascimento,
    nacionalidade, setNacionalidade,
    nacionalidadeEspec, setNacionalidadeEspec,
    telefone, setTelefone,
    telefoneEmergencia, setTelefoneEmergencia,
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
    latitudeStr, setLatitudeStr,
    longitudeStr, setLongitudeStr,
    formatCPF,
    formatCEP,
    isCpfValid,
    isFetchingCep,
    consultarCep,

    cargo, setCargo,
    cargaHoraria, setCargaHoraria,
    funcaoEspec, setFuncaoEspec,
    tipoVinculo, setTipoVinculo,
    tipoVinculoEspec, setTipoVinculoEspec,
    modalidadeEnsino, setModalidadeEnsino,
    dataAdmissao, setDataAdmissao,
    status, setStatus,
    isProfissionalAee, setIsProfissionalAee,
    cid, setCid,

    diasAfastamento, setDiasAfastamento,
    dataFimAfastamento, setDataFimAfastamento,
    atestadoFile, setAtestadoFile,
    atestadoAnexoExistenteUrl, setAtestadoAnexoExistenteUrl,
    possuiDeficiencia, setPossuiDeficiencia,
    deficiencias, setDeficiencias,
    tea, setTea,
    altasHabilidades, setAltasHabilidades,
    tipoSanguineo, setTipoSanguineo,
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
    graduacoes, setGraduacoes,
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
    handleRemoverFoto,
    lotacoesModalOpen,
    setLotacoesModalOpen,
    handleSubmit,
    handleDocUpload,
    handleOpenChange
  }
}
