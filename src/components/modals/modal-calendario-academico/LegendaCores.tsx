'use client'

import React from 'react'

export function LegendaCores() {
  const itens = [
    { label: 'Dia Letivo Regular', bg: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30' },
    { label: 'Feriado Nacional', bg: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30' },
    { label: 'Feriado Estadual', bg: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30' },
    { label: 'Feriado Municipal', bg: 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30' },
    { label: 'Ponto Facultativo', bg: 'bg-yellow-500/15 text-yellow-900 dark:text-yellow-300 border-yellow-500/30' },
    { label: 'Recesso / Férias', bg: 'bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30' },
    { label: 'Sábado Letivo', bg: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30' },
    { label: 'Fim de Semana', bg: 'bg-muted/60 text-muted-foreground border-border' }
  ]

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        Legenda de Identificação Visual
      </p>
      <div className="flex flex-wrap gap-2">
        {itens.map((item, idx) => (
          <div
            key={idx}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${item.bg}`}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
