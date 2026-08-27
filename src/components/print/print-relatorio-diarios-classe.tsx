'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer, BookOpenCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

export interface DocenteDiarioPrint {
  id: string
  professor_nome: string
  escola_nome: string
  turmas_nomes: string
  materias_nomes: string
  aulas_registradas: number
  aulas_previstas: number
  ultima_aula_data: string | null
  ultima_chamada_data: string | null
  dias_sem_registro: number
  status: 'em_dia' | 'alerta' | 'critico'
}

export interface ResumoDiariosPrint {
  total_professores: number
  percentual_em_dia: number
  total_em_dia: number
  total_alerta: number
  total_critico: number
  total_aulas_registradas: number
}

interface PrintRelatorioDiariosClasseProps {
  escolaNome?: string | null
  periodoLabel: string
  resumo: ResumoDiariosPrint
  docentes: DocenteDiarioPrint[]
  onClose: () => void
}

export function PrintRelatorioDiariosClasse({
  escolaNome,
  periodoLabel,
  resumo,
  docentes,
  onClose,
}: PrintRelatorioDiariosClasseProps) {
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

  const legendaEscola = escolaNome ?? 'Rede Municipal de Ensino (Consolidado Docente)'
  const dataHoje = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-[#09090b]/95 flex flex-col items-center p-4 overflow-y-auto print:static print:block print:p-0 print:bg-white print:overflow-visible">
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
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #e5e7eb !important;
          }
        }
      `}</style>

      {/* Barra de Ferramentas Superior */}
      <div className="no-print w-full max-w-[210mm] bg-[#18181b] border border-[#27272a] rounded-2xl p-4 mb-5 shadow-2xl flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <BookOpenCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Relatório de Diários de Classe & Cumprimento Pedagógico
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
            docTitulo="RELATÓRIO DE MONITORAMENTO PEDAGÓGICO • DIÁRIOS DE CLASSE"
            docSubtitulo={`Acompanhamento de Registros de Aulas, BNCC e Frequência • Período: ${periodoLabel}`}
          />

          {/* Metadados */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] mb-5">
            <div>
              <span className="font-bold text-zinc-700">Unidade:</span>{' '}
              <span className="text-zinc-900">{legendaEscola}</span>
            </div>
            <div>
              <span className="font-bold text-zinc-700">Período:</span>{' '}
              <span className="text-zinc-900">{periodoLabel}</span>
            </div>
            <div>
              <span className="font-bold text-zinc-700">Emissão:</span>{' '}
              <span className="text-zinc-900">{dataHoje}</span>
            </div>
          </div>

          {/* Quadro Resumo Geral */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Professores</div>
              <div className="text-lg font-black text-zinc-900 mt-0.5">{resumo.total_professores}</div>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Aulas Registradas</div>
              <div className="text-lg font-black text-blue-900 mt-0.5">{resumo.total_aulas_registradas}</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Em Dia (≤ 3d)</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">{resumo.total_em_dia} ({resumo.percentual_em_dia.toFixed(0)}%)</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Atenção (4-7d)</div>
              <div className="text-lg font-black text-amber-700 mt-0.5">{resumo.total_alerta}</div>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Crítico (&gt; 7d)</div>
              <div className="text-lg font-black text-rose-700 mt-0.5">{resumo.total_critico}</div>
            </div>
          </div>

          {/* Tabela Nominal de Docentes */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-300 pb-1 mb-2">
              Espelho Docente de Preenchimento ({docentes.length} professores)
            </h3>

            {docentes.length === 0 ? (
              <div className="text-center p-6 text-xs text-zinc-500 italic bg-zinc-50 rounded-lg border border-zinc-200">
                Nenhum professor encontrado com atribuição de turmas.
              </div>
            ) : (
              <table className="w-full text-left text-[11px] border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700">
                    <th className="p-2 font-bold w-8 text-center">Nº</th>
                    <th className="p-2 font-bold">Professor(a)</th>
                    {!escolaNome && <th className="p-2 font-bold">Escola</th>}
                    <th className="p-2 font-bold">Turma(s)</th>
                    <th className="p-2 font-bold">Disciplina(s)</th>
                    <th className="p-2 font-bold text-center">Aulas</th>
                    <th className="p-2 font-bold text-center">Último Diário</th>
                    <th className="p-2 font-bold text-center">Última Chamada</th>
                    <th className="p-2 font-bold text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {docentes.map((d, index) => {
                    const isCritico = d.status === 'critico'
                    const isAlerta = d.status === 'alerta'

                    return (
                      <tr
                        key={d.id}
                        className={`print-break-inside-avoid ${
                          isCritico ? 'bg-rose-50/40' : isAlerta ? 'bg-amber-50/30' : 'even:bg-zinc-50/50'
                        }`}
                      >
                        <td className="p-2 text-center text-zinc-500 font-mono text-[10px]">{index + 1}</td>
                        <td className="p-2 font-bold text-zinc-900">{d.professor_nome}</td>
                        {!escolaNome && <td className="p-2 text-zinc-700 max-w-[130px] truncate">{d.escola_nome}</td>}
                        <td className="p-2 text-zinc-700 max-w-[120px] truncate">{d.turmas_nomes}</td>
                        <td className="p-2 text-zinc-700 max-w-[120px] truncate">{d.materias_nomes}</td>
                        <td className="p-2 text-center font-semibold text-zinc-800">{d.aulas_registradas}</td>
                        <td className="p-2 text-center text-zinc-700">
                          {d.ultima_aula_data ? (
                            new Date(d.ultima_aula_data + 'T00:00:00').toLocaleDateString('pt-BR')
                          ) : (
                            <span className="text-rose-600 font-medium italic">Sem registro</span>
                          )}
                        </td>
                        <td className="p-2 text-center text-zinc-700">
                          {d.ultima_chamada_data ? (
                            new Date(d.ultima_chamada_data + 'T00:00:00').toLocaleDateString('pt-BR')
                          ) : (
                            <span className="text-zinc-400 italic">—</span>
                          )}
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
                            {isCritico ? 'Atraso Crítico' : isAlerta ? 'Atenção' : 'Em Dia'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Assinaturas */}
        <div className="pt-8 border-t border-zinc-300 grid grid-cols-2 gap-12 text-center text-xs text-zinc-800 print-break-inside-avoid">
          <div>
            <div className="border-t border-zinc-800 w-48 mx-auto mb-1" />
            <p className="font-bold">Coordenação Pedagógica</p>
            <p className="text-[10px] text-zinc-500">Monitoramento Curricular</p>
          </div>
          <div>
            <div className="border-t border-zinc-800 w-48 mx-auto mb-1" />
            <p className="font-bold">Direção Escolar</p>
            <p className="text-[10px] text-zinc-500">Visto da Administração</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
