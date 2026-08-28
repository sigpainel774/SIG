'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { usePessoaForm } from '@/hooks/usePessoaForm'
import { logAudit } from '@/lib/audit/audit-agent'
import { useAlunoSignaturePolling } from './useAlunoSignaturePolling'
import { AlunoFormContextType, ModalAlunoProps } from '../types'
import { invalidarCacheFoto } from '@/lib/photoCache'
import { getVisualizacaoUrl, getAvatarUrl } from '@/lib/photoHelper'
import { compressImageBeforeUpload, formatBytes } from '@/lib/imageCompression'
import { getHojeBrasilia } from '@/lib/dateUtils'
import { formatNameTitleCase } from '@/lib/stringUtils'

// Constante de sessão para cache-busting estável (evita flickering de imagem ao re-renderizar)
const sessionTimestamp = Date.now()

interface UseAlunoFormStatesProps {
  props: ModalAlunoProps
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function useAlunoFormStates({ props, isOpen, setIsOpen }: UseAlunoFormStatesProps): AlunoFormContextType {
  const { alunoEditar, onSuccess } = props
  const { isEditMode } = useEditModeStore()
  const { funcionario, acessos, escolaAtivaId, isAdminGlobalOrRoot, isDiretor } = useAuthStore()
  const [loading, setLoading] = useState(false)

  // Buscar turmas via useSWR com cache estendido
  const { data: tData } = useSWR(
    isOpen ? 'catalogo_turmas_todas' : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome, ano_letivo, escola_id')
        .is('deleted_at', null)
      if (error) throw error
      return (data || []).map((t: any) => ({ ...t, school_id: t.escola_id })) // Map compatível
    },
    { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 600000 }
  )

  // Buscar escolas via useSWR com cache estendido
  const { data: eData } = useSWR(
    isOpen ? 'catalogo_escolas_ativas' : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome')
        .is('deleted_at', null)
        .eq('ativo', true)
        .or('is_teste.is.null,is_teste.eq.false')
        .order('nome', { ascending: true })
      if (error) throw error
      return data || []
    },
    { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 600000 }
  )

  const turmas = tData || []
  const escolas = eData ? (
    isAdminGlobalOrRoot() 
      ? eData 
      : (escolaAtivaId ? eData.filter(esc => esc.id === escolaAtivaId) : [])
  ) : []

  // Hook para gerenciar os estados de dados pessoais e endereço
  const pessoaForm = usePessoaForm({
    estadoCivilDefault: 'Solteiro',
    nacionalidadeDefault: 'BRASILEIRA',
    ufNascDefault: 'BA',
    sexoDefault: '',
    corRacaDefault: '',
    cidadeEndDefault: 'SAPE AÇU',
    ufEndDefault: 'BA',
    areaLocalizacaoDefault: 'Urbana',
    areaDiferenciadaDefault: 'Não está em área diferenciada'
  })

  // 0. Escola Seletor
  const [escolaId, setEscolaId] = useState('')

  // 1. Identificação Básica
  const [fotoUrl, setFotoUrl] = useState('')

  // 2. Turma Vinculada
  const [turmaId, setTurmaId] = useState('')

  // 3. Documentos Específicos
  const [sus, setSus] = useState('')
  const [certidao, setCertidao] = useState('')

  // 4. Filiação e Contato
  const [endereco, setEndereco] = useState('')

  // 5. Matrícula & Etapa
  const [tipoMatricula, setTipoMatricula] = useState('Renovação')
  const [dataMatricula, setDataMatricula] = useState(getHojeBrasilia())
  const [localizacao, setLocalizacao] = useState('Zona Urbana')
  const [serie, setSerie] = useState('')
  const [turno, setTurno] = useState('Matutino')
  const [turmaLetra, setTurmaLetra] = useState('')

  // 6. Saúde e Transporte Rápido
  const [transporte, setTransporte] = useState(false)
  const [rotaTransporte, setRotaTransporte] = useState('')
  const [situacaoVacinal, setSituacaoVacinal] = useState('Em dia')
  const [restricoesSaude, setRestricoesSaude] = useState('')

  // 8. Recursos SAEB (INEP)
  const [recursosEspeciais, setRecursosEspeciais] = useState('Não')
  const [recursosSelecionados, setRecursosSelecionados] = useState<string[]>([])

  // 9. Ficha de Saúde / Anamnese
  const [diabete, setDiabete] = useState('Não')
  const [convulsoes, setConvulsoes] = useState('Não')
  const [asma, setAsma] = useState('Não')
  const [infeccoes, setInfeccoes] = useState('Não')
  const [restricaoExercicio, setRestricaoExercicio] = useState('Não')
  const [covid, setCovid] = useState('Não')
  const [covidQuando, setCovidQuando] = useState('')
  const [situacaoVacinalCovid, setSituacaoVacinalCovid] = useState('')
  const [alergiaMed, setAlergiaMed] = useState('Não')
  const [alergiaMedQuais, setAlergiaMedQuais] = useState('')
  const [motivoNaoVacinacaoGeral, setMotivoNaoVacinacaoGeral] = useState('')
  const [motivoNaoVacinacaoCovid, setMotivoNaoVacinacaoCovid] = useState('')
  const [restricaoAlimentar, setRestricaoAlimentar] = useState('Não')
  const [restricaoAlimentarQuais, setRestricaoAlimentarQuais] = useState('')

  // 10. NEE
  const [nee, setNee] = useState('Não')
  const [neeSelecionadas, setNeeSelecionadas] = useState<string[]>([])

  // 11. Deficiências
  const [deficiencia, setDeficiencia] = useState('Não')
  const [deficienciasSelecionadas, setDeficienciasSelecionadas] = useState<string[]>([])

  // 12. Assinatura e Autorização de Imagem e Voz
  const [autorizaImagemVoz, setAutorizaImagemVoz] = useState('sim')
  
  // Foto State (Fase 3: Armazenamento local antes do envio)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoRemovidaManualmente, setFotoRemovidaManualmente] = useState(false)
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false)
  const [assinaturaResponsavelUrl, setAssinaturaResponsavelUrl] = useState<string | null>(null)
  const [assinaturaFuncionarioUrl, setAssinaturaFuncionarioUrl] = useState<string | null>(null)
  const [newSignatureResponsavel, setNewSignatureResponsavel] = useState<string | null>(null)
  const [newSignatureFuncionario, setNewSignatureFuncionario] = useState<string | null>(null)

  // Estados para controle de bloqueio e solicitações de edições
  const [isEdicaoLiberada, setIsEdicaoLiberada] = useState(false)
  const [solicitandoLibere, setSolicitandoLibere] = useState(false)
  const [solicitacaoPendente, setSolicitacaoPendente] = useState(false)
  const [justificativaSolicitacao, setJustificativaSolicitacao] = useState('')
  const [justificativaPendente, setJustificativaPendente] = useState('')

  const isDocumentoBloqueado = alunoEditar?.dados_matricula?.documento_bloqueado === true
  const isFichaBloqueada = isDocumentoBloqueado && !isEdicaoLiberada

  const signatureSectionRef = useRef<HTMLDivElement>(null)
  const prevOpenRef = useRef(false)
  const prevAlunoIdRef = useRef<string | null>(null)

  // Hook isolado para o polling da assinatura
  const {
    celularSigningField,
    setCelularSigningField,
    celularSigningCode,
    setCelularSigningCode,
    iniciarAssinaturaCelular,
    cancelarAssinaturaCelular,
    clearDatabaseCodes
  } = useAlunoSignaturePolling({
    alunoId: alunoEditar?.id,
    setAssinaturaResponsavelUrl,
    setAssinaturaFuncionarioUrl
  })

  // Preencher os dados quando o modal abre ou alunoEditar muda
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false
      return
    }

    const wasClosed = !prevOpenRef.current
    const currentAlunoId = alunoEditar?.id ?? null
    const alunoChanged = currentAlunoId !== prevAlunoIdRef.current

    // Se o modal já estava aberto e não mudou o aluno sendo editado, não reseta (preserva tudo o que foi digitado)
    if (!wasClosed && !alunoChanged) {
      return
    }

    prevOpenRef.current = true
    prevAlunoIdRef.current = currentAlunoId

    let active = true // Evita race conditions em chamadas assíncronas

    const checarStatusLiberacao = async () => {
      if (!alunoEditar?.id) {
        if (active) {
          setIsEdicaoLiberada(false)
          setSolicitacaoPendente(false)
        }
        return
      }

      // Diretores (Nível 2) e Admin/Root (Nível 1) possuem liberação automática permanente para edição
      const isDiretorOuAdmin = isAdminGlobalOrRoot() || isDiretor() || (acessos || []).some(a => (a.nivel === 1 || a.nivel === 2) && a.ativo)
      if (isDiretorOuAdmin) {
        if (active) {
          setIsEdicaoLiberada(true)
          setSolicitacaoPendente(false)
        }
        return
      }

      const supabase = createClient()
      const { data: rawSol } = await (supabase
        .from('solicitacoes_edicao_aluno' as any) as any)
        .select('id, aluno_id, solicitante_id, justificativa, status, aprovado_por, justificativa_resposta, criado_em, respondido_em')
        .eq('aluno_id', alunoEditar.id)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      const sol = rawSol as any

      if (!active) return

      if (sol) {
        if (sol.status === 'aprovado') {
          setIsEdicaoLiberada(true)
          setSolicitacaoPendente(false)
        } else if (sol.status === 'pendente') {
          setIsEdicaoLiberada(false)
          setSolicitacaoPendente(true)
          setJustificativaPendente(sol.justificativa)
        } else {
          setIsEdicaoLiberada(false)
          setSolicitacaoPendente(false)
        }
      } else {
        setIsEdicaoLiberada(false)
        setSolicitacaoPendente(false)
      }
    }

    if (alunoEditar) {
      const dm = alunoEditar.dados_matricula || {}
      pessoaForm.populatePessoais({ ...alunoEditar, ...dm })
      
      const rawFotoUrl = getVisualizacaoUrl(alunoEditar) || getAvatarUrl(alunoEditar) || alunoEditar.foto_url || ''
      const fotoComCacheBust = rawFotoUrl ? `${rawFotoUrl.split('?')[0]}?t=${sessionTimestamp}` : ''
      setFotoUrl(fotoComCacheBust)
      setFotoRemovidaManualmente(false)
      setFotoFile(null)
      setIsCompressingPhoto(false)

      setEscolaId(alunoEditar.escola_id || '')
      setTurmaId(alunoEditar.turma_id || '')
      setSus(alunoEditar.cartao_sus || dm.susAluno || '')
      setCertidao(alunoEditar.certidao_nascimento || dm.certidaoAluno || '')
      setEndereco(alunoEditar.endereco || dm.enderecoAluno || '')
      setSerie(alunoEditar.serie || dm.serieAluno || '')

      pessoaForm.setTelMae(dm.telMaeAluno || '')
      pessoaForm.setTelPai(dm.telPaiAluno || '')
      setTipoMatricula(dm.tipoMatricula || 'Renovação')
      setDataMatricula(dm.dataMatricula || getHojeBrasilia())
      setLocalizacao(dm.localizacaoAluno || 'Zona Urbana')
      setTurno(dm.turnoAluno || 'Matutino')
      setTurmaLetra(dm.turmaAluno || '')
      setTransporte(!!dm.transporteAluno)
      setRotaTransporte(dm.rotaTransporteAluno || '')
      setRecursosEspeciais(dm.recursosEspeciaisAluno || 'Não')
      setRecursosSelecionados(dm.recursosSelecionados || [])
      setDiabete(dm.diabeteAluno || 'Não')
      setConvulsoes(dm.convulsoesAluno || 'Não')
      setAsma(dm.asmaAluno || 'Não')
      setInfeccoes(dm.infeccoesAluno || 'Não')
      setRestricaoExercicio(dm.restricaoExercicioAluno || 'Não')
      setCovid(dm.covidAluno || 'Não')
      setCovidQuando(dm.covidQuandoAluno || '')
      setSituacaoVacinalCovid(dm.situacaoVacinalAluno || '')
      setAlergiaMed(dm.alergiaMedAluno || 'Não')
      setAlergiaMedQuais(dm.alergiaMedQuaisAluno || '')
      setRestricaoAlimentar(dm.restricaoAlimentarAluno || 'Não')
      setRestricaoAlimentarQuais(dm.restricaoAlimentarQuaisAluno || '')
      setSituacaoVacinal(dm.situacaoVacinalGeral || 'Em dia')
      setRestricoesSaude(dm.restricoesSaudeAluno || '')
      setNee(dm.neeAluno || 'Não')
      setNeeSelecionadas(dm.neeSelecionadas || [])
      setDeficiencia(dm.deficienciaAluno || 'Não')
      setDeficienciasSelecionadas(dm.deficienciasSelecionadas || [])
      setAutorizaImagemVoz(dm.autoriza_imagem_voz || 'Não')

      // Correção de concorrência nos motivos de não vacinação
      setMotivoNaoVacinacaoGeral(dm.motivoNaoVacinacaoAluno || '')
      setMotivoNaoVacinacaoCovid(dm.motivoNaoVacinacaoCovidAluno || (dm.situacaoVacinalAluno === 'Não foi vacinado' ? dm.motivoNaoVacinacaoAluno : '') || '')

      const cacheBust = (url: string | null) => {
        if (!url) return null
        return `${url}${url.includes('?') ? '&' : '?'}t=${sessionTimestamp}`
      }
      setAssinaturaResponsavelUrl(cacheBust(dm.assinatura_responsavel_url))
      setAssinaturaFuncionarioUrl(cacheBust(dm.assinatura_funcionario_url))
      setNewSignatureResponsavel(null)
      setNewSignatureFuncionario(null)

    } else {
      // Reset completo para cadastrar aluno novo (Apenas na abertura inicial)
      pessoaForm.resetPessoais()
      setFotoUrl('')
      setFotoFile(null)
      setFotoRemovidaManualmente(false)
      setIsCompressingPhoto(false)
      setEscolaId(escolaAtivaId || '')
      setTurmaId('')
      setSus('')
      setCertidao('')
      setEndereco('')
      setSerie('')
      pessoaForm.setTelMae('')
      pessoaForm.setTelPai('')
      setTipoMatricula('Renovação')
      setDataMatricula(getHojeBrasilia())
      setLocalizacao('Zona Urbana')
      setTurno('Matutino')
      setTurmaLetra('')
      setTransporte(false)
      setRotaTransporte('')
      setRecursosEspeciais('Não')
      setRecursosSelecionados([])
      setDiabete('Não')
      setConvulsoes('Não')
      setAsma('Não')
      setInfeccoes('Não')
      setRestricaoExercicio('Não')
      setCovid('Não')
      setCovidQuando('')
      setSituacaoVacinalCovid('')
      setAlergiaMed('Não')
      setAlergiaMedQuais('')
      setMotivoNaoVacinacaoGeral('')
      setMotivoNaoVacinacaoCovid('')
      setRestricaoAlimentar('Não')
      setRestricaoAlimentarQuais('')
      setSituacaoVacinal('Em dia')
      setRestricoesSaude('')
      setNee('Não')
      setNeeSelecionadas([])
      setDeficiencia('Não')
      setDeficienciasSelecionadas([])
      setAutorizaImagemVoz('Não')
      setAssinaturaResponsavelUrl(null)
      setAssinaturaFuncionarioUrl(null)
      setNewSignatureResponsavel(null)
      setNewSignatureFuncionario(null)
    }

    setCelularSigningCode(null)
    setCelularSigningField(null)
    setSolicitandoLibere(false)
    setJustificativaSolicitacao('')

    checarStatusLiberacao()

    return () => {
      active = false // Desativa se desmontar ou re-executar
    }
  }, [isOpen, alunoEditar?.id])

  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item))
    } else {
      setter([...list, item])
    }
  }

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type || !file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).')
      return
    }

    setIsCompressingPhoto(true)
    const toastId = file.size > 3 * 1024 * 1024 ? toast.loading(`Otimizando foto (${formatBytes(file.size)})...`) : null

    try {
      const result = await compressImageBeforeUpload(file, {
        maxWidth: 2560,
        maxHeight: 2560,
        quality: 0.82,
        mimeType: 'image/webp'
      })

      setFotoFile(result.file)
      setFotoRemovidaManualmente(false)

      const reader = new FileReader()
      reader.onload = () => {
        setFotoUrl(reader.result as string)
      }
      reader.readAsDataURL(result.file)

      if (toastId && result.wasCompressed) {
        toast.success(`Foto otimizada com sucesso! (${formatBytes(result.originalSize)} ➔ ${formatBytes(result.compressedSize)})`, { id: toastId })
      } else if (toastId) {
        toast.dismiss(toastId)
      }
    } catch (err: any) {
      console.error('[handleFotoUpload] Erro ao processar foto:', err)
      if (toastId) toast.dismiss(toastId)
      toast.error(err.message || 'Erro ao processar imagem selecionada.')
    } finally {
      setIsCompressingPhoto(false)
    }
  }

  const handleRemoverFoto = () => {
    setFotoFile(null)
    setFotoUrl('')
    setFotoRemovidaManualmente(true)
  }

  const handleFotoCapturada = (file: File, dataUrl: string) => {
    setFotoFile(file)
    setFotoUrl(dataUrl)
    setFotoRemovidaManualmente(false)
  }

  const handleEnviarSolicitacaoEdicao = async () => {
    if (!justificativaSolicitacao.trim()) {
      toast.error('Por favor, descreva a justificativa para a liberação da ficha.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const { error } = await (supabase
        .from('solicitacoes_edicao_aluno' as any) as any)
        .insert({
          aluno_id: alunoEditar.id,
          solicitante_id: funcionario?.id ?? null,
          justificativa: justificativaSolicitacao,
          status: 'pendente'
        })

      if (error) throw error

      toast.success('Solicitação de liberação enviada com sucesso!')
      setSolicitacaoPendente(true)
      setJustificativaPendente(justificativaSolicitacao)
      setSolicitandoLibere(false)
      setJustificativaSolicitacao('')
    } catch (err: any) {
      toast.error(`Erro ao enviar solicitação: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pessoaForm.nome) {
      toast.error('Preencha o Nome Completo do Aluno.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const nomeFormatado = formatNameTitleCase(pessoaForm.nome)
    const maeFormatada = formatNameTitleCase(pessoaForm.mae)
    const paiFormatado = formatNameTitleCase(pessoaForm.pai)
    const ruaFormatada = formatNameTitleCase(pessoaForm.rua)
    const bairroFormatado = formatNameTitleCase(pessoaForm.bairro)
    const cidadeEndFormatada = formatNameTitleCase(pessoaForm.cidadeEnd)
    const cidadeNascFormatada = formatNameTitleCase(pessoaForm.cidadeNasc)
    const enderecoFormatado = endereco ? formatNameTitleCase(endereco) : ruaFormatada

    const dadosMatriculaObj: any = {
      escolaId,
      nomeAluno: nomeFormatado,
      nascimentoAluno: pessoaForm.nascimento,
      censoAluno: pessoaForm.censo,
      cpfAluno: pessoaForm.cpf,
      telefoneAluno: pessoaForm.telefone,
      estadoCivilAluno: pessoaForm.estadoCivil,
      corRacaAluno: pessoaForm.corRaca,
      sexoAluno: pessoaForm.sexo,
      turmaIdAluno: turmaId,
      rgAluno: pessoaForm.rg,
      nisAluno: pessoaForm.nis,
      susAluno: sus,
      certidaoAluno: certidao,
      nacionalidadeAluno: pessoaForm.nacionalidade,
      cidadeNascAluno: cidadeNascFormatada,
      naturalidadeAluno: cidadeNascFormatada,
      municipio_nascimento: cidadeNascFormatada,
      ufNascAluno: pessoaForm.ufNasc,
      maeAluno: maeFormatada,
      telMaeAluno: pessoaForm.telMae,
      paiAluno: paiFormatado,
      telPaiAluno: pessoaForm.telPai,
      enderecoAluno: enderecoFormatado,
      tipoMatricula,
      dataMatricula,
      localizacaoAluno: localizacao,
      serieAluno: serie,
      turnoAluno: turno,
      turmaAluno: turmaLetra,
      transporteAluno: transporte,
      rotaTransporteAluno: rotaTransporte,
      ruaAluno: ruaFormatada,
      numeroAluno: pessoaForm.numero,
      cepAluno: pessoaForm.cep,
      bairroAluno: bairroFormatado,
      cidadeEndAluno: cidadeEndFormatada,
      ufEndAluno: pessoaForm.ufEnd,
      areaLocalizacaoAluno: pessoaForm.areaLocalizacao,
      areaDiferenciadaAluno: pessoaForm.areaDiferenciada,
      recursosEspeciaisAluno: recursosEspeciais,
      recursosSelecionados,
      diabeteAluno: diabete,
      convulsoesAluno: convulsoes,
      asmaAluno: asma,
      infeccoesAluno: infeccoes,
      restricaoExercicioAluno: restricaoExercicio,
      covidAluno: covid,
      covidQuandoAluno: covidQuando,
      situacaoVacinalAluno: situacaoVacinalCovid,
      alergiaMedAluno: alergiaMed,
      alergiaMedQuais: alergiaMedQuais,
      motivoNaoVacinacaoAluno: motivoNaoVacinacaoGeral,
      motivoNaoVacinacaoCovidAluno: motivoNaoVacinacaoCovid,
      restricaoAlimentarAluno: restricaoAlimentar,
      restricaoAlimentarQuais: restricaoAlimentarQuais,
      situacaoVacinalGeral: situacaoVacinal,
      restricoesSaudeAluno: restricoesSaude,
      neeAluno: nee,
      neeSelecionadas,
      deficienciaAluno: deficiencia,
      deficienciasSelecionadas,
      autoriza_imagem_voz: autorizaImagemVoz,
      assinatura_responsavel_url: (assinaturaResponsavelUrl ? assinaturaResponsavelUrl.split('?')[0] : null) || (alunoEditar?.dados_matricula?.assinatura_responsavel_url ? alunoEditar.dados_matricula.assinatura_responsavel_url.split('?')[0] : null) || null,
      assinatura_funcionario_url: (assinaturaFuncionarioUrl ? assinaturaFuncionarioUrl.split('?')[0] : null) || (alunoEditar?.dados_matricula?.assinatura_funcionario_url ? alunoEditar.dados_matricula.assinatura_funcionario_url.split('?')[0] : null) || null,
      assinatura_responsavel_at: alunoEditar?.dados_matricula?.assinatura_responsavel_at || null,
      assinatura_funcionario_at: alunoEditar?.dados_matricula?.assinatura_funcionario_at || null
    }

    try {
      let finalRespUrl = dadosMatriculaObj.assinatura_responsavel_url
      let finalFuncUrl = dadosMatriculaObj.assinatura_funcionario_url

      const base64ToBlob = (base64: string) => {
        const parts = base64.split(';base64,')
        const contentType = parts[0].split(':')[1]
        const raw = window.atob(parts[1])
        const rawLength = raw.length
        const uInt8Array = new Uint8Array(rawLength)
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i)
        }
        return new Blob([uInt8Array], { type: contentType })
      }

      if (alunoEditar?.id) {
        if (newSignatureResponsavel) {
          const blob = base64ToBlob(newSignatureResponsavel)
          const fileName = `aluno_${alunoEditar.id}_responsavel.png`
          const { error: uploadErr } = await supabase.storage.from('assinaturas_alunos').upload(fileName, blob, { contentType: 'image/png', upsert: true })
          if (uploadErr) throw uploadErr
          const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
          finalRespUrl = pData.publicUrl
          dadosMatriculaObj.assinatura_responsavel_at = new Date().toISOString()
        }
        if (newSignatureFuncionario) {
          const blob = base64ToBlob(newSignatureFuncionario)
          const fileName = `aluno_${alunoEditar.id}_funcionario.png`
          const { error: uploadErr } = await supabase.storage.from('assinaturas_alunos').upload(fileName, blob, { contentType: 'image/png', upsert: true })
          if (uploadErr) throw uploadErr
          const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
          finalFuncUrl = pData.publicUrl
          dadosMatriculaObj.assinatura_funcionario_at = new Date().toISOString()
        }
      }

      dadosMatriculaObj.assinatura_responsavel_url = finalRespUrl
      dadosMatriculaObj.assinatura_funcionario_url = finalFuncUrl

      const isFotoRemoved = fotoRemovidaManualmente && !fotoFile

      const payload: any = {
        nome: nomeFormatado,
        cpf: pessoaForm.cpf || null,
        inep: pessoaForm.censo || null,
        telefone: pessoaForm.telefone || null,
        data_nascimento: pessoaForm.nascimento || null,
        cor_raca: pessoaForm.corRaca || null,
        sexo: pessoaForm.sexo || null,
        municipio_nascimento: cidadeNascFormatada || null,
        uf_nascimento: pessoaForm.ufNasc || null,
        foto_url: isFotoRemoved ? null : (!fotoUrl && !fotoFile ? null : undefined),
        foto_avatar_path: isFotoRemoved ? null : (!fotoUrl && !fotoFile ? null : undefined),
        foto_visualizacao_path: isFotoRemoved ? null : (!fotoUrl && !fotoFile ? null : undefined),
        foto_original_path: isFotoRemoved ? null : (!fotoUrl && !fotoFile ? null : undefined),
        turma_id: turmaId || null,
        rg: pessoaForm.rg || null,
        nis: pessoaForm.nis || null,
        cartao_sus: sus || null,
        certidao_nascimento: certidao || null,
        nome_mae: maeFormatada || null,
        nome_pai: paiFormatado || null,
        endereco: enderecoFormatado || null,
        latitude: pessoaForm.latitude ?? null,
        longitude: pessoaForm.longitude ?? null,
        serie: serie || null,
        escola_id: escolaId || alunoEditar?.escola_id || null,
        dados_matricula: dadosMatriculaObj
      }

      let savedAlunoId = alunoEditar?.id

      if (alunoEditar?.id) {
        const { error } = await (supabase.from('alunos') as any)
          .update(payload)
          .eq('id', alunoEditar.id)
        if (error) throw error

        await logAudit({
          supabase,
          action: 'UPDATE',
          entity: 'alunos',
          entityId: alunoEditar.id,
          oldData: {
            nome: alunoEditar.nome,
            turma_id: alunoEditar.turma_id,
            escola_id: alunoEditar.escola_id,
            dados_matricula: alunoEditar.dados_matricula
          },
          newData: payload,
          performedBy: {
            id: funcionario?.id ?? null,
            name: funcionario?.nome ?? 'Usuário',
            email: funcionario?.email ?? 'sem-email@sig.com',
            cargo: funcionario?.cargo ?? undefined
          }
        })

        fetch('/api/audit/log-e-notificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escolaId: escolaId || alunoEditar?.escola_id,
            titulo: 'Ficha de Aluno Alterada',
            mensagem: `${funcionario?.nome ?? 'Secretaria'} editou a ficha do aluno ${pessoaForm.nome}.`,
            tipoNotificacao: 'edicao_ficha',
            entidade: 'alunos',
            entidadeId: alunoEditar.id,
            acao: 'UPDATE',
            executadoPor: {
              id: funcionario?.id ?? null,
              name: funcionario?.nome ?? 'Usuário',
              email: funcionario?.email ?? 'sem-email@sig.com',
              cargo: funcionario?.cargo ?? undefined
            },
            oldData: { nome: alunoEditar.nome },
            newData: { nome: pessoaForm.nome }
          })
        }).catch(err => console.error('Erro ao notificar diretor:', err))

        // --- UPLOAD OTIMIZADO COM FALLBACK RESILIENTE DE FOTO (EDIÇÃO DE ALUNO) ---
        if (fotoFile) {
          const USE_LEGACY_UPLOAD = process.env.NEXT_PUBLIC_ENABLE_LEGACY_FOTO_UPLOAD === 'true'
          
          if (USE_LEGACY_UPLOAD) {
            try {
              const fileExt = fotoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
              const fileName = `${alunoEditar.id}_${Date.now()}.${fileExt}`

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
                .eq('id', alunoEditar.id)

              await invalidarCacheFoto(publicUrl)
            } catch (err: any) {
              console.error('[useAlunoFormStates] Erro no upload direto legado da foto do aluno:', err)
              toast.error('Aviso: A ficha foi atualizada, mas houve um erro ao salvar a foto.')
            }
          } else {
            const toastFotoId = toast.loading('Processando foto do aluno...')
            try {
              let photoSaved = false

              // 1. Tenta fluxo otimizado no servidor via URL assinada + Sharp
              try {
                const requestId = crypto.randomUUID()
                const presignedRes = await fetch(`/api/fotos/presigned-url?entity=alunos&id=${alunoEditar.id}&fileName=${encodeURIComponent(fotoFile.name)}&requestId=${requestId}`)
                if (presignedRes.ok) {
                  const presignedData = await presignedRes.json()
                  if (presignedData?.signedUrl) {
                    toast.loading('Enviando foto...', { id: toastFotoId })
                    const uploadRes = await fetch(presignedData.signedUrl, {
                      method: 'PUT',
                      headers: { 'Content-Type': fotoFile.type || 'application/octet-stream' },
                      body: fotoFile
                    })
                    if (uploadRes.ok) {
                      toast.loading('Otimizando variantes da foto...', { id: toastFotoId })
                      const processRes = await fetch('/api/fotos/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          entity: 'alunos',
                          id: alunoEditar.id,
                          originalPath: presignedData.path,
                          requestId
                        })
                      })
                      if (processRes.ok) {
                        const processData = await processRes.json()
                        if (processData.success && processData.data?.foto_url) {
                          await invalidarCacheFoto(processData.data.foto_url)
                        }
                        photoSaved = true
                        toast.dismiss(toastFotoId)
                      } else {
                        console.warn('[useAlunoFormStates] Otimização server-side falhou, acionando fallback direto...')
                      }
                    }
                  }
                }
              } catch (serverErr) {
                console.warn('[useAlunoFormStates] Erro na rota de otimização de foto do aluno:', serverErr)
              }

              // 2. Fallback automático resiliente: upload direto no Storage Supabase
              if (!photoSaved) {
                toast.loading('Salvando foto diretamente...', { id: toastFotoId })
                const fileExt = fotoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
                const fileName = `${alunoEditar.id}_${Date.now()}.${fileExt}`

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
                  .eq('id', alunoEditar.id)

                await invalidarCacheFoto(publicUrl)
                toast.dismiss(toastFotoId)
              }
            } catch (err: any) {
              console.error('[useAlunoFormStates] Erro no upload da foto do aluno:', err)
              toast.dismiss(toastFotoId)
              toast.error('Aviso: A ficha foi atualizada, mas houve um erro ao salvar a foto.')
            }
          }
        }
        // --- FIM UPLOAD FOTO (EDIÇÃO) ---

        toast.success('Ficha do aluno atualizada com sucesso!')
      } else {
        const { data: insertedData, error } = await (supabase.from('alunos') as any)
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        savedAlunoId = insertedData.id

        await logAudit({
          supabase,
          action: 'CREATE',
          entity: 'alunos',
          entityId: savedAlunoId,
          newData: payload,
          performedBy: {
            id: funcionario?.id ?? null,
            name: funcionario?.nome ?? 'Usuário',
            email: funcionario?.email ?? 'sem-email@sig.com',
            cargo: funcionario?.cargo ?? undefined
          }
        })

        fetch('/api/audit/log-e-notificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            escolaId: escolaId || payload.escola_id,
            titulo: 'Nova Matrícula de Aluno',
            mensagem: `${funcionario?.nome ?? 'Secretaria'} realizou a matrícula do aluno ${pessoaForm.nome}.`,
            tipoNotificacao: 'matricula',
            entidade: 'alunos',
            entidadeId: savedAlunoId,
            acao: 'CREATE',
            executadoPor: {
              id: funcionario?.id ?? null,
              name: funcionario?.nome ?? 'Usuário',
              email: funcionario?.email ?? 'sem-email@sig.com',
              cargo: funcionario?.cargo ?? undefined
            },
            newData: { nome: pessoaForm.nome }
          })
        }).catch(err => console.error('Erro ao notificar diretor:', err))

        toast.success('Aluno cadastrado com sucesso!')

        // --- UPLOAD OTIMIZADO DE FOTO (CADASTRO NOVO DE ALUNO) ---
        if (fotoFile && savedAlunoId) {
          const USE_LEGACY_UPLOAD = process.env.NEXT_PUBLIC_ENABLE_LEGACY_FOTO_UPLOAD === 'true'
          
          if (USE_LEGACY_UPLOAD) {
            try {
              const fileExt = fotoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
              const fileName = `${savedAlunoId}_${Date.now()}.${fileExt}`

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
                .eq('id', savedAlunoId)

              await invalidarCacheFoto(publicUrl)
            } catch (err: any) {
              console.error('[useAlunoFormStates] Erro no upload da foto do novo aluno:', err)
              toast.error('Aviso: O aluno foi cadastrado, mas houve um erro ao salvar a foto.')
            }
          } else {
            const toastFotoId = toast.loading('Processando foto do aluno...')
            try {
              let photoSaved = false

              // 1. Tenta fluxo otimizado no servidor via URL assinada + Sharp
              try {
                const requestId = crypto.randomUUID()
                const presignedRes = await fetch(`/api/fotos/presigned-url?entity=alunos&id=${savedAlunoId}&fileName=${encodeURIComponent(fotoFile.name)}&requestId=${requestId}`)
                if (presignedRes.ok) {
                  const presignedData = await presignedRes.json()
                  if (presignedData?.signedUrl) {
                    toast.loading('Enviando foto...', { id: toastFotoId })
                    const uploadRes = await fetch(presignedData.signedUrl, {
                      method: 'PUT',
                      headers: { 'Content-Type': fotoFile.type || 'application/octet-stream' },
                      body: fotoFile
                    })
                    if (uploadRes.ok) {
                      toast.loading('Otimizando variantes da foto...', { id: toastFotoId })
                      const processRes = await fetch('/api/fotos/process', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          entity: 'alunos',
                          id: savedAlunoId,
                          originalPath: presignedData.path,
                          requestId
                        })
                      })
                      if (processRes.ok) {
                        const processData = await processRes.json()
                        if (processData.success && processData.data?.foto_url) {
                          await invalidarCacheFoto(processData.data.foto_url)
                        }
                        photoSaved = true
                        toast.dismiss(toastFotoId)
                      } else {
                        console.warn('[useAlunoFormStates] Otimização server-side falhou no novo aluno, acionando fallback direto...')
                      }
                    }
                  }
                }
              } catch (serverErr) {
                console.warn('[useAlunoFormStates] Erro na rota de otimização de foto no novo aluno:', serverErr)
              }

              // 2. Fallback automático resiliente: upload direto no Storage Supabase
              if (!photoSaved) {
                toast.loading('Salvando foto diretamente...', { id: toastFotoId })
                const fileExt = fotoFile.name.split('.').pop()?.toLowerCase() || 'jpg'
                const fileName = `${savedAlunoId}_${Date.now()}.${fileExt}`

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
                  .eq('id', savedAlunoId)

                await invalidarCacheFoto(publicUrl)
                toast.dismiss(toastFotoId)
              }
            } catch (err: any) {
              console.error('[useAlunoFormStates] Erro no upload da foto do novo aluno:', err)
              toast.dismiss(toastFotoId)
              toast.error('Aviso: O aluno foi cadastrado, mas houve um erro ao salvar a foto.')
            }
          }
        }
        // --- FIM UPLOAD FOTO (CADASTRO) ---

        let hasNewSigs = false
        if (newSignatureResponsavel) {
          const blob = base64ToBlob(newSignatureResponsavel)
          const fileName = `aluno_${savedAlunoId}_responsavel.png`
          const { error: uploadErr } = await supabase.storage.from('assinaturas_alunos').upload(fileName, blob, { contentType: 'image/png', upsert: true })
          if (uploadErr) throw uploadErr
          const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
          dadosMatriculaObj.assinatura_responsavel_url = pData.publicUrl
          dadosMatriculaObj.assinatura_responsavel_at = new Date().toISOString()
          hasNewSigs = true
        }
        if (newSignatureFuncionario) {
          const blob = base64ToBlob(newSignatureFuncionario)
          const fileName = `aluno_${savedAlunoId}_funcionario.png`
          const { error: uploadErr } = await supabase.storage.from('assinaturas_alunos').upload(fileName, blob, { contentType: 'image/png', upsert: true })
          if (uploadErr) throw uploadErr
          const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
          dadosMatriculaObj.assinatura_funcionario_url = pData.publicUrl
          dadosMatriculaObj.assinatura_funcionario_at = new Date().toISOString()
          hasNewSigs = true
        }

        if (hasNewSigs) {
          await supabase
            .from('alunos')
            .update({ dados_matricula: dadosMatriculaObj })
            .eq('id', savedAlunoId)
        }
      }

      // Se ambas as assinaturas estão presentes, acionar a geração do PDF e bloqueio
      if (dadosMatriculaObj.assinatura_responsavel_url && dadosMatriculaObj.assinatura_funcionario_url) {
        let clientIp = '127.0.0.1'
        try {
          const ipRes = await fetch('/api/get-ip')
          const ipData = await ipRes.json()
          clientIp = ipData.ip || '127.0.0.1'
        } catch (ipErr) {
          console.error('Erro ao obter IP:', ipErr)
        }

        const ua = navigator.userAgent
        
        if (newSignatureFuncionario) {
          dadosMatriculaObj.assinatura_funcionario_ip = clientIp
          dadosMatriculaObj.assinatura_funcionario_user_agent = ua
          dadosMatriculaObj.assinatura_funcionario_dispositivo = 'Desktop'
          
          await supabase
            .from('alunos')
            .update({ dados_matricula: dadosMatriculaObj })
            .eq('id', savedAlunoId)
        }

        toast.info('Ambas as assinaturas salvas. Compilando PDF oficial com criptografia SHA-256...')
        
        try {
          const pdfRes = await fetch('/api/matricula/gerar-pdf', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alunoId: savedAlunoId })
          })
          
          const pdfData = await pdfRes.json()
          
          if (pdfRes.ok) {
            toast.success('Matrícula homologada e PDF assinado gerado com sucesso!')
            
            if (isEdicaoLiberada) {
              await (supabase
                .from('solicitacoes_edicao_aluno' as any) as any)
                .update({ status: 'finalizado' } as any)
                .eq('aluno_id', savedAlunoId)
                .eq('status', 'aprovado')
            }
          } else {
            console.error('Erro ao gerar PDF oficial:', pdfData.error)
            toast.warning(`Ficha salva, mas a compilação do PDF oficial falhou: ${pdfData.error}`)
          }
        } catch (pdfErr: any) {
          console.error('Erro de conexão ao gerar PDF:', pdfErr)
          toast.warning('Ficha salva, mas falhou a conexão para gerar o PDF assinado oficial.')
        }
      }

      setIsOpen(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar aluno: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return {
    alunoEditar,
    isEditMode,
    isFichaBloqueada,
    loading,
    escolas,
    turmas,
    escolaId,
    setEscolaId,
    fotoUrl,
    setFotoUrl,
    turmaId,
    setTurmaId,
    sus,
    setSus,
    certidao,
    setCertidao,
    endereco,
    setEndereco,
    tipoMatricula,
    setTipoMatricula,
    dataMatricula,
    setDataMatricula,
    localizacao,
    setLocalizacao,
    serie,
    setSerie,
    turno,
    setTurno,
    turmaLetra,
    setTurmaLetra,
    transporte,
    setTransporte,
    rotaTransporte,
    setRotaTransporte,
    situacaoVacinal,
    setSituacaoVacinal,
    restricoesSaude,
    setRestricoesSaude,
    recursosEspeciais,
    setRecursosEspeciais,
    recursosSelecionados,
    setRecursosSelecionados,
    diabete,
    setDiabete,
    convulsoes,
    setConvulsoes,
    asma,
    setAsma,
    infeccoes,
    setInfeccoes,
    restricaoExercicio,
    setRestricaoExercicio,
    covid,
    setCovid,
    covidQuando,
    setCovidQuando,
    situacaoVacinalCovid,
    setSituacaoVacinalCovid,
    alergiaMed,
    setAlergiaMed,
    alergiaMedQuais,
    setAlergiaMedQuais,
    motivoNaoVacinacaoGeral,
    setMotivoNaoVacinacaoGeral,
    motivoNaoVacinacaoCovid,
    setMotivoNaoVacinacaoCovid,
    restricaoAlimentar,
    setRestricaoAlimentar,
    restricaoAlimentarQuais,
    setRestricaoAlimentarQuais,
    nee,
    setNee,
    neeSelecionadas,
    setNeeSelecionadas,
    deficiencia,
    setDeficiencia,
    deficienciasSelecionadas,
    setDeficienciasSelecionadas,
    autorizaImagemVoz,
    setAutorizaImagemVoz,
    assinaturaResponsavelUrl,
    setAssinaturaResponsavelUrl,
    assinaturaFuncionarioUrl,
    setAssinaturaFuncionarioUrl,
    newSignatureResponsavel,
    setNewSignatureResponsavel,
    newSignatureFuncionario,
    setNewSignatureFuncionario,
    celularSigningField,
    setCelularSigningField,
    celularSigningCode,
    setCelularSigningCode,
    isEdicaoLiberada,
    solicitandoLibere,
    setSolicitandoLibere,
    solicitacaoPendente,
    setSolicitacaoPendente,
    justificativaSolicitacao,
    setJustificativaSolicitacao,
    justificativaPendente,
    setJustificativaPendente,
    signatureSectionRef,
    handleEnviarSolicitacaoEdicao,
    iniciarAssinaturaCelular,
    cancelarAssinaturaCelular,
    clearDatabaseCodes,
    isCompressingPhoto,
    handleFotoUpload,
    handleFotoCapturada,
    handleRemoverFoto,
    toggleArrayItem,
    handleSubmit,
    ...pessoaForm
  }
}
