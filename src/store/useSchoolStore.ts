import { create } from 'zustand'

export interface Escola {
  id: string
  nome: string
  codigo?: string
  color?: string
  totalAlunos?: number
  totalProfessores?: number
  totalTurmas?: number
}

export const mockEscolas: Escola[] = [
  { id: '1', nome: 'Colégio Dr Eraldo Tinoco', codigo: 'ET-01', color: 'bg-blue-600', totalAlunos: 840, totalProfessores: 42, totalTurmas: 24 },
  { id: '2', nome: 'Colégio Moisés Alves', codigo: 'MA-02', color: 'bg-indigo-600', totalAlunos: 760, totalProfessores: 38, totalTurmas: 20 },
  { id: '3', nome: 'Escola Castelo Branco', codigo: 'CB-03', color: 'bg-amber-600', totalAlunos: 620, totalProfessores: 31, totalTurmas: 18 },
  { id: '4', nome: 'Escola Frei Urbano', codigo: 'FU-04', color: 'bg-emerald-600', totalAlunos: 580, totalProfessores: 29, totalTurmas: 16 },
  { id: '5', nome: 'Escola Jovino Souza Lima', codigo: 'JL-05', color: 'bg-cyan-600', totalAlunos: 490, totalProfessores: 24, totalTurmas: 14 },
  { id: '6', nome: 'Escolhinha PIU-PIU', codigo: 'PP-06', color: 'bg-rose-600', totalAlunos: 310, totalProfessores: 18, totalTurmas: 10 },
]

interface SchoolState {
  selectedEscola: Escola | null
  setSelectedEscola: (escola: Escola | null) => void
  selectEscolaById: (id: string | null) => void
}

export const useSchoolStore = create<SchoolState>((set) => ({
  selectedEscola: null,
  setSelectedEscola: (escola) => set({ selectedEscola: escola }),
  selectEscolaById: (id) => {
    if (!id) {
      set({ selectedEscola: null })
      return
    }
    const found = mockEscolas.find((e) => e.id === id) || null
    set({ selectedEscola: found })
  },
}))
