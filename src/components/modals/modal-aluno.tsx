'use client'

import { useState, useEffect } from 'react'
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
import { Camera, UserPlus, Save, X, PenTool, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'

interface ModalAlunoProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  alunoEditar?: any
  onSuccess?: () => void
}

export function ModalAluno({ open, onOpenChange, trigger, alunoEditar, onSuccess }: ModalAlunoProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [turmas, setTurmas] = useState<any[]>([])
  const [escolas, setEscolas] = useState<any[]>([])

  const activeOpen = open !== undefined ? open : isOpen
  const handleOpenChange = (val: boolean) => {
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

  // 7. Endereço Residencial Detalhado
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [cep, setCep] = useState('')
  const [bairro, setBairro] = useState('')
  const [cidadeEnd, setCidadeEnd] = useState('SAPE AÇU')
  const [ufEnd, setUfEnd] = useState('BA')
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
      setNee(dm.neeAluno || 'Não')
      setNeeSelecionadas(dm.neeSelecionadas || [])
      setDeficiencia(dm.deficienciaAluno || 'Não')
      setDeficienciasSelecionadas(dm.deficienciasSelecionadas || [])
    }
  }, [alunoEditar])

  const carregarDadosIniciais = async () => {
    const supabase = createClient()
    const { data: tData } = await supabase.from('turmas').select('id, nome, ano_letivo')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome) {
      toast.error('Preencha o Nome Completo do Aluno.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const dadosMatriculaObj = {
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
      neeAluno: nee,
      neeSelecionadas,
      deficienciaAluno: deficiencia,
      deficienciasSelecionadas,
      // Mantenha assinatura se já existir no editar
      assinatura_responsavel_url: alunoEditar?.dados_matricula?.assinatura_responsavel_url || null
    }

    try {
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
        serie: serie || null,
        dados_matricula: dadosMatriculaObj
      }

      if (alunoEditar?.id) {
        const { error } = await (supabase.from('alunos') as any)
          .update(payload)
          .eq('id', alunoEditar.id)
        if (error) throw error
        toast.success('Ficha do aluno atualizada com sucesso!')
      } else {
        const { error } = await (supabase.from('alunos') as any)
          .insert(payload)
        if (error) throw error
        toast.success('Aluno cadastrado com sucesso!')
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
                  <SelectValue placeholder="Selecione a Escola" />
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
                  <SelectValue placeholder="Selecione uma turma ativa" />
                </SelectTrigger>
                <SelectContent className="bg-[#181818] border-[#2a2a2a] text-white">
                  {turmas.map((t) => (
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

          {/* Espaço Reservado para Captura de Assinatura Digital (Futuro) */}
          <div className="bg-[#121212] p-4 border border-[#2a2a2a] rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase">
              <PenTool className="w-4 h-4 text-[#3ea6ff]" />
              Assinatura Digital do Responsável (Espaço Reservado)
            </div>
            <div className="border border-dashed border-[#3a3a3a] rounded-lg p-6 text-center text-xs text-gray-400 bg-[#181818]/50">
              O módulo de captura e desenho de assinatura digital do responsável estará disponível aqui em breve. O espaço na Ficha de Matrícula impressa já está formatado.
            </div>
          </div>

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
