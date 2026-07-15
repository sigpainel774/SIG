'use client'

import React, { useState, useEffect } from 'react'
import { Printer, GraduationCap, AlertTriangle, HelpCircle } from 'lucide-react'
import { NotaRecord } from '@/hooks/useRelatorioNotas'

import { Escola } from '@/store/useSchoolStore'

interface SchoolDetailedReportProps {
  school: Escola
  alunos: any[]
  notas: NotaRecord[]
  turmas: any[]
  materias: any[]
  loading: boolean
  onFilterChange: (filters: { turmaId?: string; materiaId?: string }) => void
}

export function SchoolDetailedReport({
  school,
  alunos,
  notas,
  turmas,
  materias,
  loading,
  onFilterChange
}: SchoolDetailedReportProps) {
  const [selectedTurma, setSelectedTurma] = useState('todos')
  const [selectedMateria, setSelectedMateria] = useState('todos')

  useEffect(() => {
    onFilterChange({ turmaId: selectedTurma, materiaId: selectedMateria })
  }, [selectedTurma, selectedMateria, onFilterChange])

  // Lógica de cálculo de médias por aluno
  const processarNotasAlunos = () => {
    return alunos.map((aluno) => {
      // Filtrar notas deste aluno especificamente
      const notasAluno = notas.filter((n) => n.aluno_id === aluno.id)

      // Chave: materia_id, Valor: { tri1, tri2, tri3 }
      const notasPorMateria: Record<string, { t1: number | null; t2: number | null; t3: number | null }> = {}

      notasAluno.forEach((n) => {
        if (!notasPorMateria[n.materia_id]) {
          notasPorMateria[n.materia_id] = { t1: null, t2: null, t3: null }
        }
        if (n.unidade === 1) {
          const validas = [n.nota1, n.nota2, n.nota3].filter((val): val is number => val !== null && !isNaN(Number(val)))
          notasPorMateria[n.materia_id].t1 = validas.length > 0 ? (validas.reduce((a, b) => a + b, 0) / validas.length) : null
        }
        if (n.unidade === 2) {
          const validas = [n.nota1, n.nota2, n.nota3].filter((val): val is number => val !== null && !isNaN(Number(val)))
          notasPorMateria[n.materia_id].t2 = validas.length > 0 ? (validas.reduce((a, b) => a + b, 0) / validas.length) : null
        }
        if (n.unidade === 3) {
          const validas = [n.nota1, n.nota2, n.nota3].filter((val): val is number => val !== null && !isNaN(Number(val)))
          notasPorMateria[n.materia_id].t3 = validas.length > 0 ? (validas.reduce((a, b) => a + b, 0) / validas.length) : null
        }
      })

      // Calcular médias por matéria do aluno
      const mediasMaterias = Object.keys(notasPorMateria).map((matId) => {
        const n = notasPorMateria[matId]
        const vals = [n.t1, n.t2, n.t3].filter((v): v is number => v !== null)
        const total = vals.reduce((a, b) => a + b, 0)
        const mediaFinal = vals.length > 0 ? (total / vals.length) : null

        return {
          materiaId: matId,
          t1: n.t1,
          t2: n.t2,
          t3: n.t3,
          total: vals.length > 0 ? total : null,
          mediaFinal
        }
      })

      // Média final global de todas as disciplinas do aluno
      const mediasFinaisValidas = mediasMaterias
        .map((m) => m.mediaFinal)
        .filter((mf): mf is number => mf !== null)
      
      const mediaGeralAluno = mediasFinaisValidas.length > 0
        ? (mediasFinaisValidas.reduce((a, b) => a + b, 0) / mediasFinaisValidas.length)
        : null

      return {
        id: aluno.id,
        nome: aluno.nome,
        turmaId: aluno.turma_id,
        mediasMaterias,
        mediaGeralAluno
      }
    })
  }

  const alunosProcessados = processarNotasAlunos()

  // Alunos abaixo de 5.0
  const alunosEmRisco = alunosProcessados.filter(
    (a) => a.mediaGeralAluno !== null && a.mediaGeralAluno < 5.0
  )

  const handlePrintReport = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Filtros Internos do Relatório */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between no-print">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Seletor de Turma */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Turma</label>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="bg-surface-1 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary min-w-[140px]"
            >
              <option value="todos">Todas as turmas</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.turno || 'Geral'})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Disciplina */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Disciplina / Matéria</label>
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="bg-surface-1 border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary min-w-[160px]"
            >
              <option value="todos">Todas as matérias</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handlePrintReport}
          className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Printer className="w-4 h-4" /> Imprimir Boletins da Unidade (A4)
        </button>
      </div>

      {/* Cabeçalho de Impressão (Fidelidade Visual A4) */}
      <div className="hidden print:flex print:items-center print:justify-between print:border-b-2 print:border-black print:pb-4 print:mb-6 w-full">
        <div className="flex items-center gap-4">
          <img
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo-prefeitura.png?t=${Date.now()}`}
            alt="Brasão"
            className="w-16 h-16 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-black">Estado da Bahia</h2>
            <h1 className="text-lg font-black uppercase text-black">Prefeitura Municipal de Sapeaçú</h1>
            <p className="text-xs font-semibold text-gray-700">Secretaria Municipal de Educação, Cultura e Esporte</p>
            <p className="text-xs font-bold text-gray-900 mt-1">Unidade Escolar: {school.nome}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block bg-gray-100 text-gray-800 text-[10px] font-bold px-3 py-1 rounded-full border border-gray-300">
            Documento Oficial da Rede
          </span>
          <p className="text-[10px] text-gray-600 mt-1">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Indicadores Locais da Escola */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print">
        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-lg">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold">Total de Estudantes</p>
            <p className="text-lg font-bold text-foreground">{alunos.length}</p>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 rounded-lg">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold">Turmas Filtradas</p>
            <p className="text-lg font-bold text-foreground">
              {selectedTurma === 'todos' ? turmas.length : 1}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold">Alunos em Alerta (&lt; 5.0)</p>
            <p className="text-lg font-bold text-rose-400">{alunosEmRisco.length}</p>
          </div>
        </div>
      </div>

      {/* Alerta de Risco (Se houver) */}
      {alunosEmRisco.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-300 no-print">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-400 flex-shrink-0" />
          <div>
            <strong>Atenção Gestão Escolar:</strong> Existem {alunosEmRisco.length} alunos com média final consolidada abaixo de 5.0 (Risco de recuperação pedagógica). É recomendada a verificação das notas e aplicação de reforço/recuperação.
          </div>
        </div>
      )}

      {/* Tabela de Notas Detalhada */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Grade Analítica de Notas por Estudante
          </h3>
          <span className="text-[10px] bg-surface-1 border border-border text-muted-foreground px-2 py-0.5 rounded-lg font-semibold no-print">
            {selectedTurma === 'todos' ? 'Todas as turmas' : turmas.find(t => t.id === selectedTurma)?.nome} | Média de aprovação: 5.0
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground animate-pulse">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs">Carregando diário de notas...</span>
          </div>
        ) : alunosProcessados.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground text-xs italic">
            Nenhum estudante encontrado com os filtros aplicados nesta unidade escolar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-muted-foreground border-collapse">
              <thead className="bg-surface-1 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                <tr className="border-b border-border">
                  <th className="p-3">Estudante</th>
                  <th className="p-3">Turma</th>
                  <th className="p-3">1º Trimestre</th>
                  <th className="p-3">2º Trimestre</th>
                  <th className="p-3">3º Trimestre</th>
                  <th className="p-3 text-right">Média Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alunosProcessados.map((aluno) => {
                  // Agrupar médias do aluno para exibir uma linha resumo na tabela
                  const m1Valores = aluno.mediasMaterias.map((m) => m.t1).filter((v): v is number => v !== null)
                  const m2Valores = aluno.mediasMaterias.map((m) => m.t2).filter((v): v is number => v !== null)
                  const m3Valores = aluno.mediasMaterias.map((m) => m.t3).filter((v): v is number => v !== null)

                  const tri1 = m1Valores.length > 0 ? (m1Valores.reduce((a, b) => a + b, 0) / m1Valores.length) : null
                  const tri2 = m2Valores.length > 0 ? (m2Valores.reduce((a, b) => a + b, 0) / m2Valores.length) : null
                  const tri3 = m3Valores.length > 0 ? (m3Valores.reduce((a, b) => a + b, 0) / m3Valores.length) : null
                  
                  const mediaFinal = aluno.mediaGeralAluno

                  const turmaNome = turmas.find((t) => t.id === aluno.turmaId)?.nome || 'Sem Turma'

                  return (
                    <tr key={aluno.id} className="hover:bg-hoverCustom transition-colors">
                      <td className="p-3 font-bold text-foreground uppercase">{aluno.nome}</td>
                      <td className="p-3 font-semibold text-muted-foreground">{turmaNome}</td>
                      <td className="p-3 font-mono">
                        {tri1 !== null ? (
                          <span className={tri1 < 5.0 ? 'text-rose-400 font-bold' : 'text-foreground'}>
                            {tri1.toFixed(1)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 font-mono">
                        {tri2 !== null ? (
                          <span className={tri2 < 5.0 ? 'text-rose-400 font-bold' : 'text-foreground'}>
                            {tri2.toFixed(1)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 font-mono">
                        {tri3 !== null ? (
                          <span className={tri3 < 5.0 ? 'text-rose-400 font-bold' : 'text-foreground'}>
                            {tri3.toFixed(1)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 font-mono text-right font-black">
                        {mediaFinal !== null ? (
                          <span className={mediaFinal < 5.0 ? 'text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20'}>
                            {mediaFinal.toFixed(1)}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
