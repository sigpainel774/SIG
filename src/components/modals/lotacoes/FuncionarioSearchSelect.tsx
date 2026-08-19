'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react'

export interface FuncionarioOption {
  id: string
  nome: string
  cargo?: string | null
  cargo_vinculo?: string | null
  cpf?: string | null
  email?: string | null
  foto_url?: string | null
  [key: string]: any
}

interface FuncionarioSearchSelectProps {
  funcionarios: FuncionarioOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function FuncionarioSearchSelect({
  funcionarios,
  value,
  onChange,
  placeholder = 'Selecione um funcionário...',
  disabled = false,
  loading = false,
  className = '',
}: FuncionarioSearchSelectProps) {
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

  // Normaliza o termo e filtra a lista de funcionários por Nome, Cargo ou CPF
  const funcionariosFiltrados = useMemo(() => {
    if (!busca.trim()) return funcionarios
    const termoNormalizado = busca
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[.\-\s]/g, '')

    return funcionarios.filter((f) => {
      const nomeNorm = (f.nome ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

      const cargoNorm = (f.cargo_vinculo ?? f.cargo ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

      const cpfLimpo = (f.cpf ?? '').replace(/[.\-\s]/g, '')

      return (
        nomeNorm.includes(busca.toLowerCase().trim()) ||
        cargoNorm.includes(busca.toLowerCase().trim()) ||
        (cpfLimpo && cpfLimpo.includes(termoNormalizado))
      )
    })
  }, [funcionarios, busca])

  const funcionarioSelecionado = useMemo(() => {
    return funcionarios.find((f) => f.id === value)
  }, [funcionarios, value])

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => {
          if (!disabled && !loading) {
            setOpen((prev) => !prev)
          }
        }}
        className="w-full flex items-center justify-between bg-background border border-border text-foreground text-sm h-10 rounded-md px-3 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-500" />
              <span>Carregando funcionários...</span>
            </div>
          ) : funcionarioSelecionado ? (
            <div className="flex flex-col truncate">
              <span className="font-semibold text-foreground text-xs truncate">
                {funcionarioSelecionado.nome}
              </span>
              <span className="text-[11px] text-muted-foreground truncate">
                {funcionarioSelecionado.cargo_vinculo ?? funcionarioSelecionado.cargo ?? 'Sem Cargo'}
                {funcionarioSelecionado.cpf ? ` • CPF: ${funcionarioSelecionado.cpf}` : ''}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && !loading && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors cursor-pointer"
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[280px]">
          <div className="p-2 border-b border-border bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                autoFocus
                placeholder="Pesquisar por nome, cargo ou CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-background border border-border text-foreground text-xs rounded-md pl-8 pr-2.5 py-2 outline-none focus:border-sky-500 placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-border/20">
            {loading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                <span>Carregando funcionários da unidade...</span>
              </div>
            ) : funcionariosFiltrados.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {funcionarios.length === 0
                  ? 'Nenhum funcionário ativo vinculado a esta escola.'
                  : 'Nenhum funcionário encontrado para esta busca.'}
              </div>
            ) : (
              funcionariosFiltrados.map((f) => {
                const isSelected = value === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      onChange(f.id)
                      setOpen(false)
                      setBusca('')
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-medium">{f.nome}</span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {f.cargo_vinculo ?? f.cargo ?? 'Sem Cargo'}
                        {f.cpf ? ` • CPF: ${f.cpf}` : ''}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-sky-500 shrink-0 ml-2" />
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
