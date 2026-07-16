import { create } from 'zustand'
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
  setSelectedEscola: (escola: Escola | null) => void
  selectEscolaById: (id: string | null) => void | Promise<void>
  loadEscolas: () => Promise<void>
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
  escolas: [],
  selectedEscola: null,
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
    const found = get().escolas.find((e) => e.id === id) || null
    if (found) {
      set({ selectedEscola: found })
      useAuthStore.getState().setEscolaAtivaId(id)
    } else {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('escolas')
          .select('*')
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
  loadEscolas: async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('escolas')
      .select('*')
      .is('deleted_at', null)
      .eq('ativo', true)
      .order('nome', { ascending: true })
      
    if (data) {
      set({ escolas: data as Escola[] })
      
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
  }
}))
