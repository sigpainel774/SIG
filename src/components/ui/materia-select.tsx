"use client"

import React, { useMemo, useEffect, useRef } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMateriasSWR } from "@/lib/swr/useSigSWR"
import { cn } from "@/lib/utils"

export interface MateriaSelectProps {
  value: string | null | undefined
  onChange: (id: string | null) => void
  escolaId: string | null | undefined
  placeholder?: string
  disabled?: boolean
  className?: string
  includeAll?: boolean
  allLabel?: string
  size?: "sm" | "default"
}

export function MateriaSelect({
  value,
  onChange,
  escolaId,
  placeholder = "Selecione a Matéria",
  disabled = false,
  className,
  includeAll = false,
  allLabel = "Todas as Matérias",
  size = "default",
}: MateriaSelectProps) {
  const { data: materias, isLoading } = useMateriasSWR(escolaId)

  // Tratamento de cascata: detecta mudanças subsequentes de escolaId sem apagar valor inicial
  const prevEscolaIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (prevEscolaIdRef.current === undefined) {
      prevEscolaIdRef.current = escolaId
      return
    }

    if (prevEscolaIdRef.current !== escolaId) {
      prevEscolaIdRef.current = escolaId
      if (value) {
        onChange(null)
      }
    }
  }, [escolaId, value, onChange])

  // Resolução do label da matéria selecionada para prevenir o bug do UUID cru no Base UI
  const selectedNome = useMemo(() => {
    if (!value || value === "all") {
      return includeAll && value === "all" ? allLabel : undefined
    }
    const found = materias?.find((m: any) => m.id === value)
    return found?.nome
  }, [value, materias, includeAll, allLabel])

  const selectValue = value ?? (includeAll ? "all" : "")

  const handleValueChange = (val: string | null) => {
    if (!val || val === "all") {
      onChange(null)
    } else {
      onChange(val)
    }
  }

  const isSelectDisabled = disabled || !escolaId || (isLoading && (!materias || materias.length === 0))

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={isSelectDisabled}
    >
      <SelectTrigger size={size} className={cn("w-full min-w-[180px]", className)}>
        <SelectValue placeholder={!escolaId ? "Selecione a escola primeiro" : placeholder}>
          {selectedNome || (isLoading && (!materias || materias.length === 0) ? "Carregando..." : undefined)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">
            {allLabel}
          </SelectItem>
        )}
        {materias && materias.length > 0 ? (
          materias.map((materia: any) => (
            <SelectItem key={materia.id} value={materia.id}>
              {materia.nome}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="__none__" disabled>
            {isLoading ? "Carregando matérias..." : "Nenhuma matéria encontrada"}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
