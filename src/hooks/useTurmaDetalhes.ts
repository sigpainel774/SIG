'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabaseClient'
import { getProfessoresEscola, getCatalogoMaterias, getVinculosProfessores } from '@/lib/swrFetchers'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'

// Importando os sub-hooks
import { useTurmaMaterias } from './useTurmaMaterias'
import { useTurmaFrequencias } from './useTurmaFrequencias'
import { useTurmaNotas } from './useTurmaNotas'

interface UseTurmaDetalhesProps {
  open: boolean
  turma: any
  initialMateriaId?: string
  initialAgendaAulaId?: string | null
  initialData?: string
}

export function useTurmaDetalhes({
  open,
  turma,
  initialMateriaId,
  initialAgendaAulaId,
  initialData
}: UseTurmaDetalhesProps) {
  const [activeTab, setActiveTab] = useState('materias')
  const [searchAluno, setSearchAluno] = useState('')
  const [selectedAluno, setSelectedAluno] = useState<any>(null)

  const supabase = createClient() as any
  const { escolaAtivaId, acessos, funcionario } = useAuthStore()
  const { isEditMode: globalEditMode } = useEditModeStore()
  
  const isProfessor = !!(acessos?.some(a => a.nivel === 4 || a.nivel === 5) || funcionario?.cargo?.toLowerCase().includes('professor'))
  const isCoordenador = !!funcionario?.cargo?.toLowerCase().includes('coordenador')
  const isEditMode = globalEditMode && !isProfessor && !isCoordenador
  const selectedEscola = useSchoolStore((state) => state.selectedEscola)
  const escolaNome = selectedEscola?.nome ?? 'Sem Escola'

  // Ref de montagem para evitar memory leaks
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Ref para inicialização de aba (UX Reset Bug Fix)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      if (initialMateriaId) {
        setActiveTab('frequencia')
      } else {
        setActiveTab('materias')
      }
    }
    wasOpen.current = open
  }, [open, initialMateriaId])

  // 1. Alunos e Matérias da Turma (Query Principal)
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

  // 2. Professores da Escola (apenas em modo de edição)
  const { data: professoresEscolaData, error: errorProfs } = useSWR(
    open && isEditMode && escolaAtivaId ? ['professores-escola', escolaAtivaId] : null,
    () => getProfessoresEscola(supabase, escolaAtivaId ?? ''),
    { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 300000 }
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
    () => getCatalogoMaterias(supabase, escolaAtivaId ?? ''),
    { revalidateOnFocus: false, revalidateIfStale: false, dedupingInterval: 600000 }
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
    () => getVinculosProfessores(supabase, turma.id),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
  const vinculosProfessores: any[] = (vinculosProfessoresData as any[]) ?? []

  useEffect(() => {
    if (errorVinculos) {
      toast.error('Erro ao carregar vínculos de professores: ' + errorVinculos.message)
    }
  }, [errorVinculos])

  // --- CHAMADAS DOS SUB-HOOKS ---

  // Sub-hook 1: Frequências
  const frequenciasHook = useTurmaFrequencias({
    open,
    turma,
    initialData,
    initialMateriaId,
    initialAgendaAulaId,
    materias,
    escolaAtivaId,
    supabase,
    isMounted
  })

  // Sub-hook 2: Notas
  const notasHook = useTurmaNotas({
    open,
    turma,
    alunos,
    materias,
    escolaAtivaId,
    supabase,
    isMounted
  })

  // Sub-hook 3: Matérias
  const materiasHook = useTurmaMaterias({
    turma,
    escolaAtivaId,
    materias,
    vinculosProfessores,
    professoresEscola,
    catalogoMaterias,
    mutateTurmaData,
    mutateVinculos,
    supabase,
    isMounted
  })

  // Expandir a primeira matéria por padrão se nenhuma estiver aberta no hook de matérias
  useEffect(() => {
    if (open && materias.length > 0 && !materiasHook.materiaAberta) {
      materiasHook.setMateriaAberta(materias[0].id)
    }
  }, [open, materias, materiasHook.materiaAberta])

  // Filtro dinâmico de alunos no componente de visualização
  const filteredAlunos = alunos.filter(a => a.nome.toLowerCase().includes(searchAluno.toLowerCase()))

  return {
    activeTab,
    setActiveTab,
    searchAluno,
    setSearchAluno,
    selectedAluno,
    setSelectedAluno,
    isEditMode,
    escolaNome,
    alunos,
    materias,
    loading,
    professoresEscola,
    vinculosProfessores,
    catalogoMaterias,
    filteredAlunos,

    // Métodos e estados integrados do sub-hook de frequência
    dataFreq: frequenciasHook.dataFreq,
    setDataFreq: frequenciasHook.setDataFreq,
    selectedMateriaId: frequenciasHook.selectedMateriaId,
    setSelectedMateriaId: frequenciasHook.setSelectedMateriaId,
    selectedAgendaAulaId: frequenciasHook.selectedAgendaAulaId,
    setSelectedAgendaAulaId: frequenciasHook.setSelectedAgendaAulaId,
    frequencias: frequenciasHook.frequencias,
    loadingFreq: frequenciasHook.loadingFreq,
    isPrazoExpirado: frequenciasHook.isPrazoExpirado,
    prazoFrequenciaDias: frequenciasHook.prazoFrequenciaDias,
    alterarData: frequenciasHook.alterarData,
    handleLancarFrequencia: frequenciasHook.handleLancarFrequencia,
    mutateFrequencias: frequenciasHook.mutateFrequencias,

    // Métodos e estados integrados do sub-hook de notas
    notasState: notasHook.notasState,
    recuperacoesState: notasHook.recuperacoesState,
    unidadesAtivas: notasHook.unidadesAtivas,
    setUnidadesAtivas: notasHook.setUnidadesAtivas,
    savingNotas: notasHook.savingNotas,
    calculosNotas: notasHook.calculosNotas,
    defaultCalculos: notasHook.defaultCalculos,
    handleNotaChange: notasHook.handleNotaChange,
    handleRecuperacaoChange: notasHook.handleRecuperacaoChange,
    handleSalvarNotas: notasHook.handleSalvarNotas,
    mutateNotasServidor: notasHook.mutateNotasServidor,

    // Métodos e estados integrados do sub-hook de matérias
    materiaAberta: materiasHook.materiaAberta,
    setMateriaAberta: materiasHook.setMateriaAberta,
    selectedProfId: materiasHook.selectedProfId,
    setSelectedProfId: materiasHook.setSelectedProfId,
    novaMateriaNome: materiasHook.novaMateriaNome,
    setNovaMateriaNome: materiasHook.setNovaMateriaNome,
    novaMateriaProfId: materiasHook.novaMateriaProfId,
    setNovaMateriaProfId: materiasHook.setNovaMateriaProfId,
    novaMateriaBaseCurricular: materiasHook.novaMateriaBaseCurricular,
    setNovaMateriaBaseCurricular: materiasHook.setNovaMateriaBaseCurricular,
    handleAddProfessor: materiasHook.handleAddProfessor,
    handleRemoveProfessor: materiasHook.handleRemoveProfessor,
    handleSelectMateriaCatalogo: materiasHook.handleSelectMateriaCatalogo,
    handleAddMateria: materiasHook.handleAddMateria,
    handleImportarMateriasDaGrade: materiasHook.handleImportarMateriasDaGrade,
    handleRemoveMateria: materiasHook.handleRemoveMateria,
    handleUpdateMateriaProfessor: materiasHook.handleUpdateMateriaProfessor,
    handleUpdateMateriaBase: materiasHook.handleUpdateMateriaBase
  }
}
