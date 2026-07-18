'use client'

import React from 'react'
import { TrendingUp, Users, AlertTriangle, Trophy, BarChart3, CalendarCheck } from 'lucide-react'
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

  // Calcular média geral de assiduidade na rede
  const escolasComAssiduidade = escolasDesempenho.filter((e) => e.taxaAssiduidade !== null)
  const assiduidadeRede = escolasComAssiduidade.length > 0
    ? parseFloat((escolasComAssiduidade.reduce((sum, e) => sum + (e.taxaAssiduidade || 0), 0) / escolasComAssiduidade.length).toFixed(1))
    : null

  // Total de alunos sob alerta de evasão na rede
  const totalAlunosEvasao = escolasDesempenho.reduce((sum, e) => sum + (e.alunosEvasao || 0), 0)

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

        {/* KPI 2: Assiduidade Geral */}
        <div className="relative overflow-hidden bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <CalendarCheck className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Assiduidade da Rede</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {assiduidadeRede !== null ? `${assiduidadeRede}%` : 'S/R'}
            </p>
            <span className="text-[10px] text-muted-foreground">Presença geral consolidada</span>
          </div>
        </div>

        {/* KPI 3: Alunos em Evasão */}
        <div className="relative overflow-hidden bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold">Risco de Evasão</p>
            <p className="text-2xl font-black text-rose-400 mt-1">
              {totalAlunosEvasao}
            </p>
            <span className="text-[10px] text-rose-400 font-semibold">Alunos com frequência &lt; 75%</span>
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
            <span className="text-[10px] text-muted-foreground">Unidades de ensino integradas</span>
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

        {/* Gráfico de Desempenho Visual (Barras comparadas) */}
        <div className="bg-card border border-border rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            Desempenho & Assiduidade Comparado
          </h3>
          {escolasDesempenho.length === 0 ? (
            <div className="text-center py-16 text-xs text-muted-foreground italic">
              Nenhuma escola cadastrada.
            </div>
          ) : (
            <div className="space-y-4">
              {escolasDesempenho.map((esc) => {
                const percentNota = esc.mediaGeral ? (esc.mediaGeral / 10) * 100 : 0
                const percentAssid = esc.taxaAssiduidade || 0
                return (
                  <div key={esc.id} className="p-3 bg-surface-1/40 border border-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-foreground truncate max-w-[200px]">{esc.nome}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-mono">
                          Média: <strong className="text-primary">{esc.mediaGeral !== null ? esc.mediaGeral.toFixed(1) : '-'}</strong>
                        </span>
                        <span className="text-muted-foreground font-mono">
                          Assiduidade: <strong className="text-emerald-400">{esc.taxaAssiduidade !== null ? `${esc.taxaAssiduidade}%` : 'S/R'}</strong>
                        </span>
                      </div>
                    </div>
                    
                    {/* Barra de Média Notas */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground w-12">Notas</span>
                      <div className="flex-1 h-2 bg-surface-1 rounded-full overflow-hidden border border-border/60">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentNota >= 70 ? 'bg-emerald-500' :
                            percentNota >= 50 ? 'bg-primary' : 'bg-rose-500'
                          }`}
                          style={{ width: `${percentNota}%` }}
                        />
                      </div>
                    </div>

                    {/* Barra de Frequência */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground w-12">Presença</span>
                      <div className="flex-1 h-2 bg-surface-1 rounded-full overflow-hidden border border-border/60">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentAssid >= 75 ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${percentAssid}%` }}
                        />
                      </div>
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
          Resumo Pedagógico & Assiduidade da Rede
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted-foreground">
            <thead className="bg-surface-1 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-3.5 rounded-l-xl">Unidade Escolar</th>
                <th className="p-3.5">Matriculados</th>
                <th className="p-3.5">Turmas</th>
                <th className="p-3.5">Média Notas</th>
                <th className="p-3.5">Assiduidade (%)</th>
                <th className="p-3.5">Alunos em Risco de Evasão</th>
                <th className="p-3.5 rounded-r-xl text-right">Risco / Em Recuperação (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {escolasDesempenho.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                    Nenhuma escola cadastrada no banco de dados.
                  </td>
                </tr>
              ) : (
                escolasDesempenho.map((esc) => {
                  const riscoPercent = esc.totalAlunos > 0 ? ((esc.alunosRisco / esc.totalAlunos) * 100) : 0
                  return (
                    <tr key={esc.id} className="hover:bg-hoverCustom transition-colors">
                      <td className="p-3.5 font-bold text-foreground">{esc.nome}</td>
                      <td className="p-3.5 font-mono">{esc.totalAlunos}</td>
                      <td className="p-3.5 font-mono">{esc.totalTurmas}</td>
                      <td className="p-3.5 font-mono font-bold text-primary">
                        {esc.mediaGeral !== null ? esc.mediaGeral.toFixed(1) : '-'}
                      </td>
                      <td className={`p-3.5 font-mono font-semibold ${
                        esc.taxaAssiduidade === null ? 'text-muted-foreground' :
                        esc.taxaAssiduidade >= 75 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {esc.taxaAssiduidade !== null ? `${esc.taxaAssiduidade}%` : 'S/R'}
                      </td>
                      <td className={`p-3.5 font-mono font-semibold ${
                        esc.alunosEvasao > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {esc.alunosEvasao > 0 ? (
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                            {esc.alunosEvasao} aluno(s)
                          </span>
                        ) : (
                          'Nenhum'
                        )}
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
