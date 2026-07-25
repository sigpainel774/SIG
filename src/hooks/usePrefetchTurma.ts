'use client'

import { useRef, useCallback } from 'react'
import { preload } from 'swr'
import { createBrowserClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { getCatalogoMaterias, getVinculosProfessores } from '@/lib/swrFetchers'

/**
 * Hook para pré-carregamento discreto e inteligente dos dados mais prováveis de uma turma.
 * Dispara ao focar ou passar o cursor (com debounce de 150ms) sobre uma turma.
 * Carrega: Alunos, Matérias, Vínculos de Professores, Prazos e Lançamentos Recentes de Frequência do Mês.
 */
export function usePrefetchTurma(escolaId?: string | null) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createBrowserClient()
  const funcionario = useAuthStore((s) => s.funcionario)
  const userId = funcionario?.id ?? 'anon'

  const prefetchTurmaData = useCallback(
    (turmaId: string) => {
      if (!turmaId || !escolaId) return

      // 1. Pré-carrega Alunos da Turma
      const alunosKey = ['catalog_alunos', userId, escolaId, turmaId]
      preload(alunosKey, async () => {
        const { data } = await supabase
          .from('alunos')
          .select('*')
          .eq('escola_id', escolaId)
          .eq('turma_id', turmaId)
          .order('nome', { ascending: true })
        return data || []
      })

      // 2. Pré-carrega Matérias/Disciplinas
      const materiasKey = ['catalog_materias', userId, escolaId]
      preload(materiasKey, async () => getCatalogoMaterias(supabase, escolaId))

      // 3. Pré-carrega Vínculos de Professores da Turma
      const vinculosKey = ['vinculos_professores', turmaId]
      preload(vinculosKey, async () => getVinculosProfessores(supabase, turmaId))

      // 4. Pré-carrega Frequências Recentes do Mês Corrente
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const freqMesKey = ['turma_frequencias_mes', turmaId, inicioMes]
      preload(freqMesKey, async () => {
        const { data } = await supabase
          .from('frequencias')
          .select('*')
          .eq('turma_id', turmaId)
          .gte('data', inicioMes)
        return data || []
      })
    },
    [escolaId, userId, supabase]
  )

  const handleMouseEnter = useCallback(
    (turmaId: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        prefetchTurmaData(turmaId)
      }, 150) // Debounce de 150ms
    },
    [prefetchTurmaData]
  )

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  return {
    prefetchTurmaData,
    handleMouseEnter,
    handleMouseLeave,
  }
}
