"use client"

import React, { useMemo, useEffect, useRef } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTurmasSWR } from "@/lib/swr/useSigSWR"
import { cn } from "@/lib/utils"

export interface TurmaSelectProps {
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

export function TurmaSelect({
  value,
  onChange,
  escolaId,
  placeholder = "Selecione a Turma",
  disabled = false,
  className,
  includeAll = false,
  allLabel = "Todas as Turmas",
  size = "default",
}: TurmaSelectProps) {
  const { data: turmas, isLoading } = useTurmasSWR(escolaId)

  // Tratamento de cascata: detecta mudanças subsequentes de escolaId sem apagar valor inicial de formulários de edição
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

  // Resolução do label da turma selecionada para prevenir o bug do UUID cru no Base UI
  const selectedNome = useMemo(() => {
    if (!value || value === "all") {
      return includeAll && value === "all" ? allLabel : undefined
    }
    const found = turmas?.find((t) => t.id === value)
    return found?.nome
  }, [value, turmas, includeAll, allLabel])

  const selectValue = value ?? (includeAll ? "all" : "")

  const handleValueChange = (val: string | null) => {
    if (!val || val === "all") {
      onChange(null)
    } else {
      onChange(val)
    }
  }

  const isSelectDisabled = disabled || !escolaId || (isLoading && (!turmas || turmas.length === 0))

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
      disabled={isSelectDisabled}
    >
      <SelectTrigger size={size} className={cn("w-full min-w-[180px]", className)}>
        <SelectValue placeholder={!escolaId ? "Selecione a escola primeiro" : placeholder}>
          {selectedNome || (isLoading && (!turmas || turmas.length === 0) ? "Carregando..." : undefined)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">
            {allLabel}
          </SelectItem>
        )}
        {turmas && turmas.length > 0 ? (
          turmas.map((turma) => (
            <SelectItem key={turma.id} value={turma.id}>
              {turma.nome} {turma.turno ? `(${turma.turno})` : ""}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="__none__" disabled>
            {isLoading ? "Carregando turmas..." : "Nenhuma turma encontrada"}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  )
}
