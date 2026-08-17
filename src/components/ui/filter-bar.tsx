"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  children?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  searchClassName?: string
  onClear?: () => void
}

export function FilterBar({
  searchValue,
  onSearchChange,
  placeholder = "Buscar...",
  debounceMs = 300,
  children,
  actions,
  className,
  searchClassName,
  onClear,
}: FilterBarProps) {
  // Estado local para digitação instantânea sem lag visual
  const [localValue, setLocalValue] = useState(searchValue)

  // Sincronização quando a prop externa mudar programaticamente
  useEffect(() => {
    setLocalValue(searchValue)
  }, [searchValue])

  // Debounce controlado: emite o valor para o pai após o tempo de espera
  useEffect(() => {
    if (localValue === searchValue) return

    const timer = setTimeout(() => {
      onSearchChange(localValue)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, searchValue, debounceMs, onSearchChange])

  const handleClear = useCallback(() => {
    setLocalValue("")
    onSearchChange("")
    onClear?.()
  }, [onSearchChange, onClear])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear()
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card/60 p-3 rounded-2xl border border-border",
        className
      )}
    >
      <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-3 min-w-0">
        {/* Campo de Busca Textual com Ícone e Limpeza Rápida */}
        <div className={cn("relative flex-1 min-w-[200px] max-w-full sm:max-w-md", searchClassName)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-9 pl-9 pr-8 bg-background border border-input rounded-xl text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          />
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Slot para Selects e Filtros Adicionais (ex: SchoolSelect, TurmaSelect, Badges) */}
        {children && (
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {children}
          </div>
        )}
      </div>

      {/* Slot para Ações à Direita (ex: Botão Novo Registro, Exportar, etc.) */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          {actions}
        </div>
      )}
    </div>
  )
}
