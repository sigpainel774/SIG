'use client'

import { Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { FuncionarioSimples } from './types'
import type { RefObject } from 'react'

interface AutocompleteFuncionarioProps {
  autocompleteRef: RefObject<HTMLDivElement | null>
  inputFunc: string
  setInputFunc: (v: string) => void
  funcSelecionado: FuncionarioSimples | null
  setFuncSelecionado: (f: FuncionarioSimples | null) => void
  showSugestoes: boolean
  setShowSugestoes: (v: boolean) => void
  sugestoesFiltradas: FuncionarioSimples[]
}

export function AutocompleteFuncionario({
  autocompleteRef,
  inputFunc,
  setInputFunc,
  funcSelecionado,
  setFuncSelecionado,
  showSugestoes,
  setShowSugestoes,
  sugestoesFiltradas,
}: AutocompleteFuncionarioProps) {
  return (
    <div className="space-y-2" ref={autocompleteRef}>
      <label className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase block">
        FUNCIONÁRIO
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <Input
          type="text"
          placeholder="Digite para pesquisar..."
          value={inputFunc}
          onChange={(e) => {
            setInputFunc(e.target.value)
            setFuncSelecionado(null)
            setShowSugestoes(true)
          }}
          onFocus={() => setShowSugestoes(true)}
          className="pl-9 bg-surface-1 border-borderCustom text-foreground placeholder:text-muted-foreground h-11 rounded-xl focus:ring-[#0090ff] focus:border-[#0090ff]"
        />
        {funcSelecionado && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
        )}

        {/* Dropdown de sugestões */}
        {showSugestoes && sugestoesFiltradas.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-surface-1 border border-borderCustom rounded-xl shadow-xl overflow-hidden">
            {sugestoesFiltradas.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFuncSelecionado(f)
                  setInputFunc(f.nome)
                  setShowSugestoes(false)
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-hoverCustom transition-colors flex items-center gap-3 group"
              >
                <div className="w-7 h-7 rounded-full bg-[#0070f3]/20 border border-[#0070f3]/40 flex items-center justify-center text-[#0090ff] font-bold text-xs shrink-0">
                  {f.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{f.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{f.email ?? '—'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
