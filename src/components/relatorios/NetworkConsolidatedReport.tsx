'use client'

import React from 'react'
import { TrendingUp, Users, AlertTriangle, Trophy, BarChart3 } from 'lucide-react'
import { EscolaDesempenho } from '@/hooks/useRelatorioNotas'

interface NetworkConsolidatedReportProps {
  escolasDesempenho: EscolaDesempenho[]
  mediaRede: number | null
  taxaAprovados: number
  taxaRisco: number
  loading: boolean
}

export function NetworkConsolidatedReport({
  escolasDesempenho,
  mediaRede,
  taxaAprovados,
  taxaRisco,
  loading
}: NetworkConsolidatedReportProps) {
  
  if (loading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-muted-foreground animate-pulse">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-sm font-semibold">Carregando dados consolidados da rede...</span>
      </div>
    )
  }

  // Ordenar escolas para o ranking (Top 5)
  const rankingEscolas = [...escolasDesempenho]
    .filter((e) => e.mediaGeral !== null)
    .sort((a, b) => (b.mediaGeral || 0) - (a.mediaGeral || 0))
    .slice(0, 5)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Indicadores Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Média Geral */}
        <div className="relative overflow-hidden bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Média Geral da Rede</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {mediaRede !== null ? `${mediaRede.toFixed(1)} / 10` : 'Sem dados'}
            </p>
            <span className="text-[10px] text-muted-foreground">Média aritmética municipal</span>
          </div>
        </div>

        {/* KPI 2: Taxa de Aprovação */}
        <div className="relative overflow-hidden bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Taxa Geral de Aprovação</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {taxaAprovados > 0 ? `${taxaAprovados}%` : '-%'}
            </p>
            <span className="text-[10px] text-emerald-400 font-semibold">Média final &gt;= 5.0</span>
          </div>
        </div>

        {/* KPI 3: Alunos em Risco */}
        <div className="relative overflow-hidden bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Alunos em Risco / Recuperação</p>
            <p className="text-2xl font-black text-rose-400 mt-1">
              {taxaRisco > 0 ? `${taxaRisco}%` : '-%'}
            </p>
            <span className="text-[10px] text-rose-400 font-semibold">Média final &lt; 5.0</span>
          </div>
        </div>

        {/* KPI 4: Escolas Integradas */}
        <div className="relative overflow-hidden bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-500/10 rounded-xl">
            <Users className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Escolas Conectadas</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {escolasDesempenho.length}
            </p>
            <span className="text-[10px] text-muted-foreground">Unidades escolares ativas</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel do Top 5 Ranking */}
        <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" /> Top 5 Escolas da Rede
            </h3>
            {rankingEscolas.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground italic">
                Nenhum ranking disponível no momento.
              </div>
            ) : (
              <div className="space-y-3.5">
                {rankingEscolas.map((esc, index) => (
                  <div key={esc.id} className="flex items-center justify-between p-2.5 bg-surface-1/50 border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        index === 0 ? 'bg-yellow-500/25 text-yellow-400 border border-yellow-500/30' :
                        index === 1 ? 'bg-slate-400/25 text-slate-300 border border-slate-400/30' :
                        index === 2 ? 'bg-amber-600/25 text-amber-500 border border-amber-600/30' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                        {esc.nome}
                      </span>
                    </div>
                    <span className="text-xs font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-lg">
                      {esc.mediaGeral?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Desempenho Visual (Barras customizadas em Tailwind) */}
        <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            Desempenho Médio Comparado por Escola
          </h3>
          {escolasDesempenho.length === 0 ? (
            <div className="text-center py-16 text-xs text-muted-foreground italic">
              Nenhuma escola cadastrada.
            </div>
          ) : (
            <div className="space-y-4">
              {escolasDesempenho.map((esc) => {
                const percent = esc.mediaGeral ? (esc.mediaGeral / 10) * 100 : 0
                return (
                  <div key={esc.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground truncate max-w-[200px]">{esc.nome}</span>
                      <span className="text-muted-foreground font-mono">
                        Média: <strong className="text-primary">{esc.mediaGeral !== null ? esc.mediaGeral.toFixed(1) : '-'}</strong>
                      </span>
                    </div>
                    <div className="w-full h-3 bg-surface-1 rounded-full overflow-hidden border border-border/60">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent >= 70 ? 'bg-emerald-500' :
                          percent >= 50 ? 'bg-primary' : 'bg-rose-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Escolas Completa */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
          Resumo Pedagógico da Rede
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted-foreground">
            <thead className="bg-surface-1 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-3.5 rounded-l-xl">Unidade Escolar</th>
                <th className="p-3.5">Matriculados</th>
                <th className="p-3.5">Turmas</th>
                <th className="p-3.5">Média Notas</th>
                <th className="p-3.5">Aprovados (%)</th>
                <th className="p-3.5 rounded-r-xl text-right">Risco / Em Recuperação (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {escolasDesempenho.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                    Nenhuma escola cadastrada no banco de dados.
                  </td>
                </tr>
              ) : (
                escolasDesempenho.map((esc) => {
                  const aprovPercent = esc.totalAlunos > 0 ? ((esc.alunosAprovados / esc.totalAlunos) * 100) : 0
                  const riscoPercent = esc.totalAlunos > 0 ? ((esc.alunosRisco / esc.totalAlunos) * 100) : 0
                  return (
                    <tr key={esc.id} className="hover:bg-hoverCustom transition-colors">
                      <td className="p-3.5 font-bold text-foreground">{esc.nome}</td>
                      <td className="p-3.5 font-mono">{esc.totalAlunos}</td>
                      <td className="p-3.5 font-mono">{esc.totalTurmas}</td>
                      <td className="p-3.5 font-mono font-bold text-primary">
                        {esc.mediaGeral !== null ? esc.mediaGeral.toFixed(1) : '-'}
                      </td>
                      <td className="p-3.5 font-mono text-emerald-400 font-semibold">
                        {aprovPercent.toFixed(1)}%
                      </td>
                      <td className="p-3.5 font-mono text-rose-400 font-semibold text-right">
                        {riscoPercent.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
