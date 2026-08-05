import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from './useAuthStore'

export interface Escola {
  id: string
  nome: string
  codigo?: number | string
  color?: string
  totalAlunos?: number
  totalProfessores?: number
  totalTurmas?: number
  ativo?: boolean
  logo_url?: string | null
  diretor_id?: string | null
  assinatura_diretor_url?: string | null
  secretaria_id?: string | null
  secretariaNome?: string
  tipo?: string | null
  inep?: string | null
  localizacao?: string | null
  created_at?: string | null
  deleted_at?: string | null
  secretarias?: {
    id: string
    nome: string
    modulos_ativos?: string[] | null
  } | null
}

export interface SecretariaState {
  id: string
  nome: string
  logo_url?: string | null
  modulos_ativos?: string[] | null
}

interface SchoolState {
  escolas: Escola[]
  selectedEscola: Escola | null
  selectedSecretaria: SecretariaState | null
  isLoaded: boolean
  isLoading: boolean
  setSelectedEscola: (escola: Escola | null) => void
  setSelectedSecretaria: (secretaria: SecretariaState | null) => void
  selectEscolaById: (id: string | null) => void | Promise<void>
  loadEscolas: (force?: boolean) => Promise<void>
}

let loadingPromise: Promise<void> | null = null;

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set, get) => ({
      escolas: [],
      selectedEscola: null,
      selectedSecretaria: null,
      isLoaded: false,
      isLoading: false,
      setSelectedEscola: (escola) => {
        if (get().selectedEscola?.id === (escola?.id ?? null)) return
        
        let sec: SecretariaState | null = get().selectedSecretaria
        if (escola) {
          sec = {
            id: escola.secretaria_id || '',
            nome: escola.secretariaNome || escola.secretarias?.nome || 'Secretaria Municipal de Educação',
            modulos_ativos: escola.secretarias?.modulos_ativos || null
          }
        }
        set({ selectedEscola: escola, selectedSecretaria: sec })
        useAuthStore.getState().setEscolaAtivaId(escola ? escola.id : null)
      },
      setSelectedSecretaria: (secretaria) => {
        set({ selectedSecretaria: secretaria, selectedEscola: null })
        useAuthStore.getState().setEscolaAtivaId(null)
      },
      selectEscolaById: async (id) => {
        if (get().selectedEscola?.id === id) return
        if (!id) {
          set({ selectedEscola: null })
          useAuthStore.getState().setEscolaAtivaId(null)
          return
        }

        if (!get().isLoaded) {
          await get().loadEscolas()
        }

        const found = get().escolas.find((e) => e.id === id) || null
        if (found) {
          const sec = {
            id: found.secretaria_id || '',
            nome: found.secretariaNome || 'Secretaria Municipal de Educação',
            modulos_ativos: found.secretarias?.modulos_ativos || null
          }
          set({ selectedEscola: found, selectedSecretaria: sec })
          useAuthStore.getState().setEscolaAtivaId(id)
        } else {
          try {
            const supabase = createClient()
            const { data } = await supabase
              .from('escolas')
              .select('id, nome, logo_url, plano, modulos_ativos, endereco, telefone, inep, tipo, ativo, diretor_id, localizacao, assinatura_diretor_url, codigo, secretaria_id, created_at, deleted_at, secretarias:secretaria_id(id, nome, modulos_ativos)')
              .eq('id', id)
              .is('deleted_at', null)
              .maybeSingle()
            
            if (data) {
              const formatted: Escola = {
                ...(data as any),
                secretariaNome: (data as any).secretarias?.nome || 'Secretaria Municipal de Educação'
              }
              const sec = {
                id: (data as any).secretaria_id || '',
                nome: formatted.secretariaNome || 'Secretaria Municipal de Educação',
                modulos_ativos: (data as any).secretarias?.modulos_ativos || null
              }
              set({ selectedEscola: formatted, selectedSecretaria: sec })
            }
          } catch (err) {
            console.error('Erro ao carregar escola ativa:', err)
          }
          useAuthStore.getState().setEscolaAtivaId(id)
        }
      },
      loadEscolas: async (force = false) => {
        if (!force && get().isLoaded) return
        if (loadingPromise && !force) {
          await loadingPromise
          return
        }

        loadingPromise = (async () => {
          set({ isLoading: true })
          try {
            const supabase = createClient()
            const { data } = await supabase
              .from('escolas')
              .select('id, nome, logo_url, plano, modulos_ativos, endereco, telefone, inep, tipo, ativo, diretor_id, localizacao, assinatura_diretor_url, codigo, secretaria_id, created_at, deleted_at, secretarias:secretaria_id(id, nome, modulos_ativos)')
              .is('deleted_at', null)
              .eq('ativo', true)
              .order('nome', { ascending: true })
              
            if (data) {
              const mappedEscolas: Escola[] = (data || []).map((e: any) => ({
                ...e,
                secretariaNome: e.secretarias?.nome || 'Secretaria Municipal de Educação'
              }))

              set({ escolas: mappedEscolas, isLoaded: true })
              
              const currentSelected = get().selectedEscola
              if (currentSelected) {
                const stillExists = mappedEscolas.find(e => e.id === currentSelected.id)
                if (!stillExists) {
                  set({ selectedEscola: null })
                } else {
                  set({ selectedEscola: stillExists })
                }
              }
            }
          } finally {
            set({ isLoading: false })
            loadingPromise = null
          }
        })()

        await loadingPromise
      }
    }),
    {
      name: 'sig-selected-school',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ selectedEscola: state.selectedEscola, selectedSecretaria: state.selectedSecretaria }),
      onRehydrateStorage: () => (state) => {
        if (state?.selectedEscola?.id) {
          useAuthStore.getState().setEscolaAtivaId(state.selectedEscola.id)
        }
      }
    }
  )
)
