'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabaseClient'
import { getProfessoresEscola, getCatalogoMaterias, getVinculosProfessores } from '@/lib/swrFetchers'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import {
  Users,
  BookOpen,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react'
import { ModalDetalhesAluno } from './ModalDetalhesAluno'

import { TabMateriasTurma } from './turmas/TabMateriasTurma'
import { TabAlunosTurma } from './turmas/TabAlunosTurma'
import { TabFrequenciasTurma } from './turmas/TabFrequenciasTurma'
import { TabNotasTurma } from './turmas/TabNotasTurma'


interface ModalDetalhesTurmaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turma: any // Objeto da turma selecionada
  initialMateriaId?: string
  initialAgendaAulaId?: string
  initialData?: string
}

export function ModalDetalhesTurma({
  open,
  onOpenChange,
  turma,
  initialMateriaId,
  initialAgendaAulaId,
  initialData
}: ModalDetalhesTurmaProps) {
  const [activeTab, setActiveTab] = useState('materias')
  // Filtros locais de busca de alunos
  const [searchAluno, setSearchAluno] = useState('')

  // Frequência
  const [dataFreq, setDataFreq] = useState(new Date().toISOString().split('T')[0])
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>('')
  const [selectedAgendaAulaId, setSelectedAgendaAulaId] = useState<string | null>(null)

  // Notas
  const [notasState, setNotasState] = useState<Record<string, { nota1: string | number | null; nota2: string | number | null; nota3: string | number | null; nota4: string | number | null }>>({}) // alunoId_materiaId_unidade -> notas
  const [recuperacoesState, setRecuperacoesState] = useState<Record<string, { nota: string | number | null }>>({}) // alunoId_materiaId -> recuperacao
  const [unidadesAtivas, setUnidadesAtivas] = useState<Record<string, number>>({}) // materiaId -> unidade ativa (1, 2 ou 3)
  const [savingNotas, setSavingNotas] = useState<Record<string, boolean>>({}) // materiaId -> loading de salvar
  const [materiaAberta, setMateriaAberta] = useState<string | null>(null) // Controlar Accordion manual

  // Estados Adicionais de Alocação Administrativa (quando isEditMode for true)
  const [selectedProfId, setSelectedProfId] = useState('')
  const [novaMateriaNome, setNovaMateriaNome] = useState('')
  const [novaMateriaProfId, setNovaMateriaProfId] = useState('')
  const [novaMateriaBaseCurricular, setNovaMateriaBaseCurricular] = useState('comum')
  
  // Modais de detalhe e impressão
  const [selectedAluno, setSelectedAluno] = useState<any>(null)

  const supabase = createClient() as any
  const { escolaAtivaId, acessos, funcionario } = useAuthStore()
  const { isEditMode: globalEditMode } = useEditModeStore()
  const isProfessor = !!(acessos?.some(a => a.nivel === 4 || a.nivel === 5) || funcionario?.cargo?.toLowerCase().includes('professor'))
  const isCoordenador = !!funcionario?.cargo?.toLowerCase().includes('coordenador')
  const isEditMode = globalEditMode && !isProfessor && !isCoordenador
  const selectedEscola = useSchoolStore((state) => state.selectedEscola)
  const escolaNome = selectedEscola?.nome ?? 'Sem Escola'

  // --- SWR Hooks para buscar dados ---

  // 1. Alunos e Matérias da Turma
  const { data: turmaData, isLoading: loadingTurma, error: errorTurma, mutate: mutateTurmaData } = useSWR(
    open && turma?.id && escolaAtivaId ? ['turma-detalhes', turma.id, escolaAtivaId] : null,
    async () => {
      const [alunosRes, materiasRes] = await Promise.all([
        supabase
          .from('alunos')
          .select('id, nome, foto_url, nome_mae, nome_pai, telefone, dados_matricula, turma_id, escola_id')
          .eq('turma_id', turma.id)
          .eq('escola_id', escolaAtivaId)
          .is('deleted_at', null)
          .order('nome', { ascending: true }),
        supabase
          .from('materias')
          .select('id, nome, professor_id, base_curricular, turma_id, escola_id, funcionarios:professor_id(id, nome)')
          .eq('turma_id', turma.id)
          .eq('escola_id', escolaAtivaId)
          .order('nome', { ascending: true })
      ])
      if (alunosRes.error) throw alunosRes.error
      if (materiasRes.error) throw materiasRes.error
      return { alunos: alunosRes.data || [], materias: materiasRes.data || [] }
    }
  )

  const alunos: any[] = turmaData?.alunos ?? []
  const materias: any[] = turmaData?.materias ?? []
  const loading = loadingTurma

  useEffect(() => {
    if (errorTurma) {
      toast.error('Erro ao carregar dados da turma: ' + errorTurma.message)
    }
  }, [errorTurma])

  // Expandir a primeira matéria por padrão se nenhuma estiver aberta
  useEffect(() => {
    if (open && materias.length > 0 && !materiaAberta) {
      setMateriaAberta(materias[0].id)
    }
  }, [open, materias, materiaAberta])

  // 2. Professores da Escola (apenas em modo de edição)
  const { data: professoresEscolaData, error: errorProfs } = useSWR(
    open && isEditMode && escolaAtivaId ? ['professores-escola', escolaAtivaId] : null,
    () => getProfessoresEscola(supabase, escolaAtivaId ?? '')
  )
  const professoresEscola: any[] = (professoresEscolaData as any[]) ?? []

  useEffect(() => {
    if (errorProfs) {
      toast.error('Erro ao carregar professores da escola: ' + errorProfs.message)
    }
  }, [errorProfs])

  // 3. Catálogo de Matérias (apenas em modo de edição)
  const { data: catalogoMateriasData, error: errorCatalogo } = useSWR(
    open && isEditMode && escolaAtivaId ? ['catalogo-materias', escolaAtivaId] : null,
    () => getCatalogoMaterias(supabase, escolaAtivaId ?? '')
  )
  const catalogoMaterias: any[] = (catalogoMateriasData as any[]) ?? []

  useEffect(() => {
    if (errorCatalogo) {
      toast.error('Erro ao carregar catálogo de matérias: ' + errorCatalogo.message)
    }
  }, [errorCatalogo])

  // 4. Vínculos de Professores na Turma (apenas em modo de edição)
  const { data: vinculosProfessoresData, error: errorVinculos, mutate: mutateVinculos } = useSWR(
    open && isEditMode && turma?.id ? ['vinculos-professores', turma.id] : null,
    () => getVinculosProfessores(supabase, turma.id)
  )
  const vinculosProfessores: any[] = (vinculosProfessoresData as any[]) ?? []

  useEffect(() => {
    if (errorVinculos) {
      toast.error('Erro ao carregar vínculos de professores: ' + errorVinculos.message)
    }
  }, [errorVinculos])

  // 5. Frequências do dia e matéria selecionados
  const freqKey = open && turma?.id && selectedMateriaId
    ? ['frequencias', turma.id, dataFreq, selectedMateriaId]
    : null

  const { data: frequencias = {}, isLoading: loadingFreq, error: errorFreq, mutate: mutateFrequencias } = useSWR(
    freqKey,
    async () => {
      const { data, error } = await supabase
        .from('frequencias')
        .select('aluno_id, presenca')
        .eq('turma_id', turma.id)
        .eq('data', dataFreq)
        .eq('materia_id', selectedMateriaId)
      if (error) throw error
      const map: Record<string, boolean> = {}
      ;(data || []).forEach((f: any) => { map[f.aluno_id] = f.presenca })
      return map
    }
  )

  useEffect(() => {
    if (errorFreq) {
      toast.error('Erro ao buscar frequências: ' + errorFreq.message)
    }
  }, [errorFreq])

  // 6. Notas da Turma (Cache centralizado no servidor com revalidação controlada)
  const { data: notasServidor, error: errorNotas, mutate: mutateNotasServidor } = useSWR(
    open && turma?.id ? ['notas-turma', turma.id] : null,
    async () => {
      const [notasRes, recsRes] = await Promise.all([
        supabase.from('notas').select('aluno_id, materia_id, unidade, nota1, nota2, nota3, nota4').eq('turma_id', turma.id),
        supabase.from('recuperacoes_finais').select('aluno_id, materia_id, nota').eq('turma_id', turma.id)
      ])
      if (notasRes.error) throw notasRes.error
      if (recsRes.error) throw recsRes.error

      const notasMap: typeof notasState = {}
      ;(notasRes.data || []).forEach((n: any) => {
        notasMap[`${n.aluno_id}_${n.materia_id}_${n.unidade}`] = {
          nota1: n.nota1 !== null ? String(n.nota1) : null,
          nota2: n.nota2 !== null ? String(n.nota2) : null,
          nota3: n.nota3 !== null ? String(n.nota3) : null,
          nota4: n.nota4 !== null ? String(n.nota4) : null
        }
      })

      const recMap: typeof recuperacoesState = {}
      ;(recsRes.data || []).forEach((r: any) => {
        recMap[`${r.aluno_id}_${r.materia_id}`] = { nota: r.nota !== null ? String(r.nota) : null }
      })

      return { notasMap, recMap }
    },
    { 
      revalidateOnFocus: false, 
      revalidateOnReconnect: false, 
      revalidateIfStale: false 
    }
  )

  useEffect(() => {
    if (errorNotas) {
      toast.error('Erro ao buscar notas da turma: ' + errorNotas.message)
    }
  }, [errorNotas])

  useEffect(() => {
    if (notasServidor) {
      setNotasState(notasServidor.notasMap)
      setRecuperacoesState(notasServidor.recMap)
    }
  }, [notasServidor])

  // Sincronizar parâmetros iniciais do professor/agenda
  useEffect(() => {
    if (open) {
      if (initialData) setDataFreq(initialData)
      if (initialMateriaId) setSelectedMateriaId(initialMateriaId)
      if (initialAgendaAulaId) setSelectedAgendaAulaId(initialAgendaAulaId)
    }
  }, [open, initialData, initialMateriaId, initialAgendaAulaId])

  // Autoselecionar a primeira matéria disponível para a chamada geral
  useEffect(() => {
    if (open && materias.length > 0 && !selectedMateriaId) {
      setSelectedMateriaId(materias[0].id)
    }
  }, [open, materias, selectedMateriaId])

  // Resetar a aba ativa somente quando o modal abrir pela primeira vez
  useEffect(() => {
    if (open) {
      if (initialMateriaId) {
        setActiveTab('frequencia')
      } else {
        setActiveTab('materias')
      }
    }
  }, [open, initialMateriaId])

  // Busca Dinâmica de Alunos
  const filteredAlunos = useMemo(() => {
    return alunos.filter(a => a.nome.toLowerCase().includes(searchAluno.toLowerCase()))
  }, [alunos, searchAluno])

  // Navegação de Datas na Frequência
  const alterarData = (dias: number) => {
    const d = new Date(dataFreq + 'T00:00:00')
    d.setDate(d.getDate() + dias)
    setDataFreq(d.toISOString().split('T')[0])
  }

  // Gravar Frequência (Upsert Imediato com feedback reativo e rollback)
  const handleLancarFrequencia = async (alunoId: string, presenca: boolean) => {
    if (!escolaAtivaId) return
    if (!selectedMateriaId) {
      toast.error('Selecione uma matéria antes de lançar a frequência.')
      return
    }

    const anterior = frequencias[alunoId]
    
    // Atualização otimista no cache SWR
    await mutateFrequencias(
      (curr) => ({ ...(curr || {}), [alunoId]: presenca }),
      { revalidate: false }
    )

    try {
      const { error } = await supabase
        .from('frequencias')
        .upsert({
          aluno_id: alunoId,
          turma_id: turma.id,
          escola_id: escolaAtivaId ?? '',
          data: dataFreq,
          presenca: presenca,
          materia_id: selectedMateriaId,
          agenda_aula_id: selectedAgendaAulaId
        }, { onConflict: 'aluno_id, data, materia_id' })

      if (error) throw error
    } catch (err: any) {
      console.error('Erro ao salvar frequência:', err)
      toast.error('Erro ao salvar presença: ' + err.message)
      // Rollback imediato no cache local para o valor anterior
      mutateFrequencias(
        (curr) => {
          const next = { ...(curr || {}) }
          if (anterior === undefined) {
            delete next[alunoId]
          } else {
            next[alunoId] = anterior
          }
          return next
        },
        { revalidate: false }
      )
    }
  }

  // Manipular notas
  const handleNotaChange = useCallback((
    alunoId: string,
    materiaId: string,
    unidade: number,
    campo: 'nota1' | 'nota2' | 'nota3' | 'nota4',
    valor: string
  ) => {
    const rawVal = valor.replace(',', '.')
    if (rawVal === '') {
      const key = `${alunoId}_${materiaId}_${unidade}`
      setNotasState(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || { nota1: null, nota2: null, nota3: null, nota4: null }),
          [campo]: null
        }
      }))
      return
    }

    // Validar se o formato é um número de 0 a 10 com no máximo 1 casa decimal (aceitando decimais parciais temporariamente)
    if (!/^(10(\.0?)?|[0-9](\.[0-9]?)?|\.)$/.test(rawVal)) {
      return // ignorar valores inválidos
    }
    
    const key = `${alunoId}_${materiaId}_${unidade}`
    setNotasState(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] || { nota1: null, nota2: null, nota3: null, nota4: null }),
        [campo]: rawVal
      }
    }))
  }, [])

  // Manipular alteração de recuperação final
  const handleRecuperacaoChange = useCallback((
    alunoId: string,
    materiaId: string,
    valor: string
  ) => {
    const rawVal = valor.replace(',', '.')
    const key = `${alunoId}_${materiaId}`
    if (rawVal === '') {
      setRecuperacoesState(prev => ({
        ...prev,
        [key]: { nota: null }
      }))
      return
    }

    if (!/^(10(\.0?)?|[0-9](\.[0-9]?)?|\.)$/.test(rawVal)) {
      return // ignorar valores inválidos
    }

    setRecuperacoesState(prev => ({
      ...prev,
      [key]: { nota: rawVal }
    }))
  }, [])

  // Salvar notas da matéria e unidade ativas em lote (Upsert seguro)
  const handleSalvarNotas = async (materiaId: string) => {
    if (!escolaAtivaId) return
    const unidade = unidadesAtivas[materiaId] || 1
    
    setSavingNotas(prev => ({ ...prev, [materiaId]: true }))

    try {
      // 1. Salvar notas das unidades
      const upserts = alunos.map(aluno => {
        const key = `${aluno.id}_${materiaId}_${unidade}`
        const n = notasState[key] || { nota1: null, nota2: null, nota3: null, nota4: null }
        return {
          aluno_id: aluno.id,
          turma_id: turma.id,
          materia_id: materiaId,
          escola_id: escolaAtivaId ?? '',
          unidade: unidade,
          nota1: n.nota1 !== null && n.nota1 !== '' ? Number(n.nota1) : null,
          nota2: n.nota2 !== null && n.nota2 !== '' ? Number(n.nota2) : null,
          nota3: n.nota3 !== null && n.nota3 !== '' ? Number(n.nota3) : null,
          nota4: n.nota4 !== null && n.nota4 !== '' ? Number(n.nota4) : null
        }
      })

      const { error } = await supabase
        .from('notas')
        .upsert(upserts, { onConflict: 'aluno_id, materia_id, unidade' })

      if (error) throw error

      // 2. Salvar ou deletar recuperações finais
      const recUpserts: any[] = []
      const recDeletes: string[] = []

      alunos.forEach(aluno => {
        const key = `${aluno.id}_${materiaId}`
        const rec = recuperacoesState[key]
        const calc = calculosNotas[key] ?? defaultCalculos
        const m1 = calc.m1
        const m2 = calc.m2
        const m3 = calc.m3
        const todasUnidades = calc.todasUnidades
        const mediaFinal = calc.mediaFinal

        if (rec && rec.nota !== null && rec.nota !== '') {
          // Apenas salva a recuperação final se o aluno realmente estiver elegível (média < 5.0 e todas as unidades lançadas)
          if (todasUnidades && mediaFinal !== null && mediaFinal < 5.0) {
            recUpserts.push({
              aluno_id: aluno.id,
              turma_id: turma.id,
              materia_id: materiaId,
              escola_id: escolaAtivaId ?? '',
              nota: Number(rec.nota)
            })
          }
        } else {
          recDeletes.push(aluno.id)
        }
      })

      if (recUpserts.length > 0) {
        const { error: recError } = await supabase
          .from('recuperacoes_finais')
          .upsert(recUpserts, { onConflict: 'aluno_id, materia_id' })
        if (recError) throw recError
      }

      if (recDeletes.length > 0) {
        const { error: delError } = await supabase
          .from('recuperacoes_finais')
          .delete()
          .eq('turma_id', turma.id)
          .eq('materia_id', materiaId)
          .in('aluno_id', recDeletes)
        if (delError) throw delError
      }

      toast.success('Notas salvas com sucesso!')
      mutateNotasServidor()
    } catch (err: any) {
      console.error('Erro ao salvar notas/recuperações:', err)
      toast.error('Erro ao salvar notas: ' + err.message)
    } finally {
      setSavingNotas(prev => ({ ...prev, [materiaId]: false }))
    }
  }

  // Ações de Alocação Administrativa de Professores e Matérias
  const handleAddProfessor = async () => {
    if (!selectedProfId) {
      toast.error('Selecione um professor')
      return
    }

    if (vinculosProfessores.some(vp => vp.funcionario_id === selectedProfId)) {
      toast.error('Este professor já está vinculado a esta turma')
      return
    }

    try {
      const { error } = await supabase
        .from('vinculos_turmas')
        .insert({
          funcionario_id: selectedProfId,
          turma_id: turma.id,
          escola_id: escolaAtivaId ?? '',
          tipo: 'professor'
        })

      if (error) throw error
      toast.success('Professor adicionado com sucesso')
      setSelectedProfId('')
      mutateVinculos()
    } catch (err: any) {
      toast.error('Erro ao adicionar professor: ' + err.message)
    }
  }

  const handleRemoveProfessor = async (vinculoId: string, funcionarioId: string) => {
    try {
      // Validar se o professor ministra alguma matéria na turma
      const hasSubject = materias.some(m => m.professor_id === funcionarioId)
      if (hasSubject) {
        toast.error('Não é possível remover este professor, pois ele está alocado em uma ou mais matérias desta turma.')
        return
      }

      const { error } = await supabase
        .from('vinculos_turmas')
        .delete()
        .eq('id', vinculoId)

      if (error) throw error
      toast.success('Professor removido com sucesso')
      mutateVinculos()
    } catch (err: any) {
      toast.error('Erro ao remover professor: ' + err.message)
    }
  }

  const handleSelectMateriaCatalogo = (nomeMateria: string) => {
    setNovaMateriaNome(nomeMateria)
    const selected = catalogoMaterias.find(m => m.nome === nomeMateria)
    if (selected) {
      setNovaMateriaBaseCurricular(selected.base_curricular)
    } else {
      setNovaMateriaBaseCurricular('comum')
    }
  }

  const handleAddMateria = async () => {
    if (!novaMateriaNome.trim()) {
      toast.error('Digite o nome da matéria')
      return
    }

    const alreadyExists = materias.some(
      (m: any) => m.nome.trim().toLowerCase() === novaMateriaNome.trim().toLowerCase()
    )
    if (alreadyExists) {
      toast.error('Esta matéria já está vinculada a esta turma.')
      return
    }

    try {
      const { error } = await supabase
        .from('materias')
        .insert({
          nome: novaMateriaNome.trim(),
          turma_id: turma.id,
          escola_id: escolaAtivaId || null,
          professor_id: novaMateriaProfId === 'sem_professor' || !novaMateriaProfId ? null : novaMateriaProfId,
          base_curricular: novaMateriaBaseCurricular
        })

      if (error) throw error
      toast.success('Matéria adicionada com sucesso')
      setNovaMateriaNome('')
      setNovaMateriaProfId('')
      setNovaMateriaBaseCurricular('comum')
      mutateTurmaData() // Recarregar matérias
    } catch (err: any) {
      toast.error('Erro ao adicionar matéria: ' + err.message)
    }
  }

  const handleImportarMateriasDaGrade = async () => {
    if (!catalogoMaterias || catalogoMaterias.length === 0) {
      toast.info('Não há matérias na grade curricular desta escola.')
      return
    }

    try {
      const missingMaterias = catalogoMaterias.filter((gridMat: any) => 
        !materias.some((mat: any) => mat.nome.trim().toLowerCase() === gridMat.nome.trim().toLowerCase())
      )

      if (missingMaterias.length === 0) {
        toast.info('Todas as matérias da grade já estão nesta turma.')
        return
      }

      const inserts = missingMaterias.map((gridMat: any) => ({
        nome: gridMat.nome.trim(),
        turma_id: turma.id,
        escola_id: escolaAtivaId || null,
        professor_id: null,
        base_curricular: gridMat.base_curricular || 'comum'
      }))

      const { error } = await supabase
        .from('materias')
        .insert(inserts)

      if (error) throw error

      toast.success(`${missingMaterias.length} matéria(s) importada(s) com sucesso!`)
      mutateTurmaData() // Recarregar matérias
    } catch (err: any) {
      toast.error('Erro ao importar matérias da grade: ' + err.message)
    }
  }

  const handleRemoveMateria = async (materiaId: string) => {
    try {
      const { error } = await supabase
        .from('materias')
        .delete()
        .eq('id', materiaId)

      if (error) throw error
      toast.success('Matéria removida com sucesso')
      mutateTurmaData() // Recarregar matérias
    } catch (err: any) {
      toast.error('Erro ao remover matéria: ' + err.message)
    }
  }

  const handleUpdateMateriaProfessor = async (materiaId: string, professorId: string) => {
    const profIdVal = professorId === 'sem_professor' || !professorId ? null : professorId

    // Mutate otimista local no cache do SWR
    mutateTurmaData(
      (curr: any) => {
        if (!curr) return curr
        const nomeProf = vinculosProfessores.find(vp => vp.funcionario_id === profIdVal)?.funcionarios?.nome || null
        return {
          ...curr,
          materias: curr.materias.map((m: any) => 
            m.id === materiaId 
              ? { 
                  ...m, 
                  professor_id: profIdVal, 
                  funcionarios: profIdVal ? { id: profIdVal, nome: nomeProf } : null 
                } 
              : m
          )
        }
      },
      { revalidate: false }
    )

    try {
      const { error } = await supabase
        .from('materias')
        .update({ professor_id: profIdVal })
        .eq('id', materiaId)

      if (error) throw error
      toast.success('Professor da matéria atualizado!')
      mutateTurmaData() // Sincroniza com o banco de dados
    } catch (err: any) {
      toast.error('Erro ao atualizar professor da matéria: ' + err.message)
      mutateTurmaData() // Reverte para o estado correto do banco
    }
  }

  const handleUpdateMateriaBase = async (materiaId: string, baseCurricular: string) => {
    // Mutate otimista local no cache do SWR
    mutateTurmaData(
      (curr: any) => {
        if (!curr) return curr
        return {
          ...curr,
          materias: curr.materias.map((m: any) => 
            m.id === materiaId 
              ? { ...m, base_curricular: baseCurricular } 
              : m
          )
        }
      },
      { revalidate: false }
    )

    try {
      const { error } = await supabase
        .from('materias')
        .update({ base_curricular: baseCurricular })
        .eq('id', materiaId)

      if (error) throw error
      toast.success('Base curricular da matéria atualizada com sucesso!')
      mutateTurmaData() // Sincroniza com o banco de dados
    } catch (err: any) {
      toast.error('Erro ao atualizar base curricular da matéria: ' + err.message)
      mutateTurmaData() // Reverte para o estado correto do banco
    }
  }


  const defaultCalculos = useMemo(() => ({
    m1: null,
    m2: null,
    m3: null,
    mediaFinal: null,
    mediaPosRec: null,
    situacao: 'Sem Notas',
    todasUnidades: false,
    isElegivelRec: false
  }), [])

  const calculosNotas = useMemo(() => {
    const res: Record<string, {
      m1: number | null
      m2: number | null
      m3: number | null
      mediaFinal: number | null
      mediaPosRec: number | null
      situacao: string
      todasUnidades: boolean
      isElegivelRec: boolean
    }> = {}

    alunos.forEach(aluno => {
      materias.forEach(mat => {
        const keyPrefix = `${aluno.id}_${mat.id}`
        
        const n1Data = notasState[`${keyPrefix}_1`] || { nota1: null, nota2: null, nota3: null, nota4: null }
        const n2Data = notasState[`${keyPrefix}_2`] || { nota1: null, nota2: null, nota3: null, nota4: null }
        const n3Data = notasState[`${keyPrefix}_3`] || { nota1: null, nota2: null, nota3: null, nota4: null }

        const parseUnidade = (n: typeof n1Data) => {
          const v1 = n.nota1 !== null && n.nota1 !== '' ? Number(n.nota1) : null
          const v2 = n.nota2 !== null && n.nota2 !== '' ? Number(n.nota2) : null
          const v3 = n.nota3 !== null && n.nota3 !== '' ? Number(n.nota3) : null
          const v4 = n.nota4 !== null && n.nota4 !== '' ? Number(n.nota4) : null
          
          const validas = [v1, v2, v3, v4].filter((v): v is number => v !== null && !isNaN(v))
          if (validas.length === 0) return null
          
          const val1 = v1 ?? 0
          const val2 = v2 ?? 0
          const val3 = v3 ?? 0
          const val4 = v4 ?? 0
          
          const divisor = (v4 !== null) ? 4 : 3
          const soma = val1 + val2 + val3 + (v4 !== null ? val4 : 0)
          return parseFloat((soma / divisor).toFixed(1))
        }

        const m1 = parseUnidade(n1Data)
        const m2 = parseUnidade(n2Data)
        const m3 = parseUnidade(n3Data)

        const mediasValidas = [m1, m2, m3].filter((m): m is number => m !== null)
        const mediaFinal = mediasValidas.length === 0 
          ? null 
          : parseFloat((mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length).toFixed(1))

        const todasUnidades = m1 !== null && m2 !== null && m3 !== null
        const isElegivelRec = todasUnidades && mediaFinal !== null && mediaFinal < 5.0

        const recData = recuperacoesState[keyPrefix] || { nota: null }
        const notaRec = recData.nota !== null && recData.nota !== '' ? Number(recData.nota) : null

        let mediaPosRec = mediaFinal
        if (mediaFinal !== null && todasUnidades && mediaFinal < 5.0) {
          if (notaRec !== null) {
            mediaPosRec = notaRec
          }
        }

        let situacao = 'Cursando'
        if (mediaFinal === null) {
          situacao = 'Sem Notas'
        } else if (!todasUnidades) {
          situacao = 'Cursando'
        } else if (mediaFinal >= 5.0) {
          situacao = 'Aprovado'
        } else if (notaRec === null) {
          situacao = 'Em Recuperação'
        } else {
          situacao = notaRec >= 5.0 ? 'Aprovado (Rec)' : 'Reprovado'
        }

        res[keyPrefix] = {
          m1,
          m2,
          m3,
          mediaFinal,
          mediaPosRec,
          situacao,
          todasUnidades,
          isElegivelRec
        }
      })
    })

    return res
  }, [alunos, materias, notasState, recuperacoesState])

  const processarNotasParaImpressao = (alunoId: string) => {
    const formatadas: any[] = []
    materias.forEach(mat => {
      [1, 2, 3].forEach(unid => {
        const key = `${alunoId}_${mat.id}_${unid}`
        const n = notasState[key]
        if (n) {
          formatadas.push({
            materia_id: mat.id,
            unidade: unid,
            nota1: n.nota1 !== null && n.nota1 !== '' ? Number(n.nota1) : null,
            nota2: n.nota2 !== null && n.nota2 !== '' ? Number(n.nota2) : null,
            nota3: n.nota3 !== null && n.nota3 !== '' ? Number(n.nota3) : null,
            nota4: n.nota4 !== null && n.nota4 !== '' ? Number(n.nota4) : null
          })
        }
      })
    })
    return formatadas
  }

  const processarRecuperacoesParaImpressao = (alunoId: string) => {
    return materias.map(mat => {
      const key = `${alunoId}_${mat.id}`
      const rec = recuperacoesState[key]
      return {
        materia_id: mat.id,
        nota: rec && rec.nota !== null && rec.nota !== '' ? Number(rec.nota) : null
      }
    })
  }

  if (!turma) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] w-full bg-card border-borderCustom text-foreground p-6 rounded-[18px] shadow-[0_24px_80px_rgba(15,23,42,0.18)] max-h-[92vh] overflow-y-auto">
          <DialogHeader className="pr-12">
            <DialogTitle className="text-2xl font-bold tracking-tight">{turma.nome}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              {turma.turno} • Ano letivo {turma.ano_letivo}
            </DialogDescription>
          </DialogHeader>

          {/* Abas Nativas do SIG */}
          <div className="mt-6">
            <div className="bg-surface-2 border border-borderCustom p-1 rounded-xl w-full grid grid-cols-4 h-11 text-muted-foreground">
              <button
                onClick={() => setActiveTab('materias')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'materias' ? 'bg-card text-primary shadow border border-border' : 'hover:text-foreground hover:bg-[#eef5ff] dark:hover:bg-primary/5'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Matérias
              </button>
              <button
                onClick={() => setActiveTab('alunos')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'alunos' ? 'bg-card text-primary shadow border border-border' : 'hover:text-foreground hover:bg-[#eef5ff] dark:hover:bg-primary/5'
                }`}
              >
                <Users className="w-4 h-4" />
                Alunos
              </button>
              <button
                onClick={() => setActiveTab('frequencia')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'frequencia' ? 'bg-card text-primary shadow border border-border' : 'hover:text-foreground hover:bg-[#eef5ff] dark:hover:bg-primary/5'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Frequência
              </button>
              <button
                onClick={() => setActiveTab('notas')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'notas' ? 'bg-card text-primary shadow border border-border' : 'hover:text-foreground hover:bg-[#eef5ff] dark:hover:bg-primary/5'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Notas
              </button>
            </div>

            {activeTab === 'materias' && (
              <TabMateriasTurma
                isEditMode={isEditMode}
                loading={loading}
                materias={materias}
                professoresEscola={professoresEscola}
                vinculosProfessores={vinculosProfessores}
                catalogoMaterias={catalogoMaterias}
                selectedProfId={selectedProfId}
                setSelectedProfId={setSelectedProfId}
                novaMateriaNome={novaMateriaNome}
                setNovaMateriaNome={setNovaMateriaNome}
                novaMateriaProfId={novaMateriaProfId}
                setNovaMateriaProfId={setNovaMateriaProfId}
                novaMateriaBaseCurricular={novaMateriaBaseCurricular}
                setNovaMateriaBaseCurricular={setNovaMateriaBaseCurricular}
                handleAddProfessor={handleAddProfessor}
                handleRemoveProfessor={handleRemoveProfessor}
                handleSelectMateriaCatalogo={handleSelectMateriaCatalogo}
                handleAddMateria={handleAddMateria}
                handleImportarMateriasDaGrade={handleImportarMateriasDaGrade}
                handleRemoveMateria={handleRemoveMateria}
                handleUpdateMateriaProfessor={handleUpdateMateriaProfessor}
                handleUpdateMateriaBase={handleUpdateMateriaBase}
              />
            )}

            {activeTab === 'alunos' && (
              <TabAlunosTurma
                loading={loading}
                alunos={alunos}
                setSelectedAluno={setSelectedAluno}
              />
            )}

            {activeTab === 'frequencia' && (
              <TabFrequenciasTurma
                alunos={alunos}
                materias={materias}
                selectedMateriaId={selectedMateriaId}
                setSelectedMateriaId={setSelectedMateriaId}
                setSelectedAgendaAulaId={setSelectedAgendaAulaId}
                initialMateriaId={initialMateriaId}
                dataFreq={dataFreq}
                setDataFreq={setDataFreq}
                loading={loading}
                loadingFreq={loadingFreq}
                frequencias={frequencias}
                handleLancarFrequencia={handleLancarFrequencia}
                mutateFrequencias={mutateFrequencias}
              />
            )}

            {activeTab === 'notas' && (
              <TabNotasTurma
                loading={loading}
                materias={materias}
                alunos={alunos}
                materiaAberta={materiaAberta}
                setMateriaAberta={setMateriaAberta}
                unidadesAtivas={unidadesAtivas}
                setUnidadesAtivas={setUnidadesAtivas}
                notasState={notasState}
                recuperacoesState={recuperacoesState}
                savingNotas={savingNotas}
                calculosNotas={calculosNotas}
                defaultCalculos={defaultCalculos}
                mutateNotasServidor={mutateNotasServidor}
                handleSalvarNotas={handleSalvarNotas}
                handleNotaChange={handleNotaChange}
                handleRecuperacaoChange={handleRecuperacaoChange}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes do Aluno */}
      <ModalDetalhesAluno
        open={selectedAluno !== null}
        onOpenChange={(val) => {
          if (!val) setSelectedAluno(null)
        }}
        aluno={selectedAluno}
        turma={turma}
      />
    </>
  )
}

