'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useFuncionarioForm } from '../context/FuncionarioFormContext'

export function SaudeTab() {
  const {
    possuiDeficiencia, setPossuiDeficiencia,
    deficiencias, setDeficiencias,
    tea, setTea,
    altasHabilidades, setAltasHabilidades,
    doencas, setDoencas,
    toggleDeficiencia,
  } = useFuncionarioForm()

  const deficienciasDisponiveis = [
    'Baixa visão',
    'Cegueira',
    'Surdez',
    'Deficiência física',
    'Deficiência intelectual',
    'Deficiência Auditiva',
    'Surdocegueira',
    'Deficiência múltipla',
  ]

  const doencasDisponiveis = [
    { key: 'diabetes' as const, label: 'Diabetes?' },
    { key: 'convulsoes' as const, label: 'Convulsões?' },
    { key: 'asmaBronquite' as const, label: 'Asma / Bronquite?' },
    { key: 'infeccoes' as const, label: 'Infecções recorrentes?' },
    { key: 'cardiopatias' as const, label: 'Cardiopatias?' },
    { key: 'alergias' as const, label: 'Alergias severas?' },
    { key: 'covid19' as const, label: 'Teve Covid-19?' },
    { key: 'articulares' as const, label: 'Doenças articulares?' },
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1">Acessibilidade & Deficiências</h3>
      
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="possuiDeficiencia"
          checked={possuiDeficiencia}
          onChange={(e) => {
            setPossuiDeficiencia(e.target.checked)
            if (!e.target.checked) setDeficiencias([])
          }}
          className="w-4 h-4 cursor-pointer accent-highlight"
        />
        <Label htmlFor="possuiDeficiencia" className="font-semibold text-sm cursor-pointer text-zinc-100">
          O servidor possui deficiência, TEA ou altas habilidades / superdotação?
        </Label>
      </div>

      {possuiDeficiencia && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#18181a] p-4 rounded-xl border border-zinc-800/80 text-xs text-zinc-300">
          {/* Deficiências */}
          <div className="space-y-2">
            <p className="font-bold text-highlight text-[10px] uppercase">Grupo Deficiências:</p>
            {deficienciasDisponiveis.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`def_${item}`}
                  checked={deficiencias.includes(item)}
                  onChange={() => toggleDeficiencia(item)}
                  className="w-3.5 h-3.5 accent-highlight"
                />
                <label htmlFor={`def_${item}`} className="cursor-pointer">{item}</label>
              </div>
            ))}
          </div>

          {/* TEA */}
          <div className="space-y-2">
            <p className="font-bold text-highlight text-[10px] uppercase">Transtornos:</p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="teaCheck"
                checked={tea}
                onChange={(e) => setTea(e.target.checked)}
                className="w-3.5 h-3.5 accent-highlight"
              />
              <label htmlFor="teaCheck" className="cursor-pointer font-medium text-zinc-200">Transtorno do Espectro Autista (TEA)</label>
            </div>
          </div>

          {/* Altas habilidades */}
          <div className="space-y-2">
            <p className="font-bold text-highlight text-[10px] uppercase">Altas Habilidades:</p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="altasHab"
                checked={altasHabilidades}
                onChange={(e) => setAltasHabilidades(e.target.checked)}
                className="w-3.5 h-3.5 accent-highlight"
              />
              <label htmlFor="altasHab" className="cursor-pointer font-medium text-zinc-200">Altas Habilidades / Superdotação</label>
            </div>
          </div>
        </div>
      )}

      <h3 className="text-xs font-bold text-highlight uppercase tracking-wider border-b border-zinc-800 pb-1">Doenças Crônicas ou Recentes</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-zinc-300">
        {doencasDisponiveis.map((d) => (
          <div key={d.key} className="flex items-center gap-2 p-2 rounded bg-[#18181a] border border-zinc-800">
            <input
              type="checkbox"
              id={`doenca_${d.key}`}
              checked={doencas[d.key]}
              onChange={(e) => setDoencas({ ...doencas, [d.key]: e.target.checked })}
              className="w-4 h-4 accent-highlight"
            />
            <label htmlFor={`doenca_${d.key}`} className="cursor-pointer font-medium">{d.label}</label>
          </div>
        ))}
      </div>

      <div>
        <Label>Outra doença, especificar:</Label>
        <Input
          value={doencas.outra}
          onChange={(e) => setDoencas({ ...doencas, outra: e.target.value })}
          placeholder="Especifique medicamentos ou condições crônicas não listadas"
          className="bg-[#181818] border-borderCustom text-white mt-1"
        />
      </div>
    </div>
  )
}
