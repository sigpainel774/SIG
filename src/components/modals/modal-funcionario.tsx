'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  UserPlus,
  Save,
  Camera,
  Loader2,
  FileText,
  Check,
  Plus,
  Trash2,
  Paperclip,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { MiniMapa } from '@/components/map/MapWrapper'
import { useAuthStore } from '@/store/useAuthStore'

interface FuncionarioBasico {
  id: string
  nome: string
  email: string
  cpf?: string | null
  cargo?: string | null
  status: string
  formacao?: string | null
  foto_url?: string | null
  data_nascimento?: string | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
}

interface ModalFuncionarioProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onSuccess?: () => void
  /** Se fornecido, abre em modo edição */
  funcionario?: FuncionarioBasico | null
}

interface Cargo {
  id: string
  nome: string
}

export function ModalFuncionario({
  open,
  onOpenChange,
  trigger,
  onSuccess,
  funcionario,
}: ModalFuncionarioProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)

  const isEditing = !!funcionario
  const activeOpen = open !== undefined ? open : isOpen

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
    if (!val) {
      setFotoFile(null)
      setFotoPreview(null)
      setActiveTab('pessoais')
    }
  }

  // Tabs state
  const [activeTab, setActiveTab] = useState<'pessoais' | 'documentos' | 'emprego' | 'saude' | 'escolaridade' | 'anexos'>('pessoais')

  // Form states
  const [empId, setEmpId] = useState('')

  // Escola vinculada (auto-preenchida)
  const [escolaId, setEscolaId] = useState('')
  const [escolaNome, setEscolaNome] = useState('')
  const [escolaInep, setEscolaInep] = useState('')
  const [escolaLocalizacao, setEscolaLocalizacao] = useState('')

  // Dados Pessoais / Identificação
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [censo, setCenso] = useState('')
  const [estadoCivil, setEstadoCivil] = useState('Não declarado')
  const [corRaca, setCorRaca] = useState('Não declarado')
  const [sexo, setSexo] = useState('Não declarado')
  const [nomeMae, setNomeMae] = useState('')
  const [nomePai, setNomePai] = useState('')
  const [nacionalidade, setNacionalidade] = useState('Brasileira')
  const [nacionalidadeEspec, setNacionalidadeEspec] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [municipioNasc, setMunicipioNasc] = useState('')
  const [ufNasc, setUfNasc] = useState('')

  // Documentos
  const [rg, setRg] = useState('')
  const [nis, setNis] = useState('')

  // Endereço
  const [logradouro, setLogradouro] = useState('')
  const [numero, setNumero] = useState('')
  const [cep, setCep] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidade, setCidade] = useState('')
  const [ufResidencia, setUfResidencia] = useState('BA')
  const [areaResidencia, setAreaResidencia] = useState('Urbana')
  const [areaDiferenciada, setAreaDiferenciada] = useState('Não está em área diferenciada')
  
  // Localização (GPS)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

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
  const [doencas, setDoencas] = useState({
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
  const [posGraduacoes, setPosGraduacoes] = useState<Array<{tipo: string, area: string, ano: string}>>([])

  // Outros cursos específicos (múltipla escolha)
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

  // Outros
  const [observacoes, setObservacoes] = useState('')
  const [dataPreenchimento, setDataPreenchimento] = useState('')

  // Masks
  const formatCPF = (value: string) => {
    const clean = value.replace(/\D/g, '')
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14)
  }

  const formatCEP = (value: string) => {
    const clean = value.replace(/\D/g, '')
    return clean
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 9)
  }

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
          if (data) {
            setEmpId(data.id)
            setNome(data.nome ?? '')
            setEmail(data.email ?? '')
            setCpf(data.cpf ?? '')
            setCenso(data.censo ?? '')
            setEstadoCivil(data.estado_civil ?? 'Não declarado')
            setCorRaca(data.cor_raca ?? 'Não declarado')
            setSexo(data.sexo ?? 'Não declarado')
            setNomeMae(data.nome_mae ?? '')
            setNomePai(data.nome_pai ?? '')
            setNacionalidade(data.nacionalidade ?? 'Brasileira')
            setNacionalidadeEspec(data.nacionalidade_especificacao ?? '')
            setNascimento(data.data_nascimento ?? '')
            setMunicipioNasc(data.municipio_nascimento ?? '')
            setUfNasc(data.uf_nascimento ?? '')
            setRg(data.rg ?? '')
            setNis(data.nis ?? '')
            setLogradouro(data.logradouro ?? '')
            setNumero(data.numero ?? '')
            setCep(data.cep ?? '')
            setBairro(data.bairro ?? '')
            setCidade(data.cidade ?? '')
            setUfResidencia(data.uf_residencia ?? 'BA')
            setAreaResidencia(data.area_residencia ?? 'Urbana')
            setAreaDiferenciada(data.area_diferenciada ?? 'Não está em área diferenciada')
            setLatitude(data.latitude ? Number(data.latitude) : null)
            setLongitude(data.longitude ? Number(data.longitude) : null)
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
            setFotoPreview(data.foto_url ?? null)
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
          setLoadingData(false)
        }
      } else if (activeOpen) {
        // Criando novo funcionário
        const newUuid = crypto.randomUUID()
        setEmpId(newUuid)
        
        // Reset states
        setNome('')
        setEmail('')
        setCpf('')
        setCenso('')
        setEstadoCivil('Não declarado')
        setCorRaca('Não declarado')
        setSexo('Não declarado')
        setNomeMae('')
        setNomePai('')
        setNacionalidade('Brasileira')
        setNacionalidadeEspec('')
        setNascimento('')
        setMunicipioNasc('')
        setUfNasc('')
        setRg('')
        setNis('')
        setLogradouro('')
        setNumero('')
        setCep('')
        setBairro('')
        setCidade('')
        setUfResidencia('BA')
        setAreaResidencia('Urbana')
        setAreaDiferenciada('Não está em área diferenciada')
        setLatitude(null)
        setLongitude(null)
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
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string, setter: (url: string) => void) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const supabase = createClient()
    try {
      const ext = file.name.split('.').pop()
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

  // Repeatable Pos-Graduacoes
  const addPos = () => {
    if (posGraduacoes.length >= 6) {
      toast.error('Limite de 6 pós-graduações atingido.')
      return
    }
    setPosGraduacoes([...posGraduacoes, { tipo: 'Especialização', area: '', ano: '' }])
  }

  const updatePos = (index: number, key: 'tipo' | 'area' | 'ano', value: string) => {
    const updated = [...posGraduacoes]
    updated[index][key] = value
    setPosGraduacoes(updated)
  }

  const removePos = (index: number) => {
    setPosGraduacoes(posGraduacoes.filter((_, i) => i !== index))
  }

  // Toggle Checkboxes for Deficiencias
  const toggleDeficiencia = (val: string) => {
    if (deficiencias.includes(val)) {
      setDeficiencias(deficiencias.filter((d) => d !== val))
    } else {
      setDeficiencias([...deficiencias, val])
    }
  }

  // Toggle Checkboxes for Outros Cursos
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome || !email) {
      toast.error('Preencha os campos obrigatórios: Nome e E-mail.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      let foto_url: string | null = fotoPreview

      // Upload da foto 3x4 se houver arquivo novo
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop()
        const path = `${empId}/foto3x4_${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fotos-funcionarios')
          .upload(path, fotoFile, { upsert: true })

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('fotos-funcionarios')
          .getPublicUrl(uploadData.path)

        foto_url = urlData.publicUrl
      }

      const basePayload = {
        id: empId,
        nome,
        cpf: cpf || null,
        cargo: cargo || null,
        status,
        formacao: escolaridadeNivel || null,
        foto_url,
        data_nascimento: nascimento || null,
        endereco: logradouro ? `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${ufResidencia}` : (funcionario?.endereco || null),
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        // Novos campos Sapeacu
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
        pos_graduacoes: posGraduacoes,
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

  const tabClass = (tab: string) =>
    `px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
      activeTab === tab
        ? 'border-highlight text-highlight'
        : 'border-transparent text-zinc-400 hover:text-white'
    }`

  return (
    <Dialog open={activeOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent className="sm:max-w-4xl bg-[#121212] border-borderCustom text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <UserPlus className="w-5 h-5 text-highlight" />
            {isEditing ? `Editar Funcionário: ${nome}` : 'Cadastro de Funcionário / Servidor'}
          </DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#3ea6ff]" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            
            {/* Foto e Escola Vinculada */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-[#18181a] p-4 rounded-xl border border-borderCustom">
              {/* Foto 3x4 */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-16 h-20 rounded bg-[#1a1a2e] border-2 border-[#3ea6ff]/40 overflow-hidden flex items-center justify-center">
                    {fotoPreview ? (
                      <img src={fotoPreview} alt="Foto 3x4" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-center text-zinc-500 font-bold">
                        FOTO 3x4
                      </span>
                    )}
                  </div>
                  <label
                    htmlFor="foto-input"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#3ea6ff] flex items-center justify-center cursor-pointer hover:bg-[#0090ff] transition-colors"
                    title="Alterar foto"
                  >
                    <Camera className="w-3 h-3 text-white" />
                  </label>
                  <input
                    id="foto-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFotoChange}
                  />
                </div>
                <div className="text-[11px] text-zinc-400">
                  <p className="font-semibold text-zinc-300">Foto 3x4 do Servidor</p>
                  <p>PNG/JPG · max 5MB</p>
                </div>
              </div>

              {/* Dados da Escola (Auto-preenchidos) */}
              <div className="md:col-span-2 space-y-1.5 text-xs border-l border-zinc-800 pl-6">
                <p className="font-semibold text-highlight text-[10px] uppercase tracking-wider">Unidade Escolar Vinculada</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-zinc-500 block">Nome da UE:</span>
                    <span className="font-medium text-zinc-200">{escolaNome || 'Sem vínculo ativo'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Código INEP:</span>
                    <span className="font-medium text-zinc-200">{escolaInep || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500">Localização da UE: </span>
                    <span className="font-medium text-zinc-200">{escolaLocalizacao || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu de Abas */}
            <div className="flex flex-wrap gap-1 border-b border-borderCustom scrollbar-none overflow-x-auto">
              <button type="button" onClick={() => setActiveTab('pessoais')} className={tabClass('pessoais')}>Identificação</button>
              <button type="button" onClick={() => setActiveTab('documentos')} className={tabClass('documentos')}>Docs & Endereço</button>
              <button type="button" onClick={() => setActiveTab('emprego')} className={tabClass('emprego')}>Dados Empregatícios</button>
              <button type="button" onClick={() => setActiveTab('saude')} className={tabClass('saude')}>Saúde</button>
              <button type="button" onClick={() => setActiveTab('escolaridade')} className={tabClass('escolaridade')}>Escolaridade</button>
              <button type="button" onClick={() => setActiveTab('anexos')} className={tabClass('anexos')}>Anexos & Obs</button>
            </div>

            {/* Aba 1: Dados Pessoais / Identificação */}
            {activeTab === 'pessoais' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Nome completo conforme documentos"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label>Identificação CENSO (INEP)</Label>
                    <Input
                      value={censo}
                      onChange={(e) => setCenso(e.target.value)}
                      placeholder="Código INEP do Professor"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>E-mail de Login *</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="maria@escola.com"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                      required
                      disabled={isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Sexo</Label>
                    <select
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="Não declarado">Não declarado</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <Label>Estado Civil</Label>
                    <select
                      value={estadoCivil}
                      onChange={(e) => setEstadoCivil(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="Não declarado">Não declarado</option>
                      <option value="Solteiro">Solteiro(a)</option>
                      <option value="Casado">Casado(a)</option>
                      <option value="Separado">Separado(a)</option>
                      <option value="Divorciado">Divorciado(a)</option>
                      <option value="Viúvo">Viúvo(a)</option>
                    </select>
                  </div>
                  <div>
                    <Label>Cor / Raça</Label>
                    <select
                      value={corRaca}
                      onChange={(e) => setCorRaca(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="Não declarado">Não declarado</option>
                      <option value="Branca">Branca</option>
                      <option value="Preta">Preta</option>
                      <option value="Parda">Parda</option>
                      <option value="Amarela">Amarela</option>
                      <option value="Indígena">Indígena</option>
                    </select>
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={nascimento}
                      onChange={(e) => setNascimento(e.target.value)}
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome da Mãe</Label>
                    <Input
                      value={nomeMae}
                      onChange={(e) => setNomeMae(e.target.value)}
                      placeholder="Nome completo da mãe"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>Nome do Pai</Label>
                    <Input
                      value={nomePai}
                      onChange={(e) => setNomePai(e.target.value)}
                      placeholder="Nome completo do pai"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Nacionalidade</Label>
                    <select
                      value={nacionalidade}
                      onChange={(e) => setNacionalidade(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="Brasileira">Brasileira</option>
                      <option value="Brasileira exterior">Naturalizado / Nascido no exterior</option>
                      <option value="Estrangeira">Estrangeira</option>
                    </select>
                  </div>
                  <div className={nacionalidade === 'Estrangeira' ? 'block' : 'hidden'}>
                    <Label>Especifique País</Label>
                    <Input
                      value={nacionalidadeEspec}
                      onChange={(e) => setNacionalidadeEspec(e.target.value)}
                      placeholder="Qual país?"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div className={nacionalidade === 'Estrangeira' ? 'md:col-span-2' : 'md:col-span-3'}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Município de Nascimento</Label>
                        <Input
                          value={municipioNasc}
                          onChange={(e) => setMunicipioNasc(e.target.value)}
                          placeholder="Cidade de nascimento"
                          className="bg-[#181818] border-borderCustom text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label>UF Nascimento</Label>
                        <Input
                          value={ufNasc}
                          onChange={(e) => setUfNasc(e.target.value.toUpperCase())}
                          placeholder="Ex: BA"
                          maxLength={2}
                          className="bg-[#181818] border-borderCustom text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Aba 2: Documentos & Endereço */}
            {activeTab === 'documentos' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1">Documentação Básica</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>Identidade (RG)</Label>
                    <Input
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      placeholder="Número do RG"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>Número do NIS (PIS/PASEP)</Label>
                    <Input
                      value={nis}
                      onChange={(e) => setNis(e.target.value)}
                      placeholder="Número do NIS"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                </div>

                <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1 pt-2">Endereço Residencial</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-3">
                    <Label>Avenida / Rua / Travessa</Label>
                    <Input
                      value={logradouro}
                      onChange={(e) => setLogradouro(e.target.value)}
                      placeholder="Ex: Av. Sete de Setembro"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="Nº"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input
                      value={cep}
                      onChange={(e) => setCep(formatCEP(e.target.value))}
                      placeholder="44350-000"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Bairro / Localidade</Label>
                    <Input
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Ex: Centro"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={cidade}
                      onChange={(e) => setCidade(e.target.value)}
                      placeholder="Ex: Sapeaçu"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>UF Residência</Label>
                    <Input
                      value={ufResidencia}
                      onChange={(e) => setUfResidencia(e.target.value.toUpperCase())}
                      placeholder="Ex: BA"
                      maxLength={2}
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>Área Residencial</Label>
                    <select
                      value={areaResidencia}
                      onChange={(e) => setAreaResidencia(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="Urbana">Urbana</option>
                      <option value="Rural">Rural</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Área de Localização Diferenciada</Label>
                    <select
                      value={areaDiferenciada}
                      onChange={(e) => setAreaDiferenciada(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="Não está em área diferenciada">Não está em área diferenciada</option>
                      <option value="Comunidade remanescente de quilombos">Comunidade remanescente de quilombos (Quilombola)</option>
                      <option value="Terra indígena">Terra indígena</option>
                      <option value="Área de assentamento cigano">Área de assentamento cigano</option>
                    </select>
                  </div>
                  
                  {/* Coordenadas mapa */}
                  <div>
                    <Label>Endereço Completo de Login (exibe no mapa)</Label>
                    <Input
                      type="text"
                      placeholder="Rua, número, bairro, cidade..."
                      value={logradouro ? `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${ufResidencia}` : ''}
                      disabled
                      className="bg-zinc-800/40 border-borderCustom text-zinc-400 mt-1 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Label className="text-xs text-zinc-400">Coordenadas de GPS Residencial (Opcional, clique ou arraste no mapa)</Label>
                  <div className="mt-2 h-[220px] w-full rounded-xl overflow-hidden border border-borderCustom relative z-10">
                    <MiniMapa
                      initialLat={latitude ?? undefined}
                      initialLng={longitude ?? undefined}
                      onCoordinatesChange={(lat, lng) => {
                        setLatitude(lat)
                        setLongitude(lng)
                      }}
                      address={logradouro ? `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${ufResidencia}` : ''}
                      onAddressChange={() => {}}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Aba 3: Dados Empregatícios */}
            {activeTab === 'emprego' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Função / Cargo Principal na Escola</Label>
                    <select
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="">Selecione a função</option>
                      <option value="Auxiliar Administrativo">Auxiliar Administrativo</option>
                      <option value="Auxiliar de Sala">Auxiliar de Sala</option>
                      <option value="Auxiliar de Serviços Gerais">Auxiliar de Serviços Gerais</option>
                      <option value="Coordenador(a) Pedagógico">Coordenador(a) Pedagógico</option>
                      <option value="Diretor(a)">Diretor(a)</option>
                      <option value="Merendeira">Merendeira</option>
                      <option value="Monitor de Atividade Complementar">Monitor de Atividade Complementar</option>
                      <option value="Monitor(a) de área">Monitor(a) de área</option>
                      <option value="Nutricionista">Nutricionista</option>
                      <option value="Professor(a)">Professor(a)</option>
                      <option value="Psicólogo(a)">Psicólogo(a)</option>
                      <option value="Psicopedagogo(a)">Psicopedagogo(a)</option>
                      <option value="Secretária(o)">Secretária(o)</option>
                      <option value="Tecnólogo em Alimentos">Tecnólogo em Alimentos</option>
                      <option value="Vice-Diretor">Vice-Diretor</option>
                      <option value="Vigilante">Vigilante</option>
                      <option value="Zelador(a)">Zelador(a)</option>
                      <option value="Outro">Outro (especificar)</option>
                    </select>
                  </div>
                  <div className={cargo === 'Outro' ? 'block' : 'hidden'}>
                    <Label>Especificar Função</Label>
                    <Input
                      value={funcaoEspec}
                      onChange={(e) => setFuncaoEspec(e.target.value)}
                      placeholder="Qual outra função?"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Tipo de Vínculo</Label>
                    <select
                      value={tipoVinculo}
                      onChange={(e) => setTipoVinculo(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="Contratado">Contratado</option>
                      <option value="Efetivo">Efetivo</option>
                      <option value="Nomeado">Nomeado</option>
                      <option value="Outro">Outro (especificar)</option>
                    </select>
                  </div>
                  <div className={tipoVinculo === 'Outro' ? 'block' : 'hidden'}>
                    <Label>Especificar Vínculo</Label>
                    <Input
                      value={tipoVinculoEspec}
                      onChange={(e) => setTipoVinculoEspec(e.target.value)}
                      placeholder="Qual outro tipo?"
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label>Status Funcional</Label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="afastado">Afastado</option>
                      <option value="desligado">Desligado</option>
                      <option value="suspenso">Suspenso</option>
                    </select>
                  </div>
                </div>

              </div>
            )}

            {/* Aba 4: Saúde */}
            {activeTab === 'saude' && (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1">Acessibilidade & Deficiências</h3>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="possuiDeficiencia"
                    checked={possuiDeficiencia}
                    onChange={(e) => {
                      setPossuiDeficiencia(e.target.checked)
                      if (!e.target.checked) setDeficiencias([])
                    }}
                    className="w-4 h-4 cursor-pointer accent-highlight"
                  />
                  <Label htmlFor="possuiDeficiencia" className="font-semibold text-sm cursor-pointer text-zinc-100">
                    O servidor possui deficiência, TEA ou altas habilidades / superdotação?
                  </Label>
                </div>

                {possuiDeficiencia && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#18181a] p-4 rounded-xl border border-zinc-800/80 text-xs text-zinc-300">
                    
                    {/* Deficiências */}
                    <div className="space-y-2">
                      <p className="font-bold text-highlight text-[10px] uppercase">Grupo Deficiências:</p>
                      {[
                        'Baixa visão',
                        'Cegueira',
                        'Surdez',
                        'Deficiência física',
                        'Deficiência intelectual',
                        'Deficiência Auditiva',
                        'Surdocegueira',
                        'Deficiência múltipla',
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`def_${item}`}
                            checked={deficiencias.includes(item)}
                            onChange={() => toggleDeficiencia(item)}
                            className="w-3.5 h-3.5 accent-highlight"
                          />
                          <label htmlFor={`def_${item}`} className="cursor-pointer">{item}</label>
                        </div>
                      ))}
                    </div>

                    {/* TEA */}
                    <div className="space-y-2">
                      <p className="font-bold text-highlight text-[10px] uppercase">Transtornos:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="teaCheck"
                          checked={tea}
                          onChange={(e) => setTea(e.target.checked)}
                          className="w-3.5 h-3.5 accent-highlight"
                        />
                        <label htmlFor="teaCheck" className="cursor-pointer font-medium text-zinc-200">Transtorno do Espectro Autista (TEA)</label>
                      </div>
                    </div>

                    {/* Altas habilidades */}
                    <div className="space-y-2">
                      <p className="font-bold text-highlight text-[10px] uppercase">Altas Habilidades:</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="altasHab"
                          checked={altasHabilidades}
                          onChange={(e) => setAltasHabilidades(e.target.checked)}
                          className="w-3.5 h-3.5 accent-highlight"
                        />
                        <label htmlFor="altasHab" className="cursor-pointer font-medium text-zinc-200">Altas Habilidades / Superdotação</label>
                      </div>
                    </div>

                  </div>
                )}

                <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1">Doenças Crônicas ou Recentes</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-zinc-300">
                  {[
                    { key: 'diabetes', label: 'Diabetes?' },
                    { key: 'convulsoes', label: 'Convulsões?' },
                    { key: 'asmaBronquite', label: 'Asma / Bronquite?' },
                    { key: 'infeccoes', label: 'Infecções recorrentes?' },
                    { key: 'cardiopatias', label: 'Cardiopatias?' },
                    { key: 'alergias', label: 'Alergias severas?' },
                    { key: 'covid19', label: 'Teve Covid-19?' },
                    { key: 'articulares', label: 'Doenças articulares?' },
                  ].map((d) => (
                    <div key={d.key} className="flex items-center gap-2 p-2 rounded bg-[#18181a] border border-zinc-800">
                      <input
                        type="checkbox"
                        id={`doenca_${d.key}`}
                        checked={(doencas as any)[d.key]}
                        onChange={(e) => setDoencas({ ...doencas, [d.key]: e.target.checked })}
                        className="w-4 h-4 accent-highlight"
                      />
                      <label htmlFor={`doenca_${d.key}`} className="cursor-pointer font-medium">{d.label}</label>
                    </div>
                  ))}
                </div>

                <div>
                  <Label>Outra doença, especificar:</Label>
                  <Input
                    value={doencas.outra}
                    onChange={(e) => setDoencas({ ...doencas, outra: e.target.value })}
                    placeholder="Especifique medicamentos ou condições crônicas não listadas"
                    className="bg-[#181818] border-borderCustom text-white mt-1"
                  />
                </div>
              </div>
            )}

            {/* Aba 5: Escolaridade */}
            {activeTab === 'escolaridade' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Maior Nível de Escolaridade Concluído</Label>
                    <select
                      value={escolaridadeNivel}
                      onChange={(e) => setEscolaridadeNivel(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                    >
                      <option value="Não concluiu o Ensino Fundamental">Não concluiu o Ensino Fundamental</option>
                      <option value="Ensino Fundamental">Ensino Fundamental Completo</option>
                      <option value="Ensino Médio">Ensino Médio Completo</option>
                      <option value="Educação Superior">Educação Superior Completa</option>
                    </select>
                  </div>

                  {escolaridadeNivel === 'Ensino Médio' && (
                    <div>
                      <Label>Tipo de Ensino Médio Cursado</Label>
                      <select
                        value={ensinoMedioTipo}
                        onChange={(e) => setEnsinoMedioTipo(e.target.value)}
                        className="w-full h-10 px-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none mt-1"
                      >
                        <option value="Formação Geral">Formação Geral</option>
                        <option value="Modalidade Normal/Magistérios">Modalidade Normal / Magistério</option>
                        <option value="Curso Técnico">Curso Técnico</option>
                        <option value="Magistério Indígena - modalidade Normal">Magistério Indígena - modalidade Normal</option>
                      </select>
                    </div>
                  )}
                </div>

                {escolaridadeNivel === 'Educação Superior' && (
                  <div className="bg-[#18181a] p-4 rounded-xl border border-zinc-800 space-y-4">
                    <h4 className="text-xs font-bold text-highlight uppercase tracking-wider">Dados do Curso Superior</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs">Área do Curso</Label>
                        <Input
                          value={superiorArea}
                          onChange={(e) => setSuperiorArea(e.target.value)}
                          placeholder="Ex: Pedagogia, Matemática"
                          className="bg-[#121212] border-borderCustom text-white mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Código do Curso Superior</Label>
                        <Input
                          value={superiorCodigo}
                          onChange={(e) => setSuperiorCodigo(e.target.value)}
                          placeholder="Código do curso"
                          className="bg-[#121212] border-borderCustom text-white mt-1 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Ano de Conclusão</Label>
                        <Input
                          value={superiorAno}
                          onChange={(e) => setSuperiorAno(e.target.value)}
                          placeholder="Ex: 2018"
                          className="bg-[#121212] border-borderCustom text-white mt-1 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs">Tipo de Instituição</Label>
                        <select
                          value={superiorTipoInst}
                          onChange={(e) => setSuperiorTipoInst(e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-[#121212] border border-borderCustom text-white text-xs outline-none mt-1"
                        >
                          <option value="Pública">Pública</option>
                          <option value="Privada">Privada</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Nível / Grau Acadêmico</Label>
                        <select
                          value={superiorGrau}
                          onChange={(e) => setSuperiorGrau(e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-[#121212] border border-borderCustom text-white text-xs outline-none mt-1"
                        >
                          <option value="Licenciatura">Licenciatura</option>
                          <option value="Bacharelado">Bacharelado</option>
                          <option value="Sequencial">Sequencial</option>
                          <option value="Tecnológico">Tecnológico</option>
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Instituição de Formação</Label>
                        <Input
                          value={superiorInstituicao}
                          onChange={(e) => setSuperiorInstituicao(e.target.value)}
                          placeholder="Nome da faculdade"
                          className="bg-[#121212] border-borderCustom text-white mt-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Formação / Complementação Pedagógica</Label>
                  <Input
                    value={complementacaoPedagogica}
                    onChange={(e) => setComplementacaoPedagogica(e.target.value)}
                    placeholder="Área de conhecimento/componentes curriculares"
                    className="bg-[#181818] border-borderCustom text-white mt-1"
                  />
                </div>

                {/* Pós-Graduações (Lista repetível até 6 registros) */}
                <div className="space-y-3 bg-[#18181a] p-4 rounded-xl border border-zinc-800">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-highlight uppercase tracking-wider">Pós-Graduações Concluídas (Até 6)</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPos}
                      className="text-xs h-7 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </Button>
                  </div>

                  {posGraduacoes.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-2">Nenhuma pós-graduação inserida.</p>
                  ) : (
                    <div className="space-y-3">
                      {posGraduacoes.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#121212] p-2.5 rounded border border-zinc-800 relative">
                          <div>
                            <Label className="text-[10px] text-zinc-500">Tipo</Label>
                            <select
                              value={item.tipo}
                              onChange={(e) => updatePos(idx, 'tipo', e.target.value)}
                              className="w-full h-8 px-2 rounded bg-[#181818] border border-borderCustom text-white text-xs outline-none mt-1"
                            >
                              <option value="Especialização">Especialização</option>
                              <option value="Mestrado">Mestrado</option>
                              <option value="Doutorado">Doutorado</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-[10px] text-zinc-500 font-semibold">Área do Curso</Label>
                            <Input
                              value={item.area}
                              onChange={(e) => updatePos(idx, 'area', e.target.value)}
                              placeholder="Ex: Gestão Escolar, Psicopedagogia"
                              className="bg-[#181818] border-borderCustom text-white h-8 text-xs mt-1"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <Label className="text-[10px] text-zinc-500">Conclusão</Label>
                              <Input
                                value={item.ano}
                                onChange={(e) => updatePos(idx, 'ano', e.target.value)}
                                placeholder="Ano"
                                className="bg-[#181818] border-borderCustom text-white h-8 text-xs mt-1"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removePos(idx)}
                              className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-0 border border-transparent hover:border-rose-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outros cursos específicos / formação continuada */}
                <div className="space-y-3">
                  <Label className="font-bold text-xs text-highlight">Outros Cursos Específicos / Formação Continuada (mín. 80h)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-[#18181a] p-4 rounded-xl border border-zinc-800/80">
                    {[
                      'Creche (0 a 3 anos)',
                      'Pré-escolar (4 e 5 anos)',
                      'Anos iniciais do ensino fundamental',
                      'Anos finais do ensino fundamental',
                      'Ensino médio',
                      'Educação de jovens e adultos',
                      'Educação especial',
                      'Educação indígena',
                      'Educação do campo',
                      'Direitos da criança e do adolescente',
                      'Educação em direitos humanos',
                      'Gênero e diversidade sexual',
                      'Gestão escolar',
                      'Outros',
                      'Nenhum',
                    ].map((curso) => (
                      <div key={curso} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`curso_${curso}`}
                          checked={outrosCursos.includes(curso)}
                          onChange={() => toggleOutroCurso(curso)}
                          className="w-4 h-4 accent-highlight cursor-pointer"
                        />
                        <label htmlFor={`curso_${curso}`} className="cursor-pointer select-none text-zinc-300">{curso}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Aba 6: Anexos e Outros */}
            {activeTab === 'anexos' && (
              <div className="space-y-6">
                <div className="bg-[#18181a] p-4 rounded-xl border border-zinc-800">
                  <h4 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-2 mb-4">
                    Documentos Comprovatórios Obrigatórios (PDF, JPG ou PNG)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {[
                      { key: 'identidade', label: 'Identidade (RG)', url: docIdentidadeUrl, setter: setDocIdentidadeUrl },
                      { key: 'cpf', label: 'CPF', url: docCpfUrl, setter: setDocCpfUrl },
                      { key: 'residencia', label: 'Comprovante de Residência', url: docCompResidenciaUrl, setter: setDocCompResidenciaUrl },
                      { key: 'fund', label: 'Comprovante Escolaridade: Fundamental', url: docFundamentalUrl, setter: setDocFundamentalUrl },
                      { key: 'medio', label: 'Comprovante Escolaridade: Médio', url: docMedioUrl, setter: setDocMedioUrl },
                      { key: 'sup', label: 'Comprovante Escolaridade: Superior', url: docSuperiorUrl, setter: setDocSuperiorUrl },
                      { key: 'pos', label: 'Comprovante Escolaridade: Pós-Graduação', url: docPosUrl, setter: setDocPosUrl },
                      { key: 'mestrado', label: 'Comprovante Escolaridade: Mestrado', url: docMestradoUrl, setter: setDocMestradoUrl },
                      { key: 'doutorado', label: 'Comprovante Escolaridade: Doutorado', url: docDoutoradoUrl, setter: setDocDoutoradoUrl },
                    ].map((doc) => (
                      <div key={doc.key} className="flex flex-col gap-1 p-3 rounded bg-[#121212] border border-zinc-800">
                        <span className="font-semibold text-zinc-300">{doc.label}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <label className="flex-1 flex items-center justify-between px-3 py-1.5 rounded bg-[#1a1a1c] border border-zinc-700 hover:bg-[#252528] transition-colors cursor-pointer text-zinc-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Paperclip className="w-3.5 h-3.5" />
                              {doc.url ? 'Substituir Arquivo' : 'Escolher Arquivo'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png"
                              className="hidden"
                              onChange={(e) => handleDocUpload(e, doc.key, doc.setter)}
                            />
                          </label>
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 font-bold hover:bg-emerald-900/60 flex items-center gap-1"
                              title="Visualizar documento cadastrado"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver
                            </a>
                          )}
                          {doc.url && (
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Observações Gerais</Label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Adicione observações importantes sobre a contratação, licenças ou restrições..."
                    rows={4}
                    className="w-full mt-1 p-3 rounded-md bg-[#181818] border border-borderCustom text-white text-sm outline-none focus:border-[#3ea6ff]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Preenchimento</Label>
                    <Input
                      type="date"
                      value={dataPreenchimento}
                      onChange={(e) => setDataPreenchimento(e.target.value)}
                      className="bg-[#181818] border-borderCustom text-white mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-[10px] text-zinc-500 leading-normal mb-1 bg-[#18181a] p-2 rounded border border-zinc-800">
                      * Nota: A data de preenchimento e a assinatura do funcionário são impressas para validação em papel. O preenchimento da data é automático no envio.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-4 border-t border-borderCustom">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
