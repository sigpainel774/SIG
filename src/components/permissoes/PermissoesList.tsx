'use client'

import { Loader2, Building2 } from 'lucide-react'
import { FuncionarioCard } from './FuncionarioCard'
import type { RegistroPermissao } from './types'

interface PermissoesListProps {
  loading: boolean
  modoAtribuicao: 'funcionario' | 'escola'
  registrosFiltrados: RegistroPermissao[]
  registrosAgrupadosPorEscola: Record<string, RegistroPermissao[]>
  isEditActive: boolean
  onClickEditCard: (item: RegistroPermissao, overrideModo?: 'funcionario') => void
}

export function PermissoesList({
  loading,
  modoAtribuicao,
  registrosFiltrados,
  registrosAgrupadosPorEscola,
  isEditActive,
  onClickEditCard,
}: PermissoesListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-zinc-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando permissões...</span>
      </div>
    )
  }

  if (registrosFiltrados.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-400 text-sm border border-dashed border-[#3f3f46] rounded-xl">
        Nenhum funcionário encontrado com os filtros aplicados.
      </div>
    )
  }

  if (modoAtribuicao === 'funcionario') {
    return (
      <div className="space-y-2">
        {registrosFiltrados.map((item) => (
          <FuncionarioCard
            key={`${item.id}-${item.escolaId}`}
            item={item}
            isEditActive={isEditActive}
            onClickEdit={() => onClickEditCard(item)}
          />
        ))}
      </div>
    )
  }

  // Modo Por Escola
  return (
    <div className="space-y-6">
      {Object.entries(registrosAgrupadosPorEscola)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([escolaNome, membros]) => (
          <div key={escolaNome}>
            {/* Header da Escola */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 bg-[#0090ff]/10 border border-[#0090ff]/20 rounded-lg px-3 py-1.5">
                <Building2 className="w-4 h-4 text-[#0090ff] shrink-0" />
                <span className="text-sm font-semibold text-[#0090ff]">{escolaNome}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-surface-3 px-2 py-0.5 rounded-full">
                {membros.length} funcionário{membros.length !== 1 ? 's' : ''}
              </span>
              <div className="flex-1 h-px bg-borderCustom" />
            </div>

            {/* Membros */}
            <div className="space-y-2 ml-2">
              {membros.map((item) => (
                <FuncionarioCard
                  key={`${item.id}-${item.escolaId}`}
                  item={item}
                  isEditActive={isEditActive}
                  compact
                  onClickEdit={() => onClickEditCard(item, 'funcionario')}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
