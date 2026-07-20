'use client'

import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { usePessoaForm } from '@/hooks/usePessoaForm'
import { useAlunoSignaturePolling } from './useAlunoSignaturePolling'
import { AlunoFormContextType, ModalAlunoProps } from '../types'

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
  const { funcionario, escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()
  const [loading, setLoading] = useState(false)

  // Buscar turmas via useSWR com cache estendido
  const { data: tData } = useSWR(
    isOpen ? 'catalogo_turmas_todas' : null,
    async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome, ano_letivo, school_id:escola_id')
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
  const [dataMatricula, setDataMatricula] = useState(new Date().toISOString().split('T')[0])
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
  const [autorizaImagemVoz, setAutorizaImagemVoz] = useState('Não')
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
    let active = true // Evita race conditions em chamadas assíncronas

    const checarStatusLiberacao = async () => {
      if (!alunoEditar?.id) {
        if (active) {
          setIsEdicaoLiberada(false)
          setSolicitacaoPendente(false)
        }
        return
      }
      const supabase = createClient()
      const { data: rawSol } = await (supabase
        .from('solicitacoes_edicao_aluno' as any) as any)
        .select('*')
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

    if (isOpen) {
      if (alunoEditar) {
        const dm = alunoEditar.dados_matricula || {}
        pessoaForm.populatePessoais({ ...alunoEditar, ...dm })
        setFotoUrl(alunoEditar.foto_url || '')
        setEscolaId(alunoEditar.escola_id || '')
        setTurmaId(alunoEditar.turma_id || '')
        setSus(alunoEditar.cartao_sus || dm.susAluno || '')
        setCertidao(alunoEditar.certidao_nascimento || dm.certidaoAluno || '')
        setEndereco(alunoEditar.endereco || dm.enderecoAluno || '')
        setSerie(alunoEditar.serie || dm.serieAluno || '')

        pessoaForm.setTelMae(dm.telMaeAluno || '')
        pessoaForm.setTelPai(dm.telPaiAluno || '')
        setTipoMatricula(dm.tipoMatricula || 'Renovação')
        setDataMatricula(dm.dataMatricula || new Date().toISOString().split('T')[0])
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
        // Reset completo para cadastrar aluno novo
        pessoaForm.resetPessoais()
        setFotoUrl('')
        setEscolaId(escolaAtivaId || '')
        setTurmaId('')
        setSus('')
        setCertidao('')
        setEndereco('')
        setSerie('')
        pessoaForm.setTelMae('')
        pessoaForm.setTelPai('')
        setTipoMatricula('Renovação')
        setDataMatricula(new Date().toISOString().split('T')[0])
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
    }

    return () => {
      active = false // Desativa se desmonatar ou re-executar
    }
  }, [isOpen, alunoEditar, escolaAtivaId])

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

    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `aluno_${Date.now()}.${fileExt}`
    toast.loading('Enviando foto 3x4...')

    const { data, error } = await supabase.storage
        .from('fotos_alunos')
        .upload(fileName, file, { cacheControl: '31536000' })

    toast.dismiss()

    if (error) {
      toast.error(`Erro no upload da foto: ${error.message}`)
      return
    }

    const { data: publicData } = supabase.storage
        .from('fotos_alunos')
        .getPublicUrl(fileName)

    setFotoUrl(publicData.publicUrl)
    toast.success('Foto enviada com sucesso!')
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

    const dadosMatriculaObj: any = {
      escolaId,
      nomeAluno: pessoaForm.nome,
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
      cidadeNascAluno: pessoaForm.cidadeNasc,
      ufNascAluno: pessoaForm.ufNasc,
      maeAluno: pessoaForm.mae,
      telMaeAluno: pessoaForm.telMae,
      paiAluno: pessoaForm.pai,
      telPaiAluno: pessoaForm.telPai,
      enderecoAluno: endereco,
      tipoMatricula,
      dataMatricula,
      localizacaoAluno: localizacao,
      serieAluno: serie,
      turnoAluno: turno,
      turmaAluno: turmaLetra,
      transporteAluno: transporte,
      rotaTransporteAluno: rotaTransporte,
      ruaAluno: pessoaForm.rua,
      numeroAluno: pessoaForm.numero,
      cepAluno: pessoaForm.cep,
      bairroAluno: pessoaForm.bairro,
      cidadeEndAluno: pessoaForm.cidadeEnd,
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

      const payload: any = {
        nome: pessoaForm.nome,
        cpf: pessoaForm.cpf || null,
        inep: pessoaForm.censo || null,
        telefone: pessoaForm.telefone || null,
        data_nascimento: pessoaForm.nascimento || null,
        foto_url: fotoUrl || null,
        turma_id: turmaId || null,
        rg: pessoaForm.rg || null,
        nis: pessoaForm.nis || null,
        cartao_sus: sus || null,
        certidao_nascimento: certidao || null,
        nome_mae: pessoaForm.mae || null,
        nome_pai: pessoaForm.pai || null,
        endereco: endereco || pessoaForm.rua || null,
        latitude: pessoaForm.latitude ?? null,
        longitude: pessoaForm.longitude ?? null,
        serie: serie || null,
        dados_matricula: dadosMatriculaObj
      }

      if (!alunoEditar?.id) {
        payload.escola_id = escolaId || null
      }

      let savedAlunoId = alunoEditar?.id

      if (alunoEditar?.id) {
        const { error } = await (supabase.from('alunos') as any)
          .update(payload)
          .eq('id', alunoEditar.id)
        if (error) throw error
        toast.success('Ficha do aluno atualizada com sucesso!')
      } else {
        const { data: insertedData, error } = await (supabase.from('alunos') as any)
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        savedAlunoId = insertedData.id
        toast.success('Aluno cadastrado com sucesso!')

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
    handleFotoUpload,
    toggleArrayItem,
    handleSubmit,
    ...pessoaForm
  }
}
