'use client'

import { Eye, SlidersHorizontal } from 'lucide-react'
import { nivelColor } from './utils'
import type { RegistroPermissao } from './types'

interface FuncionarioCardProps {
  item: RegistroPermissao
  isEditActive: boolean
  compact?: boolean
  onClickEdit: () => void
  onClickConfigurar?: () => void
}

export function FuncionarioCard({
  item,
  isEditActive,
  compact = false,
  onClickEdit,
  onClickConfigurar,
}: FuncionarioCardProps) {
  const inicial = item.nome.charAt(0).toUpperCase()
  const isSecretario = item.nivelNum === 3 || item.nivel.includes('3')

  return (
    <div
      className={`bg-surface-2 border border-borderCustom hover:border-highlight/50 rounded-xl transition-colors flex items-center justify-between gap-3 ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div
          className={`rounded-full bg-[#0070f3]/20 border border-[#0070f3]/50 flex items-center justify-center font-bold text-[#0090ff] shrink-0 ${
            compact ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-base'
          }`}
        >
          {inicial}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <h4 className={`font-bold text-foreground truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {item.nome}
          </h4>
          <p className="text-xs text-muted-foreground truncate">{item.email}</p>
        </div>
      </div>

      {/* Badges + Ações */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${nivelColor(item.nivel)}`}>
          {item.nivel}
        </span>
        {!compact && (
          <span className="hidden md:inline-flex px-2.5 py-0.5 rounded-full text-xs border border-borderCustom text-muted-foreground bg-surface-3 truncate max-w-[160px]">
            {item.escola}
          </span>
        )}

        {/* Botão Configurar Acessos para Secretários */}
        {isSecretario && onClickConfigurar && (
          <button
            type="button"
            onClick={onClickConfigurar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0090ff]/10 hover:bg-[#0090ff]/20 text-[#0090ff] font-medium text-xs border border-[#0090ff]/30 transition-colors cursor-pointer"
            title="Configurar Acessos do Secretário"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configurar Acessos</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClickEdit}
          className={`p-2 rounded-full transition-colors cursor-pointer ${
            isEditActive
              ? 'bg-[#0090ff]/10 hover:bg-[#0090ff]/20 text-[#0090ff]'
              : 'bg-surface-3 hover:bg-hoverCustom text-muted-foreground hover:text-foreground'
          }`}
          title={isEditActive ? 'Editar Permissão' : 'Visualizar'}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
