'use client'

import { Card } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FrequenciaBarProps {
  feitas: number
  total: number
  loading: boolean
}

export function FrequenciaBar({ feitas, total, loading }: FrequenciaBarProps) {
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0
  return (
    <Card className="bg-surface-1 border-borderCustom rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-foreground">Frequência de Hoje</span>
        </div>
        {!loading && (
          <span className={cn(
            'text-sm font-bold tabular-nums',
            pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'
          )}>
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
          <p className="text-xs text-muted-foreground mt-2">
            {feitas} de {total} turmas registraram presença hoje
          </p>
        </>
      )}
    </Card>
  )
}
