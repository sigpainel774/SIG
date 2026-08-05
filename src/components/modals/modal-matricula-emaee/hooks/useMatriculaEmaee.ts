import React, { useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { ModalMatriculaEmaeeProps, AlunoSearchData } from '../types'

export function useMatriculaEmaee({ props, isOpen, setIsOpen }: { props: ModalMatriculaEmaeeProps, isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [alunosEncontrados, setAlunosEncontrados] = useState<AlunoSearchData[]>([])
  
  // Dados Selecionados
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSearchData | null>(null)
  
  // Escolarização Regular
  const [escolaRegularId, setEscolaRegularId] = useState<string>('')
  const [anoEscolarizacao, setAnoEscolarizacao] = useState('')
  const [turnoRegular, setTurnoRegular] = useState('')
  const [turmaRegular, setTurmaRegular] = useState('')
  const [professorRegular, setProfessorRegular] = useState('')
  const [gestorRegular, setGestorRegular] = useState('')
  
  // Dados de Matrícula (EMAEE)
  const [turnoAtendimento, setTurnoAtendimento] = useState('Matutino')
  const [localizacaoAtendimento, setLocalizacaoAtendimento] = useState('Urbana')
  const [principalQueixa, setPrincipalQueixa] = useState('')
  const [cidCodigo, setCidCodigo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  
  // Deficiências e Transtornos
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
  
  // Profissionais Vinculados
  const [profissionaisSelecionados, setProfissionaisSelecionados] = useState<{
    profissional_id: string;
    especialidade: string;
    frequencia: string;
  }[]>([])
  
  // Lista de Escolas Regulares e Profissionais da EMAEE
  const [escolas, setEscolas] = useState<{id: string, nome: string}[]>([])
  const [profissionaisAEE, setProfissionaisAEE] = useState<any[]>([])

  // Busca inicial
  React.useEffect(() => {
    let isMounted = true
    async function fetchData() {
      // 1. Busca escolas regulares
      const { data: escolasData } = await supabase
        .from('escolas')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      if (escolasData && isMounted) setEscolas(escolasData)

      // 2. Busca profissionais desta EMAEE
      if (props.escolaEmaeeId) {
        const { data: profData } = await supabase
          .from('funcionarios')
          .select(`
            id, nome, cargo, foto_avatar_path,
            vinculos_funcionarios!inner(escola_id, ativo)
          `)
          .eq('vinculos_funcionarios.escola_id', props.escolaEmaeeId)
          .eq('vinculos_funcionarios.ativo', true)
          .is('deleted_at', null)
          .order('nome')
        
        if (profData && isMounted) setProfissionaisAEE(profData)
      }
    }
    if (isOpen) {
      fetchData()
    }
    return () => { isMounted = false }
  }, [isOpen, props.escolaEmaeeId, supabase])

  const handleSearchAluno = async (term: string) => {
    if (!term || term.length < 3) {
      setAlunosEncontrados([])
      return
    }
    
    setSearchLoading(true)
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select(`
          id, nome, cpf, data_nascimento, certidao_nascimento,
          nome_mae, nome_pai, endereco, sexo, dados_matricula
        `)
        .ilike('nome', `%${term}%`)
        .is('deleted_at', null)
        .limit(10)
        
      if (error) throw error
      
      const mapped = data.map(a => ({
        id: a.id,
        nome: a.nome,
        cpf: a.cpf,
        data_nascimento: a.data_nascimento,
        certidao_nascimento: a.certidao_nascimento,
        nome_mae: a.nome_mae,
        nome_pai: a.nome_pai,
        endereco: a.endereco,
        sexo: a.sexo,
        cor_raca: (a.dados_matricula as any)?.cor_raca || null
      }))
      
      setAlunosEncontrados(mapped)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar alunos')
    } finally {
      setSearchLoading(false)
    }
  }

  const toggleDeficiencia = (key: keyof typeof deficiencias) => {
    setDeficiencias(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleProfissional = (profissionalId: string, cargo: string) => {
    setProfissionaisSelecionados(prev => {
      const exists = prev.find(p => p.profissional_id === profissionalId)
      if (exists) return prev.filter(p => p.profissional_id !== profissionalId)
      return [...prev, { profissional_id: profissionalId, especialidade: cargo || 'Outros', frequencia: 'SEMANAL' }]
    })
  }

  const updateFrequenciaProfissional = (profissionalId: string, freq: string) => {
    setProfissionaisSelecionados(prev => prev.map(p => 
      p.profissional_id === profissionalId ? { ...p, frequencia: freq } : p
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alunoSelecionado) {
      toast.error('Selecione um aluno primeiro')
      return
    }

    setLoading(true)
    try {
      // 1. Inserir matrícula
      const { data: matricula, error: matriculaError } = await supabase
        .from('emaee_matriculas')
        .insert({
          aluno_id: alunoSelecionado.id,
          escola_atendimento_id: props.escolaEmaeeId,
          turno_atendimento: turnoAtendimento,
          localizacao_atendimento: localizacaoAtendimento,
          escola_regular_id: escolaRegularId || null,
          ano_escolarizacao: anoEscolarizacao || null,
          turno_regular: turnoRegular || null,
          turma_regular: turmaRegular || null,
          professor_regular: professorRegular || null,
          gestor_regular: gestorRegular || null,
          principal_queixa: principalQueixa || null,
          cid_codigo: cidCodigo || null,
          observacoes_requerimento: observacoes || null,
          ...deficiencias,
          status: 'FILA_ESPERA'
        })
        .select('id')
        .single()

      if (matriculaError) throw matriculaError

      // 2. Inserir especialidades se houver
      if (profissionaisSelecionados.length > 0) {
        const specsToInsert = profissionaisSelecionados.map(p => ({
          emaee_matricula_id: matricula.id,
          profissional_id: p.profissional_id,
          especialidade: p.especialidade,
          frequencia: p.frequencia,
          dia_semana: 1, // Default
          horario_inicio: '08:00:00'
        }))

        const { error: specError } = await supabase
          .from('emaee_especialidades_vinculadas')
          .insert(specsToInsert)

        if (specError) throw specError
      }

      toast.success('Matrícula registrada com sucesso! Paciente na Fila de Espera.')
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
    setAlunoSelecionado,
    handleSearchAluno,
    
    escolaRegularId, setEscolaRegularId,
    escolas,
    anoEscolarizacao, setAnoEscolarizacao,
    turnoRegular, setTurnoRegular,
    turmaRegular, setTurmaRegular,
    professorRegular, setProfessorRegular,
    gestorRegular, setGestorRegular,
    
    turnoAtendimento, setTurnoAtendimento,
    localizacaoAtendimento, setLocalizacaoAtendimento,
    principalQueixa, setPrincipalQueixa,
    cidCodigo, setCidCodigo,
    observacoes, setObservacoes,
    
    deficiencias, toggleDeficiencia,
    profissionaisAEE,
    profissionaisSelecionados, toggleProfissional, updateFrequenciaProfissional,
    
    handleSubmit
  }
}
