'use client'

import React, { useState } from 'react'
import { TipoDiaCalendario } from '@/hooks/useCalendarioAcademico'
import { formatarDataISO } from '@/lib/feriadosNacionais'
import { ModalEditarDia } from './ModalEditarDia'

interface MatrizAnualMesesProps {
  anoLetivo: number
  classificarDia: (dataStr: string) => {
    tipo: TipoDiaCalendario
    descricao: string
    letivo: boolean
    emTrimestre: number | null
  }
  onSalvarDia: (data: string, tipo: TipoDiaCalendario, descricao: string, letivo: boolean) => void
  onRemoverDia: (data: string) => void
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DIAS_SEMANA_ABREV = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export function MatrizAnualMeses({
  anoLetivo,
  classificarDia,
  onSalvarDia,
  onRemoverDia
}: MatrizAnualMesesProps) {
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
  const [modalDiaOpen, setModalDiaOpen] = useState(false)

  const handleAbrirDia = (dataStr: string) => {
    setDiaSelecionado(dataStr)
    setModalDiaOpen(true)
  }

  const infoDiaSelecionado = diaSelecionado ? classificarDia(diaSelecionado) : null

  // Gera a matriz de dias para cada um dos 12 meses
  const renderMes = (mesIdx: number) => {
    const nomeMes = NOMES_MESES[mesIdx]
    const primeiroDia = new Date(anoLetivo, mesIdx, 1)
    const ultimoDia = new Date(anoLetivo, mesIdx + 1, 0)
    const totalDias = ultimoDia.getDate()
    const offsetInicio = primeiroDia.getDay() // 0 = Domingo

    const celulas = []

    // Células vazias antes do dia 1
    for (let i = 0; i < offsetInicio; i++) {
      celulas.push(
        <div key={`empty-${i}`} className="h-7 w-7 rounded-md opacity-0 pointer-events-none" />
      )
    }

    // Dias do mês
    for (let dia = 1; dia <= totalDias; dia++) {
      const dataStr = formatarDataISO(anoLetivo, mesIdx + 1, dia)
      const info = classificarDia(dataStr)

      let estilo = 'bg-muted/40 text-muted-foreground/70 border-border/30 hover:border-border'

      if (info.tipo === 'letivo_regular') {
        estilo = 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25 font-semibold'
      } else if (info.tipo === 'feriado_nacional') {
        estilo = 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/50 hover:bg-rose-500/30 font-black ring-1 ring-rose-500/30'
      } else if (info.tipo === 'feriado_estadual') {
        estilo = 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/50 hover:bg-amber-500/30 font-black ring-1 ring-amber-500/30'
      } else if (info.tipo === 'feriado_municipal') {
        estilo = 'bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/50 hover:bg-purple-500/30 font-black ring-1 ring-purple-500/30'
      } else if (info.tipo === 'ponto_facultativo') {
        estilo = 'bg-yellow-500/20 text-yellow-900 dark:text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30 font-black ring-1 ring-yellow-500/40'
      } else if (info.tipo === 'recesso_escolar') {
        estilo = 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40 hover:bg-orange-500/30'
      } else if (info.tipo === 'sabado_letivo') {
        estilo = 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30 font-black ring-1 ring-cyan-500/40'
      } else if (info.tipo === 'dia_letivo_especial') {
        estilo = 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border-indigo-500/50 hover:bg-indigo-500/30 font-bold'
      } else if (info.tipo === 'conselho_classe' || info.tipo === 'planejamento_pedagogico') {
        estilo = 'bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
      } else if (info.tipo === 'fim_de_semana') {
        estilo = 'bg-muted/40 text-muted-foreground/60 border-border/30 hover:bg-muted'
      }

      celulas.push(
        <button
          key={dataStr}
          type="button"
          onClick={() => handleAbrirDia(dataStr)}
          title={`${dia}/${mesIdx + 1}: ${info.descricao}`}
          className={`h-7 w-7 rounded-md border text-[11px] flex items-center justify-center transition-all cursor-pointer transform hover:scale-105 active:scale-95 ${estilo}`}
        >
          {dia}
        </button>
      )
    }

    return (
      <div
        key={mesIdx}
        className="bg-card border border-border rounded-xl p-3 shadow-xs hover:border-border/80 transition-colors"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-2">
          <h4 className="text-xs font-bold text-foreground">{nomeMes}</h4>
          <span className="text-[10px] text-muted-foreground font-mono">{anoLetivo}</span>
        </div>

        {/* Cabeçalho dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DIAS_SEMANA_ABREV.map((d, i) => (
            <span
              key={i}
              className={`text-[10px] font-bold ${
                i === 0 || i === 6 ? 'text-muted-foreground/60' : 'text-muted-foreground'
              }`}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Grade de dias */}
        <div className="grid grid-cols-7 gap-1">{celulas}</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 12 }, (_, i) => renderMes(i))}
      </div>

      {/* Modal de personalização do dia clicado */}
      <ModalEditarDia
        open={modalDiaOpen}
        onOpenChange={setModalDiaOpen}
        dataStr={diaSelecionado}
        tipoAtual={infoDiaSelecionado?.tipo || 'letivo_regular'}
        descricaoAtual={infoDiaSelecionado?.descricao || ''}
        letivoAtual={infoDiaSelecionado?.letivo ?? true}
        onSave={onSalvarDia}
        onRemove={onRemoverDia}
      />
    </div>
  )
}
