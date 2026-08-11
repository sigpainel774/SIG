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
  
  // 2. Dados do Aluno Selecionado e Edição
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSearchData | null>(null)
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
  const [estadoNascimento, setEstadoNascimento] = useState('')
  const [nomeMae, setNomeMae] = useState('')
  const [profissaoMae, setProfissaoMae] = useState('')
  const [nomePai, setNomePai] = useState('')
  const [profissaoPai, setProfissaoPai] = useState('')
  const [endereco, setEndereco] = useState('')
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

  // 5. Assinaturas Integradas (Responsável & Servidor)
  const [assinaturaResponsavelUrl, setAssinaturaResponsavelUrl] = useState<string | null>(null)
  const [assinaturaServidorUrl, setAssinaturaServidorUrl] = useState<string | null>(funcionario?.assinatura_url || null)

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
        const { data: escolasData } = await supabase
          .from('escolas')
          .select('id, nome, tipo')
          .eq('ativo', true)
          .order('nome')
          
        if (escolasData && isMounted) {
          setEscolas(escolasData)
          const emaeeList = escolasData.filter(e => e.tipo === 'EMAEE' || /emaee/i.test(e.nome))
          setUnidadesEmaee(emaeeList.length > 0 ? emaeeList : escolasData)
          if (!escolaAtendimentoId && emaeeList.length > 0) {
            setEscolaAtendimentoId(emaeeList[0].id)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar escolas:', err)
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
    
    if (!alunoSelecionado?.id) {
      toast.error('Localize e selecione um aluno cadastrado no SIG')
      return
    }

    if (!escolaAtendimentoId) {
      toast.error('Selecione a unidade de atendimento EMAEE')
      return
    }

    setLoading(true)
    try {
      // 1. Upload e otimização da Foto 3x4 se um novo arquivo foi capturado
      if (fotoFile) {
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
            body: JSON.stringify({ entity: 'alunos', id: alunoSelecionado.id, originalPath: dataUrl.path })
          })
          if (!processRes.ok) throw new Error('Erro ao otimizar e salvar as variações da foto 3x4.')
        } catch (fotoErr: any) {
          console.error('Erro no upload da foto 3x4:', fotoErr)
          toast.error('Aviso: Houve um problema ao processar a foto 3x4 do aluno.')
        }
      }

      // 2. Atualizar dados do aluno se houver modificações + preservar/atualizar assinatura do responsável em dados_matricula
      const currentDadosMatricula = (alunoSelecionado as any)?.dados_matricula || {}
      const updatedDadosMatricula = {
        ...currentDadosMatricula,
        cor_raca: corRaca || currentDadosMatricula.cor_raca,
        assinatura_responsavel_url: assinaturaResponsavelUrl || currentDadosMatricula.assinatura_responsavel_url,
      }

      const updatePayload: any = {
        nome: nomeCompleto || alunoSelecionado.nome,
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
        zona_residencial: zonaResidencial || 'Urbana',
        nome_contato_emergencia: contatoEmergencia || null,
        telefone: telefoneEmergencia || null,
        dados_matricula: updatedDadosMatricula
      }

      const { error: alunoUpdateError } = await (supabase
        .from('alunos')
        .update(updatePayload) as any)
        .eq('id', alunoSelecionado.id)

      if (alunoUpdateError) console.warn('Aviso ao atualizar aluno:', alunoUpdateError)

      // 3. Inserir matrícula EMAEE (Sanitizar UUIDs vazios para evitar erro ES-1)
      const validEscolaAtendimento = (escolaAtendimentoId.trim() || props.escolaEmaeeId || '').trim() || null
      const validEscolaRegular = escolaRegularId.trim() ? escolaRegularId.trim() : null

      const insertPayload: any = {
        aluno_id: alunoSelecionado.id,
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
        ...deficiencias,
        status: 'FILA_ESPERA'
      }

      const { data: matricula, error: matriculaError } = await (supabase
        .from('emaee_matriculas')
        .insert(insertPayload) as any)
        .select('id')
        .single()

      if (matriculaError) throw matriculaError

      toast.success('Ficha de Matrícula AEE salva com sucesso!')
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
    handleSelectAluno,
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
    endereco, setEndereco,
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

    // Assinaturas Integradas (Conta do Responsável / Servidor / QR Code Celular)
    assinaturaResponsavelUrl, setAssinaturaResponsavelUrl,
    assinaturaServidorUrl, setAssinaturaServidorUrl,
    celularSigningField,
    celularSigningCode,
    iniciarAssinaturaCelular,
    cancelarAssinaturaCelular,
    funcionario,

    handleSubmit
  }
}

