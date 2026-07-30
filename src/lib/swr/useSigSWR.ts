'use client'

import useSWR, { SWRConfiguration } from 'swr'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { getIdbItem, setIdbItem } from './indexedDBCache'
import { getProfessoresEscola, getCatalogoMaterias } from '@/lib/swrFetchers'

const DEFAULT_SWR_OPTIONS: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000,
  keepPreviousData: true,
}

/**
 * Hook para buscar catálogos de Escolas Ativas com cache SWR + IndexedDB
 */
export function useEscolasSWR() {
  const supabase = createBrowserClient()
  const funcionario = useAuthStore((s) => s.funcionario)
  const userId = funcionario?.id ?? 'anon'
  const key = ['catalog_escolas', userId]

  const [initialData, setInitialData] = useState<any[] | undefined>(undefined)

  useEffect(() => {
    getIdbItem<any[]>(key.join('_'), userId).then((cached) => {
      if (cached && Array.isArray(cached)) {
        setInitialData(cached)
      }
    })
  }, [userId])

  const swr = useSWR(
    key,
    async () => {
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome, logo_url, plano, modulos_ativos, endereco, telefone, inep, tipo, ativo, diretor_id, localizacao, assinatura_diretor_url, codigo, created_at, deleted_at')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (error) throw error
      const result = data || []
      setIdbItem(key.join('_'), result, userId)
      return result
    },
    {
      ...DEFAULT_SWR_OPTIONS,
      fallbackData: initialData,
    }
  )

  return swr
}

/**
 * Hook para buscar Turmas por escola com cache SWR + IndexedDB
 */
export function useTurmasSWR(escolaId: string | null | undefined) {
  const supabase = createBrowserClient()
  const funcionario = useAuthStore((s) => s.funcionario)
  const userId = funcionario?.id ?? 'anon'
  const key = escolaId ? ['catalog_turmas', userId, escolaId] : null

  const [initialData, setInitialData] = useState<any[] | undefined>(undefined)

  useEffect(() => {
    if (!escolaId) return
    getIdbItem<any[]>(['catalog_turmas', userId, escolaId].join('_'), userId).then((cached) => {
      if (cached && Array.isArray(cached)) {
        setInitialData(cached)
      }
    })
  }, [escolaId, userId])

  const swr = useSWR(
    key,
    async ([, , escId]) => {
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome, ano_letivo, escola_id, turno, capacidade, created_at, deleted_at')
        .eq('escola_id', escId)
        .order('nome', { ascending: true })

      if (error) throw error
      const result = data || []
      setIdbItem(['catalog_turmas', userId, escId].join('_'), result, userId)
      return result
    },
    {
      ...DEFAULT_SWR_OPTIONS,
      fallbackData: initialData,
    }
  )

  return swr
}

/**
 * Hook para buscar Matérias / Componentes Curriculares da escola com cache SWR + IndexedDB
 */
export function useMateriasSWR(escolaId: string | null | undefined) {
  const supabase = createBrowserClient()
  const funcionario = useAuthStore((s) => s.funcionario)
  const userId = funcionario?.id ?? 'anon'
  const key = escolaId ? ['catalog_materias', userId, escolaId] : null

  const [initialData, setInitialData] = useState<any[] | undefined>(undefined)

  useEffect(() => {
    if (!escolaId) return
    getIdbItem<any[]>(['catalog_materias', userId, escolaId].join('_'), userId).then((cached) => {
      if (cached && Array.isArray(cached)) {
        setInitialData(cached)
      }
    })
  }, [escolaId, userId])

  const swr = useSWR(
    key,
    async ([, , escId]) => {
      const data = await getCatalogoMaterias(supabase, escId)
      setIdbItem(['catalog_materias', userId, escId].join('_'), data, userId)
      return data
    },
    {
      ...DEFAULT_SWR_OPTIONS,
      fallbackData: initialData,
    }
  )

  return swr
}

/**
 * Hook para buscar Professores da escola com cache SWR + IndexedDB
 */
export function useProfessoresSWR(escolaId: string | null | undefined) {
  const supabase = createBrowserClient()
  const funcionario = useAuthStore((s) => s.funcionario)
  const userId = funcionario?.id ?? 'anon'
  const key = escolaId ? ['catalog_professores', userId, escolaId] : null

  const [initialData, setInitialData] = useState<any[] | undefined>(undefined)

  useEffect(() => {
    if (!escolaId) return
    getIdbItem<any[]>(['catalog_professores', userId, escolaId].join('_'), userId).then((cached) => {
      if (cached && Array.isArray(cached)) {
        setInitialData(cached)
      }
    })
  }, [escolaId, userId])

  const swr = useSWR(
    key,
    async ([, , escId]) => {
      const data = await getProfessoresEscola(supabase, escId)
      setIdbItem(['catalog_professores', userId, escId].join('_'), data, userId)
      return data
    },
    {
      ...DEFAULT_SWR_OPTIONS,
      fallbackData: initialData,
    }
  )

  return swr
}

/**
 * Hook para buscar Alunos por Escola ou Turma
 */
export function useAlunosSWR(escolaId: string | null | undefined, turmaId?: string | null) {
  const supabase = createBrowserClient()
  const funcionario = useAuthStore((s) => s.funcionario)
  const userId = funcionario?.id ?? 'anon'
  const key = escolaId ? ['catalog_alunos', userId, escolaId, turmaId || 'all'] : null

  return useSWR(
    key,
    async ([, , escId, tId]) => {
      let query = supabase.from('alunos').select('id, nome, escola_id, turma_id, numero_matricula, foto_url, data_nascimento, cpf, rg, nis, inep, cartao_sus, certidao_nascimento, nome_mae, nome_pai, telefone, endereco, serie, latitude, longitude, dados_matricula, codigo_temp_resp, created_at, deleted_at').eq('escola_id', escId)
      if (tId && tId !== 'all') {
        query = query.eq('turma_id', tId)
      }
      const { data, error } = await query.order('nome', { ascending: true })
      if (error) throw error
      return data || []
    },
    DEFAULT_SWR_OPTIONS
  )
}

export interface DashboardResumoMetrics {
  totalAlunos: number
  totalTurmas: number
  totalFuncionarios: number
  totalComunicados: number
  diariosPendentes: number
  ocorrenciasMes: number
}

/**
 * Hook para buscar indicadores resumidos do Dashboard da escola (RPC de alta performance com SWR)
 */
export function useDashboardMetricsSWR(escolaId: string | null | undefined) {
  const supabase = createBrowserClient()
  const funcionario = useAuthStore((s) => s.funcionario)
  const userId = funcionario?.id ?? 'anon'
  const key = escolaId ? ['dashboard_metrics', userId, escolaId] : null

  return useSWR<DashboardResumoMetrics>(
    key,
    async ([, , escId]) => {
      const { data, error } = await (supabase.rpc as any)('get_dashboard_resumo', {
        p_escola_id: escId,
        p_funcionario_id: userId !== 'anon' ? userId : null,
      })

      if (error || !data) {
        console.warn('Fallback de contagem do Dashboard sem RPC:', error?.message)
        const [resAlunos, resTurmas, resFuncs, resComunicados] = await Promise.all([
          supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('escola_id', escId),
          supabase.from('turmas').select('id', { count: 'exact', head: true }).eq('escola_id', escId),
          supabase.from('vinculos_funcionarios').select('id', { count: 'exact', head: true }).eq('escola_id', escId).eq('ativo', true),
          supabase.from('comunicados').select('id', { count: 'exact', head: true }),
        ])

        return {
          totalAlunos: resAlunos.count ?? 0,
          totalTurmas: resTurmas.count ?? 0,
          totalFuncionarios: resFuncs.count ?? 0,
          totalComunicados: resComunicados.count ?? 0,
          diariosPendentes: 0,
          ocorrenciasMes: 0,
        }
      }

      const res = data as any
      return {
        totalAlunos: Number(res.totalAlunos ?? 0),
        totalTurmas: Number(res.totalTurmas ?? 0),
        totalFuncionarios: Number(res.totalFuncionarios ?? 0),
        totalComunicados: Number(res.totalComunicados ?? 0),
        diariosPendentes: Number(res.diariosPendentes ?? 0),
        ocorrenciasMes: Number(res.ocorrenciasMes ?? 0),
      }
    },
    {
      ...DEFAULT_SWR_OPTIONS,
      refreshInterval: 120000,
    }
  )
}
