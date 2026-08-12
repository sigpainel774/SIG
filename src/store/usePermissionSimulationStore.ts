import { create } from 'zustand'
import { Database } from '@/types/supabase'
import { mutate } from 'swr'
import { useSchoolStore } from './useSchoolStore'
import { useAuthStore } from './useAuthStore'

type Funcionario = Database['public']['Tables']['funcionarios']['Row']
type AcessoUsuario = Database['public']['Tables']['acessos_usuarios']['Row']

export type VinculoSimulado = {
  id: string
  escola_id: string
  escolaNome?: string
  cargo: string | null
  ativo: boolean
}

interface PermissionSimulationState {
  isSimulating: boolean
  isLoadingSimulation: boolean
  simulatedFuncionario: Funcionario | null
  simulatedAcessos: AcessoUsuario[]
  simulatedVinculos: VinculoSimulado[]
  
  iniciarSimulacao: (funcionarioId: string, supabase: any) => Promise<boolean>
  encerrarSimulacao: () => void
  restaurarSimulacaoSeExistir: (supabase: any) => Promise<void>
}

const SESSION_KEY = 'sig_simulated_funcionario_id'

export const usePermissionSimulationStore = create<PermissionSimulationState>((set, get) => ({
  isSimulating: false,
  isLoadingSimulation: false,
  simulatedFuncionario: null,
  simulatedAcessos: [],
  simulatedVinculos: [],

  iniciarSimulacao: async (funcionarioId: string, supabase: any) => {
    if (!funcionarioId || !supabase) return false
    set({ isLoadingSimulation: true })

    try {
      // 1. Buscar perfil do funcionário simulado
      const { data: funcionario, error: funcError } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('id', funcionarioId)
        .single()

      if (funcError || !funcionario) {
        console.error('Erro ao carregar perfil para simulação:', funcError)
        set({ isLoadingSimulation: false })
        return false
      }

      // 2. Buscar acessos ABAC do funcionário simulado
      const { data: acessosData } = await supabase
        .from('acessos_usuarios')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('ativo', true)

      // 3. Buscar vínculos escolares do funcionário simulado
      const { data: vinculosData } = await supabase
        .from('vinculos_funcionarios')
        .select('id, escola_id, cargo, ativo, escolas(nome)')
        .eq('funcionario_id', funcionarioId)
        .eq('ativo', true)

      const vinculosFormatados: VinculoSimulado[] = (vinculosData || []).map((v: any) => ({
        id: v.id,
        escola_id: v.escola_id,
        escolaNome: v.escolas?.nome ?? 'Escola sem nome',
        cargo: v.cargo ?? funcionario.cargo ?? null,
        ativo: v.ativo,
      }))

      // Persistir no sessionStorage para aguentar F5
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(SESSION_KEY, funcionarioId)
          // Cookie lido pelo proxy.ts (server-side) para liberar /home durante simulação
          document.cookie = 'sig_simulating=1; path=/; SameSite=Lax'
        } catch (e) {}
      }

      set({
        isSimulating: true,
        isLoadingSimulation: false,
        simulatedFuncionario: funcionario,
        simulatedAcessos: acessosData || [],
        simulatedVinculos: vinculosFormatados,
      })

      // Synchronize auth store reactively so all UI components re-render immediately under simulated user
      useAuthStore.getState().syncSimulation(funcionario, acessosData || [], vinculosFormatados)

      // Sincronizar escola no seletor global se houver escola vinculada
      if (vinculosFormatados.length > 0 && vinculosFormatados[0].escola_id) {
        useSchoolStore.getState().selectEscolaById(vinculosFormatados[0].escola_id)
      }

      // Revalidar caches SWR para forçar re-render dos componentes sob o perfil simulado
      if (typeof window !== 'undefined') {
        try {
          mutate(() => true, undefined, { revalidate: true }).catch(() => {})
        } catch (e) {}
      }

      return true
    } catch (err) {
      console.error('Erro inesperado ao iniciar simulação:', err)
      set({ isLoadingSimulation: false })
      return false
    }
  },

  encerrarSimulacao: () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(SESSION_KEY)
        // Remove cookie de sinalização para o proxy.ts
        document.cookie = 'sig_simulating=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
      } catch (e) {}
    }

    set({
      isSimulating: false,
      isLoadingSimulation: false,
      simulatedFuncionario: null,
      simulatedAcessos: [],
      simulatedVinculos: [],
    })

    // Restore real auth state reactively
    useAuthStore.getState().desativarSimulacao()

    // Revalidar caches SWR para restaurar visão original
    if (typeof window !== 'undefined') {
      try {
        mutate(() => true, undefined, { revalidate: true }).catch(() => {})
      } catch (e) {}
    }
  },

  restaurarSimulacaoSeExistir: async (supabase: any) => {
    if (typeof window === 'undefined' || get().isSimulating) return
    try {
      const savedId = sessionStorage.getItem(SESSION_KEY)
      if (savedId) {
        await get().iniciarSimulacao(savedId, supabase)
      }
    } catch (e) {}
  },
}))
