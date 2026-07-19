'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { Escola } from './types'

interface PermissoesFiltersProps {
  buscaLista: string
  setBuscaLista: (v: string) => void
  filtroNivel: string
  setFiltroNivel: (v: string) => void
  filtroEscola: string
  setFiltroEscola: (v: string) => void
  escolas: Escola[]
  totalFiltrados: number
  limparFiltros: () => void
}

export function PermissoesFilters({
  buscaLista,
  setBuscaLista,
  filtroNivel,
  setFiltroNivel,
  filtroEscola,
  setFiltroEscola,
  escolas,
  totalFiltrados,
  limparFiltros,
}: PermissoesFiltersProps) {
  const temFiltroAtivo = buscaLista || filtroNivel || filtroEscola

  return (
    <>
      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar funcionário..."
            value={buscaLista}
            onChange={(e) => setBuscaLista(e.target.value)}
            className="pl-9 bg-surface-1 border-borderCustom text-foreground placeholder:text-muted-foreground h-11 rounded-xl focus:ring-[#0090ff] focus:border-[#0090ff]"
          />
        </div>

        {/* Filtro Nível */}
        <select
          value={filtroNivel}
          onChange={(e) => setFiltroNivel(e.target.value)}
          className="w-full bg-surface-1 border border-borderCustom text-foreground h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] cursor-pointer"
        >
          <option value="">Todos os Níveis</option>
          <option value="ROOT">ROOT</option>
          <option value="Nível 1">Nível 1 - Administrador Global</option>
          <option value="Nível 2">Nível 2 - Diretor</option>
          <option value="Nível 3">Nível 3 - Coord. / Secretário</option>
          <option value="Nível 4">Nível 4 - Professor</option>
          <option value="Nível 5">Nível 5 - Chefe de Equipe</option>
          <option value="Nível 6">Nível 6 - Operacional</option>
          <option value="Pendente / Sem Permissão">Pendente / Sem Permissão</option>
        </select>

        {/* Filtro Escola — populado do banco */}
        <select
          value={filtroEscola}
          onChange={(e) => setFiltroEscola(e.target.value)}
          className="w-full bg-surface-1 border border-borderCustom text-foreground h-11 rounded-xl px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#0090ff] cursor-pointer"
        >
          <option value="">Todas as Escolas</option>
          <option value="Sem Lotação">Sem Lotação</option>
          {escolas.map((e) => (
            <option key={e.id} value={e.nome}>
              {e.nome}
            </option>
          ))}
        </select>

        {/* Limpar */}
        <button
          type="button"
          onClick={limparFiltros}
          className="h-11 px-4 bg-surface-2 hover:bg-hoverCustom text-foreground border border-borderCustom rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Limpar</span>
        </button>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
        <span>
          {totalFiltrados} funcionário{totalFiltrados !== 1 ? 's' : ''} encontrado{totalFiltrados !== 1 ? 's' : ''}
        </span>
        {temFiltroAtivo && (
          <button onClick={limparFiltros} className="text-[#0090ff] hover:underline cursor-pointer">
            limpar filtros
          </button>
        )}
      </div>
    </>
  )
}
