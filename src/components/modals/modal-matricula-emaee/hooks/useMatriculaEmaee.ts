import React, { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ModalMatriculaEmaeeProps, AlunoSearchData } from '../types'
import { useAuthStore } from '@/store/useAuthStore'
import { useAlunoSignaturePolling } from '@/components/modals/modal-aluno/hooks/useAlunoSignaturePolling'
import { getVisualizacaoUrl, getAvatarUrl } from '@/lib/photoHelper'
import { getHojeBrasilia } from '@/lib/dateUtils'
import { VinculoAEEConfig } from '../components/ModalVincularProfissionalAlunoAEE'

export function useMatriculaEmaee({ props, isOpen, setIsOpen }: { props: ModalMatriculaEmaeeProps, isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const supabase = createBrowserClient()
  const { funcionario } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [alunosEncontrados, setAlunosEncontrados] = useState<AlunoSearchData[]>([])

  // Flags de controle de ciclo de vida para blindagem contra resets fantasmas e memory leaks
  const prevOpenRef = useRef(false)
  const prevMatriculaIdRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)
  const searchReqIdRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])
  
  // 1. Dados do Atendimento
  const [escolaAtendimentoId, setEscolaAtendimentoId] = useState(props.escolaEmaeeId || '')
  const [localizacaoAtendimento, setLocalizacaoAtendimento] = useState('Urbana')
  const [dataMatricula, setDataMatricula] = useState(() => getHojeBrasilia())
  
  // 2. Dados do Aluno Selecionado e Edição / Cadastro Manual
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSearchData | null>(null)
  const [isManualAluno, setIsManualAluno] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [cpf, setCpf] = useState('')
  const [identificacaoCenso, setIdentificacaoCenso] = useState('')
  const [rg, setRg] = useState('')
  const [nis, setNis] = useState('')
  const [certidaoNascimento, setCertidaoNascimento] = useState('')
  const [corRaca, setCorRaca] = useState('')
  const [sexo, setSexo] = useState('')
  const [cidadeNascimento, setCidadeNascimento] = useState('')
  const [estadoNascimento, setEstadoNascimento] = useState('BA')
  const [nomeMae, setNomeMae] = useState('')
  const [profissaoMae, setProfissaoMae] = useState('')
  const [nomePai, setNomePai] = useState('')
  const [profissaoPai, setProfissaoPai] = useState('')
  
  // Endereço Residencial Estruturado com CEP e Geolocalização (MiniMapa)
  const [cep, setCep] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidadeEndereco, setCidadeEndereco] = useState('Sapeaçu')
  const [ufEndereco, setUfEndereco] = useState('BA')
  const [isFetchingCep, setIsFetchingCep] = useState(false)
  const [endereco, setEndereco] = useState('')
  const [latitude, setLatitude] = useState<number | null>(-12.7299932)
  const [longitude, setLongitude] = useState<number | null>(-39.1858195)
  const [zonaResidencial, setZonaResidencial] = useState('Urbana')

  const formatCEP = (value: string) => {
    const clean = value.replace(/\D/g, '')
    return clean
      .replace(/^(\d{5})(\d)/, '$1-$2')
      .substring(0, 9)
  }

  const consultarCep = async (cepParam?: string) => {
    const clean = (cepParam ?? cep).replace(/\D/g, '')
    if (clean.length !== 8) {
      if (cepParam !== undefined) toast.error('CEP incompleto. Digite os 8 números.')
      return
    }
    setIsFetchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (data.erro) {
        toast.error('CEP não localizado na base dos Correios.')
        return
      }
      if (data.logradouro) setRua(data.logradouro)
      if (data.bairro) setBairro(data.bairro)
      if (data.localidade) setCidadeEndereco(data.localidade)
      if (data.uf) setUfEndereco(data.uf)

      const partes = [
        data.logradouro,
        numero ? `nº ${numero}` : '',
        data.bairro,
        data.localidade ? `${data.localidade} - ${data.uf || 'BA'}` : '',
        `CEP: ${formatCEP(clean)}`
      ].filter(Boolean)
      setEndereco(partes.join(', '))
      toast.success('Endereço localizado via CEP!')
    } catch (err) {
      console.error('Erro ao consultar ViaCEP:', err)
      toast.error('Não foi possível consultar o CEP.')
    } finally {
      setIsFetchingCep(false)
    }
  }
  
  const [contatoEmergencia, setContatoEmergencia] = useState('')
  const [telefoneEmergencia, setTelefoneEmergencia] = useState('')
  const [turnoAtendimento, setTurnoAtendimento] = useState('Matutino')
  const [statusMatricula, setStatusMatricula] = useState<string>('FILA_ESPERA')

  // Foto 3x4 do Aluno e Scanner
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoRemovidaManualmente, setFotoRemovidaManualmente] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFotoFile(file)
    setFotoRemovidaManualmente(false)
    const reader = new FileReader()
    reader.onload = () => {
      setFotoUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleFotoCapturada = (file: File, dataUrl: string) => {
    setFotoFile(file)
    setFotoUrl(dataUrl)
    setFotoRemovidaManualmente(false)
  }

  const handleRemoverFoto = () => {
    setFotoFile(null)
    setFotoUrl(null)
    setFotoRemovidaManualmente(true)
  }

  // 3. Escola Regular
  const [escolaOrigemForaRede, setEscolaOrigemForaRede] = useState(false)
  const [escolaOrigemNome, setEscolaOrigemNome] = useState('')
  const [escolaOrigemMunicipio, setEscolaOrigemMunicipio] = useState('')
  const [escolaOrigemUf, setEscolaOrigemUf] = useState('BA')
  const [escolaRegularId, setEscolaRegularId] = useState<string>('')
  const [anoEscolarizacao, setAnoEscolarizacao] = useState('')
  const [turnoRegular, setTurnoRegular] = useState('')
  const [turmaRegular, setTurmaRegular] = useState('')
  const [professorRegular, setProfessorRegular] = useState('')
  const [gestorRegular, setGestorRegular] = useState('')
  
  // 4. Dados Clínicos e Deficiências
  const [cidCodigo, setCidCodigo] = useState('')
  const [outrosTranstornos, setOutrosTranstornos] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  const [deficiencias, setDeficiencias] = useState({
    def_baixa_visao: false,
    def_cegueira: false,
    def_auditiva: false,
    def_fisica: false,
    def_intelectual: false,
    def_surdez: false,
    def_surdocegueira: false,
    def_multipla: false,
    transtorno_tea: false,
    transtorno_outros: false,
  })

  const [condicoesSaude, setCondicoesSaude] = useState({
    transtorno_tea: { selecionado: false, cid: '' },
    tdah: { selecionado: false, cid: '' },
    deficiencia_intelectual: { selecionado: false, cid: '' },
    dislexia: { selecionado: false, cid: '' },
    disgrafia_disortografia: { selecionado: false, cid: '' },
    tod: { selecionado: false, cid: '' },
    ansiedade: { selecionado: false, cid: '' },
    superdotacao: { selecionado: false, cid: '' },
  })

  const toggleCondicao = (key: keyof typeof condicoesSaude) => {
    setCondicoesSaude(prev => {
      const current = prev[key] || { selecionado: false, cid: '' }
      const nextSelected = !current.selecionado
      return {
        ...prev,
        [key]: {
          selecionado: nextSelected,
          cid: nextSelected ? current.cid : ''
        }
      }
    })
  }

  const setCidCondicao = (key: keyof typeof condicoesSaude, cid: string) => {
    setCondicoesSaude(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { selecionado: true }),
        cid
      }
    }))
  }

  // 5. Assinaturas Integradas (Responsável & Servidor) e Coleta Local
  const [assinaturaResponsavelUrl, setAssinaturaResponsavelUrl] = useState<string | null>(null)
  const [assinaturaServidorUrl, setAssinaturaServidorUrl] = useState<string | null>(funcionario?.assinatura_url || null)
  const [codigoColetaLocal, setCodigoColetaLocal] = useState<string | null>(null)

  // Polling de assinatura remota pelo celular (QR Code)
  const {
    celularSigningField,
    celularSigningCode,
    iniciarAssinaturaCelular,
    cancelarAssinaturaCelular,
  } = useAlunoSignaturePolling({
    alunoId: alunoSelecionado?.id,
    setAssinaturaResponsavelUrl,
    setAssinaturaFuncionarioUrl: setAssinaturaServidorUrl,
  })

  // Gerador de código para Coleta Local
  const gerarCodigoColetaLocal = async () => {
    const token = Math.floor(100000 + Math.random() * 900000).toString()
    setCodigoColetaLocal(token)
    
    if (alunoSelecionado?.id) {
      try {
        await (supabase
          .from('alunos')
          .update({
            codigo_temp_resp: token,
            codigo_temp_resp_criado_em: new Date().toISOString()
          } as any)
          .eq('id', alunoSelecionado.id) as any)
        toast.success(`Código de Coleta Local gerado: ${token}`)
      } catch (err) {
        console.error('Erro ao salvar código no aluno:', err)
      }
    } else {
      toast.success(`Código de Coleta Local gerado: ${token}. Ele será vinculado ao salvar o aluno.`)
    }
  }

  // 6. Especialistas e Vínculos AEE
  const [vinculosAEE, setVinculosAEE] = useState<VinculoAEEConfig[]>([])
  const [vinculosRemovidos, setVinculosRemovidos] = useState<VinculoAEEConfig[]>([])
  const [modalVincularAEEOpen, setModalVincularAEEOpen] = useState(false)

  const adicionarVinculoAEE = (novoVinculo: VinculoAEEConfig) => {
    setVinculosAEE((prev) => [...prev, novoVinculo])
  }

  const removerVinculoAEE = (idOuTempId: string) => {
    setVinculosAEE((prev) => {
      const item = prev.find((v) => (v.id || v.tempId) === idOuTempId)
      if (item && item.id) {
        setVinculosRemovidos((r) => [...r, item])
      }
      return prev.filter((v) => (v.id || v.tempId) !== idOuTempId)
    })
  }

  // Listas de apoio
  const [escolas, setEscolas] = useState<{id: string, nome: string}[]>([])
  const [unidadesEmaee, setUnidadesEmaee] = useState<{id: string, nome: string}[]>([])

  const isEditMode = Boolean(props.matriculaEditar?.id)

  // Função controlada para resetar todos os estados do formulário
  const handleResetForm = () => {
    setAlunoSelecionado(null)
    setIsManualAluno(true)
    setSearchTerm('')
    setNomeCompleto('')
    setDataNascimento('')
    setCpf('')
    setIdentificacaoCenso('')
    setRg('')
    setNis('')
    setCertidaoNascimento('')
    setCorRaca('')
    setSexo('')
    setCidadeNascimento('')
    setEstadoNascimento('BA')
    setNomeMae('')
    setProfissaoMae('')
    setNomePai('')
    setProfissaoPai('')
    setCep('')
    setRua('')
    setNumero('')
    setBairro('')
    setCidadeEndereco('Sapeaçu')
    setUfEndereco('BA')
    setEndereco('')
    setLatitude(-12.7299932)
    setLongitude(-39.1858195)
    setZonaResidencial('Urbana')
    setContatoEmergencia('')
    setTelefoneEmergencia('')
    setFotoUrl(null)
    setFotoFile(null)
    setEscolaAtendimentoId(props.escolaEmaeeId ?? '')
    setLocalizacaoAtendimento('Urbana')
    setDataMatricula(getHojeBrasilia())
    setTurnoAtendimento('Matutino')
    setStatusMatricula('FILA_ESPERA')
    setEscolaOrigemForaRede(false)
    setEscolaOrigemNome('')
    setEscolaOrigemMunicipio('')
    setEscolaOrigemUf('BA')
    setEscolaRegularId('')
    setAnoEscolarizacao('')
    setTurnoRegular('')
    setTurmaRegular('')
    setProfessorRegular('')
    setGestorRegular('')
    setCidCodigo('')
    setOutrosTranstornos('')
    setObservacoes('')
    setDeficiencias({
      def_baixa_visao: false,
      def_cegueira: false,
      def_auditiva: false,
      def_fisica: false,
      def_intelectual: false,
      def_surdez: false,
      def_surdocegueira: false,
      def_multipla: false,
      transtorno_tea: false,
      transtorno_outros: false,
    })
    setCondicoesSaude({
      transtorno_tea: { selecionado: false, cid: '' },
      tdah: { selecionado: false, cid: '' },
      deficiencia_intelectual: { selecionado: false, cid: '' },
      dislexia: { selecionado: false, cid: '' },
      disgrafia_disortografia: { selecionado: false, cid: '' },
      tod: { selecionado: false, cid: '' },
      ansiedade: { selecionado: false, cid: '' },
      superdotacao: { selecionado: false, cid: '' },
    })
    setAssinaturaResponsavelUrl(null)
    setAssinaturaServidorUrl(funcionario?.assinatura_url || null)
    setCodigoColetaLocal(null)
    setVinculosAEE([])
    setVinculosRemovidos([])
  }

  // Sincronizar dados quando o modal for ABERTO ou quando a matrícula a editar mudar
  // Blindagem estrita: NÃO reseta enquanto o modal já estiver aberto e o usuário estiver digitando
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false
      return
    }

    const wasClosed = !prevOpenRef.current
    const currentMatriculaId = props.matriculaEditar?.id ?? null
    const matriculaIdChanged = currentMatriculaId !== prevMatriculaIdRef.current

    // Se o modal já estava aberto e não mudou o ID da matrícula, não faz nada (preserva tudo o que foi digitado)
    if (!wasClosed && !matriculaIdChanged) {
      return
    }

    prevOpenRef.current = true
    prevMatriculaIdRef.current = currentMatriculaId

    if (props.matriculaEditar) {
      const mat = props.matriculaEditar
      const al = mat.alunos || {}
      const dm = al.dados_matricula || {}

      setAlunoSelecionado(al.id ? (al as AlunoSearchData) : null)
      setIsManualAluno(false)
      setSearchTerm(al.nome ?? '')

      setNomeCompleto(al.nome ?? '')
      setDataNascimento(al.data_nascimento ?? '')
      setCpf(al.cpf ?? '')
      setIdentificacaoCenso(al.identif_unica_censo ?? '')
      setRg(al.rg ?? '')
      setNis(al.nis ?? '')
      setCertidaoNascimento(al.certidao_nascimento_novo_modelo ?? al.certidao_nascimento ?? '')
      setCorRaca(al.cor_raca ?? dm.cor_raca ?? '')
      setSexo(al.sexo ?? '')
      setCidadeNascimento(al.municipio_nascimento ?? '')
      setEstadoNascimento(al.uf_nascimento ?? 'BA')
      setNomeMae(al.nome_mae ?? '')
      setProfissaoMae(al.profissao_mae ?? '')
      setNomePai(al.nome_pai ?? '')
      setProfissaoPai(al.profissao_pai ?? '')
      
      // Endereço Residencial Estruturado
      setCep(dm.cep ?? '')
      setRua(dm.rua ?? dm.logradouro ?? al.endereco ?? '')
      setNumero(dm.numero ?? '')
      setBairro(dm.bairro ?? '')
      setCidadeEndereco(dm.cidade_endereco ?? dm.cidadeEnd ?? 'Sapeaçu')
      setUfEndereco(dm.uf_endereco ?? dm.ufEnd ?? 'BA')
      setEndereco(al.endereco ?? dm.endereco_formatado ?? '')
      setLatitude(al.latitude != null ? Number(al.latitude) : (dm.latitude != null ? Number(dm.latitude) : -12.7299932))
      setLongitude(al.longitude != null ? Number(al.longitude) : (dm.longitude != null ? Number(dm.longitude) : -39.1858195))
      setZonaResidencial(al.zona_residencial ?? 'Urbana')
      const alDm = (al.dados_matricula as any) || {}
      setContatoEmergencia(al.nome_contato_emergencia ?? alDm.nome_contato_emergencia ?? alDm.contatoEmergencia ?? '')
      setTelefoneEmergencia(al.telefone ?? alDm.telefone_emergencia ?? alDm.telefoneEmergencia ?? alDm.telefone ?? '')

      // Foto 3x4
      const visualUrl = getVisualizacaoUrl({
        foto_url: al.foto_url,
        foto_avatar_path: al.foto_avatar_path,
        foto_visualizacao_path: al.foto_visualizacao_path,
        foto_updated_at: al.foto_updated_at
      })
      setFotoUrl(visualUrl || al.foto_url || null)
      setFotoFile(null)

      // Atendimento EMAEE
      setEscolaAtendimentoId(mat.escola_atendimento_id ?? props.escolaEmaeeId ?? '')
      setLocalizacaoAtendimento(mat.localizacao_atendimento ?? 'Urbana')
      setDataMatricula(mat.data_matricula ? (mat.data_matricula.includes('T') ? mat.data_matricula.split('T')[0] : mat.data_matricula) : getHojeBrasilia())
      setTurnoAtendimento(mat.turno_atendimento ?? 'Matutino')
      setStatusMatricula(mat.status || 'FILA_ESPERA')

      // Escola Regular
      const foraRede = Boolean(mat.escola_origem_fora_rede || (mat.escola_origem_nome && !mat.escola_regular_id))
      setEscolaOrigemForaRede(foraRede)
      setEscolaOrigemNome(mat.escola_origem_nome ?? '')
      setEscolaOrigemMunicipio(mat.escola_origem_municipio ?? '')
      setEscolaOrigemUf(mat.escola_origem_uf ?? 'BA')
      setEscolaRegularId(mat.escola_regular_id ?? '')
      setAnoEscolarizacao(mat.ano_escolarizacao ?? '')
      setTurnoRegular(mat.turno_regular ?? '')
      setTurmaRegular(mat.turma_regular ?? '')
      setProfessorRegular(mat.professor_regular ?? '')
      setGestorRegular(mat.gestor_regular ?? '')

      // Dados Clínicos
      setCidCodigo(mat.cid_codigo ?? '')
      setOutrosTranstornos(mat.outros_transtornos ?? '')
      setObservacoes(mat.principal_queixa ?? mat.observacoes_requerimento ?? '')
      setDeficiencias({
        def_baixa_visao: Boolean(mat.def_baixa_visao),
        def_cegueira: Boolean(mat.def_cegueira),
        def_auditiva: Boolean(mat.def_auditiva),
        def_fisica: Boolean(mat.def_fisica),
        def_intelectual: Boolean(mat.def_intelectual),
        def_surdez: Boolean(mat.def_surdez),
        def_surdocegueira: Boolean(mat.def_surdocegueira),
        def_multipla: Boolean(mat.def_multipla),
        transtorno_tea: Boolean(mat.transtorno_tea),
        transtorno_outros: Boolean(mat.transtorno_outros),
      })

      const condicoesJson = mat.condicoes_saude || {}
      setCondicoesSaude({
        transtorno_tea: {
          selecionado: Boolean(condicoesJson.transtorno_tea?.selecionado ?? mat.transtorno_tea),
          cid: condicoesJson.transtorno_tea?.cid ?? (mat.transtorno_tea ? (mat.cid_codigo ?? '') : '')
        },
        tdah: {
          selecionado: Boolean(condicoesJson.tdah?.selecionado),
          cid: condicoesJson.tdah?.cid ?? ''
        },
        deficiencia_intelectual: {
          selecionado: Boolean(condicoesJson.deficiencia_intelectual?.selecionado ?? mat.def_intelectual),
          cid: condicoesJson.deficiencia_intelectual?.cid ?? ''
        },
        dislexia: {
          selecionado: Boolean(condicoesJson.dislexia?.selecionado),
          cid: condicoesJson.dislexia?.cid ?? ''
        },
        disgrafia_disortografia: {
          selecionado: Boolean(condicoesJson.disgrafia_disortografia?.selecionado),
          cid: condicoesJson.disgrafia_disortografia?.cid ?? ''
        },
        tod: {
          selecionado: Boolean(condicoesJson.tod?.selecionado),
          cid: condicoesJson.tod?.cid ?? ''
        },
        ansiedade: {
          selecionado: Boolean(condicoesJson.ansiedade?.selecionado),
          cid: condicoesJson.ansiedade?.cid ?? ''
        },
        superdotacao: {
          selecionado: Boolean(condicoesJson.superdotacao?.selecionado),
          cid: condicoesJson.superdotacao?.cid ?? ''
        },
      })

      // Assinaturas
      setAssinaturaResponsavelUrl(mat.assinatura_responsavel_aluno_url ?? dm.assinatura_responsavel_url ?? null)
      setAssinaturaServidorUrl(mat.assinatura_responsavel_matricula_url ?? funcionario?.assinatura_url ?? null)

      // Carregar Especialistas e Vínculos AEE existentes
      if (mat.id) {
        (async () => {
          try {
            const { data: vincData, error } = await supabase
              .from('emaee_especialidades_vinculadas')
              .select(`
                id, profissional_id, especialidade, frequencia, dia_semana, horario_inicio, horario_fim, ativo,
                funcionarios ( id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at )
              `)
              .eq('emaee_matricula_id', mat.id)
              .eq('ativo', true)

            if (!error && vincData && isMountedRef.current) {
              const mapeados: VinculoAEEConfig[] = vincData.map((v: any) => {
                const func = v.funcionarios || {}
                const avatar = getAvatarUrl(func) || func.foto_url
                return {
                  id: v.id,
                  tempId: v.id,
                  profissionalId: v.profissional_id,
                  profissionalNome: func.nome ?? 'Profissional AEE',
                  profissionalCargo: func.cargo ?? v.especialidade ?? 'Especialista AEE',
                  profissionalFoto: avatar,
                  frequencia: v.frequencia ?? 'SEMANAL',
                  diaSemana: v.dia_semana ?? 1,
                  horarioInicio: (v.horario_inicio || '08:00').substring(0, 5),
                  horarioFim: (v.horario_fim || '09:00').substring(0, 5),
                  isNovo: false
                }
              })
              setVinculosAEE(mapeados)
              setVinculosRemovidos([])
            }
          } catch (err) {
            console.error('Erro ao carregar vínculos AEE do aluno:', err)
          }
        })()
      }
    } else {
      // Reset limpo inicial para Nova Matrícula
      handleResetForm()
    }
  }, [isOpen, props.matriculaEditar?.id])

  // Sincroniza unidade EMAEE selecionada e assinatura padrão do funcionário logado
  useEffect(() => {
    if (props.escolaEmaeeId && !escolaAtendimentoId) {
      setEscolaAtendimentoId(props.escolaEmaeeId)
    }
    if (funcionario?.assinatura_url && !assinaturaServidorUrl) {
      setAssinaturaServidorUrl(funcionario.assinatura_url)
    }
  }, [props.escolaEmaeeId, funcionario?.assinatura_url, assinaturaServidorUrl, escolaAtendimentoId])

  // Carga das escolas no modal
  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        const { data: escolasData, error } = await supabase
          .from('escolas')
          .select('id, nome, tipo, inep, is_teste, secretaria_id, secretarias(id, nome)')
          .is('deleted_at', null)
          .eq('ativo', true)
          .order('nome')
          
        if (error) throw error

        if (escolasData && isMounted) {
          const escolasRegulares = (escolasData as any[]).filter((e) => {
            if (e.is_teste) return false
            if (/(^|\s)teste(\s|\d|$)/i.test(e.nome || '')) return false
            if (e.tipo === 'SAUDE' || e.tipo === 'UNIDADE_SAUDE' || e.tipo === 'EMAEE' || e.tipo === 'SECRETARIA') return false
            if (/emaee/i.test(e.nome || '')) return false
            if (e.inep === '01' || e.inep === '1') return false
            if (/semed|secretaria municipal de educa/i.test(e.nome || '')) return false
            const secNome = (e.secretarias as any)?.nome || ''
            if (/sa[uú]de/i.test(secNome)) return false
            if (/sa[uú]de|posto|ubs|usf|hospital|upa/i.test(e.nome || '')) return false
            return true
          })
          setEscolas(escolasRegulares)

          const emaeeList = (escolasData as any[]).filter((e) => 
            !e.is_teste && 
            !/(^|\s)teste(\s|\d|$)/i.test(e.nome || '') && 
            (e.tipo === 'EMAEE' || /emaee/i.test(e.nome || ''))
          )
          setUnidadesEmaee(emaeeList.length > 0 ? emaeeList : escolasRegulares)
          setEscolaAtendimentoId(prev => prev || (emaeeList.length > 0 ? emaeeList[0].id : ''))
        }
      } catch (err) {
        console.error('Erro ao carregar escolas:', err)
        if (isMounted) toast.error('Erro ao carregar lista de escolas.')
      }
    }
    if (isOpen) {
      fetchData()
    }
    return () => { isMounted = false }
  }, [isOpen, supabase])

  // Preenchimento dos campos ao selecionar aluno
  const handleSelectAluno = (aluno: AlunoSearchData) => {
    setAlunoSelecionado(aluno)
    setIsManualAluno(false)
    setAlunosEncontrados([])
    setSearchTerm(aluno.nome)
    
    // Auto-preenchimento
    setNomeCompleto(aluno.nome ?? '')
    setDataNascimento(aluno.data_nascimento ?? '')
    setCpf(aluno.cpf ?? '')
    setIdentificacaoCenso(aluno.identif_unica_censo ?? '')
    setRg(aluno.rg ?? '')
    setNis(aluno.nis ?? '')
    setCertidaoNascimento(aluno.certidao_nascimento ?? '')
    setCorRaca(aluno.cor_raca ?? '')
    setSexo(aluno.sexo ?? '')
    setCidadeNascimento(aluno.municipio_nascimento ?? '')
    setEstadoNascimento(aluno.uf_nascimento ?? 'BA')
    setNomeMae(aluno.nome_mae ?? '')
    setProfissaoMae(aluno.profissao_mae ?? '')
    setNomePai(aluno.nome_pai ?? '')
    setProfissaoPai(aluno.profissao_pai ?? '')
    setEndereco(aluno.endereco ?? '')
    setLatitude(aluno.latitude != null ? Number(aluno.latitude) : null)
    setLongitude(aluno.longitude != null ? Number(aluno.longitude) : null)
    setZonaResidencial(aluno.zona_residencial ?? 'Urbana')
    const alunoDm = (aluno as any).dados_matricula || {}
    setContatoEmergencia(aluno.nome_contato_emergencia ?? alunoDm.nome_contato_emergencia ?? alunoDm.contatoEmergencia ?? '')
    setTelefoneEmergencia(aluno.telefone ?? alunoDm.telefone_emergencia ?? alunoDm.telefoneEmergencia ?? alunoDm.telefone ?? '')

    // Carregar foto existente
    const visualUrl = getVisualizacaoUrl({
      foto_url: aluno.foto_url,
      foto_avatar_path: aluno.foto_avatar_path,
      foto_visualizacao_path: aluno.foto_visualizacao_path,
      foto_updated_at: aluno.foto_updated_at
    })
    setFotoUrl(visualUrl || aluno.foto_url || null)
    setFotoFile(null)

    // Se aluno pertencer a uma escola regular da rede municipal, auto-seleciona escola e turma
    if (aluno.escola_id && aluno.escola_id !== props.escolaEmaeeId) {
      setEscolaOrigemForaRede(false)
      setEscolaRegularId(aluno.escola_id)
      if (aluno.turma_nome) {
        setTurmaRegular(aluno.turma_nome)
      }
    }

    // Carregar assinatura existente do responsável se já salva na ficha do aluno
    const dadosMatricula = (aluno as any).dados_matricula || {}
    if (dadosMatricula.assinatura_responsavel_url) {
      setAssinaturaResponsavelUrl(dadosMatricula.assinatura_responsavel_url)
    }

    // Carregar vínculos AEE se o aluno selecionado já possuir matrícula/prontuário no EMAEE
    if (aluno.id && !props.matriculaEditar) {
      (async () => {
        try {
          const { data: matExistente } = await supabase
            .from('emaee_matriculas')
            .select('id')
            .eq('aluno_id', aluno.id)
            .is('deleted_at', null)
            .maybeSingle()

          if (matExistente?.id) {
            const { data: vincData, error } = await supabase
              .from('emaee_especialidades_vinculadas')
              .select(`
                id, profissional_id, especialidade, frequencia, dia_semana, horario_inicio, horario_fim, ativo,
                funcionarios ( id, nome, cargo, foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at )
              `)
              .eq('emaee_matricula_id', matExistente.id)
              .eq('ativo', true)

            if (!error && vincData) {
              const mapeados: VinculoAEEConfig[] = vincData.map((v: any) => {
                const func = v.funcionarios || {}
                const avatar = getAvatarUrl(func) || func.foto_url
                return {
                  id: v.id,
                  tempId: v.id,
                  profissionalId: v.profissional_id,
                  profissionalNome: func.nome ?? 'Profissional AEE',
                  profissionalCargo: func.cargo ?? v.especialidade ?? 'Especialista AEE',
                  profissionalFoto: avatar,
                  frequencia: v.frequencia ?? 'SEMANAL',
                  diaSemana: v.dia_semana ?? 1,
                  horarioInicio: (v.horario_inicio || '08:00').substring(0, 5),
                  horarioFim: (v.horario_fim || '09:00').substring(0, 5),
                  isNovo: false
                }
              })
              setVinculosAEE(mapeados)
              setVinculosRemovidos([])
            }
          } else {
            setVinculosAEE([])
            setVinculosRemovidos([])
          }
        } catch (err) {
          console.error('Erro ao verificar vínculos do aluno selecionado:', err)
        }
      })()
    }
  }

  // Ativar modo manual para novo aluno
  const handleAtivarManual = () => {
    setAlunoSelecionado(null)
    setIsManualAluno(true)
    setAlunosEncontrados([])
    setNomeCompleto('')
    setDataNascimento('')
    setCpf('')
    setIdentificacaoCenso('')
    setRg('')
    setNis('')
    setCertidaoNascimento('')
    setCorRaca('')
    setSexo('')
    setCidadeNascimento('')
    setEstadoNascimento('BA')
    setNomeMae('')
    setProfissaoMae('')
    setNomePai('')
    setProfissaoPai('')
    setEndereco('')
    setLatitude(-12.7299932)
    setLongitude(-39.1858195)
    setZonaResidencial('Urbana')
    setContatoEmergencia('')
    setTelefoneEmergencia('')
    setFotoUrl(null)
    setFotoFile(null)
    setAssinaturaResponsavelUrl(null)
    setVinculosAEE([])
    setVinculosRemovidos([])
  }

  // Busca de alunos com debounce e cancelamento (protegido contra race condition)
  const handleSearchAluno = async (term: string) => {
    setSearchTerm(term)
    if (!term || term.length < 3) {
      setAlunosEncontrados([])
      return
    }
    
    const currentReqId = ++searchReqIdRef.current
    setSearchLoading(true)
    try {
      const { data, error } = await (supabase
        .from('alunos')
        .select(`
          id, nome, cpf, rg, nis, data_nascimento, certidao_nascimento,
          certidao_nascimento_novo_modelo, identif_unica_censo,
          nome_mae, profissao_mae, nome_pai, profissao_pai, endereco,
          sexo, dados_matricula, uf_nascimento, municipio_nascimento,
          zona_residencial, nome_contato_emergencia, telefone,
          latitude, longitude,
          foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at,
          escola_id, turma_id, atendido_emaee,
          turmas:turma_id (nome, ano_letivo),
          escolas:escola_id (nome)
        `) as any)
        .ilike('nome', `%${term}%`)
        .is('deleted_at', null)
        .limit(10)
        
      if (error) throw error
      
      const mapped: AlunoSearchData[] = (data || []).map((a: any) => ({
        id: a.id,
        nome: a.nome,
        cpf: a.cpf,
        rg: a.rg,
        nis: a.nis,
        identif_unica_censo: a.identif_unica_censo || null,
        data_nascimento: a.data_nascimento,
        certidao_nascimento: a.certidao_nascimento_novo_modelo || a.certidao_nascimento,
        nome_mae: a.nome_mae,
        profissao_mae: a.profissao_mae || null,
        nome_pai: a.nome_pai,
        profissao_pai: a.profissao_pai || null,
        endereco: a.endereco,
        sexo: a.sexo,
        cor_raca: (a.dados_matricula as any)?.cor_raca || null,
        uf_nascimento: a.uf_nascimento || null,
        municipio_nascimento: a.municipio_nascimento || null,
        zona_residencial: a.zona_residencial || 'Urbana',
        nome_contato_emergencia: a.nome_contato_emergencia || null,
        telefone: a.telefone || null,
        latitude: a.latitude,
        longitude: a.longitude,
        foto_url: a.foto_url || null,
        foto_avatar_path: a.foto_avatar_path || null,
        foto_visualizacao_path: a.foto_visualizacao_path || null,
        foto_updated_at: a.foto_updated_at || null,
        escola_id: a.escola_id || null,
        escola_nome: a.escolas?.nome || null,
        turma_id: a.turma_id || null,
        turma_nome: a.turmas?.nome || null,
        atendido_emaee: a.atendido_emaee ?? false,
        dados_matricula: a.dados_matricula
      }))
      
      if (isMountedRef.current && currentReqId === searchReqIdRef.current) {
        setAlunosEncontrados(mapped)
      }
    } catch (err) {
      console.error('Erro na busca de alunos:', err)
      if (isMountedRef.current) toast.error('Erro ao pesquisar alunos no SIG')
    } finally {
      if (isMountedRef.current && currentReqId === searchReqIdRef.current) {
        setSearchLoading(false)
      }
    }
  }

  const toggleDeficiencia = (key: keyof typeof deficiencias) => {
    setDeficiencias(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) {
      e.preventDefault()
      if (e.target && e.currentTarget && e.target !== e.currentTarget) {
        return
      }
    }
    
    // Validação: ou selecionou aluno ou digitou nome manual
    if (!alunoSelecionado?.id && !nomeCompleto.trim()) {
      toast.error('Informe o nome do aluno ou selecione um aluno cadastrado no SIG')
      return
    }

    if (!escolaAtendimentoId) {
      toast.error('Selecione a unidade de atendimento EMAEE')
      return
    }

    setLoading(true)
    try {
      const validEscolaAtendimento = (escolaAtendimentoId.trim() || props.escolaEmaeeId || '').trim() || null
      const validEscolaRegular = escolaRegularId.trim() ? escolaRegularId.trim() : null

      // ==========================================
      // CASO A: EDIÇÃO DE MATRÍCULA JÁ EXISTENTE
      // ==========================================
      if (isEditMode && props.matriculaEditar?.id) {
        const matriculaId = props.matriculaEditar.id
        const targetAlunoId = props.matriculaEditar.aluno_id || alunoSelecionado?.id

        // 1. Atualizar dados do aluno se houver ID vinculado
        if (targetAlunoId) {
          const currentDadosMatricula = (props.matriculaEditar.alunos as any)?.dados_matricula || (alunoSelecionado as any)?.dados_matricula || {}
          const updatedDadosMatricula = {
            ...currentDadosMatricula,
            cor_raca: corRaca || currentDadosMatricula.cor_raca,
            contato_emergencia_nome: contatoEmergencia || currentDadosMatricula.contato_emergencia_nome,
            telefone_emergencia: telefoneEmergencia || currentDadosMatricula.telefone_emergencia,
            assinatura_responsavel_url: assinaturaResponsavelUrl || currentDadosMatricula.assinatura_responsavel_url,
          }

          const updateAlunoPayload: any = {
            nome: nomeCompleto.trim() || (alunoSelecionado?.nome ?? ''),
            cpf: cpf || null,
            rg: rg || null,
            nis: nis || null,
            identif_unica_censo: identificacaoCenso || null,
            data_nascimento: dataNascimento || null,
            certidao_nascimento_novo_modelo: certidaoNascimento || null,
            sexo: sexo || null,
            uf_nascimento: estadoNascimento || null,
            municipio_nascimento: cidadeNascimento.trim() || null,
            nome_mae: nomeMae || null,
            profissao_mae: profissaoMae || null,
            nome_pai: nomePai || null,
            profissao_pai: profissaoPai || null,
            endereco: endereco || null,
            latitude: latitude != null && !isNaN(latitude) && latitude !== 0 ? Number(latitude) : null,
            longitude: longitude != null && !isNaN(longitude) && longitude !== 0 ? Number(longitude) : null,
            zona_residencial: zonaResidencial || 'Urbana',
            nome_contato_emergencia: contatoEmergencia || null,
            telefone: telefoneEmergencia || null,
            dados_matricula: updatedDadosMatricula
          }

          if (codigoColetaLocal) {
            updateAlunoPayload.codigo_temp_resp = codigoColetaLocal
            updateAlunoPayload.codigo_temp_resp_criado_em = new Date().toISOString()
          }

          if (fotoRemovidaManualmente && !fotoFile) {
            updateAlunoPayload.foto_url = null
            updateAlunoPayload.foto_avatar_path = null
            updateAlunoPayload.foto_visualizacao_path = null
            updateAlunoPayload.foto_original_path = null
            updateAlunoPayload.foto_updated_at = new Date().toISOString()
          }

          const { error: alunoUpdateError } = await (supabase
            .from('alunos')
            .update(updateAlunoPayload) as any)
            .eq('id', targetAlunoId)

          if (alunoUpdateError) {
            console.error('Erro ao atualizar aluno no EMAEE:', alunoUpdateError)
            toast.error('Aviso: Não foi possível atualizar todos os dados cadastrais do aluno.')
          }
        }

        // 2. Upload e otimização da Foto 3x4 se novo arquivo foi selecionado (com fallback resiliente)
        if (fotoFile && targetAlunoId) {
          let photoSaved = false
          try {
            const requestId = crypto.randomUUID()
            const resUrl = await fetch(`/api/fotos/presigned-url?entity=alunos&id=${targetAlunoId}&fileName=${encodeURIComponent(fotoFile.name)}&requestId=${requestId}`)
            if (resUrl.ok) {
              const dataUrl = await resUrl.json()
              if (dataUrl?.signedUrl) {
                const uploadRes = await fetch(dataUrl.signedUrl, {
                  method: 'PUT',
                  body: fotoFile,
                  headers: { 'Content-Type': fotoFile.type || 'application/octet-stream' }
                })
                if (uploadRes.ok) {
                  const processRes = await fetch('/api/fotos/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ entity: 'alunos', id: targetAlunoId, originalPath: dataUrl.path, requestId })
                  })
                  if (processRes.ok) {
                    photoSaved = true
                  }
                }
              }
            }
          } catch (fotoErr: any) {
            console.warn('[useMatriculaEmaee] Otimização server-side falhou, acionando fallback direto:', fotoErr)
          }

          // Fallback direto
          if (!photoSaved) {
            try {
              const fileExt = fotoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
              const fileName = `${targetAlunoId}_${Date.now()}.${fileExt}`

              const { error: uploadError } = await supabase.storage
                .from('fotos_alunos')
                .upload(fileName, fotoFile, { upsert: true })

              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('fotos_alunos')
                  .getPublicUrl(fileName)

                await supabase
                  .from('alunos')
                  .update({
                    foto_url: publicUrl,
                    foto_avatar_path: null,
                    foto_visualizacao_path: null,
                    foto_original_path: null,
                    foto_updated_at: new Date().toISOString()
                  })
                  .eq('id', targetAlunoId)
                photoSaved = true
              }
            } catch (fallbackErr) {
              console.error('[useMatriculaEmaee] Erro no fallback de foto 3x4:', fallbackErr)
              toast.error('Aviso: Houve um problema ao salvar a foto 3x4 do aluno.')
            }
          }
        }

        // 3. Atualizar matrícula EMAEE
        const updateMatriculaPayload: any = {
          escola_atendimento_id: validEscolaAtendimento,
          data_matricula: dataMatricula,
          turno_atendimento: turnoAtendimento,
          localizacao_atendimento: localizacaoAtendimento,
          escola_origem_fora_rede: escolaOrigemForaRede,
          escola_origem_nome: escolaOrigemForaRede ? (escolaOrigemNome.trim() || null) : null,
          escola_origem_municipio: escolaOrigemForaRede ? (escolaOrigemMunicipio.trim() || null) : null,
          escola_origem_uf: escolaOrigemForaRede ? (escolaOrigemUf.trim().toUpperCase() || 'BA') : null,
          escola_regular_id: escolaOrigemForaRede ? null : validEscolaRegular,
          ano_escolarizacao: anoEscolarizacao || null,
          turno_regular: turnoRegular || null,
          turma_regular: turmaRegular || null,
          professor_regular: professorRegular || null,
          gestor_regular: gestorRegular || null,
          principal_queixa: observacoes || null,
          cid_codigo: cidCodigo || null,
          outros_transtornos: outrosTranstornos || null,
          observacoes_requerimento: observacoes || null,
          assinatura_responsavel_matricula_url: assinaturaServidorUrl || props.matriculaEditar.assinatura_responsavel_matricula_url || null,
          assinatura_responsavel_aluno_url: assinaturaResponsavelUrl || props.matriculaEditar.assinatura_responsavel_aluno_url || null,
          autorizado_pelo_responsavel: Boolean(assinaturaResponsavelUrl || props.matriculaEditar.assinatura_responsavel_aluno_url),
          responsavel_assinatura_nome: nomeMae || nomePai || props.matriculaEditar.responsavel_assinatura_nome || null,
          responsavel_assinatura_cpf: cpf || props.matriculaEditar.responsavel_assinatura_cpf || null,
          ...deficiencias,
          transtorno_tea: Boolean(condicoesSaude.transtorno_tea.selecionado),
          def_intelectual: Boolean(condicoesSaude.deficiencia_intelectual.selecionado),
          condicoes_saude: condicoesSaude,
          status: statusMatricula || 'FILA_ESPERA'
        }

        const { error: matriculaUpdateErr } = await (supabase
          .from('emaee_matriculas')
          .update(updateMatriculaPayload) as any)
          .eq('id', matriculaId)

        if (matriculaUpdateErr) throw matriculaUpdateErr

        // 4. Inativar vínculos removidos
        if (vinculosRemovidos.length > 0) {
          const idsRemover: string[] = vinculosRemovidos
            .map((v) => v.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 10)

          if (idsRemover.length > 0) {
            await supabase
              .from('emaee_especialidades_vinculadas')
              .update({ ativo: false })
              .in('id', idsRemover)
          }
        }

        // 5. Inserir novos vínculos adicionados
        const novosParaInserir = vinculosAEE
          .filter(v => v.isNovo)
          .map(v => ({
            emaee_matricula_id: matriculaId,
            profissional_id: v.profissionalId,
            especialidade: v.profissionalCargo || 'Especialista AEE',
            frequencia: v.frequencia,
            dia_semana: v.diaSemana,
            horario_inicio: v.horarioInicio.length === 5 ? `${v.horarioInicio}:00` : v.horarioInicio,
            horario_fim: v.horarioFim.length === 5 ? `${v.horarioFim}:00` : v.horarioFim,
            ativo: true
          }))

        if (novosParaInserir.length > 0) {
          const { error: errVinc } = await supabase
            .from('emaee_especialidades_vinculadas')
            .insert(novosParaInserir as any)

          if (errVinc) {
            console.error('Erro ao salvar especialidades vinculadas no EMAEE:', errVinc)
            toast.error('Aviso: Houve um problema ao salvar os horários de atendimento dos profissionais AEE.')
          }
        }

        toast.success('Ficha do aluno / Matrícula EMAEE atualizada com sucesso!')
        if (props.onSuccess) props.onSuccess()
        setIsOpen(false)
        return
      }

      // ==========================================
      // CASO B: CRIAÇÃO DE NOVA MATRÍCULA NO EMAEE
      // ==========================================
      let targetAlunoId = alunoSelecionado?.id

      const logradouroFinal = rua.trim()
      const enderecoCompleto = [
        logradouroFinal,
        numero.trim() ? `nº ${numero.trim()}` : '',
        bairro.trim(),
        cidadeEndereco.trim() ? `${cidadeEndereco.trim()} - ${ufEndereco || 'BA'}` : '',
        cep.trim() ? `CEP: ${cep.trim()}` : ''
      ].filter(Boolean).join(', ')

      const enderecoFinal = endereco.trim() || enderecoCompleto || null

      // 1. Se for cadastro de ALUNO NOVO (não existente no SIG)
      if (!targetAlunoId) {
        const insertAlunoPayload: any = {
          nome: nomeCompleto.trim(),
          cpf: cpf || null,
          rg: rg || null,
          nis: nis || null,
          identif_unica_censo: identificacaoCenso || null,
          data_nascimento: dataNascimento || null,
          certidao_nascimento_novo_modelo: certidaoNascimento || null,
          sexo: sexo || null,
          uf_nascimento: estadoNascimento || 'BA',
          municipio_nascimento: cidadeNascimento.trim() || null,
          nome_mae: nomeMae || null,
          profissao_mae: profissaoMae || null,
          nome_pai: nomePai || null,
          profissao_pai: profissaoPai || null,
          endereco: enderecoFinal,
          latitude: latitude != null && !isNaN(latitude) && latitude !== 0 ? Number(latitude) : null,
          longitude: longitude != null && !isNaN(longitude) && longitude !== 0 ? Number(longitude) : null,
          zona_residencial: zonaResidencial || 'Urbana',
          nome_contato_emergencia: contatoEmergencia || null,
          telefone: telefoneEmergencia || null,
          escola_id: validEscolaAtendimento,
          atendido_emaee: true,
          codigo_temp_resp: codigoColetaLocal || null,
          codigo_temp_resp_criado_em: codigoColetaLocal ? new Date().toISOString() : null,
          dados_matricula: {
            cor_raca: corRaca || null,
            cep: cep || null,
            rua: rua || null,
            numero: numero || null,
            bairro: bairro || null,
            cidade_endereco: cidadeEndereco || 'Sapeaçu',
            uf_endereco: ufEndereco || 'BA',
            endereco_formatado: enderecoFinal,
            contato_emergencia_nome: contatoEmergencia || null,
            telefone_emergencia: telefoneEmergencia || null,
            assinatura_responsavel_url: assinaturaResponsavelUrl || null,
          }
        }

        const { data: newAluno, error: newAlunoErr } = await (supabase
          .from('alunos')
          .insert(insertAlunoPayload) as any)
          .select('id')
          .single()

        if (newAlunoErr) throw newAlunoErr
        targetAlunoId = newAluno.id
      } else {
        // 2. Aluno já existente: Atualizar dados e coordenadas
        const currentDadosMatricula = (alunoSelecionado as any)?.dados_matricula || {}
        const updatedDadosMatricula = {
          ...currentDadosMatricula,
          cor_raca: corRaca || currentDadosMatricula.cor_raca,
          cep: cep || currentDadosMatricula.cep,
          rua: rua || currentDadosMatricula.rua,
          numero: numero || currentDadosMatricula.numero,
          bairro: bairro || currentDadosMatricula.bairro,
          cidade_endereco: cidadeEndereco || currentDadosMatricula.cidade_endereco || 'Sapeaçu',
          uf_endereco: ufEndereco || currentDadosMatricula.uf_endereco || 'BA',
          endereco_formatado: enderecoFinal || currentDadosMatricula.endereco_formatado,
          contato_emergencia_nome: contatoEmergencia || currentDadosMatricula.contato_emergencia_nome,
          telefone_emergencia: telefoneEmergencia || currentDadosMatricula.telefone_emergencia,
          assinatura_responsavel_url: assinaturaResponsavelUrl || currentDadosMatricula.assinatura_responsavel_url,
        }

        const updatePayload: any = {
          nome: nomeCompleto || (alunoSelecionado?.nome ?? ''),
          cpf: cpf || null,
          rg: rg || null,
          nis: nis || null,
          identif_unica_censo: identificacaoCenso || null,
          data_nascimento: dataNascimento || null,
          certidao_nascimento_novo_modelo: certidaoNascimento || null,
          sexo: sexo || null,
          uf_nascimento: estadoNascimento || 'BA',
          municipio_nascimento: cidadeNascimento.trim() || null,
          nome_mae: nomeMae || null,
          profissao_mae: profissaoMae || null,
          nome_pai: nomePai || null,
          profissao_pai: profissaoPai || null,
          endereco: enderecoFinal,
          latitude: latitude != null && !isNaN(latitude) && latitude !== 0 ? Number(latitude) : null,
          longitude: longitude != null && !isNaN(longitude) && longitude !== 0 ? Number(longitude) : null,
          zona_residencial: zonaResidencial || 'Urbana',
          nome_contato_emergencia: contatoEmergencia || null,
          telefone: telefoneEmergencia || null,
          atendido_emaee: true,
          dados_matricula: updatedDadosMatricula
        }

        if (codigoColetaLocal) {
          updatePayload.codigo_temp_resp = codigoColetaLocal
          updatePayload.codigo_temp_resp_criado_em = new Date().toISOString()
        }

        const { error: alunoUpdateError } = await (supabase
          .from('alunos')
          .update(updatePayload) as any)
          .eq('id', targetAlunoId)

        if (alunoUpdateError) {
          console.error('Erro ao sincronizar aluno no EMAEE:', alunoUpdateError)
          toast.error('Aviso: Não foi possível atualizar todos os dados cadastrais do aluno.')
        }
      }

      // 3. Upload direto da Foto 3x4 se um novo arquivo foi capturado
      if (fotoFile && targetAlunoId) {
        try {
          const fileExt = fotoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
          const fileName = `${targetAlunoId}_${Date.now()}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('fotos_alunos')
            .upload(fileName, fotoFile, { upsert: true })

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('fotos_alunos')
            .getPublicUrl(fileName)

          await supabase
            .from('alunos')
            .update({
              foto_url: publicUrl,
              foto_avatar_path: null,
              foto_visualizacao_path: null,
              foto_original_path: null,
              foto_updated_at: new Date().toISOString()
            })
            .eq('id', targetAlunoId)
        } catch (fotoErr: any) {
          console.error('Erro no upload direto da foto 3x4:', fotoErr)
          toast.error('Aviso: Houve um problema ao salvar a foto 3x4 do aluno.')
        }
      }

      // 4. Inserir matrícula EMAEE (Sanitizar UUIDs vazios para evitar erro)
      const insertPayload: any = {
        aluno_id: targetAlunoId,
        escola_atendimento_id: validEscolaAtendimento,
        data_matricula: dataMatricula,
        turno_atendimento: turnoAtendimento,
        localizacao_atendimento: localizacaoAtendimento,
        escola_origem_fora_rede: escolaOrigemForaRede,
        escola_origem_nome: escolaOrigemForaRede ? (escolaOrigemNome.trim() || null) : null,
        escola_origem_municipio: escolaOrigemForaRede ? (escolaOrigemMunicipio.trim() || null) : null,
        escola_origem_uf: escolaOrigemForaRede ? (escolaOrigemUf.trim().toUpperCase() || 'BA') : null,
        escola_regular_id: escolaOrigemForaRede ? null : validEscolaRegular,
        ano_escolarizacao: anoEscolarizacao || null,
        turno_regular: turnoRegular || null,
        turma_regular: turmaRegular || null,
        professor_regular: professorRegular || null,
        gestor_regular: gestorRegular || null,
        principal_queixa: observacoes || null,
        cid_codigo: cidCodigo || null,
        outros_transtornos: outrosTranstornos || null,
        observacoes_requerimento: observacoes || null,
        assinatura_responsavel_matricula_url: assinaturaServidorUrl || null,
        assinatura_responsavel_aluno_url: assinaturaResponsavelUrl || null,
        autorizado_pelo_responsavel: !!assinaturaResponsavelUrl,
        data_autorizacao: assinaturaResponsavelUrl ? new Date().toISOString() : null,
        responsavel_assinatura_nome: nomeMae || nomePai || null,
        responsavel_assinatura_cpf: cpf || null,
        ...deficiencias,
        transtorno_tea: Boolean(condicoesSaude.transtorno_tea.selecionado),
        def_intelectual: Boolean(condicoesSaude.deficiencia_intelectual.selecionado),
        condicoes_saude: condicoesSaude,
        status: statusMatricula || 'FILA_ESPERA'
      }

      const { data: novaMatricula, error: matriculaError } = await (supabase
        .from('emaee_matriculas')
        .insert(insertPayload) as any)
        .select('id')
        .single()

      if (matriculaError) throw matriculaError

      // 5. Inserir vínculos AEE se houver
      if (novaMatricula?.id && vinculosAEE.length > 0) {
        const novosParaInserir = vinculosAEE.map(v => ({
          emaee_matricula_id: novaMatricula.id,
          profissional_id: v.profissionalId,
          especialidade: v.profissionalCargo || 'Especialista AEE',
          frequencia: v.frequencia,
          dia_semana: v.diaSemana,
          horario_inicio: v.horarioInicio.length === 5 ? `${v.horarioInicio}:00` : v.horarioInicio,
          horario_fim: v.horarioFim.length === 5 ? `${v.horarioFim}:00` : v.horarioFim,
          ativo: true
        }))

        const { error: errVinc } = await supabase
          .from('emaee_especialidades_vinculadas')
          .insert(novosParaInserir as any)

        if (errVinc) {
          console.error('Erro ao salvar especialidades vinculadas na nova matrícula EMAEE:', errVinc)
          toast.error('Aviso: Houve um problema ao salvar os horários de atendimento dos profissionais AEE.')
        }
      }

      toast.success('Ficha de Inscrição / Matrícula AEE salva com sucesso!')
      if (props.onSuccess) props.onSuccess()
      setIsOpen(false)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao registrar matrícula no EMAEE')
    } finally {
      setLoading(false)
    }
  }

  return {
    isEditMode,
    loading,
    searchLoading,
    alunosEncontrados,
    alunoSelecionado,
    isManualAluno,
    handleSelectAluno,
    handleAtivarManual,
    handleResetForm,
    handleSearchAluno,
    searchTerm,
    setSearchTerm,

    // Foto 3x4 & Scanner
    fotoUrl,
    handleFotoUpload,
    handleFotoCapturada,
    handleRemoverFoto,
    scannerOpen,
    setScannerOpen,
    fotoRemovidaManualmente,
    
    // Atendimento
    escolaAtendimentoId, setEscolaAtendimentoId,
    localizacaoAtendimento, setLocalizacaoAtendimento,
    dataMatricula, setDataMatricula,
    unidadesEmaee,

    // Especialistas e Vínculos AEE
    vinculosAEE,
    adicionarVinculoAEE,
    removerVinculoAEE,
    modalVincularAEEOpen,
    setModalVincularAEEOpen,

    // Identificação do Aluno
    nomeCompleto, setNomeCompleto,
    dataNascimento, setDataNascimento,
    cpf, setCpf,
    identificacaoCenso, setIdentificacaoCenso,
    rg, setRg,
    nis, setNis,
    certidaoNascimento, setCertidaoNascimento,
    corRaca, setCorRaca,
    sexo, setSexo,
    cidadeNascimento, setCidadeNascimento,
    estadoNascimento, setEstadoNascimento,
    nomeMae, setNomeMae,
    profissaoMae, setProfissaoMae,
    nomePai, setNomePai,
    profissaoPai, setProfissaoPai,
    
    // Endereço Residencial Estruturado e Geolocalização
    cep, setCep,
    rua, setRua,
    numero, setNumero,
    bairro, setBairro,
    cidadeEndereco, setCidadeEndereco,
    ufEndereco, setUfEndereco,
    isFetchingCep,
    consultarCep,
    formatCEP,
    endereco, setEndereco,
    latitude, setLatitude,
    longitude, setLongitude,
    zonaResidencial, setZonaResidencial,
    
    contatoEmergencia, setContatoEmergencia,
    telefoneEmergencia, setTelefoneEmergencia,
    turnoAtendimento, setTurnoAtendimento,
    statusMatricula, setStatusMatricula,

    // Escola Regular
    escolaOrigemForaRede, setEscolaOrigemForaRede,
    escolaOrigemNome, setEscolaOrigemNome,
    escolaOrigemMunicipio, setEscolaOrigemMunicipio,
    escolaOrigemUf, setEscolaOrigemUf,
    escolaRegularId, setEscolaRegularId,
    escolas,
    anoEscolarizacao, setAnoEscolarizacao,
    turnoRegular, setTurnoRegular,
    turmaRegular, setTurmaRegular,
    professorRegular, setProfessorRegular,
    gestorRegular, setGestorRegular,

    // Clínicos
    cidCodigo, setCidCodigo,
    outrosTranstornos, setOutrosTranstornos,
    observacoes, setObservacoes,
    deficiencias, toggleDeficiencia,
    condicoesSaude, toggleCondicao, setCidCondicao,

    // Assinaturas Integradas & Coleta Local
    assinaturaResponsavelUrl, setAssinaturaResponsavelUrl,
    assinaturaServidorUrl, setAssinaturaServidorUrl,
    codigoColetaLocal,
    gerarCodigoColetaLocal,
    celularSigningField,
    celularSigningCode,
    iniciarAssinaturaCelular,
    cancelarAssinaturaCelular,
    funcionario,

    handleSubmit
  }
}
