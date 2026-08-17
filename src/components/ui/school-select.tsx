"use client"

import React, { useMemo } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEscolasSWR } from "@/lib/swr/useSigSWR"
import { useAuthStore } from "@/store/useAuthStore"
import { cn } from "@/lib/utils"

export interface SchoolSelectProps {
  value: string | null | undefined
  onChange: (id: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  includeAll?: boolean
  allLabel?: string
  size?: "sm" | "default"
}

export function SchoolSelect({
  value,
  onChange,
  placeholder = "Selecione a Escola",
  disabled = false,
  className,
  includeAll = false,
  allLabel = "Todas as Escolas",
  size = "default",
}: SchoolSelectProps) {
  const { data: escolas, isLoading } = useEscolasSWR()
  const { isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const isAdmin = isAdminGlobalOrRoot()

  // Filtro de escopo por perfil de acesso (ABAC)
  const escolasFiltradas = useMemo(() => {
    if (!escolas) return []
    if (isAdmin) return escolas
    return escolaAtivaId ? escolas.filter((e) => e.id === escolaAtivaId) : []
  }, [escolas, isAdmin, escolaAtivaId])

  // Resolução do label do item selecionado para prevenir o bug do UUID cru no Base UI
  const selectedNome = useMemo(() => {
    if (!value || value === "all") {
      return includeAll && value === "all" ? allLabel : undefined
    }
    const found = escolasFiltradas.find((e) => e.id === value)
    return found?.nome
  }, [value, escolasFiltradas, includeAll, allLabel])

  const selectValue = value ?? (includeAll ? "all" : "")

  const handleValueChange = (val: string | null) => {
    if (!val || val === "all") {
      onChange(null)
    } else {
      onChange(val)
    }
  }

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={disabled || (isLoading && escolasFiltradas.length === 0)}
    >
      <SelectTrigger size={size} className={cn("w-full min-w-[200px]", className)}>
        <SelectValue placeholder={placeholder}>
          {selectedNome || (isLoading && escolasFiltradas.length === 0 ? "Carregando..." : undefined)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">
            {allLabel}
          </SelectItem>
        )}
        {escolasFiltradas.map((escola) => (
          <SelectItem key={escola.id} value={escola.id}>
            {escola.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
