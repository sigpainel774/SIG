'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, UserPlus, Save, X, PenTool, CheckSquare, Smartphone, QrCode, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { MiniMapa } from '@/components/map/MapWrapper'
import { SignaturePad } from '@/components/ui/SignaturePad'
import { useEditModeStore } from '@/store/useEditModeStore'

interface ModalAlunoProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  alunoEditar?: any
  onSuccess?: () => void
}

export function ModalAluno({ open, onOpenChange, trigger, alunoEditar, onSuccess }: ModalAlunoProps) {
  const { isEditMode } = useEditModeStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [turmas, setTurmas] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])

  const activeOpen = open !== undefined ? open : isOpen
  const handleOpenChange = (val: boolean) => {
    if (!val) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      setCelularSigningCode(null)
      setCelularSigningField(null)
    }
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
  }

  // 0. Escola Seletor
  const [escolaId, setEscolaId] = useState('')

  // 1. Identificação Básica
  const [fotoUrl, setFotoUrl] = useState('')
  const [nome, setNome] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [censo, setCenso] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [estadoCivil, setEstadoCivil] = useState('Solteiro')
  const [corRaca, setCorRaca] = useState('')
  const [sexo, setSexo] = useState('')

  // 2. Turma Vinculada
  const [turmaId, setTurmaId] = useState('')

  // 3. Documentos
  const [rg, setRg] = useState('')
  const [nis, setNis] = useState('')
  const [sus, setSus] = useState('')
  const [certidao, setCertidao] = useState('')
  const [nacionalidade, setNacionalidade] = useState('BRASILEIRA')
  const [cidadeNasc, setCidadeNasc] = useState('')
  const [ufNasc, setUfNasc] = useState('BA')

  // 4. Filiação e Contato
  const [mae, setMae] = useState('')
  const [telMae, setTelMae] = useState('')
  const [pai, setPai] = useState('')
  const [telPai, setTelPai] = useState('')
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

  // 7. Endereço Residencial Detalhado
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [cep, setCep] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidadeEnd, setCidadeEnd] = useState('SAPE AÇU')
  const [ufEnd, setUfEnd] = useState('BA')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [areaLocalizacao, setAreaLocalizacao] = useState('Urbana')
  const [areaDiferenciada, setAreaDiferenciada] = useState('Não está em área diferenciada')

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
  const [motivoNaoVacinacao, setMotivoNaoVacinacao] = useState('')
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
  
  // Fluxo de celular
  const [celularSigningField, setCelularSigningField] = useState<'resp' | 'func' | null>(null)
  const [celularSigningCode, setCelularSigningCode] = useState<string | null>(null)
  const pollingRef = useRef<any>(null)

  // Lista de Opções para Checkboxes
  const OPCOES_RECURSOS = [
    'Auxílio leitor',
    'Tradutor/intérprete de Libras',
    'Leitura Labial',
    'Material em Braille',
    'Auxílio transcrição',
    'Prova fonte 16',
    'Guia intérprete',
    'Prova fonte 18',
    'Vídeo Libras',
    'CD áudio',
    'LP Segunda Língua'
  ]

  const OPCOES_NEE = [
    'Desenvolvimento de funções cognitivas',
    'Desenvolvimento de vida autônoma',
    'Enriquecimento curricular',
    'Ensino de informática acessível',
    'Ensino do Sistema Braille',
    'Língua Portuguesa como Segunda Língua',
    'Técnicas de cálculo no Soroban',
    'Orientação e mobilidade',
    'Comunicação Alternativa e Aumentativa',
    'Transtorno do Espectro Autista',
    'Altas habilidades/Superdotação'
  ]

  const OPCOES_DEFICIENCIA = [
    'Baixa visão',
    'Surdez',
    'Deficiência Intelectual',
    'Cegueira',
    'Surdocegueira',
    'Deficiência múltipla',
    'Deficiência auditiva',
    'Deficiência Física'
  ]

  useEffect(() => {
    if (activeOpen) {
      carregarDadosIniciais()
    }
  }, [activeOpen])

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (alunoEditar) {
      const dm = alunoEditar.dados_matricula || {}
      setNome(alunoEditar.nome || '')
      setCpf(alunoEditar.cpf || dm.cpfAluno || '')
      setCenso(alunoEditar.inep || dm.censoAluno || '')
      setTelefone(alunoEditar.telefone || dm.telefoneAluno || '')
      setNascimento(alunoEditar.data_nascimento || dm.nascimentoAluno || '')
      setFotoUrl(alunoEditar.foto_url || '')
      setEscolaId(alunoEditar.escola_id || '')
      setTurmaId(alunoEditar.turma_id || '')
      setRg(alunoEditar.rg || dm.rgAluno || '')
      setNis(alunoEditar.nis || dm.nisAluno || '')
      setSus(alunoEditar.cartao_sus || dm.susAluno || '')
      setCertidao(alunoEditar.certidao_nascimento || dm.certidaoAluno || '')
      setMae(alunoEditar.nome_mae || dm.maeAluno || '')
      setPai(alunoEditar.nome_pai || dm.paiAluno || '')
      setEndereco(alunoEditar.endereco || dm.enderecoAluno || '')
      setSerie(alunoEditar.serie || dm.serieAluno || '')

      setEstadoCivil(dm.estadoCivilAluno || 'Solteiro')
      setCorRaca(dm.corRacaAluno || '')
      setSexo(dm.sexoAluno || '')
      setNacionalidade(dm.nacionalidadeAluno || 'BRASILEIRA')
      setCidadeNasc(dm.cidadeNascAluno || '')
      setUfNasc(dm.ufNascAluno || 'BA')
      setTelMae(dm.telMaeAluno || '')
      setTelPai(dm.telPaiAluno || '')
      setTipoMatricula(dm.tipoMatricula || 'Renovação')
      setDataMatricula(dm.dataMatricula || new Date().toISOString().split('T')[0])
      setLocalizacao(dm.localizacaoAluno || 'Zona Urbana')
      setTurno(dm.turnoAluno || 'Matutino')
      setTurmaLetra(dm.turmaAluno || '')
      setTransporte(!!dm.transporteAluno)
      setRotaTransporte(dm.rotaTransporteAluno || '')
      setRua(dm.ruaAluno || '')
      setNumero(dm.numeroAluno || '')
      setCep(dm.cepAluno || '')
      setBairro(dm.bairroAluno || '')
      setCidadeEnd(dm.cidadeEndAluno || 'SAPE AÇU')
      setUfEnd(dm.ufEndAluno || 'BA')
      setAreaLocalizacao(dm.areaLocalizacaoAluno || 'Urbana')
      setAreaDiferenciada(dm.areaDiferenciadaAluno || 'Não está em área diferenciada')
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
      setMotivoNaoVacinacao(dm.motivoNaoVacinacaoAluno || '')
      setRestricaoAlimentar(dm.restricaoAlimentarAluno || 'Não')
      setRestricaoAlimentarQuais(dm.restricaoAlimentarQuaisAluno || '')
      setSituacaoVacinal(dm.situacaoVacinalGeral || 'Em dia')
      setRestricoesSaude(dm.restricoesSaudeAluno || '')
      setNee(dm.neeAluno || 'Não')
      setNeeSelecionadas(dm.neeSelecionadas || [])
      setDeficiencia(dm.deficienciaAluno || 'Não')
      setDeficienciasSelecionadas(dm.deficienciasSelecionadas || [])
      setLatitude(alunoEditar.latitude ? Number(alunoEditar.latitude) : null)
      setLongitude(alunoEditar.longitude ? Number(alunoEditar.longitude) : null)
      
      setAutorizaImagemVoz(dm.autoriza_imagem_voz || 'Não')
      setAssinaturaResponsavelUrl(dm.assinatura_responsavel_url || null)
      setAssinaturaFuncionarioUrl(dm.assinatura_funcionario_url || null)
      setNewSignatureResponsavel(null)
      setNewSignatureFuncionario(null)
    } else {
      setLatitude(null)
      setLongitude(null)
      setAutorizaImagemVoz('Não')
      setAssinaturaResponsavelUrl(null)
      setAssinaturaFuncionarioUrl(null)
      setNewSignatureResponsavel(null)
      setNewSignatureFuncionario(null)
    }

    // Limpar qualquer polling rodando ao trocar ou recarregar
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setCelularSigningCode(null)
    setCelularSigningField(null)
  }, [alunoEditar])

  const carregarDadosIniciais = async () => {
    const supabase = createClient()
    const { data: tData } = await supabase.from('turmas').select('id, nome, ano_letivo, escola_id').is('deleted_at', null)
    if (tData) setTurmas(tData)

    const { data: eData } = await supabase
      .from('escolas')
      .select('id, nome')
      .is('deleted_at', null)
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (eData) setEscolas(eData)
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
      .upload(fileName, file)

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

  const toggleArrayItem = (list: string[], item: string, setter: (val: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter(i => i !== item))
    } else {
      setter([...list, item])
    }
  }

  const iniciarAssinaturaCelular = async (tipo: 'resp' | 'func') => {
    if (!alunoEditar?.id) {
      toast.error('Por favor, salve a ficha do aluno primeiro para poder usar a assinatura pelo celular.')
      return
    }

    const codeTemp = Math.floor(1000 + Math.random() * 9000).toString()
    setCelularSigningField(tipo)
    setCelularSigningCode(codeTemp)

    const supabase = createClient()
    const columnName = tipo === 'resp' ? 'codigo_temp_resp' : 'codigo_temp_func'

    try {
      const { error } = await supabase
        .from('alunos')
        .update({ [columnName]: codeTemp } as any)
        .eq('id', alunoEditar.id)

      if (error) throw error

      toast.success('Código temporário gerado! Aponte o celular ou informe o código.')

      // Cancelar polling anterior
      if (pollingRef.current) clearInterval(pollingRef.current)

      // Iniciar Polling
      pollingRef.current = setInterval(async () => {
        const { data, error: pollError } = await supabase
          .from('alunos')
          .select('dados_matricula, codigo_temp_resp, codigo_temp_func')
          .eq('id', alunoEditar.id)
          .single()

        if (pollError) return

        if (data) {
          const dm = data.dados_matricula as Record<string, any> || {}
          const codeValue = tipo === 'resp' ? data.codigo_temp_resp : data.codigo_temp_func
          const sigUrl = tipo === 'resp' ? dm.assinatura_responsavel_url : dm.assinatura_funcionario_url

          // Se o código sumiu e a URL foi setada no celular
          if (!codeValue && sigUrl) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }
            if (tipo === 'resp') {
              setAssinaturaResponsavelUrl(sigUrl)
            } else {
              setAssinaturaFuncionarioUrl(sigUrl)
            }
            setCelularSigningCode(null)
            setCelularSigningField(null)
            toast.success(`Assinatura do ${tipo === 'resp' ? 'Responsável' : 'Funcionário'} capturada com sucesso!`)
          }
        }
      }, 3000)
    } catch (err: any) {
      toast.error(`Erro ao iniciar assinatura por celular: ${err.message}`)
      setCelularSigningField(null)
      setCelularSigningCode(null)
    }
  }

  const cancelarAssinaturaCelular = async () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (alunoEditar?.id && celularSigningField) {
      const supabase = createClient()
      const columnName = celularSigningField === 'resp' ? 'codigo_temp_resp' : 'codigo_temp_func'
      await supabase
        .from('alunos')
        .update({ [columnName]: null } as any)
        .eq('id', alunoEditar.id)
    }

    setCelularSigningCode(null)
    setCelularSigningField(null)
    toast.info('Assinatura pelo celular cancelada.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome) {
      toast.error('Preencha o Nome Completo do Aluno.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const dadosMatriculaObj: any = {
      escolaId,
      nomeAluno: nome,
      nascimentoAluno: nascimento,
      censoAluno: censo,
      cpfAluno: cpf,
      telefoneAluno: telefone,
      estadoCivilAluno: estadoCivil,
      corRacaAluno: corRaca,
      sexoAluno: sexo,
      turmaIdAluno: turmaId,
      rgAluno: rg,
      nisAluno: nis,
      susAluno: sus,
      certidaoAluno: certidao,
      nacionalidadeAluno: nacionalidade,
      cidadeNascAluno: cidadeNasc,
      ufNascAluno: ufNasc,
      maeAluno: mae,
      telMaeAluno: telMae,
      paiAluno: pai,
      telPaiAluno: telPai,
      enderecoAluno: endereco,
      tipoMatricula,
      dataMatricula,
      localizacaoAluno: localizacao,
      serieAluno: serie,
      turnoAluno: turno,
      turmaAluno: turmaLetra,
      transporteAluno: transporte,
      rotaTransporteAluno: rotaTransporte,
      ruaAluno: rua,
      numeroAluno: numero,
      cepAluno: cep,
      bairroAluno: bairro,
      cidadeEndAluno: cidadeEnd,
      ufEndAluno: ufEnd,
      areaLocalizacaoAluno: areaLocalizacao,
      areaDiferenciadaAluno: areaDiferenciada,
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
      motivoNaoVacinacaoAluno: motivoNaoVacinacao,
      restricaoAlimentarAluno: restricaoAlimentar,
      restricaoAlimentarQuais: restricaoAlimentarQuais,
      situacaoVacinalGeral: situacaoVacinal,
      restricoesSaudeAluno: restricoesSaude,
      neeAluno: nee,
      neeSelecionadas,
      deficienciaAluno: deficiencia,
      deficienciasSelecionadas,
      autoriza_imagem_voz: autorizaImagemVoz,
      assinatura_responsavel_url: assinaturaResponsavelUrl || alunoEditar?.dados_matricula?.assinatura_responsavel_url || null,
      assinatura_funcionario_url: assinaturaFuncionarioUrl || alunoEditar?.dados_matricula?.assinatura_funcionario_url || null
    }

    try {
      let finalRespUrl = dadosMatriculaObj.assinatura_responsavel_url
      let finalFuncUrl = dadosMatriculaObj.assinatura_funcionario_url

      // Função auxiliar para converter base64 em blob
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
        }
        if (newSignatureFuncionario) {
          const blob = base64ToBlob(newSignatureFuncionario)
          const fileName = `aluno_${alunoEditar.id}_funcionario.png`
          const { error: uploadErr } = await supabase.storage.from('assinaturas_alunos').upload(fileName, blob, { contentType: 'image/png', upsert: true })
          if (uploadErr) throw uploadErr
          const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
          finalFuncUrl = pData.publicUrl
        }
      }

      dadosMatriculaObj.assinatura_responsavel_url = finalRespUrl
      dadosMatriculaObj.assinatura_funcionario_url = finalFuncUrl

      const payload: any = {
        nome,
        cpf: cpf || null,
        inep: censo || null,
        telefone: telefone || null,
        data_nascimento: nascimento || null,
        foto_url: fotoUrl || null,
        escola_id: escolaId || null,
        turma_id: turmaId || null,
        rg: rg || null,
        nis: nis || null,
        cartao_sus: sus || null,
        certidao_nascimento: certidao || null,
        nome_mae: mae || null,
        nome_pai: pai || null,
        endereco: endereco || rua || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        serie: serie || null,
        dados_matricula: dadosMatriculaObj
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
          hasNewSigs = true
        }
        if (newSignatureFuncionario) {
          const blob = base64ToBlob(newSignatureFuncionario)
          const fileName = `aluno_${savedAlunoId}_funcionario.png`
          const { error: uploadErr } = await supabase.storage.from('assinaturas_alunos').upload(fileName, blob, { contentType: 'image/png', upsert: true })
          if (uploadErr) throw uploadErr
          const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
          dadosMatriculaObj.assinatura_funcionario_url = pData.publicUrl
          hasNewSigs = true
        }

        if (hasNewSigs) {
          await supabase
            .from('alunos')
            .update({ dados_matricula: dadosMatriculaObj })
            .eq('id', savedAlunoId)
        }
      }

      handleOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao salvar aluno: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={activeOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as any} />}
      <DialogContent className="sm:max-w-[1200px] w-[95vw] max-h-[90vh] bg-[#181818] border border-[#2a2a2a] text-[#f1f1f1] p-0 overflow-hidden flex flex-col rounded-xl shadow-2xl">
        
        {/* Cabeçalho Fixo (Sticky) */}
        <DialogHeader className="sticky top-0 z-10 bg-[#181818] border-b border-[#2a2a2a] px-6 py-4 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-[#3ea6ff]" />
            {alunoEditar ? 'Editar Ficha do Aluno' : 'Cadastro Completo de Aluno'}
          </DialogTitle>
        </DialogHeader>

        {/* Formulário com Scroll discreto */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-[#181818]">
          
          {/* 0. Seletor de Escola */}
          {escolas.length > 0 && (
            <div className="bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
              <Label className="text-xs text-gray-400 font-bold uppercase">Escola / Unidade Escolar</Label>
              <Select value={escolaId} onValueChange={(val) => setEscolaId(val || '')}>
                <SelectTrigger className="bg-[#181818] border-[#2a2a2a] text-white mt-1">
                  <SelectValue placeholder="Selecione a Escola">
                    {escolaId 
                      ? (escolas.find((esc) => esc.id === escolaId)?.nome || (escolas.length === 0 ? 'Carregando...' : escolaId))
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  {escolas.map((esc) => (
                    <SelectItem key={esc.id} value={esc.id}>{esc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 1. Identificação Básica */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              1. Identificação Básica
            </div>

            {/* Foto 3x4 Upload */}
            <div className="flex items-center gap-4 p-3 mb-4 rounded-xl bg-[#121212] border border-[#2a2a2a]">
              <div 
                onClick={() => document.getElementById('modalFotoAlunoInput')?.click()}
                className="w-20 h-20 rounded-full bg-[#181818] border-2 border-[#3ea6ff] flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
              >
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Foto Aluno" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-white">Foto 3x4 do Aluno</Label>
                <p className="text-xs text-gray-400 mt-0.5">Clique no círculo para selecionar a imagem.</p>
                <input 
                  id="modalFotoAlunoInput" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFotoUpload} 
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-300">Nome Completo do Aluno *</Label>
                <Input 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  placeholder="Nome do Aluno" 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1 focus:border-[#3ea6ff]" 
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">Data de Nascimento</Label>
                  <Input 
                    type="date" 
                    value={nascimento} 
                    onChange={(e) => setNascimento(e.target.value)} 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Código INEP (Censo)</Label>
                  <Input 
                    value={censo} 
                    onChange={(e) => setCenso(e.target.value)} 
                    placeholder="87426482" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">CPF do Aluno</Label>
                  <Input 
                    value={cpf} 
                    onChange={(e) => setCpf(e.target.value)} 
                    placeholder="000.000.000-00" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">Estado Civil</Label>
                  <Select value={estadoCivil} onValueChange={(val) => setEstadoCivil(val || 'Solteiro')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Solteiro">Solteiro</SelectItem>
                      <SelectItem value="Casado">Casado</SelectItem>
                      <SelectItem value="Não declared">Não declarado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Telefone do Aluno</Label>
                  <Input 
                    value={telefone} 
                    onChange={(e) => setTelefone(e.target.value)} 
                    placeholder="(75) 99999-0000" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Cor / Raça</Label>
                  <Select value={corRaca} onValueChange={(val) => setCorRaca(val || '')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Branca">Branca</SelectItem>
                      <SelectItem value="Preta">Preta</SelectItem>
                      <SelectItem value="Parda">Parda</SelectItem>
                      <SelectItem value="Indígena">Indígena</SelectItem>
                      <SelectItem value="Amarela">Amarela</SelectItem>
                      <SelectItem value="Não declarado">Não declarado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Sexo</Label>
                  <Select value={sexo} onValueChange={(val) => setSexo(val || '')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Turma Vinculada */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              2. Turma Vinculada
            </div>
            <div>
              <Label className="text-xs text-gray-300">Selecione a Turma no Sistema</Label>
              <Select value={turmaId} onValueChange={(val) => setTurmaId(val || '')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue placeholder="Selecione uma turma ativa">
                    {turmaId 
                      ? (() => {
                          const t = turmas.find((x) => x.id === turmaId);
                          return t ? `${t.nome} (${t.ano_letivo})` : (turmas.length === 0 ? 'Carregando...' : turmaId);
                        })()
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  {turmas.filter(t => t.escola_id === escolaId).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome} ({t.ano_letivo})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 3. Documentos */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              3. Documentos
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">Nº Identidade (RG)</Label>
                  <Input 
                    value={rg} 
                    onChange={(e) => setRg(e.target.value)} 
                    placeholder="0908272363" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Nº do NIS</Label>
                  <Input 
                    value={nis} 
                    onChange={(e) => setNis(e.target.value)} 
                    placeholder="817873766358" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Nº Cartão do SUS</Label>
                  <Input 
                    value={sus} 
                    onChange={(e) => setSus(e.target.value)} 
                    placeholder="43287492838" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-300">Certidão de Nascimento (Modelo antigo ou número de matrícula)</Label>
                <Input 
                  value={certidao} 
                  onChange={(e) => setCertidao(e.target.value)} 
                  placeholder="82882728929824415" 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">Nacionalidade</Label>
                  <Input 
                    value={nacionalidade} 
                    onChange={(e) => setNacionalidade(e.target.value)} 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Cidade de Nasc.</Label>
                  <Input 
                    value={cidadeNasc} 
                    onChange={(e) => setCidadeNasc(e.target.value)} 
                    placeholder="Salvador" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">UF Nasc.</Label>
                  <Input 
                    value={ufNasc} 
                    maxLength={2}
                    onChange={(e) => setUfNasc(e.target.value.toUpperCase())} 
                    placeholder="BA" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Filiação e Contato */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              4. Filiação e Contato
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-300">Nome da Mãe *</Label>
                  <Input 
                    value={mae} 
                    onChange={(e) => setMae(e.target.value)} 
                    placeholder="Nome Completo da Mãe" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Telefone da Mãe</Label>
                  <Input 
                    value={telMae} 
                    onChange={(e) => setTelMae(e.target.value)} 
                    placeholder="(75) 98237-4736" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs text-gray-300">Nome do Pai</Label>
                  <Input 
                    value={pai} 
                    onChange={(e) => setPai(e.target.value)} 
                    placeholder="Nome Completo do Pai" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Telefone do Pai</Label>
                  <Input 
                    value={telPai} 
                    onChange={(e) => setTelPai(e.target.value)} 
                    placeholder="(75) 98882-7645" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-300">Endereço Completo (Rua, Nº, Bairro)</Label>
                <Input 
                  value={endereco} 
                  onChange={(e) => setEndereco(e.target.value)} 
                  placeholder="Endereço Completo" 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                />
              </div>
            </div>
          </div>

          {/* 5. Informações da Matrícula & Etapa */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              5. Ano / Etapa de Escolarização & Matrícula
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-300">Tipo de Matrícula</Label>
                <Select value={tipoMatricula} onValueChange={(val) => setTipoMatricula(val || 'Renovação')}>
                  <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                    <SelectItem value="Nova Matrícula">Nova Matrícula</SelectItem>
                    <SelectItem value="Renovação">Renovação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-gray-300">Data da Matrícula</Label>
                <Input 
                  type="date" 
                  value={dataMatricula} 
                  onChange={(e) => setDataMatricula(e.target.value)} 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                />
              </div>

              <div>
                <Label className="text-xs text-gray-300">Ano / Série / Etapa</Label>
                <Input 
                  value={serie} 
                  onChange={(e) => setSerie(e.target.value)} 
                  placeholder="Ex: 3º ANO" 
                  className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                />
              </div>

              <div>
                <Label className="text-xs text-gray-300">Turno</Label>
                <Select value={turno} onValueChange={(val) => setTurno(val || 'Matutino')}>
                  <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                    <SelectItem value="Matutino">Matutino</SelectItem>
                    <SelectItem value="Vespertino">Vespertino</SelectItem>
                    <SelectItem value="Noturno">Noturno</SelectItem>
                    <SelectItem value="Integral">Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 6. Saúde e Transporte Escolar */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              6. Transporte Escolar
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center bg-[#121212] p-3 rounded-xl border border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="chkTransporte" 
                  checked={transporte} 
                  onChange={(e) => setTransporte(e.target.checked)}
                  className="w-4 h-4 accent-[#3ea6ff] rounded bg-[#181818] border-[#2a2a2a]"
                />
                <label htmlFor="chkTransporte" className="text-sm font-semibold text-white cursor-pointer">
                  Utiliza Transporte Público?
                </label>
              </div>

              {transporte && (
                <div>
                  <Label className="text-xs text-gray-300">Qual a Rota do Transporte?</Label>
                  <Input 
                    value={rotaTransporte} 
                    onChange={(e) => setRotaTransporte(e.target.value)} 
                    placeholder="Ex: Rota 02 - Zona Rural" 
                    className="bg-[#181818] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 items-start">
              <div>
                <Label className="text-xs text-gray-300">Situação Vacinal Geral</Label>
                <Select value={situacaoVacinal} onValueChange={(val) => setSituacaoVacinal(val || 'Em dia')}>
                  <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                    <SelectItem value="Em dia">Em dia</SelectItem>
                    <SelectItem value="Atrasada">Atrasada</SelectItem>
                    <SelectItem value="Não Vacinado">Não Vacinado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {situacaoVacinal !== 'Em dia' && (
                <div>
                  <Label className="text-xs text-gray-300">Motivo de não vacinação / atraso</Label>
                  <Input 
                    value={motivoNaoVacinacao} 
                    onChange={(e) => setMotivoNaoVacinacao(e.target.value)} 
                    placeholder="Opção da família / Recomendação" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              )}
            </div>

            <div className="mt-3">
              <Label className="text-xs text-gray-300">Outras observações de saúde</Label>
              <Input 
                value={restricoesSaude} 
                onChange={(e) => setRestricoesSaude(e.target.value)} 
                placeholder="Alergias, cuidados especiais, etc." 
                className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
              />
            </div>
          </div>

          {/* 7. Endereço Residencial Detalhado */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              7. Endereço Residencial Detalhado
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-3">
                  <Label className="text-xs text-gray-300">Rua / Logradouro</Label>
                  <Input 
                    value={rua} 
                    onChange={(e) => setRua(e.target.value)} 
                    placeholder="Rua do Brito" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Nº</Label>
                  <Input 
                    value={numero} 
                    onChange={(e) => setNumero(e.target.value)} 
                    placeholder="78" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">CEP</Label>
                  <Input 
                    value={cep} 
                    onChange={(e) => setCep(e.target.value)} 
                    placeholder="44540000" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Bairro / Localidade</Label>
                  <Input 
                    value={bairro} 
                    onChange={(e) => setBairro(e.target.value)} 
                    placeholder="Brito" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Cidade</Label>
                  <Input 
                    value={cidadeEnd} 
                    onChange={(e) => setCidadeEnd(e.target.value)} 
                    placeholder="SAPE AÇU" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-300">UF</Label>
                  <Input 
                    value={ufEnd} 
                    maxLength={2}
                    onChange={(e) => setUfEnd(e.target.value.toUpperCase())} 
                    placeholder="BA" 
                    className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">Área de localização da residência</Label>
                  <Select value={areaLocalizacao} onValueChange={(val) => setAreaLocalizacao(val || 'Urbana')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Urbana">Urbana</SelectItem>
                      <SelectItem value="Rural">Rural</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-300">Residência em Área Diferenciada?</Label>
                  <Select value={areaDiferenciada} onValueChange={(val) => setAreaDiferenciada(val || 'Não está em área diferenciada')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não está em área diferenciada">Não está em área diferenciada</SelectItem>
                      <SelectItem value="Área quilombola">Área quilombola</SelectItem>
                      <SelectItem value="Terra indígena">Terra indígena</SelectItem>
                      <SelectItem value="Área de assentamento">Área de assentamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seleção de GPS por Mapa - print:hidden */}
              <div className="print:hidden mt-4">
                <Label className="text-xs text-gray-400 font-medium">Coordenadas de GPS (Arraste o pin ou clique no mapa para selecionar)</Label>
                <div className="mt-2 h-[260px] w-full rounded-xl overflow-hidden border border-[#2a2a2a] relative z-10">
                  <MiniMapa
                    initialLat={latitude ?? undefined}
                    initialLng={longitude ?? undefined}
                    onCoordinatesChange={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                    }}
                    address={rua ? `${rua}, ${numero || ''}, ${bairro || ''}, ${cidadeEnd || ''} - ${ufEnd || ''}` : endereco}
                    onAddressChange={(val) => {
                      setEndereco(val)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 8. Recursos SAEB (INEP) */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              8. Recursos para Uso em Sala de Aula e Avaliação INEP (SAEB)
            </div>
            <div className="space-y-3">
              <div className="w-48">
                <Label className="text-xs text-gray-300">Necessita de Recursos Especiais?</Label>
                <Select value={recursosEspeciais} onValueChange={(val) => setRecursosEspeciais(val || 'Não')}>
                  <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recursosEspeciais === 'Sim' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-[#121212] rounded-xl border border-[#2a2a2a]">
                  {OPCOES_RECURSOS.map((opcao) => (
                    <label 
                      key={opcao}
                      className="flex items-center gap-2 p-2 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs cursor-pointer hover:border-[#3ea6ff]/50 transition-colors"
                    >
                      <input 
                        type="checkbox" 
                        checked={recursosSelecionados.includes(opcao)}
                        onChange={() => toggleArrayItem(recursosSelecionados, opcao, setRecursosSelecionados)}
                        className="accent-[#3ea6ff]"
                      />
                      <span>{opcao}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 9. Ficha de Saúde / Anamnese */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              9. Ficha de Saúde / Anamnese
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">Diabete?</Label>
                  <Select value={diabete} onValueChange={(val) => setDiabete(val || 'Não')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Convulsões?</Label>
                  <Select value={convulsoes} onValueChange={(val) => setConvulsoes(val || 'Não')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Asma Brônquica?</Label>
                  <Select value={asma} onValueChange={(val) => setAsma(val || 'Não')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-300">Infecções freq.?</Label>
                  <Select value={infeccoes} onValueChange={(val) => setInfeccoes(val || 'Não')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">Restrição a Exercício?</Label>
                  <Select value={restricaoExercicio} onValueChange={(val) => setRestricaoExercicio(val || 'Não')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-gray-300">Teve COVID-19?</Label>
                  <Select value={covid} onValueChange={(val) => setCovid(val || 'Não')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {covid === 'Sim' && (
                  <div>
                    <Label className="text-xs text-gray-300">Quando teve COVID-19?</Label>
                    <Input 
                      value={covidQuando} 
                      onChange={(e) => setCovidQuando(e.target.value)} 
                      placeholder="Ex: Em 2021" 
                      className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-300">Situação Vacinal COVID-19</Label>
                  <Select value={situacaoVacinalCovid} onValueChange={(val) => setSituacaoVacinalCovid(val || '')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="D1">D1 (1ª Dose)</SelectItem>
                      <SelectItem value="D2">D2 (2ª Dose)</SelectItem>
                      <SelectItem value="Reforço">Reforço</SelectItem>
                      <SelectItem value="Não foi vacinado">Não foi vacinado</SelectItem>
                      <SelectItem value="Não informado">Não informado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {situacaoVacinalCovid === 'Não foi vacinado' && (
                  <div>
                    <Label className="text-xs text-gray-300">Motivo de não vacinação</Label>
                    <Input 
                      value={motivoNaoVacinacao} 
                      onChange={(e) => setMotivoNaoVacinacao(e.target.value)} 
                      placeholder="Opção da família / Recomendação" 
                      className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Alergia a Matérias / Medicamentos?</Label>
                  <Select value={alergiaMed} onValueChange={(val) => setAlergiaMed(val || 'Não')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                  {alergiaMed === 'Sim' && (
                    <Input 
                      value={alergiaMedQuais} 
                      onChange={(e) => setAlergiaMedQuais(e.target.value)} 
                      placeholder="Quais alergias?" 
                      className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Restrições Alimentares?</Label>
                  <Select value={restricaoAlimentar} onValueChange={(val) => setRestricaoAlimentar(val || 'Não')}>
                    <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                      <SelectItem value="Não">Não</SelectItem>
                      <SelectItem value="Sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                  {restricaoAlimentar === 'Sim' && (
                    <Input 
                      value={restricaoAlimentarQuais} 
                      onChange={(e) => setRestricaoAlimentarQuais(e.target.value)} 
                      placeholder="Quais restrições alimentares?" 
                      className="bg-[#121212] border-[#2a2a2a] text-white mt-1" 
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 10. Necessidade Educativa Especial (NEE) */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              10. Necessidade Educativa Especial (NEE)
            </div>
            <div className="space-y-3">
              <div className="w-56">
                <Label className="text-xs text-gray-300">Possui NEE?</Label>
                <Select value={nee} onValueChange={(val) => setNee(val || 'Não')}>
                  <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Sim">Sim, indique qual(is)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {nee !== 'Não' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-[#121212] rounded-xl border border-[#2a2a2a]">
                  {OPCOES_NEE.map((opcao) => (
                    <label 
                      key={opcao}
                      className="flex items-center gap-2 p-2 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs cursor-pointer hover:border-[#3ea6ff]/50 transition-colors"
                    >
                      <input 
                        type="checkbox" 
                        checked={neeSelecionadas.includes(opcao)}
                        onChange={() => toggleArrayItem(neeSelecionadas, opcao, setNeeSelecionadas)}
                        className="accent-[#3ea6ff]"
                      />
                      <span>{opcao}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 11. Deficiências */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              11. Deficiência Física, Auditiva ou Visual
            </div>
            <div className="space-y-3">
              <div className="w-56">
                <Label className="text-xs text-gray-300">Possui Deficiência?</Label>
                <Select value={deficiencia} onValueChange={(val) => setDeficiencia(val || 'Não')}>
                  <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                    <SelectItem value="Não">Não</SelectItem>
                    <SelectItem value="Sim">Sim, indique qual(is)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {deficiencia !== 'Não' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 p-3 bg-[#121212] rounded-xl border border-[#2a2a2a]">
                  {OPCOES_DEFICIENCIA.map((opcao) => (
                    <label 
                      key={opcao}
                      className="flex items-center gap-2 p-2 bg-[#181818] border border-[#2a2a2a] rounded-lg text-xs cursor-pointer hover:border-[#3ea6ff]/50 transition-colors"
                    >
                      <input 
                        type="checkbox" 
                        checked={deficienciasSelecionadas.includes(opcao)}
                        onChange={() => toggleArrayItem(deficienciasSelecionadas, opcao, setDeficienciasSelecionadas)}
                        className="accent-[#3ea6ff]"
                      />
                      <span>{opcao}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 12. Autorização de Imagem e Voz */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              12. Autorização de Imagem e Voz (Para Comprovante)
            </div>
            <div className="w-64">
              <Label className="text-xs text-gray-300">Autoriza o uso de imagem e voz do aluno?</Label>
              <Select value={autorizaImagemVoz} onValueChange={(val) => setAutorizaImagemVoz(val || 'Não')}>
                <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  <SelectItem value="Sim">Sim, autorizo</SelectItem>
                  <SelectItem value="Não">Não, não autorizo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 13. Assinaturas Digitais */}
          <div>
            <div className="text-[#3ea6ff] font-bold text-xs uppercase tracking-wider pb-1 mb-3 border-b border-[#2a2a2a]">
              13. Captura de Assinaturas Digitais
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#121212] p-4 rounded-xl border border-[#2a2a2a]">
              {/* Assinatura do Responsável */}
              <div className="space-y-3">
                <SignaturePad
                  label="Assinatura do Pai/Mãe/Responsável"
                  value={newSignatureResponsavel || assinaturaResponsavelUrl}
                  onChange={setNewSignatureResponsavel}
                  isEditMode={isEditMode}
                />
                {isEditMode && alunoEditar?.id && !celularSigningCode && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => iniciarAssinaturaCelular('resp')}
                    className="w-full text-xs text-[#3ea6ff] border border-[#3ea6ff]/20 hover:bg-[#3ea6ff]/10 h-9 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Colher Assinatura pelo Celular
                  </Button>
                )}
              </div>

              {/* Assinatura do Funcionário */}
              <div className="space-y-3">
                <SignaturePad
                  label="Assinatura do Funcionário Responsável"
                  value={newSignatureFuncionario || assinaturaFuncionarioUrl}
                  onChange={setNewSignatureFuncionario}
                  isEditMode={isEditMode}
                />
                {isEditMode && alunoEditar?.id && !celularSigningCode && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => iniciarAssinaturaCelular('func')}
                    className="w-full text-xs text-[#3ea6ff] border border-[#3ea6ff]/20 hover:bg-[#3ea6ff]/10 h-9 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Colher Assinatura pelo Celular
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Modal / Overlay para Polling de Assinatura via Celular */}
          {celularSigningCode && (
            <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[#121214] border border-[#26262a] rounded-2xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl relative">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#3ea6ff]/40 to-transparent" />
                
                <div className="space-y-1.5">
                  <Smartphone className="w-9 h-9 text-[#3ea6ff] mx-auto animate-pulse" />
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">Assinar pelo Celular</h3>
                  <p className="text-[11px] text-zinc-400 max-w-[280px] mx-auto leading-normal">
                    Aponte a câmera para o QR Code ou acesse a URL da Secretaria de Educação.
                  </p>
                </div>

                <div className="bg-white p-2 rounded-xl inline-block mx-auto border border-zinc-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      `${window.location.origin}/assinar`
                    )}`}
                    alt="QR Code Assinatura"
                    className="w-28 h-28"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Código de Assinatura</span>
                  <div className="text-2xl font-mono font-black text-white bg-[#18181b] py-2 rounded-xl tracking-widest border border-[#27272a]">
                    {celularSigningCode}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-xs text-[#3ea6ff]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-semibold">Aguardando desenho...</span>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelarAssinaturaCelular}
                  className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-9 rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar Operação
                </Button>
              </div>
            </div>
          )}

          {/* Botão Salvar Fixo/Inferior */}
          <div className="pt-4 border-t border-[#2a2a2a] flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="text-gray-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#050505] font-bold px-6 py-2.5 rounded-xl text-sm transition-all"
            >
              {loading ? 'Salving...' : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {alunoEditar ? 'Atualizar Ficha' : 'Salvar Ficha do Aluno'}
                </span>
              )}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
