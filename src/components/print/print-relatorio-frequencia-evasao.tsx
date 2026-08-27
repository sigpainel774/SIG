'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

export interface AlunoFrequenciaPrint {
  id: string
  nome: string
  turma_nome: string
  serie?: string
  total_aulas: number
  total_presencas: number
  total_faltas: number
  percentual_frequencia: number
  status_risco: 'critico' | 'alerta' | 'regular'
  responsavel_nome?: string
  responsavel_telefone?: string
}

export interface ResumoFrequenciaPrint {
  total_alunos: number
  frequencia_media: number
  total_criticos: number
  total_alerta: number
  total_regulares: number
}

interface PrintRelatorioFrequenciaEvasaoProps {
  escolaNome?: string | null
  periodoLabel: string
  turmaNome?: string
  statusFiltro?: string
  resumo: ResumoFrequenciaPrint
  alunos: AlunoFrequenciaPrint[]
  onClose: () => void
}

export function PrintRelatorioFrequenciaEvasao({
  escolaNome,
  periodoLabel,
  turmaNome,
  statusFiltro = 'Todos',
  resumo,
  alunos,
  onClose,
}: PrintRelatorioFrequenciaEvasaoProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const handlePrint = () => {
    window.dispatchEvent(new Event('beforeprint'))
    setTimeout(() => {
      window.print()
    }, 200)
  }

  if (!mounted) return null

  const legendaEscola = escolaNome ?? 'Rede Municipal de Ensino (Todas as Unidades)'
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#09090b]/95 flex flex-col items-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible">
      {/* Estilos CSS específicos para Impressão */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm 12mm 10mm;
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-card {
            border: 1px solid #d1d5db !important;
            background-color: #f9fafb !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>

      {/* Barra de Ações Superior (Não impressa) */}
      <div className="no-print w-full max-w-[210mm] bg-[#18181b] border border-[#27272a] rounded-2xl p-4 mb-5 shadow-2xl flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Relatório de Frequência & Evasão Escolar
            </h2>
            <p className="text-xs text-zinc-400">
              {legendaEscola} • Período: {periodoLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 hover:text-white rounded-xl gap-2 text-xs font-semibold cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Fechar / Voltar</span>
          </Button>

          <Button
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 text-xs font-bold shadow-lg cursor-pointer px-5"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Agora</span>
          </Button>
        </div>
      </div>

      {/* Folha A4 para Impressão */}
      <div className="bg-white text-black p-8 sm:p-10 rounded-2xl shadow-2xl print:shadow-none print:rounded-none max-w-[210mm] w-full min-h-[297mm] flex flex-col justify-between">
        <div>
          {/* Cabeçalho Oficial */}
          <PrintHeader
            escolaNome={escolaNome ?? undefined}
            docTitulo="RELATÓRIO DE FREQUÊNCIA, ASSIDUIDADE & ALERTA DE EVASÃO"
            docSubtitulo={`Acompanhamento Nominal e Estatístico • Período: ${periodoLabel}`}
          />

          {/* Metadados e Filtros Aplicados */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] mb-5">
            <div>
              <span className="font-bold text-zinc-700">Unidade Escolar:</span>{' '}
              <span className="text-zinc-900">{legendaEscola}</span>
            </div>
            <div>
              <span className="font-bold text-zinc-700">Turma / Filtro:</span>{' '}
              <span className="text-zinc-900">{turmaNome || 'Todas as Turmas'}</span>
            </div>
            <div>
              <span className="font-bold text-zinc-700">Emissão em:</span>{' '}
              <span className="text-zinc-900">{dataHoje}</span>
            </div>
          </div>

          {/* Quadro Resumo Estatístico */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Total de Alunos</div>
              <div className="text-lg font-black text-zinc-900 mt-0.5">{resumo.total_alunos}</div>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Frequência Média</div>
              <div className="text-lg font-black text-blue-900 mt-0.5">{resumo.frequencia_media.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Risco Crítico (&lt;75%)</div>
              <div className="text-lg font-black text-rose-700 mt-0.5">{resumo.total_criticos}</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Alerta (75-85%)</div>
              <div className="text-lg font-black text-amber-700 mt-0.5">{resumo.total_alerta}</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Regulares (&gt;85%)</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">{resumo.total_regulares}</div>
            </div>
          </div>

          {/* Tabela Nominal */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-300 pb-1 mb-2">
              Relação de Alunos ({alunos.length} registros)
            </h3>

            {alunos.length === 0 ? (
              <div className="text-center p-6 text-xs text-zinc-500 italic bg-zinc-50 rounded-lg border border-zinc-200">
                Nenhum registro de frequência encontrado para os filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-left text-[11px] border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700">
                    <th className="p-2 font-bold w-8 text-center">Nº</th>
                    <th className="p-2 font-bold">Nome do Aluno</th>
                    <th className="p-2 font-bold">Turma / Série</th>
                    <th className="p-2 font-bold text-center">Aulas</th>
                    <th className="p-2 font-bold text-center">Presenças</th>
                    <th className="p-2 font-bold text-center">Faltas</th>
                    <th className="p-2 font-bold text-center">% Freq.</th>
                    <th className="p-2 font-bold text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {alunos.map((aluno, index) => {
                    const isCritico = aluno.status_risco === 'critico'
                    const isAlerta = aluno.status_risco === 'alerta'

                    return (
                      <tr
                        key={aluno.id}
                        className={`print-break-inside-avoid ${
                          isCritico ? 'bg-rose-50/40' : isAlerta ? 'bg-amber-50/30' : 'even:bg-zinc-50/50'
                        }`}
                      >
                        <td className="p-2 text-center text-zinc-500 font-mono text-[10px]">{index + 1}</td>
                        <td className="p-2 font-semibold text-zinc-900">
                          {aluno.nome}
                          {aluno.responsavel_nome && (
                            <span className="block text-[9px] text-zinc-500 font-normal">
                              Resp: {aluno.responsavel_nome} {aluno.responsavel_telefone ? `(${aluno.responsavel_telefone})` : ''}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-zinc-700">{aluno.turma_nome} {aluno.serie ? `• ${aluno.serie}` : ''}</td>
                        <td className="p-2 text-center text-zinc-700">{aluno.total_aulas}</td>
                        <td className="p-2 text-center text-emerald-700 font-medium">{aluno.total_presencas}</td>
                        <td className="p-2 text-center text-rose-700 font-medium">{aluno.total_faltas}</td>
                        <td className="p-2 text-center font-bold">
                          <span
                            className={
                              isCritico ? 'text-rose-700' : isAlerta ? 'text-amber-700' : 'text-emerald-700'
                            }
                          >
                            {aluno.percentual_frequencia.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              isCritico
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isAlerta
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {isCritico ? 'Risco Crítico' : isAlerta ? 'Alerta' : 'Regular'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Parecer / Nota Legal LDB */}
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-[10px] text-zinc-600 leading-relaxed mb-6 print-break-inside-avoid">
            <strong>Fundamentação Legal (LDB nº 9.394/96, Art. 24, Inciso VI):</strong> O controle de frequência fica a cargo da escola, exigida a frequência mínima de 75% do total de horas letivas para aprovação. Alunos em situação de <em>Risco Crítico</em> devem ser objeto de intervenção pedagógica imediata e notificação ao Conselho Tutelar conforme protocolo de infrequência escolar.
          </div>
        </div>

        {/* Assinaturas Oficiais */}
        <div className="pt-8 border-t border-zinc-300 grid grid-cols-2 gap-12 text-center text-xs text-zinc-800 print-break-inside-avoid">
          <div>
            <div className="border-t border-zinc-800 w-48 mx-auto mb-1" />
            <p className="font-bold">Coordenação Pedagógica</p>
            <p className="text-[10px] text-zinc-500">Responsável pelo Acompanhamento</p>
          </div>
          <div>
            <div className="border-t border-zinc-800 w-48 mx-auto mb-1" />
            <p className="font-bold">Direção Escolar</p>
            <p className="text-[10px] text-zinc-500">Visto da Unidade de Ensino</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
