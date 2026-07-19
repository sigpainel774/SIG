'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Printer, Plus } from 'lucide-react'

interface FuncionariosFiltersProps {
  isEditMode: boolean
  busca: string
  setBusca: (val: string) => void
  filtroCargo: string
  setFiltroCargo: (val: string) => void
  filtroStatus: string
  setFiltroStatus: (val: string) => void
  filtroImpEscola: string
  setFiltroImpEscola: (val: string) => void
  filtroImpCargo: string
  setFiltroImpCargo: (val: string) => void
  cargosUnicos: string[]
  escolasUnicas: string[]
  handleImprimirLista: () => void
  setModalNovoOpen: (open: boolean) => void
}

export function FuncionariosFilters({
  isEditMode,
  busca,
  setBusca,
  filtroCargo,
  setFiltroCargo,
  filtroStatus,
  setFiltroStatus,
  filtroImpEscola,
  setFiltroImpEscola,
  filtroImpCargo,
  setFiltroImpCargo,
  cargosUnicos,
  escolasUnicas,
  handleImprimirLista,
  setModalNovoOpen
}: FuncionariosFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Busca */}
      <Input
        placeholder="Buscar funcionário por nome..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="bg-surface-1 border-borderCustom text-foreground placeholder:text-muted-foreground h-9 w-56 text-sm"
      />

      {/* Filtro Cargo */}
      <Select
        value={filtroCargo}
        onValueChange={(v) => setFiltroCargo(v ?? 'todos')}
      >
        <SelectTrigger className="bg-surface-1 border-borderCustom text-foreground h-9 text-sm w-44">
          <SelectValue placeholder="Todos os Cargos" />
        </SelectTrigger>
        <SelectContent className="bg-surface-1 border-borderCustom text-foreground">
          <SelectItem value="todos">Todos os Cargos</SelectItem>
          {cargosUnicos.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro Status */}
      <Select
        value={filtroStatus}
        onValueChange={(v) => setFiltroStatus(v ?? 'todos')}
      >
        <SelectTrigger className="bg-surface-1 border-borderCustom text-foreground h-9 text-sm w-40">
          <SelectValue placeholder="Todos os Status" />
        </SelectTrigger>
        <SelectContent className="bg-surface-1 border-borderCustom text-foreground">
          <SelectItem value="todos">Todos os Status</SelectItem>
          <SelectItem value="ativo">Ativo</SelectItem>
          <SelectItem value="afastado">Afastado</SelectItem>
          <SelectItem value="desligado">Desligado</SelectItem>
          <SelectItem value="suspenso">Suspenso</SelectItem>
        </SelectContent>
      </Select>

      {/* ── Filtros de Impressão ── */}
      <Select
        value={filtroImpEscola}
        onValueChange={(v) => setFiltroImpEscola(v ?? 'todas')}
      >
        <SelectTrigger className="bg-surface-1 border-borderCustom text-foreground h-9 w-44 text-sm rounded-xl">
          <SelectValue placeholder="Escola p/ impressão" />
        </SelectTrigger>
        <SelectContent className="bg-surface-1 border-borderCustom text-foreground">
          <SelectItem value="todas">Todas as Escolas</SelectItem>
          {escolasUnicas.map((escola) => (
            <SelectItem key={escola} value={escola}>
              {escola}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Cargo para Impressão */}
      <Select
        value={filtroImpCargo}
        onValueChange={(v) => setFiltroImpCargo(v ?? 'todos')}
      >
        <SelectTrigger className="bg-surface-1 border-borderCustom text-foreground h-9 w-44 text-sm rounded-xl">
          <SelectValue placeholder="Cargo p/ impressão" />
        </SelectTrigger>
        <SelectContent className="bg-surface-1 border-borderCustom text-foreground">
          <SelectItem value="todos">Todos os Cargos</SelectItem>
          {cargosUnicos.map((cargo) => (
            <SelectItem key={cargo} value={cargo}>
              {cargo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Imprimir Lista */}
      <Button
        onClick={handleImprimirLista}
        className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 font-semibold gap-2 h-9 text-sm cursor-pointer rounded-xl border-none shadow-sm flex items-center px-4"
      >
        <Printer className="w-4 h-4" />
        Imprimir Lista
      </Button>

      {/* Botão Novo Funcionário */}
      {isEditMode && (
        <Button
          onClick={() => setModalNovoOpen(true)}
          className="bg-success hover:bg-success/90 text-success-foreground font-semibold gap-2 h-9 text-sm cursor-pointer rounded-xl border-none shadow-sm flex items-center px-4 ml-auto"
        >
          <Plus className="w-4.5 h-4.5" />
          Novo Funcionário
        </Button>
      )}
    </div>
  )
}
