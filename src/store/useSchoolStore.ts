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
}

interface SchoolState {
  escolas: Escola[]
  selectedEscola: Escola | null
  isLoaded: boolean
  isLoading: boolean
  setSelectedEscola: (escola: Escola | null) => void
  selectEscolaById: (id: string | null) => void | Promise<void>
  loadEscolas: (force?: boolean) => Promise<void>
}

let loadingPromise: Promise<void> | null = null;

export const useSchoolStore = create<SchoolState>()(
  persist(
    (set, get) => ({
      escolas: [],
      selectedEscola: null,
      isLoaded: false,
      isLoading: false,
      setSelectedEscola: (escola) => {
        if (get().selectedEscola?.id === (escola?.id ?? null)) return
        set({ selectedEscola: escola })
        useAuthStore.getState().setEscolaAtivaId(escola ? escola.id : null)
      },
      selectEscolaById: async (id) => {
        if (get().selectedEscola?.id === id) return
        if (!id) {
          set({ selectedEscola: null })
          useAuthStore.getState().setEscolaAtivaId(null)
          return
        }

        // Aguarda carregar a lista completa de escolas para evitar queries individuais redundantes
        if (!get().isLoaded) {
          await get().loadEscolas()
        }

        const found = get().escolas.find((e) => e.id === id) || null
        if (found) {
          set({ selectedEscola: found })
          useAuthStore.getState().setEscolaAtivaId(id)
        } else {
          // Fallback caso a escola não venha na lista global (inativa ou erro)
          try {
            const supabase = createClient()
            const { data } = await supabase
              .from('escolas')
              .select('id, nome, logo_url, plano, modulos_ativos, endereco, telefone, inep, tipo, ativo, diretor_id, localizacao, assinatura_diretor_url, codigo, created_at, deleted_at')
              .eq('id', id)
              .is('deleted_at', null)
              .maybeSingle()
            
            if (data) {
              set({ selectedEscola: data as Escola })
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
              .select('id, nome, logo_url, plano, modulos_ativos, endereco, telefone, inep, tipo, ativo, diretor_id, localizacao, assinatura_diretor_url, codigo, created_at, deleted_at')
              .is('deleted_at', null)
              .eq('ativo', true)
              .order('nome', { ascending: true })
              
            if (data) {
              set({ escolas: data as Escola[], isLoaded: true })
              
              const currentSelected = get().selectedEscola
              if (currentSelected) {
                const stillExists = data.find(e => e.id === currentSelected.id)
                if (!stillExists) {
                  set({ selectedEscola: null })
                } else {
                  set({ selectedEscola: stillExists as Escola })
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
      partialize: (state) => ({ selectedEscola: state.selectedEscola }),
      onRehydrateStorage: () => (state) => {
        if (state?.selectedEscola?.id) {
          useAuthStore.getState().setEscolaAtivaId(state.selectedEscola.id)
        }
      }
    }
  )
)
