import { create } from 'zustand'

export type TipoVinculoFiltro = 'todos' | 'contratado' | 'nomeado' | 'concursado'
export type StatusFiltro = 'todos' | 'ativo' | 'inativo'

interface FolhaPagamentoState {
  tipoVinculo: TipoVinculoFiltro
  escolaId: string
  status: StatusFiltro
  selectedFuncionarioId: string | null
  setTipoVinculo: (tipo: TipoVinculoFiltro) => void
  setEscolaId: (id: string) => void
  setStatus: (status: StatusFiltro) => void
  setSelectedFuncionarioId: (id: string | null) => void
  resetFilters: () => void
}

export const useFolhaPagamentoStore = create<FolhaPagamentoState>((set) => ({
  tipoVinculo: 'todos',
  escolaId: 'todas',
  status: 'todos',
  selectedFuncionarioId: null,
  setTipoVinculo: (tipoVinculo) => set({ tipoVinculo }),
  setEscolaId: (escolaId) => set({ escolaId }),
  setStatus: (status) => set({ status }),
  setSelectedFuncionarioId: (selectedFuncionarioId) => set({ selectedFuncionarioId }),
  resetFilters: () => set({ tipoVinculo: 'todos', escolaId: 'todas', status: 'todos', selectedFuncionarioId: null })
}))
