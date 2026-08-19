'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'

export interface EscolaOption {
  id: string
  nome: string
  [key: string]: any
}

interface EscolaSearchSelectProps {
  escolas: EscolaOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function EscolaSearchSelect({
  escolas,
  value,
  onChange,
  placeholder = 'Selecione uma escola...',
  disabled = false,
  className = '',
}: EscolaSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Normaliza o termo e filtra a lista de escolas
  const escolasFiltradas = useMemo(() => {
    if (!busca.trim()) return escolas
    const termoNormalizado = busca
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

    return escolas.filter((e) =>
      e.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(termoNormalizado)
    )
  }, [escolas, busca])

  const escolaSelecionada = useMemo(() => {
    return escolas.find((e) => e.id === value)
  }, [escolas, value])

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev)
          }
        }}
        className={`w-full flex items-center justify-between bg-background border border-border text-foreground text-sm h-9 rounded-md px-3 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="truncate">
          {escolaSelecionada ? (
            escolaSelecionada.nome
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[240px]">
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Pesquisar escola..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-background border border-border text-foreground text-xs rounded-md pl-8 pr-2.5 py-1.5 outline-none focus:border-sky-500 placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto p-1 divide-y divide-border/20">
            {escolasFiltradas.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Nenhuma escola encontrada.
              </div>
            ) : (
              escolasFiltradas.map((e) => {
                const isSelected = value === e.id
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      onChange(e.id)
                      setOpen(false)
                      setBusca('')
                    }}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="truncate">{e.nome}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-sky-500 shrink-0 ml-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
