'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Printer, GraduationCap, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PrintHeader } from '@/components/print/print-header'

export interface TurmaVagasPrint {
  id: string
  escola_nome: string
  turma_nome: string
  serie_etapa: string
  turno: string
  capacidade: number
  matriculados: number
  vagas_livres: number
  taxa_ocupacao: number
  status_lotacao: 'livre' | 'ideal' | 'limite' | 'lotada'
}

export interface ModalidadeBreakdownPrint {
  modalidade: string
  total_alunos: number
  percentual: number
}

export interface ResumoMatriculasVagasPrint {
  total_matriculados: number
  capacidade_total: number
  taxa_ocupacao_geral: number
  vagas_disponiveis: number
  total_turmas: number
  turmas_lotadas: number
}

interface PrintRelatorioMatriculasVagasProps {
  escolaNome?: string | null
  resumo: ResumoMatriculasVagasPrint
  turmas: TurmaVagasPrint[]
  modalidades: ModalidadeBreakdownPrint[]
  onClose: () => void
}

export function PrintRelatorioMatriculasVagas({
  escolaNome,
  resumo,
  turmas,
  modalidades,
  onClose,
}: PrintRelatorioMatriculasVagasProps) {
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

  const legendaEscola = escolaNome ?? 'Rede Municipal de Ensino (Censo Consolidado de Unidades)'
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
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Relatório de Matrículas & Ocupação de Vagas
            </h2>
            <p className="text-xs text-zinc-400">
              {legendaEscola} • Ano Letivo Vigente
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
            docTitulo="CENSO ESCOLAR • QUADRO DE MATRÍCULAS E OCUPAÇÃO DE VAGAS"
            docSubtitulo="Demonstrativo de Capacidade Instalada e Alunos Ativos"
          />

          {/* Metadados */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] mb-5">
            <div>
              <span className="font-bold text-zinc-700">Âmbito / Unidade:</span>{' '}
              <span className="text-zinc-900">{legendaEscola}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-zinc-700">Data de Emissão:</span>{' '}
              <span className="text-zinc-900">{dataHoje}</span>
            </div>
          </div>

          {/* Quadro Resumo Geral */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Matriculados</div>
              <div className="text-lg font-black text-zinc-900 mt-0.5">{resumo.total_matriculados}</div>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Capacidade Total</div>
              <div className="text-lg font-black text-zinc-900 mt-0.5">{resumo.capacidade_total}</div>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Taxa Ocupação</div>
              <div className="text-lg font-black text-blue-900 mt-0.5">{resumo.taxa_ocupacao_geral.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Vagas Livres</div>
              <div className="text-lg font-black text-emerald-700 mt-0.5">{resumo.vagas_disponiveis}</div>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Turmas Lotadas</div>
              <div className="text-lg font-black text-rose-700 mt-0.5">{resumo.turmas_lotadas} / {resumo.total_turmas}</div>
            </div>
          </div>

          {/* Distribuição por Modalidade */}
          {modalidades.length > 0 && (
            <div className="mb-6 print-break-inside-avoid">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-300 pb-1 mb-2">
                Distribuição por Modalidade de Ensino
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {modalidades.map((m) => (
                  <div key={m.modalidade} className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <div className="text-[10px] font-bold text-zinc-600 truncate">{m.modalidade}</div>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-sm font-black text-zinc-900">{m.total_alunos} alunos</span>
                      <span className="text-[10px] font-semibold text-zinc-500">{m.percentual.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabela de Vagas por Turma */}
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 border-b border-zinc-300 pb-1 mb-2">
              Detalhamento de Vagas por Turma ({turmas.length} turmas)
            </h3>

            {turmas.length === 0 ? (
              <div className="text-center p-6 text-xs text-zinc-500 italic bg-zinc-50 rounded-lg border border-zinc-200">
                Nenhuma turma cadastrada no escopo selecionado.
              </div>
            ) : (
              <table className="w-full text-left text-[11px] border border-zinc-200">
                <thead>
                  <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700">
                    <th className="p-2 font-bold w-8 text-center">Nº</th>
                    {!escolaNome && <th className="p-2 font-bold">Escola</th>}
                    <th className="p-2 font-bold">Turma</th>
                    <th className="p-2 font-bold">Etapa / Série</th>
                    <th className="p-2 font-bold text-center">Turno</th>
                    <th className="p-2 font-bold text-center">Capacidade</th>
                    <th className="p-2 font-bold text-center">Matriculados</th>
                    <th className="p-2 font-bold text-center">Vagas Livres</th>
                    <th className="p-2 font-bold text-center">% Ocupação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {turmas.map((t, index) => {
                    const isLotada = t.status_lotacao === 'lotada'
                    const isLimite = t.status_lotacao === 'limite'

                    return (
                      <tr
                        key={t.id}
                        className={`print-break-inside-avoid ${
                          isLotada ? 'bg-rose-50/40' : isLimite ? 'bg-amber-50/30' : 'even:bg-zinc-50/50'
                        }`}
                      >
                        <td className="p-2 text-center text-zinc-500 font-mono text-[10px]">{index + 1}</td>
                        {!escolaNome && <td className="p-2 text-zinc-700 max-w-[150px] truncate">{t.escola_nome}</td>}
                        <td className="p-2 font-bold text-zinc-900">{t.turma_nome}</td>
                        <td className="p-2 text-zinc-700">{t.serie_etapa}</td>
                        <td className="p-2 text-center text-zinc-600">{t.turno}</td>
                        <td className="p-2 text-center font-semibold text-zinc-800">{t.capacidade}</td>
                        <td className="p-2 text-center font-bold text-zinc-900">{t.matriculados}</td>
                        <td className="p-2 text-center font-bold text-emerald-700">
                          {t.vagas_livres > 0 ? t.vagas_livres : 0}
                        </td>
                        <td className="p-2 text-center font-black">
                          <span
                            className={
                              isLotada ? 'text-rose-700' : isLimite ? 'text-amber-700' : 'text-blue-700'
                            }
                          >
                            {t.taxa_ocupacao.toFixed(0)}%
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
            <p className="font-bold">Secretaria Escolar</p>
            <p className="text-[10px] text-zinc-500">Responsável pelo Censo</p>
          </div>
          <div>
            <div className="border-t border-zinc-800 w-48 mx-auto mb-1" />
            <p className="font-bold">Direção Geral</p>
            <p className="text-[10px] text-zinc-500">Visto da Administração</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
