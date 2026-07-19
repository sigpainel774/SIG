'use client'

import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface AlunosFiltersProps {
  searchTerm: string
  setSearchTerm: (v: string) => void
  totalFiltrado: number
}

export function AlunosFilters({
  searchTerm,
  setSearchTerm,
  totalFiltrado,
}: AlunosFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div className="relative flex-1 max-w-md w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Buscar por Nome, Matrícula, CPF ou Código INEP..."
          className="pl-9 bg-surface-1 border-borderCustom text-foreground focus-visible:ring-highlight w-full h-11 text-sm rounded-xl"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="text-xs text-muted-foreground font-medium self-end sm:self-center shrink-0">
        Total:{' '}
        <span className="text-foreground font-bold">{totalFiltrado}</span>{' '}
        aluno{totalFiltrado !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
