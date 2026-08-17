'use client'

import React from 'react'

export function LegendaCores() {
  const itens = [
    { label: 'Dia Letivo Regular', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 dot:bg-emerald-400' },
    { label: 'Feriado Nacional', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40 dot:bg-rose-400' },
    { label: 'Feriado Estadual', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40 dot:bg-amber-400' },
    { label: 'Feriado Municipal', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/40 dot:bg-purple-400' },
    { label: 'Ponto Facultativo', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 dot:bg-yellow-400' },
    { label: 'Recesso / Férias', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/40 dot:bg-orange-400' },
    { label: 'Sábado Letivo', bg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 dot:bg-cyan-400' },
    { label: 'Fim de Semana', bg: 'bg-zinc-800/40 text-zinc-400 border-zinc-700/40 dot:bg-zinc-500' }
  ]

  return (
    <div className="bg-[#18181b]/80 border border-[#27272a] rounded-xl p-3.5 shadow-inner">
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
