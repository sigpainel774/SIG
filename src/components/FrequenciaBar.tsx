'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FrequenciaBarProps {
  feitas: number
  total: number
  loading: boolean
  onClick?: () => void
}

export function FrequenciaBar({ feitas, total, loading, onClick }: FrequenciaBarProps) {
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0
  return (
    <Card
      onClick={onClick}
      className={cn(
        'bg-surface-1 border-borderCustom rounded-2xl p-5 shadow-sm transition-all duration-200',
        onClick && 'cursor-pointer hover:border-highlight/50 hover:bg-surface-2 group active:scale-[0.99]'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-foreground group-hover:text-highlight transition-colors">
            Frequência de Hoje
          </span>
          {onClick && (
            <span className="text-[10px] font-bold text-highlight bg-highlight/10 border border-highlight/20 px-2 py-0.5 rounded-full ml-1 flex items-center gap-0.5 opacity-90 group-hover:opacity-100">
              Ver detalhes <ChevronRight className="w-3 h-3" />
            </span>
          )}
        </div>
        {!loading && (
          <span
            className={cn(
              'text-sm font-bold tabular-nums',
              pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'
            )}
          >
            {pct}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-muted/20 rounded-full animate-pulse" />
          <div className="h-3 w-1/2 bg-muted/20 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="w-full bg-muted/20 rounded-full h-2.5 overflow-hidden">
            <div
              className={cn(
                'h-2.5 rounded-full transition-all duration-700',
                pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-between">
            <span>{feitas} de {total} turmas registraram presença hoje</span>
            {onClick && (
              <span className="text-[11px] text-highlight/80 font-medium group-hover:underline">
                Clique para expandir
              </span>
            )}
          </p>
        </>
      )}
    </Card>
  )
}
