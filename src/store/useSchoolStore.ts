import { create } from 'zustand'
import { createClient } from '@/lib/supabaseClient'

export interface Escola {
  id: string
  nome: string
  codigo?: string
  color?: string
  totalAlunos?: number
  totalProfessores?: number
  totalTurmas?: number
  ativo?: boolean
}

interface SchoolState {
  escolas: Escola[]
  selectedEscola: Escola | null
  setSelectedEscola: (escola: Escola | null) => void
  selectEscolaById: (id: string | null) => void
  loadEscolas: () => Promise<void>
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
  escolas: [],
  selectedEscola: null,
  setSelectedEscola: (escola) => set({ selectedEscola: escola }),
  selectEscolaById: (id) => {
    if (!id) {
      set({ selectedEscola: null })
      return
    }
    const found = get().escolas.find((e) => e.id === id) || null
    set({ selectedEscola: found })
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
