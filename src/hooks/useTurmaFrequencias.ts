'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

interface UseTurmaFrequenciasProps {
  open: boolean
  turma: any
  alunos: any[]
  initialData?: string
  initialMateriaId?: string
  initialAgendaAulaId?: string | null
  materias: any[]
  escolaAtivaId: string | null
  supabase: any
  isMounted: React.RefObject<boolean>
}

export function useTurmaFrequencias({
  open,
  turma,
  alunos,
  initialData,
  initialMateriaId,
  initialAgendaAulaId,
  materias,
  escolaAtivaId,
  supabase,
  isMounted
}: UseTurmaFrequenciasProps) {
  const [dataFreq, setDataFreq] = useState(new Date().toISOString().split('T')[0])
  const [selectedMateriaId, setSelectedMateriaId] = useState<string>('')
  const [selectedAgendaAulaId, setSelectedAgendaAulaId] = useState<string | null>(null)
  
  // Estado local gerenciado para pré-seleção rápida e salvamento em lote
  const [localFreqMap, setLocalFreqMap] = useState<Record<string, boolean>>({})
  const [hasExistingRecords, setHasExistingRecords] = useState<boolean>(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false)
  const [savingFreq, setSavingFreq] = useState<boolean>(false)

  const { mutate } = useSWRConfig()

  // 1. Chave de busca de Frequências do dia e matéria selecionados
  const freqKey = open && turma?.id && selectedMateriaId
    ? ['frequencias', turma.id, dataFreq, selectedMateriaId]
    : null

  const { data: dbFrequencias, isLoading: loadingFreq, error: errorFreq, mutate: mutateFrequencias } = useSWR(
    freqKey,
    async () => {
      const { data, error } = await supabase
        .from('frequencias')
        .select('aluno_id, presenca, agenda_aula_id')
        .eq('turma_id', turma.id)
        .eq('data', dataFreq)
        .eq('materia_id', selectedMateriaId)
      if (error) throw error
      const map: Record<string, boolean> = {}
      ;(data || []).forEach((f: any) => { map[f.aluno_id] = f.presenca })
      return { map, rawCount: (data || []).length }
    }
  )

  // 2. Buscar prazo de limite em dias da rede
  const { data: prazoFrequenciaDias = 15 } = useSWR(
    open ? 'prazo_frequencia_dias' : null,
    async () => {
      const { data } = await (supabase.from as any)('configuracoes_rede')
        .select('prazo_frequencia_dias')
        .limit(1)
        .maybeSingle()
      return data?.prazo_frequencia_dias ?? 15
    },
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )

  // Checar se usuário logado é Diretor ou Superadmin
  const isDiretor = useAuthStore((state) => state.isDiretor())
  const isAdmin = useAuthStore((state) => state.isAdminGlobalOrRoot())
  const isDiretorOuAdmin = isDiretor || isAdmin

  // Calcular se o prazo limite expirou para esta data
  const isPrazoExpirado = useMemo(() => {
    if (prazoFrequenciaDias === 0) return false // 0 = Sem trava
    if (isDiretorOuAdmin) return false // Direção/Superadmin isentos

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const dataAlvo = new Date(dataFreq + 'T00:00:00')
    const diffMs = hoje.getTime() - dataAlvo.getTime()
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return diffDias > prazoFrequenciaDias
  }, [prazoFrequenciaDias, isDiretorOuAdmin, dataFreq])

  // 3. Sincronizar dados do banco com o estado local e aplicar pré-população de presenças
  useEffect(() => {
    if (!open || loadingFreq) return

    if (dbFrequencias && dbFrequencias.rawCount > 0) {
      // Dia já lançado e gravado no banco: carregar dados reais
      setLocalFreqMap(dbFrequencias.map)
      setHasExistingRecords(true)
      setHasUnsavedChanges(false)
    } else if (alunos.length > 0) {
      // Nova chamada (ainda não gravada): pré-popular todos os alunos como Presente (true)
      const novoMapa: Record<string, boolean> = {}
      alunos.forEach((aluno) => {
        novoMapa[aluno.id] = true
      })
      setLocalFreqMap(novoMapa)
      setHasExistingRecords(false)
      setHasUnsavedChanges(false)
    } else {
      setLocalFreqMap({})
      setHasExistingRecords(false)
      setHasUnsavedChanges(false)
    }
  }, [dbFrequencias, loadingFreq, open, alunos, dataFreq, selectedMateriaId])

  useEffect(() => {
    if (errorFreq) {
      toast.error('Erro ao buscar frequências: ' + errorFreq.message)
    }
  }, [errorFreq])

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

  const alterarData = (dias: number) => {
    const d = new Date(dataFreq + 'T00:00:00')
    d.setDate(d.getDate() + dias)
    if (isMounted.current) {
      setDataFreq(d.toISOString().split('T')[0])
    }
  }

  // Alternar presença/falta de um aluno individualmente no estado local
  const handleTogglePresenca = useCallback((alunoId: string, presenca: boolean) => {
    if (isPrazoExpirado) {
      toast.error(`A alteração de frequência para esta data está bloqueada. O prazo limite é de ${prazoFrequenciaDias} dias. Entre em contato com a Direção.`)
      return
    }

    setLocalFreqMap((prev) => ({
      ...prev,
      [alunoId]: presenca
    }))
    setHasUnsavedChanges(true)
  }, [isPrazoExpirado, prazoFrequenciaDias])

  // Marcar todos os alunos como presentes em 1 clique
  const handleMarcarTodosPresentes = useCallback(() => {
    if (isPrazoExpirado) {
      toast.error('Alteração bloqueada pelo prazo limite.')
      return
    }

    const mapa: Record<string, boolean> = {}
    alunos.forEach((aluno) => {
      mapa[aluno.id] = true
    })
    setLocalFreqMap(mapa)
    setHasUnsavedChanges(true)
    toast.info('Todos os alunos foram marcados como presentes.')
  }, [alunos, isPrazoExpirado])

  // Salvar frequência completa de todos os alunos em lote
  const handleSalvarFrequencia = async () => {
    if (isPrazoExpirado) {
      toast.error(`A alteração de frequência para esta data está bloqueada pelo prazo limite (${prazoFrequenciaDias} dias).`)
      return
    }

    const targetEscolaId = escolaAtivaId || turma?.escola_id
    if (!targetEscolaId) {
      toast.error('Escola não identificada para lançar frequência.')
      return
    }
    if (!selectedMateriaId) {
      toast.error('Selecione uma matéria antes de salvar a frequência.')
      return
    }
    if (alunos.length === 0) {
      toast.error('Não há alunos matriculados nesta turma para registrar frequência.')
      return
    }

    setSavingFreq(true)
    try {
      // Montar payload em batch garantindo que todo aluno matriculado tenha seu status persistido
      const payload = alunos.map((aluno) => ({
        aluno_id: aluno.id,
        turma_id: turma.id,
        escola_id: targetEscolaId,
        data: dataFreq,
        presenca: localFreqMap[aluno.id] ?? true,
        materia_id: selectedMateriaId,
        agenda_aula_id: selectedAgendaAulaId ?? null
      }))

      const { error } = await supabase
        .from('frequencias')
        .upsert(payload, { onConflict: 'aluno_id, data, materia_id' })

      if (error) throw error

      toast.success('Frequência salva com sucesso!')
      setHasExistingRecords(true)
      setHasUnsavedChanges(false)

      // Atualiza SWR local
      mutateFrequencias({ map: localFreqMap, rawCount: payload.length }, false)

      // Revalida KPIs e listas de chamadas pendentes da Home
      mutate((key: any) => typeof key === 'string' && key.startsWith('/api/home/'))
    } catch (err: any) {
      console.error('Erro ao salvar frequência:', err)
      toast.error('Erro ao salvar frequência: ' + (err?.message ?? 'Erro desconhecido'))
    } finally {
      if (isMounted.current) {
        setSavingFreq(false)
      }
    }
  }

  return {
    dataFreq,
    setDataFreq,
    selectedMateriaId,
    setSelectedMateriaId,
    selectedAgendaAulaId,
    setSelectedAgendaAulaId,
    frequencias: localFreqMap,
    hasExistingRecords,
    hasUnsavedChanges,
    savingFreq,
    loadingFreq,
    isPrazoExpirado,
    prazoFrequenciaDias,
    alterarData,
    handleTogglePresenca,
    handleMarcarTodosPresentes,
    handleSalvarFrequencia,
    mutateFrequencias
  }
}
