'use client'

import React from 'react'

interface PrintBoletimProps {
  nomeAluno: string
  matricula: string
  escola: string
  turma: string
  anoLetivo: string
  notas: {
    disciplina: string
    u1: number | string
    u2: number | string
    u3: number | string
    u4: number | string
    media: number | string
    faltas: number
    situacao: 'Aprovado' | 'Recuperação' | 'Reprovado' | 'Em Andamento'
  }[]
}

export function PrintBoletim({
  nomeAluno = 'João Silva',
  matricula = '2026-00123',
  escola = 'Colégio Dr Eraldo Tinoco',
  turma = '9º Ano A - Matutino',
  anoLetivo = '2026',
  notas = [
    { disciplina: 'Língua Portuguesa', u1: 8.5, u2: 7.0, u3: 9.0, u4: 8.0, media: 8.1, faltas: 2, situacao: 'Aprovado' },
    { disciplina: 'Matemática', u1: 7.5, u2: 8.0, u3: 8.5, u4: 7.5, media: 7.9, faltas: 4, situacao: 'Aprovado' },
    { disciplina: 'História', u1: 9.0, u2: 8.5, u3: 9.5, u4: 9.0, media: 9.0, faltas: 0, situacao: 'Aprovado' },
    { disciplina: 'Geografia', u1: 8.0, u2: 8.0, u3: 8.5, u4: 8.5, media: 8.3, faltas: 1, situacao: 'Aprovado' },
    { disciplina: 'Ciências', u1: 7.0, u2: 7.5, u3: 8.0, u4: 8.5, media: 7.8, faltas: 3, situacao: 'Aprovado' },
    { disciplina: 'Educação Física', u1: 10.0, u2: 10.0, u3: 10.0, u4: 10.0, media: 10.0, faltas: 0, situacao: 'Aprovado' },
  ]
}: Partial<PrintBoletimProps>) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 bg-white text-black max-w-4xl mx-auto rounded-xl border border-gray-300 shadow-sm print:shadow-none print:border-none print:p-0">
      <div className="flex justify-between items-center mb-4 no-print border-b pb-4">
        <h2 className="text-lg font-bold text-slate-800">Visualização de Impressão — Boletim Escolar</h2>
        <button 
          onClick={handlePrint} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md"
        >
          🖨️ Imprimir Boletim (A4)
        </button>
      </div>

      <div className="border border-black p-4 font-sans text-xs space-y-4">
        {/* Header Oficial */}
        <div className="text-center border-b border-black pb-3">
          <h1 className="text-base font-bold uppercase tracking-wide">Prefeitura Municipal de Sapeaçu</h1>
          <h2 className="text-sm font-semibold text-gray-800">Secretaria Municipal de Educação</h2>
          <p className="text-xs font-bold text-blue-900 mt-1">{escola}</p>
          <p className="text-[10px] text-gray-600">BOLETIM ESCOLAR OFICIAL — ANO LETIVO {anoLetivo}</p>
        </div>

        {/* Dados do Aluno */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-100 p-2 border border-gray-400 font-mono text-[11px]">
          <div><strong>Aluno:</strong> {nomeAluno}</div>
          <div><strong>Matrícula:</strong> {matricula}</div>
          <div><strong>Turma:</strong> {turma}</div>
          <div><strong>Ano:</strong> {anoLetivo}</div>
        </div>

        {/* Tabela de Notas */}
        <table className="w-full border-collapse border border-black text-center text-xs">
          <thead>
            <tr className="bg-gray-200 border-b border-black">
              <th className="border border-black p-1.5 text-left">Disciplina</th>
              <th className="border border-black p-1.5 w-14">1ª UNID</th>
              <th className="border border-black p-1.5 w-14">2ª UNID</th>
              <th className="border border-black p-1.5 w-14">3ª UNID</th>
              <th className="border border-black p-1.5 w-14">4ª UNID</th>
              <th className="border border-black p-1.5 w-16 font-bold">MÉDIA</th>
              <th className="border border-black p-1.5 w-14">FALTAS</th>
              <th className="border border-black p-1.5 w-24">SITUAÇÃO</th>
            </tr>
          </thead>
          <tbody>
            {notas.map((n, i) => (
              <tr key={i} className="border-b border-gray-400">
                <td className="border border-black p-1.5 text-left font-medium">{n.disciplina}</td>
                <td className="border border-black p-1.5 font-mono">{n.u1}</td>
                <td className="border border-black p-1.5 font-mono">{n.u2}</td>
                <td className="border border-black p-1.5 font-mono">{n.u3}</td>
                <td className="border border-black p-1.5 font-mono">{n.u4}</td>
                <td className="border border-black p-1.5 font-mono font-bold">{n.media}</td>
                <td className="border border-black p-1.5 font-mono">{n.faltas}</td>
                <td className="border border-black p-1.5 font-bold text-[10px]">{n.situacao}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Assinaturas */}
        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px]">
          <div>
            <div className="border-t border-black w-48 mx-auto mb-1"></div>
            <p>Assinatura da Direção / Coordenação</p>
          </div>
          <div>
            <div className="border-t border-black w-48 mx-auto mb-1"></div>
            <p>Assinatura do Secretário Escolar</p>
          </div>
        </div>
      </div>
    </div>
  )
}
