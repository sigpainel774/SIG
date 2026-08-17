'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { EventoCalendario, TipoDiaCalendario } from '@/hooks/useCalendarioAcademico'
import { formatarDataBR } from '@/lib/feriadosNacionais'
import { Plus, Trash2, Zap, Calendar, Flag, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface PontosFacultativosSectionProps {
  anoLetivo: number
  eventosMap: Map<string, EventoCalendario>
  onAdicionar: (data: string, tipo: TipoDiaCalendario, descricao: string, letivo: boolean) => void
  onRemover: (data: string) => void
}

export function PontosFacultativosSection({
  anoLetivo,
  eventosMap,
  onAdicionar,
  onRemover
}: PontosFacultativosSectionProps) {
  const [dataInput, setDataInput] = useState(`${anoLetivo}-06-23`)
  const [tipoInput, setTipoInput] = useState<TipoDiaCalendario>('ponto_facultativo')
  const [descricaoInput, setDescricaoInput] = useState('')
  const [letivoInput, setLetivoInput] = useState(false)

  const handleAdicionar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataInput) {
      toast.error('Informe a data do evento.')
      return
    }
    if (!descricaoInput.trim()) {
      toast.error('Informe o motivo ou número do decreto.')
      return
    }

    onAdicionar(dataInput, tipoInput, descricaoInput.trim(), letivoInput)
    setDescricaoInput('')
    toast.success('Evento adicionado ao calendário!')
  }

  const handleTipoChange = (novoTipo: TipoDiaCalendario) => {
    setTipoInput(novoTipo)
    if (novoTipo === 'sabado_letivo' || novoTipo === 'dia_letivo_especial') {
      setLetivoInput(true)
    } else {
      setLetivoInput(false)
    }
  }

  // Lista ordenada de eventos
  const listaEventos = Array.from(eventosMap.values()).sort((a, b) => a.data.localeCompare(b.data))

  const getTipoBadge = (tipo: TipoDiaCalendario) => {
    switch (tipo) {
      case 'ponto_facultativo':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/15 text-yellow-900 dark:text-yellow-300 border border-yellow-500/30">Ponto Facultativo</span>
      case 'feriado_municipal':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30">Feriado Municipal</span>
      case 'feriado_estadual':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">Feriado Estadual</span>
      case 'feriado_nacional':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30">Feriado Nacional</span>
      case 'sabado_letivo':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30">Sábado Letivo</span>
      case 'dia_letivo_especial':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30">Dia Especial</span>
      case 'recesso_escolar':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/15 text-orange-800 dark:text-orange-300 border border-orange-500/30">Recesso</span>
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border">Outro</span>
    }
  }

  return (
    <div className="space-y-4">
      {/* Formulário de Lançamento Rápido */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Lançamento Rápido de Pontos Facultativos e Feriados Municipais
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Adicione decretos municipais, feriados da cidade ou sábados de reposição a qualquer momento.
            </p>
          </div>
        </div>

        <form onSubmit={handleAdicionar} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <div className="sm:col-span-3">
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Data</label>
            <Input
              type="date"
              value={dataInput}
              onChange={(e) => setDataInput(e.target.value)}
              className="h-8 text-xs bg-background border-border text-foreground"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Classificação</label>
            <Select value={tipoInput} onValueChange={(val: any) => handleTipoChange(val)}>
              <SelectTrigger className="h-8 text-xs bg-background border-border text-foreground">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="ponto_facultativo">🟡 Ponto Facultativo</SelectItem>
                <SelectItem value="feriado_municipal">🟣 Feriado Municipal</SelectItem>
                <SelectItem value="feriado_estadual">🟠 Feriado Estadual</SelectItem>
                <SelectItem value="feriado_nacional">🔴 Feriado Nacional</SelectItem>
                <SelectItem value="sabado_letivo">🔷 Sábado Letivo</SelectItem>
                <SelectItem value="dia_letivo_especial">✨ Dia Letivo Especial</SelectItem>
                <SelectItem value="recesso_escolar">🟤 Recesso Escolar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-4">
            <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Descrição / Decreto</label>
            <Input
              value={descricaoInput}
              onChange={(e) => setDescricaoInput(e.target.value)}
              placeholder="Ex: Decreto nº 08/2026 - Pós-Carnaval"
              className="h-8 text-xs bg-background border-border text-foreground"
            />
          </div>

          <div className="sm:col-span-2">
            <Button
              type="submit"
              className="w-full h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar
            </Button>
          </div>
        </form>
      </div>

      {/* Tabela de Eventos Cadastrados no Ano */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            Eventos e Feriados Registrados em {anoLetivo} ({listaEventos.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            Ordenados cronologicamente
          </span>
        </div>

        {listaEventos.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            Nenhum feriado ou evento registrado para este ano.
          </div>
        ) : (
          <div className="max-h-[260px] overflow-y-auto divide-y divide-border/30">
            {listaEventos.map((ev) => (
              <div
                key={ev.data}
                className="px-4 py-2 flex items-center justify-between hover:bg-muted/30 transition-colors text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground font-semibold w-24">
                    {formatarDataBR(ev.data)}
                  </span>
                  <div>{getTipoBadge(ev.tipo)}</div>
                  <span className="text-foreground font-medium">{ev.descricao}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-semibold ${
                      ev.letivo ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                    }`}
                  >
                    {ev.letivo ? '• Letivo' : '• Não Letivo'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemover(ev.data)}
                    title="Remover evento"
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
