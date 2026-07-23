'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { useAuthStore } from '@/store/useAuthStore'

interface UseTurmaFrequenciasProps {
  open: boolean
  turma: any
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

  // 6. Buscar prazo de limite em dias da rede
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

  // Checar se usuário logado é Diretor ou Superadmin (reativo com Zustand)
  const isDiretor = useAuthStore((state) => state.isDiretor())
  const isAdmin = useAuthStore((state) => state.isAdminGlobalOrRoot())
  const isDiretorOuAdmin = isDiretor || isAdmin

  // Calcular se o prazo limite expirou para esta data
  const isPrazoExpirado = (() => {
    if (prazoFrequenciaDias === 0) return false // 0 = Sem trava
    if (isDiretorOuAdmin) return false // Direção/Superadmin isentos

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const dataAlvo = new Date(dataFreq + 'T00:00:00')
    const diffMs = hoje.getTime() - dataAlvo.getTime()
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    return diffDias > prazoFrequenciaDias
  })()

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

  const handleLancarFrequencia = async (alunoId: string, presenca: boolean) => {
    if (isPrazoExpirado) {
      toast.error(`A alteração de frequência para esta data está bloqueada. O prazo limite é de ${prazoFrequenciaDias} dias. Entre em contato com a Direção.`)
      return
    }

    const targetEscolaId = escolaAtivaId || turma?.escola_id
    if (!targetEscolaId) {
      toast.error('Escola não identificada para lançar frequência.')
      return
    }
    if (!selectedMateriaId) {
      toast.error('Selecione uma matéria antes de lançar a frequência.')
      return
    }

    const anterior = frequencias[alunoId]
    
    // Atualização otimista no SWR
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
          escola_id: targetEscolaId,
          data: dataFreq,
          presenca: presenca,
          materia_id: selectedMateriaId,
          agenda_aula_id: selectedAgendaAulaId ?? null
        }, { onConflict: 'aluno_id, data, materia_id' })

      if (error) throw error
    } catch (err: any) {
      console.error('Erro ao salvar frequência:', err)
      toast.error('Erro ao salvar presença: ' + err.message)
      // Rollback
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

  return {
    dataFreq,
    setDataFreq,
    selectedMateriaId,
    setSelectedMateriaId,
    selectedAgendaAulaId,
    setSelectedAgendaAulaId,
    frequencias,
    loadingFreq,
    isPrazoExpirado,
    prazoFrequenciaDias,
    alterarData,
    handleLancarFrequencia,
    mutateFrequencias
  }
}
