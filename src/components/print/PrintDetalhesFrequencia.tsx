'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { PrintHeader } from '@/components/print/print-header'

export interface FrequenciaPrintData {
  data: string
  escolaNome: string
  escolaLogoUrl?: string | null
  totalTurmas: number
  turmasComFrequencia: number
  totalPresencasGeral: number
  totalFaltasGeral: number
  percentualPresencaGeral: number
  turmas: Array<{
    turmaId: string
    turmaNome: string
    turno: string | null
    totalAlunos: number
    statusTurma: 'completa' | 'parcial' | 'pendente'
    materiasLancadasCount: number
    materiasTotalCount: number
    materias: Array<{
      materiaId: string | null
      materiaNome: string
      professorNome?: string | null
      totalAlunosFrequencia: number
      presencas: number
      faltas: number
      percentualPresenca: number
      status: 'lancada' | 'pendente'
      horarioLancamento?: string | null
    }>
  }>
}

interface PrintDetalhesFrequenciaProps {
  data: FrequenciaPrintData | null
}

export function PrintDetalhesFrequencia({ data }: PrintDetalhesFrequenciaProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!data || !mounted) return null

  // Formata a data para formato amigável DD/MM/YYYY
  const [ano, mes, dia] = data.data.split('-')
  const dataFormatada = `${dia}/${mes}/${ano}`

  return createPortal(
    <div className="print-portal-container hidden print:block bg-white text-black font-sans p-4">
      <style>{`
        @media print {
          body > *:not(.print-portal-container) {
            display: none !important;
          }
          .print-portal-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            color: black !important;
            display: block !important;
            z-index: 99999 !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Cabeçalho Oficial do Documento */}
      <PrintHeader
        escolaNome={data.escolaNome}
        escolaLogoUrl={data.escolaLogoUrl ?? undefined}
        docTitulo="RELATÓRIO DE FREQUÊNCIA DIÁRIA POR TURMA E DISCIPLINA"
        docSubtitulo={`Data de Referência: ${dataFormatada}`}
      />

      {/* Resumo de Indicadores em Blocos Imprimíveis */}
      <div className="grid grid-cols-5 gap-3 mb-4 text-center text-xs">
        <div className="border border-gray-400 p-2 rounded bg-gray-50">
          <p className="font-semibold text-gray-600 text-[10px] uppercase">Data</p>
          <p className="font-bold text-sm text-gray-900">{dataFormatada}</p>
        </div>
        <div className="border border-gray-400 p-2 rounded bg-gray-50">
          <p className="font-semibold text-gray-600 text-[10px] uppercase">Turmas Registradas</p>
          <p className="font-bold text-sm text-gray-900">{data.turmasComFrequencia} / {data.totalTurmas}</p>
        </div>
        <div className="border border-gray-400 p-2 rounded bg-gray-50">
          <p className="font-semibold text-gray-600 text-[10px] uppercase">Total Presenças</p>
          <p className="font-bold text-sm text-emerald-800">{data.totalPresencasGeral}</p>
        </div>
        <div className="border border-gray-400 p-2 rounded bg-gray-50">
          <p className="font-semibold text-gray-600 text-[10px] uppercase">Total Faltas</p>
          <p className="font-bold text-sm text-red-800">{data.totalFaltasGeral}</p>
        </div>
        <div className="border border-gray-400 p-2 rounded bg-gray-50">
          <p className="font-semibold text-gray-600 text-[10px] uppercase">% Presença Geral</p>
          <p className="font-bold text-sm text-gray-900">{data.percentualPresencaGeral}%</p>
        </div>
      </div>

      {/* Tabela Geral por Turma e Disciplina */}
      <div className="space-y-4">
        {data.turmas.map((turma) => (
          <div key={turma.turmaId} className="border border-gray-400 rounded overflow-hidden page-break-inside-avoid mb-3">
            {/* Header da Turma */}
            <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-400 flex items-center justify-between font-bold text-xs">
              <div className="flex items-center gap-3">
                <span className="uppercase text-gray-900">Turma: {turma.turmaNome}</span>
                {turma.turno && (
                  <span className="text-[10px] font-normal text-gray-700">({turma.turno})</span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[10px] font-semibold text-gray-700">
                <span>Alunos: {turma.totalAlunos}</span>
                <span>
                  Status:{' '}
                  {turma.statusTurma === 'completa'
                    ? 'COMPLETA'
                    : turma.statusTurma === 'parcial'
                    ? 'PARCIAL'
                    : 'PENDENTE'}
                </span>
              </div>
            </div>

            {/* Tabela de Matérias da Turma */}
            {turma.materias.length === 0 ? (
              <p className="p-2 text-[10px] text-gray-500 italic">Sem matérias/disciplinas cadastradas para esta turma.</p>
            ) : (
              <table className="w-full text-[10px] text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-300 font-semibold text-gray-700">
                    <th className="py-1 px-2 border-r border-gray-300">Disciplina</th>
                    <th className="py-1 px-2 border-r border-gray-300">Professor</th>
                    <th className="py-1 px-2 text-center border-r border-gray-300">Status</th>
                    <th className="py-1 px-2 text-center border-r border-gray-300">Presenças</th>
                    <th className="py-1 px-2 text-center border-r border-gray-300">Faltas</th>
                    <th className="py-1 px-2 text-center border-r border-gray-300">% Presença</th>
                    <th className="py-1 px-2 text-center">Horário Lançamento</th>
                  </tr>
                </thead>
                <tbody>
                  {turma.materias.map((mat, idx) => (
                    <tr key={mat.materiaId || `mat-${idx}`} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-1 px-2 font-medium border-r border-gray-200">{mat.materiaNome}</td>
                      <td className="py-1 px-2 text-gray-600 border-r border-gray-200">{mat.professorNome ?? '-'}</td>
                      <td className="py-1 px-2 text-center border-r border-gray-200">
                        {mat.status === 'lancada' ? (
                          <span className="font-bold text-emerald-800">LANÇADA</span>
                        ) : (
                          <span className="font-bold text-amber-800">PENDENTE</span>
                        )}
                      </td>
                      <td className="py-1 px-2 text-center font-semibold text-emerald-800 border-r border-gray-200">
                        {mat.presencas}
                      </td>
                      <td className="py-1 px-2 text-center font-semibold text-red-800 border-r border-gray-200">
                        {mat.faltas}
                      </td>
                      <td className="py-1 px-2 text-center font-bold border-r border-gray-200">
                        {mat.status === 'lancada' ? `${mat.percentualPresenca}%` : '-'}
                      </td>
                      <td className="py-1 px-2 text-center text-gray-600">
                        {mat.horarioLancamento ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {/* Rodapé de Emissão */}
      <div className="mt-6 pt-3 border-t border-gray-300 text-[9px] text-gray-500 flex justify-between items-center">
        <span>Sistema de Gestão Escolar (SIG) — Relatório Oficial de Frequência</span>
        <span>Impresso em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</span>
      </div>
    </div>,
    document.body
  )
}

