'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { CalendarioAcademicoDados } from '@/hooks/useCalendarioAcademico'
import { Calendar, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'

interface TrimestresSectionProps {
  dados: CalendarioAcademicoDados
  setCampo: (campo: keyof CalendarioAcademicoDados, valor: any) => void
  calculoDias: {
    t1: number
    t2: number
    t3: number
    total: number
    meta: number
    atingiuMeta: boolean
    totalSabadosLetivos: number
    totalFeriadosEmDiasUteis: number
    totalPontosFacultativos: number
  }
}

export function TrimestresSection({ dados, setCampo, calculoDias }: TrimestresSectionProps) {
  return (
    <div className="space-y-4">
      {/* Placar de Dias Letivos (LDB) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">1º Trimestre</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
              {calculoDias.t1} dias letivos
            </span>
          </div>
          <p className="text-xs text-muted-foreground/80 mt-1">Início do ano letivo regular</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">2º Trimestre</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
              {calculoDias.t2} dias letivos
            </span>
          </div>
          <p className="text-xs text-muted-foreground/80 mt-1">Intercalado com recesso junino</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">3º Trimestre</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
              {calculoDias.t3} dias letivos
            </span>
          </div>
          <p className="text-xs text-muted-foreground/80 mt-1">Reta final e conselhos</p>
        </div>

        <div
          className={`border rounded-xl p-3 flex flex-col justify-between shadow-xs ${
            calculoDias.atingiuMeta
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5">
              {calculoDias.atingiuMeta ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              )}
              Total LDB
            </span>
            <span className="text-sm font-black">
              {calculoDias.total} / {calculoDias.meta}
            </span>
          </div>
          <p className="text-[11px] opacity-90 mt-1">
            {calculoDias.atingiuMeta
              ? 'Meta da LDB cumprida (mín. 200 dias)'
              : `Abaixo da meta legal (${calculoDias.meta - calculoDias.total} dias restantes)`}
          </p>
        </div>
      </div>

      {/* Grade de Configuração de Trimestres e Recessos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1º Trimestre */}
        <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              1º Trimestre
            </h4>
            <span className="text-[11px] text-muted-foreground font-semibold">{calculoDias.t1} dias</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Início</label>
              <Input
                type="date"
                value={dados.trimestre1_inicio || ''}
                onChange={(e) => setCampo('trimestre1_inicio', e.target.value || null)}
                className="h-8 text-xs bg-background border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Término</label>
              <Input
                type="date"
                value={dados.trimestre1_fim || ''}
                onChange={(e) => setCampo('trimestre1_fim', e.target.value || null)}
                className="h-8 text-xs bg-background border-border text-foreground"
              />
            </div>
          </div>
        </div>

        {/* 2º Trimestre */}
        <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              2º Trimestre
            </h4>
            <span className="text-[11px] text-muted-foreground font-semibold">{calculoDias.t2} dias</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Início</label>
              <Input
                type="date"
                value={dados.trimestre2_inicio || ''}
                onChange={(e) => setCampo('trimestre2_inicio', e.target.value || null)}
                className="h-8 text-xs bg-background border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Término</label>
              <Input
                type="date"
                value={dados.trimestre2_fim || ''}
                onChange={(e) => setCampo('trimestre2_fim', e.target.value || null)}
                className="h-8 text-xs bg-background border-border text-foreground"
              />
            </div>
          </div>
        </div>

        {/* 3º Trimestre */}
        <div className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              3º Trimestre
            </h4>
            <span className="text-[11px] text-muted-foreground font-semibold">{calculoDias.t3} dias</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Início</label>
              <Input
                type="date"
                value={dados.trimestre3_inicio || ''}
                onChange={(e) => setCampo('trimestre3_inicio', e.target.value || null)}
                className="h-8 text-xs bg-background border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Término</label>
              <Input
                type="date"
                value={dados.trimestre3_fim || ''}
                onChange={(e) => setCampo('trimestre3_fim', e.target.value || null)}
                className="h-8 text-xs bg-background border-border text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recessos Oficiais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 space-y-2 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Recesso Escolar Junino (São João)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Início do Recesso</label>
              <Input
                type="date"
                value={dados.recesso_junino_inicio || ''}
                onChange={(e) => setCampo('recesso_junino_inicio', e.target.value || null)}
                className="h-7 text-xs bg-background border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Fim do Recesso</label>
              <Input
                type="date"
                value={dados.recesso_junino_fim || ''}
                onChange={(e) => setCampo('recesso_junino_fim', e.target.value || null)}
                className="h-7 text-xs bg-background border-border text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 space-y-2 shadow-xs">
          <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Recesso de Fim de Ano & Férias
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Início</label>
              <Input
                type="date"
                value={dados.recesso_fim_ano_inicio || ''}
                onChange={(e) => setCampo('recesso_fim_ano_inicio', e.target.value || null)}
                className="h-7 text-xs bg-background border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-0.5">Término</label>
              <Input
                type="date"
                value={dados.recesso_fim_ano_fim || ''}
                onChange={(e) => setCampo('recesso_fim_ano_fim', e.target.value || null)}
                className="h-7 text-xs bg-background border-border text-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
