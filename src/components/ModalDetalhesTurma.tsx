'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import useSWR from 'swr'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { getProfessoresEscola, getCatalogoMaterias, getVinculosProfessores } from '@/lib/swrFetchers'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { cn } from '@/lib/utils'
import {
  Users,
  BookOpen,
  CalendarDays,
  FileSpreadsheet,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Save,
  Printer,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2
} from 'lucide-react'
import { ModalDetalhesAluno } from './ModalDetalhesAluno'

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
        <DialogContent className="sm:max-w-[700px] w-full bg-card border-borderCustom text-foreground p-6 rounded-2xl max-h-[92vh] overflow-y-auto">
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
                  activeTab === 'materias' ? 'bg-card text-foreground shadow' : 'hover:text-foreground'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Matérias
              </button>
              <button
                onClick={() => setActiveTab('alunos')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'alunos' ? 'bg-card text-foreground shadow' : 'hover:text-foreground'
                }`}
              >
                <Users className="w-4 h-4" />
                Alunos
              </button>
              <button
                onClick={() => setActiveTab('frequencia')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'frequencia' ? 'bg-card text-foreground shadow' : 'hover:text-foreground'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Frequência
              </button>
              <button
                onClick={() => setActiveTab('notas')}
                className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'notas' ? 'bg-card text-foreground shadow' : 'hover:text-foreground'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Notas
              </button>
            </div>

            {/* ABA: MATÉRIAS */}
            {activeTab === 'materias' && (
              <div className="space-y-4 mt-5">
                {isEditMode ? (
                  // PAINEL DE ALOCAÇÃO ADMINISTRATIVA (Exibido se o Modo de Edição estiver ativo)
                  <div className="space-y-5">
                    {/* Professores da Turma */}
                    <div className="border border-[#26262a] bg-[#161618] rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#26262a] pb-2">
                        <Users className="w-4 h-4 text-zinc-400" />
                        Professores da Turma
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <select
                            value={selectedProfId}
                            onChange={(e) => setSelectedProfId(e.target.value)}
                            className="w-full bg-[#121214] border border-[#2a2a2a] rounded-lg text-white px-3 h-10 text-xs focus:ring-1 focus:ring-[#3ea6ff]"
                          >
                            <option value="">-- Selecione um Professor --</option>
                            {professoresEscola
                              .filter(p => !vinculosProfessores.some(vp => vp.funcionario_id === p.id))
                              .map((prof) => (
                                <option key={prof.id} value={prof.id}>
                                  {prof.nome}
                                </option>
                              ))}
                          </select>
                        </div>
                        <Button
                          onClick={handleAddProfessor}
                          className="bg-[#3ea6ff] hover:bg-[#0090ff] text-background font-bold px-4 h-10 text-xs"
                        >
                          Adicionar
                        </Button>
                      </div>

                      {/* Lista de Professores Adicionados */}
                      {vinculosProfessores.length > 0 ? (
                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1">
                          {vinculosProfessores.map((vp) => (
                            <div key={vp.id} className="flex items-center justify-between bg-[#121214] p-2 rounded-lg border border-[#202022]">
                              <span className="text-xs font-semibold text-zinc-200 pl-1">{vp.funcionarios?.nome ?? 'Sem nome'}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveProfessor(vp.id, vp.funcionario_id)}
                                className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500 text-center py-1 font-medium">Nenhum professor alocado.</div>
                      )}
                    </div>

                    {/* Matérias da Turma */}
                    <div className="border border-[#26262a] bg-[#161618] rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#26262a] pb-2">
                        <BookOpen className="w-4 h-4 text-zinc-400" />
                        Matérias da Turma
                      </div>

                      {/* Formulário de Adição (Dashed Container) */}
                      <div className="border border-dashed border-[#3f3f46] bg-[#121214] rounded-lg p-3 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <select
                            value={novaMateriaNome}
                            onChange={(e) => handleSelectMateriaCatalogo(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#2a2a2a] rounded-lg text-white px-3 h-10 text-xs focus:ring-1 focus:ring-[#3ea6ff]"
                          >
                            <option value="">-- Selecione a Matéria --</option>
                            {catalogoMaterias.length === 0 ? (
                              <option value="" disabled>Cadastre matérias nas Configurações</option>
                            ) : (
                              catalogoMaterias.map((m) => (
                                <option key={m.id} value={m.nome}>
                                  {m.nome}
                                </option>
                              ))
                            )}
                          </select>
                          <select
                            value={novaMateriaProfId}
                            onChange={(e) => setNovaMateriaProfId(e.target.value)}
                            className="w-full bg-[#18181b] border border-[#2a2a2a] rounded-lg text-white px-3 h-10 text-xs focus:ring-1 focus:ring-[#3ea6ff]"
                          >
                            <option value="">-- Selecione o Professor --</option>
                            <option value="sem_professor">Sem professor</option>
                            {vinculosProfessores.map((vp) => (
                              <option key={vp.funcionario_id} value={vp.funcionario_id}>
                                {vp.funcionarios?.nome ?? 'Sem nome'}
                              </option>
                            ))}
                          </select>
                          <div className="w-full bg-[#18181b] border border-[#2a2a2a] rounded-lg text-zinc-400 px-3 h-10 text-xs flex items-center justify-between">
                            <span>Base:</span>
                            <span className={cn(
                              "font-semibold uppercase text-[10px] px-2 py-0.5 rounded border",
                              novaMateriaBaseCurricular === 'comum'
                                ? "bg-blue-500/10 border-blue-500/20 text-[#3ea6ff]"
                                : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                            )}>
                              {novaMateriaBaseCurricular === 'comum' ? 'Comum' : 'Diversificada'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={handleAddMateria}
                            className="bg-[#3ea6ff] hover:bg-[#0090ff] text-background font-bold w-auto gap-1 h-9 px-3 text-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar Matéria
                          </Button>
                          <Button
                            onClick={handleImportarMateriasDaGrade}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 w-9 p-0 text-xs rounded-lg flex items-center justify-center"
                            title="Importar todas as matérias da grade curricular"
                          >
                            T
                          </Button>
                        </div>
                      </div>

                      {/* Lista de Matérias */}
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {materias.length === 0 ? (
                          <div className="text-xs text-zinc-500 text-center py-2 font-medium">Nenhuma matéria cadastrada.</div>
                        ) : (
                          materias.map((mat) => (
                            <div key={mat.id} className="flex items-center justify-between bg-[#121214] p-3 rounded-lg border border-[#202022] gap-3">
                              <div className="flex flex-col min-w-0 flex-1 pr-2">
                                <span className="text-xs font-bold text-white truncate">{mat.nome}</span>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  <div className="flex items-center gap-1">
                                    <UserIcon className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                    <select
                                      value={mat.professor_id ?? 'sem_professor'}
                                      onChange={(e) => handleUpdateMateriaProfessor(mat.id, e.target.value)}
                                      className="bg-[#18181b] border border-[#2a2a2a] rounded text-zinc-300 px-2 py-0.5 text-[11px] focus:ring-1 focus:ring-[#3ea6ff] outline-none max-w-[130px]"
                                    >
                                      <option value="sem_professor">Sem professor</option>
                                      {vinculosProfessores.map((vp) => (
                                        <option key={vp.funcionario_id} value={vp.funcionario_id}>
                                          {vp.funcionarios?.nome ?? 'Sem nome'}
                                        </option>
                                      ))}
                                      {/* Caso o professor atual não esteja listado nos vínculos (prevenção de inconsistência) */}
                                      {mat.professor_id && !vinculosProfessores.some(vp => vp.funcionario_id === mat.professor_id) && (
                                        <option key={mat.professor_id} value={mat.professor_id}>
                                          {mat.funcionarios?.nome ?? 'Professor atual (Fora da Turma)'}
                                        </option>
                                      )}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                                    <select
                                      value={mat.base_curricular ?? 'comum'}
                                      onChange={(e) => handleUpdateMateriaBase(mat.id, e.target.value)}
                                      className="bg-[#18181b] border border-[#2a2a2a] rounded text-zinc-300 px-2 py-0.5 text-[11px] focus:ring-1 focus:ring-[#3ea6ff] outline-none"
                                    >
                                      <option value="comum">Base Comum</option>
                                      <option value="diversificada">Base Diversificada</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMateria(mat.id)}
                                className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex-shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // DIÁRIO SIMPLES (Exibido no modo de leitura comum)
                  <div className="space-y-3">
                    {loading ? (
                      <div className="text-center py-10 text-xs text-zinc-500 font-medium">Carregando matérias...</div>
                    ) : materias.length === 0 ? (
                      <div className="text-center py-10 text-xs text-zinc-500 font-medium">Nenhuma matéria vinculada a esta turma.</div>
                    ) : (
                      materias.map((mat) => (
                        <div
                          key={mat.id}
                          className="bg-[#18181b] border border-[#26262a] rounded-xl p-4 flex items-center justify-between h-13"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-white">{mat.nome}</span>
                            <span className="text-[10px] text-zinc-400 mt-0.5">
                              {mat.base_curricular === 'diversificada' ? 'Base Diversificada' : 'Base Comum'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <UserIcon className="w-4 h-4 text-zinc-500" />
                            <span>{mat.funcionarios?.nome ?? 'Sem professor'}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA: ALUNOS */}
            {activeTab === 'alunos' && (
              <div className="space-y-4 mt-5">
                {/* Campo de Busca */}
                <div className="relative">
                  <Input
                    type="search"
                    placeholder="Buscar aluno..."
                    value={searchAluno}
                    onChange={(e) => setSearchAluno(e.target.value)}
                    className="bg-[#18181b] border-[#26262a] text-white placeholder-zinc-500 h-10 text-sm rounded-xl pl-3 focus-visible:ring-[#3ea6ff]"
                  />
                </div>

                {/* Lista */}
                {loading ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Carregando alunos...</div>
                ) : filteredAlunos.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Nenhum aluno encontrado.</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filteredAlunos.map((aluno) => (
                      <div
                        key={aluno.id}
                        onClick={() => setSelectedAluno(aluno)}
                        className="bg-[#18181b] border border-[#26262a] hover:border-[#3ea6ff]/40 p-3 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all duration-200"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#3ea6ff]/10 border border-[#3ea6ff]/20 text-[#3ea6ff] text-sm font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                          {aluno.foto_url ? (
                            <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                          ) : (
                            aluno.nome.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="text-sm font-semibold text-zinc-200 truncate">{aluno.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ABA: FREQUÊNCIA */}
            {activeTab === 'frequencia' && (
              <div className="space-y-4 mt-5">
                {/* Controles de Data e Matéria */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center bg-[#18181b] border border-[#26262a] rounded-xl overflow-hidden h-10">
                    <button
                      onClick={() => alterarData(-1)}
                      className="p-2.5 hover:bg-[#202024] text-zinc-400 hover:text-white transition-colors"
                    >
                      <ChevronLeft className="w-4.5 h-4.5" />
                    </button>
                    <input
                      type="date"
                      value={dataFreq}
                      onChange={(e) => setDataFreq(e.target.value)}
                      className="bg-transparent text-sm text-[#3ea6ff] font-bold text-center w-36 outline-none px-2 focus:ring-0"
                    />
                    <button
                      onClick={() => alterarData(1)}
                      className="p-2.5 hover:bg-[#202024] text-zinc-400 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <select
                    value={selectedMateriaId}
                    onChange={(e) => {
                      setSelectedMateriaId(e.target.value)
                      setSelectedAgendaAulaId(null) // Reseta se trocar matéria manualmente
                    }}
                    disabled={!!initialMateriaId}
                    className="h-10 rounded-xl border border-[#26262a] bg-[#18181b] text-zinc-200 px-3.5 text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- Selecione a Matéria --</option>
                    {materias.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => mutateFrequencias()}
                    className="bg-[#18181b] text-zinc-300 border-zinc-800 hover:bg-zinc-850 hover:text-white rounded-xl px-3.5 h-10 gap-1.5 text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Atualizar
                  </Button>
                </div>

                {/* Lista com Presença/Falta */}
                {loading || loadingFreq ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Carregando diário de presenças...</div>
                ) : alunos.length === 0 ? (
                  <div className="text-center py-10 text-xs text-zinc-500 font-medium">Sem alunos matriculados nesta turma.</div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {alunos.map((aluno) => {
                      const status = frequencias[aluno.id] // true = Presente, false = Falta, undefined = Pendente
                      return (
                        <div
                          key={aluno.id}
                          className="bg-[#18181b] border border-[#26262a] p-3 rounded-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                              {aluno.foto_url ? (
                                <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                              ) : (
                                aluno.nome.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="text-sm font-semibold text-zinc-200 truncate pr-2">{aluno.nome}</span>
                          </div>

                          {/* Botões Presente / Falta */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleLancarFrequencia(aluno.id, true)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                status === true
                                  ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                  : 'bg-transparent text-zinc-400 border-zinc-800 hover:bg-[#202024]'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Presente
                            </button>
                            <button
                              onClick={() => handleLancarFrequencia(aluno.id, false)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                status === false
                                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                  : 'bg-transparent text-zinc-400 border-zinc-800 hover:bg-[#202024]'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Falta
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA: NOTAS */}
            {activeTab === 'notas' && (
              <div className="space-y-4 mt-5">
                <div className="space-y-3 w-full">
                  {loading ? (
                    <div className="text-center py-10 text-xs text-zinc-500 font-medium bg-[#18181b] border border-[#26262a] rounded-xl">
                      Carregando notas...
                    </div>
                  ) : materias.length === 0 ? (
                    <div className="text-center py-10 text-xs text-zinc-500 font-medium bg-[#18181b] border border-[#26262a] rounded-xl p-4">
                      Nenhuma matéria vinculada a esta turma. Cadastre as matérias na aba "Matérias" para poder lançar notas.
                    </div>
                  ) : (
                    materias.map((mat) => {
                      const isOpen = materiaAberta === mat.id
                      const unidAtiva = unidadesAtivas[mat.id] || 1
                      const isSaving = savingNotas[mat.id] || false

                      return (
                        <div
                          key={mat.id}
                          className="border border-[#26262a] bg-[#18181b] rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => setMateriaAberta(isOpen ? null : mat.id)}
                            className="w-full text-left px-4 py-3 text-sm font-bold text-white border-b border-[#26262a] bg-[#18181b] flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              <BookOpen className="w-4.5 h-4.5 text-zinc-400" />
                              {mat.nome}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {isOpen && (
                            <div className="p-4 bg-[#121214] space-y-4">
                              {/* Controles de Lançamento por Unidade e Botões de Ação */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#26262a] pb-3.5">
                                {/* Tabs de Unidade */}
                                <div className="flex gap-1.5 bg-[#18181b] border border-[#26262a] p-1 rounded-lg">
                                  {[1, 2, 3].map(u => (
                                    <button
                                      key={u}
                                      onClick={() => setUnidadesAtivas(prev => ({ ...prev, [mat.id]: u }))}
                                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                        unidAtiva === u
                                          ? 'bg-[#3ea6ff] text-black'
                                          : 'text-zinc-400 hover:text-white'
                                      }`}
                                    >
                                      {u}ª Unidade
                                    </button>
                                  ))}
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => mutateNotasServidor()}
                                    className="bg-[#18181b] text-zinc-300 border-zinc-800 hover:bg-zinc-850 hover:text-white rounded-lg h-9 gap-1 text-xs font-semibold"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Atualizar
                                  </Button>
                                  <Button
                                    size="sm"
                                    disabled={isSaving}
                                    onClick={() => handleSalvarNotas(mat.id)}
                                    className="bg-[#3ea6ff] hover:bg-[#0090ff] text-background font-bold h-9 gap-1 text-xs"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    {isSaving ? 'Salvando...' : 'Salvar Notas'}
                                  </Button>
                                </div>
                              </div>

                              {/* Tabela de Notas */}
                              <div className="overflow-x-auto border border-[#26262a] rounded-xl bg-[#141416]/50">
                                <table className="w-full text-left border-collapse min-w-[500px]">
                                  <thead>
                                    <tr className="border-b border-[#26262a] text-[10.5px] text-zinc-400 font-semibold uppercase bg-[#18181b]/30">
                                      <th className="p-3">Aluno</th>
                                      <th className="p-3 w-16 text-center">Nota 1</th>
                                      <th className="p-3 w-16 text-center">Nota 2</th>
                                      <th className="p-3 w-16 text-center">Nota 3</th>
                                      <th className="p-3 w-16 text-center">Nota 4</th>
                                      <th className="p-3 w-20 text-center font-bold bg-[#1c1c1e]/40">Média Unid.</th>
                                      <th className="p-3 w-20 text-center font-bold bg-[#1c1c1e]/60">Média Final</th>
                                      <th className="p-3 w-20 text-center font-bold bg-[#1c1c1e]/85">Recup. Final</th>
                                      <th className="p-3 w-20 text-center font-bold bg-[#1c1c1e]/90">Média Pós-Rec</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {alunos.length === 0 ? (
                                      <tr>
                                        <td colSpan={8} className="p-8 text-center text-xs text-zinc-500 font-medium">
                                          Nenhum aluno matriculado nesta turma.
                                        </td>
                                      </tr>
                                    ) : (
                                      alunos.map(aluno => {
                                        const key = `${aluno.id}_${mat.id}`
                                        const calc = calculosNotas[key] ?? defaultCalculos
                                        const mediaUnid = unidAtiva === 1 ? calc.m1 : unidAtiva === 2 ? calc.m2 : calc.m3
                                        const keyNota = `${key}_${unidAtiva}`
                                        const n = notasState[keyNota] || { nota1: null, nota2: null, nota3: null }
                                        const rec = recuperacoesState[key] || { nota: null }

                                        return (
                                          <RowAlunoNotas
                                            key={aluno.id}
                                            alunoId={aluno.id}
                                            alunoNome={aluno.nome}
                                            materiaId={mat.id}
                                            unidAtiva={unidAtiva}
                                            nota1={n.nota1 !== null ? String(n.nota1) : null}
                                            nota2={n.nota2 !== null ? String(n.nota2) : null}
                                            nota3={n.nota3 !== null ? String(n.nota3) : null}
                                            nota4={n.nota4 !== null ? String(n.nota4) : null}
                                            recNota={rec.nota !== null ? String(rec.nota) : null}
                                            mediaUnid={mediaUnid}
                                            mediaFinal={calc.mediaFinal}
                                            mediaPosRec={calc.mediaPosRec}
                                            situacao={calc.situacao}
                                            isElegivelRec={calc.isElegivelRec}
                                            onNotaChange={handleNotaChange}
                                            onRecuperacaoChange={handleRecuperacaoChange}
                                          />
                                        )
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
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

interface RowAlunoNotasProps {
  alunoId: string
  alunoNome: string
  materiaId: string
  unidAtiva: number
  nota1: string | null
  nota2: string | null
  nota3: string | null
  nota4: string | null
  recNota: string | null
  mediaUnid: number | null
  mediaFinal: number | null
  mediaPosRec: number | null
  situacao: string
  isElegivelRec: boolean
  onNotaChange: (
    alunoId: string,
    materiaId: string,
    unidade: number,
    campo: 'nota1' | 'nota2' | 'nota3' | 'nota4',
    valor: string
  ) => void
  onRecuperacaoChange: (
    alunoId: string,
    materiaId: string,
    valor: string
  ) => void
}

const RowAlunoNotas = memo(
  function RowAlunoNotas({
    alunoId,
    alunoNome,
    materiaId,
    unidAtiva,
    nota1,
    nota2,
    nota3,
    nota4,
    recNota,
    mediaUnid,
    mediaFinal,
    mediaPosRec,
    situacao,
    isElegivelRec,
    onNotaChange,
    onRecuperacaoChange
  }: RowAlunoNotasProps) {
    return (
      <tr className="border-b border-[#26262a] last:border-0 hover:bg-zinc-800/10 text-xs text-zinc-200">
        <td className="p-3 font-semibold text-zinc-100">{alunoNome}</td>
        
        {/* Nota 1 */}
        <td className="p-2 text-center">
          <input
            type="text"
            value={nota1 ?? ''}
            onChange={(e) => onNotaChange(alunoId, materiaId, unidAtiva, 'nota1', e.target.value)}
            placeholder="-"
            className="w-11 h-8 bg-[#18181b] border border-[#2a2a2a] text-center rounded focus:outline-none focus:border-[#3ea6ff] text-xs font-semibold text-white"
          />
        </td>

        {/* Nota 2 */}
        <td className="p-2 text-center">
          <input
            type="text"
            value={nota2 ?? ''}
            onChange={(e) => onNotaChange(alunoId, materiaId, unidAtiva, 'nota2', e.target.value)}
            placeholder="-"
            className="w-11 h-8 bg-[#18181b] border border-[#2a2a2a] text-center rounded focus:outline-none focus:border-[#3ea6ff] text-xs font-semibold text-white"
          />
        </td>

        {/* Nota 3 */}
        <td className="p-2 text-center">
          <input
            type="text"
            value={nota3 ?? ''}
            onChange={(e) => onNotaChange(alunoId, materiaId, unidAtiva, 'nota3', e.target.value)}
            placeholder="-"
            className="w-11 h-8 bg-[#18181b] border border-[#2a2a2a] text-center rounded focus:outline-none focus:border-[#3ea6ff] text-xs font-semibold text-white"
          />
        </td>

        {/* Nota 4 */}
        <td className="p-2 text-center">
          <input
            type="text"
            value={nota4 ?? ''}
            onChange={(e) => onNotaChange(alunoId, materiaId, unidAtiva, 'nota4', e.target.value)}
            placeholder="-"
            className="w-11 h-8 bg-[#18181b] border border-[#2a2a2a] text-center rounded focus:outline-none focus:border-[#3ea6ff] text-xs font-semibold text-white"
          />
        </td>

        {/* Média Unidade */}
        <td className="p-3 text-center bg-[#1c1c1e]/20 font-bold">
          {mediaUnid !== null ? (
            <span className={mediaUnid < 6 ? 'text-red-500' : 'text-green-500'}>
              {mediaUnid}
            </span>
          ) : '-'}
        </td>

        {/* Média Final */}
        <td className="p-3 text-center bg-[#1c1c1e]/40 font-bold text-sm">
          {mediaFinal !== null ? (
            <span className={mediaFinal < 5 ? 'text-red-500' : 'text-green-500'}>
              {mediaFinal}
            </span>
          ) : '-'}
        </td>

        {/* Recuperação Final */}
        <td className="p-2 text-center bg-yellow-500/5">
          <input
            type="text"
            value={recNota ?? ''}
            onChange={(e) => onRecuperacaoChange(alunoId, materiaId, e.target.value)}
            disabled={!isElegivelRec}
            placeholder={isElegivelRec ? "-" : "N/A"}
            className={`w-11 h-8 text-center rounded focus:outline-none focus:border-yellow-500 text-xs font-semibold text-white ${
              isElegivelRec 
                ? 'bg-[#18181b] border border-yellow-500/30' 
                : 'bg-zinc-800/30 border border-zinc-900 text-zinc-500 cursor-not-allowed'
            }`}
          />
        </td>

        {/* Média Pós-Rec / Situação */}
        <td className="p-3 text-center bg-[#1c1c1e]/50 font-bold">
          {mediaPosRec !== null ? (
            <div className="flex flex-col items-center">
              <span className={mediaPosRec < 5 ? 'text-red-500' : 'text-green-500'}>
                {mediaPosRec}
              </span>
              <span className={`text-[9px] uppercase mt-0.5 font-bold ${
                situacao.startsWith('Aprovado') ? 'text-green-600' : 
                situacao === 'Em Recuperação' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {situacao}
              </span>
            </div>
          ) : '-'}
        </td>
      </tr>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.alunoId === nextProps.alunoId &&
      prevProps.alunoNome === nextProps.alunoNome &&
      prevProps.materiaId === nextProps.materiaId &&
      prevProps.unidAtiva === nextProps.unidAtiva &&
      prevProps.nota1 === nextProps.nota1 &&
      prevProps.nota2 === nextProps.nota2 &&
      prevProps.nota3 === nextProps.nota3 &&
      prevProps.nota4 === nextProps.nota4 &&
      prevProps.recNota === nextProps.recNota &&
      prevProps.mediaUnid === nextProps.mediaUnid &&
      prevProps.mediaFinal === nextProps.mediaFinal &&
      prevProps.mediaPosRec === nextProps.mediaPosRec &&
      prevProps.situacao === nextProps.situacao &&
      prevProps.isElegivelRec === nextProps.isElegivelRec
    )
  }
)
