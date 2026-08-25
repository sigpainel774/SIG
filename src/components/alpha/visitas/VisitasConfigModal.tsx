'use client'

import React, { useState, useEffect } from 'react'
import {
  Sliders,
  Clock,
  MapPin,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import {
  obterVisitasConfig,
  salvarVisitasConfig,
  VisitasConfig,
  DEFAULT_VISITAS_CONFIG,
} from '@/lib/visitas/visitasConfigService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VisitasConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSalvo?: (config: VisitasConfig) => void
}

export function VisitasConfigModal({ open, onOpenChange, onSalvo }: VisitasConfigModalProps) {
  const [tempoMinimo, setTempoMinimo] = useState<number>(DEFAULT_VISITAS_CONFIG.tempoMinimoSegundos)
  const [raioTolerancia, setRaioTolerancia] = useState<number>(DEFAULT_VISITAS_CONFIG.raioToleranciaMetros)
  const [fusaoMinutos, setFusaoMinutos] = useState<number>(DEFAULT_VISITAS_CONFIG.fusaoMinutos)

  useEffect(() => {
    if (open) {
      const cfg = obterVisitasConfig()
      setTempoMinimo(cfg.tempoMinimoSegundos)
      setRaioTolerancia(cfg.raioToleranciaMetros)
      setFusaoMinutos(cfg.fusaoMinutos)
    }
  }, [open])

  const handleSalvar = () => {
    const salva = salvarVisitasConfig({
      tempoMinimoSegundos: tempoMinimo,
      raioToleranciaMetros: raioTolerancia,
      fusaoMinutos: fusaoMinutos,
    })
    toast.success('Parâmetros de telemetria e visitas salvos no dispositivo!')
    if (onSalvo) onSalvo(salva)
    onOpenChange(false)
  }

  const handleRestaurarPadroes = () => {
    setTempoMinimo(DEFAULT_VISITAS_CONFIG.tempoMinimoSegundos)
    setRaioTolerancia(DEFAULT_VISITAS_CONFIG.raioToleranciaMetros)
    setFusaoMinutos(DEFAULT_VISITAS_CONFIG.fusaoMinutos)
    toast.info('Valores padrão restaurados.')
  }

  const formatarTempo = (segundos: number) => {
    if (segundos < 60) return `${segundos} segundos`
    const min = Math.floor(segundos / 60)
    const resto = segundos % 60
    return resto > 0 ? `${min} min e ${resto}s` : `${min} minuto${min > 1 ? 's' : ''}`
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configurações de Telemetria & Visitas"
      description="Calibração de sensibilidade do GPS e regras anti-duplicação de residências."
      maxWidth="sm:max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestaurarPadroes}
            className="rounded-xl text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Padrão</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvar}
              className="rounded-xl text-xs bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1.5 shadow-md shadow-violet-600/30 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Parâmetros</span>
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 py-1 text-slate-200">
        
        {/* ── 1. Tempo Mínimo de Parada ── */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              Tempo Parado para Contabilizar Visita
            </label>
            <span className="text-xs font-extrabold text-violet-400 font-mono bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 rounded-lg">
              {formatarTempo(tempoMinimo)}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tempo contínuo que o profissional deve permanecer no local para o sistema registrar automaticamente uma visita no itinerário.
          </p>

          <input
            type="range"
            min={15}
            max={300}
            step={15}
            value={tempoMinimo}
            onChange={(e) => setTempoMinimo(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />

          {/* Atalhos Rápidos de Tempo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[30, 45, 60, 90, 120, 180, 300].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTempoMinimo(t)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap',
                  tempoMinimo === t
                    ? 'bg-violet-600 text-white font-bold shadow-xs'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/5'
                )}
              >
                {t < 60 ? `${t}s` : `${t / 60}m`}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Raio de Tolerância no Local (Quintal / Cômodos) ── */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Raio de Tolerância no Imóvel (Anti-Duplicação)
            </label>
            <span className="text-xs font-extrabold text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
              {raioTolerancia} metros
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex items-start gap-2 text-[11px] text-emerald-300">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Proteção para quintal e cômodos:</strong> Permite se deslocar (ex: 6 a 20m) dentro da mesma propriedade sem zerar o tempo e sem contar como duas casas diferentes.
            </span>
          </div>

          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={raioTolerancia}
            onChange={(e) => setRaioTolerancia(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />

          {/* Atalhos Rápidos de Raio */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[10, 15, 20, 25, 30, 40, 50].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRaioTolerancia(r)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap',
                  raioTolerancia === r
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/5'
                )}
              >
                {r}m
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. Fusão de Visitas Consecutivas no Mesmo Imóvel ── */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Fusão de Paradas Consecutivas
            </label>
            <span className="text-xs font-extrabold text-sky-400 font-mono bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-lg">
              até {fusaoMinutos} min
            </span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Se você sair brevemente do raio da casa e retornar dentro desta janela de tempo, o sistema acumula a duração na mesma visita.
          </p>

          <div className="flex items-center gap-1.5">
            {[5, 10, 15, 20, 30].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFusaoMinutos(m)}
                className={cn(
                  'flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center',
                  fusaoMinutos === m
                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/5'
                )}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

      </div>
    </StandardDialog>
  )
}
