import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ModalMatriculaEmaeeProps, AlunoSearchData } from '../types'
import { useAuthStore } from '@/store/useAuthStore'
import { useAlunoSignaturePolling } from '@/components/modals/modal-aluno/hooks/useAlunoSignaturePolling'
import { getVisualizacaoUrl } from '@/lib/photoHelper'

export function useMatriculaEmaee({ props, isOpen, setIsOpen }: { props: ModalMatriculaEmaeeProps, isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const supabase = createBrowserClient()
  const { funcionario } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [alunosEncontrados, setAlunosEncontrados] = useState<AlunoSearchData[]>([])
  
  // 1. Dados do Atendimento
  const [escolaAtendimentoId, setEscolaAtendimentoId] = useState(props.escolaEmaeeId || '')
  const [localizacaoAtendimento, setLocalizacaoAtendimento] = useState('Urbana')
  const [dataMatricula, setDataMatricula] = useState(() => new Date().toISOString().split('T')[0])
  
  // 2. Dados do Aluno Selecionado e Edição / Cadastro Manual
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSearchData | null>(null)
  const [isManualAluno, setIsManualAluno] = useState(false)
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
  
  // Endereço e Geolocalização (MiniMapa)
  const [endereco, setEndereco] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [zonaResidencial, setZonaResidencial] = useState('Urbana')
  
  const [contatoEmergencia, setContatoEmergencia] = useState('')
  const [telefoneEmergencia, setTelefoneEmergencia] = useState('')
  const [turnoAtendimento, setTurnoAtendimento] = useState('Matutino')

  // Foto 3x4 do Aluno
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoFile, setFotoFile] = useState<File | null>(null)

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFotoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setFotoUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // 3. Escola Regular
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

  // Listas de apoio
  const [escolas, setEscolas] = useState<{id: string, nome: string}[]>([])
  const [unidadesEmaee, setUnidadesEmaee] = useState<{id: string, nome: string}[]>([])

  // Sincroniza unidade EMAEE selecionada e assinatura padrão do funcionário logado
  useEffect(() => {
    if (props.escolaEmaeeId) {
      setEscolaAtendimentoId(props.escolaEmaeeId)
    }
    if (funcionario?.assinatura_url && !assinaturaServidorUrl) {
      setAssinaturaServidorUrl(funcionario.assinatura_url)
    }
  }, [props.escolaEmaeeId, funcionario?.assinatura_url, assinaturaServidorUrl])

  // Carga das escolas no modal
  useEffect(() => {
    let isMounted = true
    async function fetchData() {
      try {
        const { data: escolasData, error } = await supabase
          .from('escolas')
          .select('id, nome, tipo, is_teste, secretaria_id, secretarias(id, nome)')
          .is('deleted_at', null)
          .eq('ativo', true)
          .order('nome')
          
        if (error) throw error

        if (escolasData && isMounted) {
          const escolasRegulares = (escolasData as any[]).filter((e) => {
            if (e.is_teste) return false
            if (/(^|\s)teste(\s|\d|$)/i.test(e.nome || '')) return false
            if (e.tipo === 'SAUDE' || e.tipo === 'UNIDADE_SAUDE' || e.tipo === 'EMAEE') return false
            if (/emaee/i.test(e.nome || '')) return false
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
          if (!escolaAtendimentoId && emaeeList.length > 0) {
            setEscolaAtendimentoId(emaeeList[0].id)
          }
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
  }, [isOpen, supabase, escolaAtendimentoId])

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
    setContatoEmergencia(aluno.nome_contato_emergencia ?? '')
    setTelefoneEmergencia(aluno.telefone ?? '')

    // Carregar foto existente
    const visualUrl = getVisualizacaoUrl({
      foto_url: aluno.foto_url,
      foto_avatar_path: aluno.foto_avatar_path,
      foto_visualizacao_path: aluno.foto_visualizacao_path,
      foto_updated_at: aluno.foto_updated_at
    })
    setFotoUrl(visualUrl || aluno.foto_url || null)
    setFotoFile(null)

    // Carregar assinatura existente do responsável se já salva na ficha do aluno
    const dadosMatricula = (aluno as any).dados_matricula || {}
    if (dadosMatricula.assinatura_responsavel_url) {
      setAssinaturaResponsavelUrl(dadosMatricula.assinatura_responsavel_url)
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
    setCidadeNascimento('SAPE AÇU')
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
  }

  // Busca de alunos com debounce e cancelamento
  const handleSearchAluno = async (term: string) => {
    setSearchTerm(term)
    if (!term || term.length < 3) {
      setAlunosEncontrados([])
      return
    }
    
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
          foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at
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
        dados_matricula: a.dados_matricula
      }))
      
      setAlunosEncontrados(mapped)
    } catch (err) {
      console.error('Erro na busca de alunos:', err)
      toast.error('Erro ao pesquisar alunos no SIG')
    } finally {
      setSearchLoading(false)
    }
  }

  const toggleDeficiencia = (key: keyof typeof deficiencias) => {
    setDeficiencias(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      let targetAlunoId = alunoSelecionado?.id

      const validEscolaAtendimento = (escolaAtendimentoId.trim() || props.escolaEmaeeId || '').trim() || null
      const validEscolaRegular = escolaRegularId.trim() ? escolaRegularId.trim() : null

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
          uf_nascimento: estadoNascimento || null,
          municipio_nascimento: cidadeNascimento || null,
          nome_mae: nomeMae || null,
          profissao_mae: profissaoMae || null,
          nome_pai: nomePai || null,
          profissao_pai: profissaoPai || null,
          endereco: endereco || null,
          latitude: latitude != null && !isNaN(latitude) && latitude !== 0 ? latitude : null,
          longitude: longitude != null && !isNaN(longitude) && longitude !== 0 ? longitude : null,
          zona_residencial: zonaResidencial || 'Urbana',
          nome_contato_emergencia: contatoEmergencia || null,
          telefone: telefoneEmergencia || null,
          escola_id: validEscolaRegular || validEscolaAtendimento,
          codigo_temp_resp: codigoColetaLocal || null,
          codigo_temp_resp_criado_em: codigoColetaLocal ? new Date().toISOString() : null,
          dados_matricula: {
            cor_raca: corRaca || null,
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
          uf_nascimento: estadoNascimento || null,
          municipio_nascimento: cidadeNascimento || null,
          nome_mae: nomeMae || null,
          profissao_mae: profissaoMae || null,
          nome_pai: nomePai || null,
          profissao_pai: profissaoPai || null,
          endereco: endereco || null,
          latitude: latitude != null && !isNaN(latitude) && latitude !== 0 ? latitude : null,
          longitude: longitude != null && !isNaN(longitude) && longitude !== 0 ? longitude : null,
          zona_residencial: zonaResidencial || 'Urbana',
          nome_contato_emergencia: contatoEmergencia || null,
          telefone: telefoneEmergencia || null,
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

        if (alunoUpdateError) console.warn('Aviso ao atualizar aluno:', alunoUpdateError)
      }

      // 3. Upload e otimização da Foto 3x4 se um novo arquivo foi capturado
      if (fotoFile && targetAlunoId) {
        try {
          const resUrl = await fetch(`/api/fotos/presigned-url?entity=alunos&fileName=${encodeURIComponent(fotoFile.name)}`)
          const dataUrl = await resUrl.json()
          if (!resUrl.ok) throw new Error(dataUrl.error || 'Erro ao gerar permissão de upload da foto 3x4.')

          const uploadRes = await fetch(dataUrl.signedUrl, {
            method: 'PUT',
            body: fotoFile,
            headers: { 'Content-Type': fotoFile.type }
          })
          if (!uploadRes.ok) throw new Error('Erro ao enviar o arquivo da foto 3x4.')

          const processRes = await fetch('/api/fotos/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity: 'alunos', id: targetAlunoId, originalPath: dataUrl.path })
          })
          if (!processRes.ok) throw new Error('Erro ao otimizar e salvar as variações da foto 3x4.')
        } catch (fotoErr: any) {
          console.error('Erro no upload da foto 3x4:', fotoErr)
          toast.error('Aviso: Houve um problema ao processar a foto 3x4 do aluno.')
        }
      }

      // 4. Inserir matrícula EMAEE (Sanitizar UUIDs vazios para evitar erro)
      const insertPayload: any = {
        aluno_id: targetAlunoId,
        escola_atendimento_id: validEscolaAtendimento,
        data_matricula: dataMatricula,
        turno_atendimento: turnoAtendimento,
        localizacao_atendimento: localizacaoAtendimento,
        escola_regular_id: validEscolaRegular,
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
        status: 'FILA_ESPERA'
      }

      const { error: matriculaError } = await (supabase
        .from('emaee_matriculas')
        .insert(insertPayload) as any)

      if (matriculaError) throw matriculaError

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
    loading,
    searchLoading,
    alunosEncontrados,
    alunoSelecionado,
    isManualAluno,
    handleSelectAluno,
    handleAtivarManual,
    handleSearchAluno,
    searchTerm,
    setSearchTerm,

    // Foto 3x4
    fotoUrl,
    handleFotoUpload,
    
    // Atendimento
    escolaAtendimentoId, setEscolaAtendimentoId,
    localizacaoAtendimento, setLocalizacaoAtendimento,
    dataMatricula, setDataMatricula,
    unidadesEmaee,

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
    
    // Endereço e Geolocalização
    endereco, setEndereco,
    latitude, setLatitude,
    longitude, setLongitude,
    zonaResidencial, setZonaResidencial,
    
    contatoEmergencia, setContatoEmergencia,
    telefoneEmergencia, setTelefoneEmergencia,
    turnoAtendimento, setTurnoAtendimento,

    // Escola Regular
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
