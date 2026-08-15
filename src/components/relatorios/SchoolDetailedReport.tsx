'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Printer,
  AlertTriangle,
  CalendarCheck,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  BookOpen
} from 'lucide-react'
import { NotaRecord, FrequenciaRecord } from '@/hooks/useRelatorioNotas'
import { PrintHeader } from '@/components/print/print-header'
import { Escola } from '@/store/useSchoolStore'

interface SchoolDetailedReportProps {
  school: Escola
  alunos: any[]
  notas: NotaRecord[]
  turmas: any[]
  materias: any[]
  frequencias: FrequenciaRecord[]
  loading: boolean
  periodo: string
  onFilterChange: (filters: { turmaId?: string; materiaId?: string; periodo?: string }) => void
}

type SortOption =
  | 'nome_asc'
  | 'nome_desc'
  | 'assiduidade_desc'
  | 'assiduidade_asc'
  | 'desempenho_desc'
  | 'desempenho_asc'

const PAGE_SIZE = 20

export function SchoolDetailedReport({
  school,
  alunos,
  notas,
  turmas,
  materias,
  frequencias,
  loading,
  periodo,
  onFilterChange
}: SchoolDetailedReportProps) {
  // Filtros de seleção
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAlunoId, setSelectedAlunoId] = useState('todos')
  const [selectedTurma, setSelectedTurma] = useState('todos')
  const [selectedTurno, setSelectedTurno] = useState('todos')
  const [selectedMateria, setSelectedMateria] = useState('todos')
  const [selectedUnidade, setSelectedUnidade] = useState('todos')
  const [sortBy, setSortBy] = useState<SortOption>('nome_asc')
  
  // Controle de paginação e expansão de linhas
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedAlunos, setExpandedAlunos] = useState<Record<string, boolean>>({})

  // Resetar página sempre que qualquer filtro mudar
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedAlunoId, selectedTurma, selectedTurno, selectedMateria, selectedUnidade, sortBy])

  // Lista de turnos disponíveis a partir das turmas da escola
  const turnosDisponiveis = useMemo(() => {
    const set = new Set<string>()
    turmas.forEach((t) => {
      if (t.turno && t.turno.trim() !== '') {
        set.add(t.turno.trim())
      }
    })
    return Array.from(set).sort()
  }, [turmas])

  // Otimização Algorítmica: Mapas de acesso O(1) indexados por aluno_id
  const freqsByAluno = useMemo(() => {
    const map = new Map<string, FrequenciaRecord[]>()
    frequencias.forEach((f) => {
      const list = map.get(f.aluno_id) || []
      list.push(f)
      map.set(f.aluno_id, list)
    })
    return map
  }, [frequencias])

  const notasByAluno = useMemo(() => {
    const map = new Map<string, NotaRecord[]>()
    notas.forEach((n) => {
      const list = map.get(n.aluno_id) || []
      list.push(n)
      map.set(n.aluno_id, list)
    })
    return map
  }, [notas])

  const turmasMap = useMemo(() => {
    const map = new Map<string, any>()
    turmas.forEach((t) => map.set(t.id, t))
    return map
  }, [turmas])

  // Processamento consolidado de todos os alunos da escola (tempo linear O(N))
  const alunosProcessados = useMemo(() => {
    return alunos.map((aluno) => {
      const notasAluno = notasByAluno.get(aluno.id) ?? []
      const freqsAluno = freqsByAluno.get(aluno.id) ?? []
      const turmaAluno = turmasMap.get(aluno.turma_id)
      const turmaNome = turmaAluno?.nome ?? 'Sem Turma'
      const turmaTurno = turmaAluno?.turno ?? 'Não informado'

      // Assiduidade do aluno
      let freqAluno: number | null = null
      if (freqsAluno.length > 0) {
        const presencas = freqsAluno.filter((f) => f.presenca).length
        freqAluno = parseFloat(((presencas / freqsAluno.length) * 100).toFixed(1))
      }

      // Matérias que pertencem a este aluno (da mesma turma ou gerais da escola)
      const materiasDoAluno = materias.filter((m) => {
        if (m.turma_id) {
          return m.turma_id === aluno.turma_id
        }
        return true
      })

      // Calcular médias e notas por matéria do aluno
      const detalhesMaterias = materiasDoAluno.map((mat) => {
        const notasMat = notasAluno.filter((n) => n.materia_id === mat.id)
        
        const unidadesData = [1, 2, 3].map((unidade) => {
          const n = notasMat.find((item) => item.unidade === unidade)
          const nota1 = n?.nota1 ?? null
          const nota2 = n?.nota2 ?? null
          const nota3 = n?.nota3 ?? null
          const nota4 = n?.nota4 ?? null
          const validas = [nota1, nota2, nota3, nota4].filter((v): v is number => v !== null && !isNaN(Number(v)))

          // Correção ES-1: Média aritmética sobre as avaliações que foram realmente lançadas
          let mediaTrimestre: number | null = null
          if (validas.length > 0) {
            const soma = validas.reduce((a, b) => a + b, 0)
            mediaTrimestre = parseFloat((soma / validas.length).toFixed(1))
          }

          return {
            unidade,
            nota1,
            nota2,
            nota3,
            nota4,
            mediaTrimestre
          }
        })

        const mediasTrimestraisValidas = unidadesData
          .map((u) => u.mediaTrimestre)
          .filter((m): m is number => m !== null)

        const mediaMateria = mediasTrimestraisValidas.length > 0
          ? parseFloat((mediasTrimestraisValidas.reduce((a, b) => a + b, 0) / mediasTrimestraisValidas.length).toFixed(1))
          : null

        return {
          materiaId: mat.id,
          materiaNome: mat.nome,
          unidades: unidadesData,
          mediaMateria
        }
      })

      // Média final global do aluno (aritmética de todas as matérias com notas lançadas)
      const mediasMateriasValidas = detalhesMaterias
        .map((d) => d.mediaMateria)
        .filter((mf): mf is number => mf !== null)

      const mediaGeralAluno = mediasMateriasValidas.length > 0
        ? parseFloat((mediasMateriasValidas.reduce((a, b) => a + b, 0) / mediasMateriasValidas.length).toFixed(1))
        : null

      return {
        id: aluno.id,
        nome: aluno.nome ?? 'Sem Nome',
        turmaId: aluno.turma_id,
        turmaNome,
        turno: turmaTurno,
        detalhesMaterias,
        mediaGeralAluno,
        frequenciaPct: freqAluno
      }
    })
  }, [alunos, notasByAluno, freqsByAluno, turmasMap, materias])

  // KPIs Globais da Escola (Calculados sobre o total de alunos da unidade)
  const alunosEmRiscoNotas = useMemo(() => {
    return alunosProcessados.filter((a) => a.mediaGeralAluno !== null && a.mediaGeralAluno < 5.0)
  }, [alunosProcessados])

  const alunosEmRiscoEvasao = useMemo(() => {
    return alunosProcessados.filter((a) => a.frequenciaPct !== null && a.frequenciaPct < 75.0)
  }, [alunosProcessados])

  const totalFreqsEscola = frequencias.length
  const totalPresencasEscola = frequencias.filter((f) => f.presenca).length
  const assiduidadeEscola = totalFreqsEscola > 0
    ? parseFloat(((totalPresencasEscola / totalFreqsEscola) * 100).toFixed(1))
    : null

  // Filtragem dos Alunos para exibição
  const alunosFiltrados = useMemo(() => {
    return alunosProcessados
      .filter((aluno) => {
        // Filtro de Aluno Individual (Select)
        if (selectedAlunoId !== 'todos' && aluno.id !== selectedAlunoId) {
          return false
        }
        // Filtro de Busca Textual (Nome)
        if (searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase()
          if (!aluno.nome.toLowerCase().includes(term)) {
            return false
          }
        }
        // Filtro de Turma
        if (selectedTurma !== 'todos' && aluno.turmaId !== selectedTurma) {
          return false
        }
        // Filtro de Turno
        if (selectedTurno !== 'todos') {
          if (aluno.turno.toLowerCase() !== selectedTurno.toLowerCase()) {
            return false
          }
        }
        // Filtro de Disciplina
        if (selectedMateria !== 'todos') {
          const temMateria = aluno.detalhesMaterias.some((m) => m.materiaId === selectedMateria)
          if (!temMateria) return false
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'nome_asc') {
          return a.nome.localeCompare(b.nome, 'pt-BR')
        }
        if (sortBy === 'nome_desc') {
          return b.nome.localeCompare(a.nome, 'pt-BR')
        }
        if (sortBy === 'assiduidade_desc') {
          const freqA = a.frequenciaPct ?? -1
          const freqB = b.frequenciaPct ?? -1
          return freqB - freqA
        }
        if (sortBy === 'assiduidade_asc') {
          const freqA = a.frequenciaPct ?? 999
          const freqB = b.frequenciaPct ?? 999
          return freqA - freqB
        }
        if (sortBy === 'desempenho_desc') {
          const medA = a.mediaGeralAluno ?? -1
          const medB = b.mediaGeralAluno ?? -1
          return medB - medA
        }
        if (sortBy === 'desempenho_asc') {
          const medA = a.mediaGeralAluno ?? 999
          const medB = b.mediaGeralAluno ?? 999
          return medA - medB
        }
        return 0
      })
  }, [alunosProcessados, selectedAlunoId, searchTerm, selectedTurma, selectedTurno, selectedMateria, sortBy])

  // Paginação (20 alunos por página)
  const totalPages = Math.max(1, Math.ceil(alunosFiltrados.length / PAGE_SIZE))
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const endIndex = startIndex + PAGE_SIZE
  const alunosPaginados = alunosFiltrados.slice(startIndex, endIndex)

  const toggleExpandAluno = (alunoId: string) => {
    setExpandedAlunos((prev) => ({
      ...prev,
      [alunoId]: !prev[alunoId]
    }))
  }

  const handlePrintReport = () => {
    window.print()
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Barra de Filtros Avançados */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4 no-print shadow-sm">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Busca Textual de Aluno */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar aluno por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-1 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Seletor de Período de Frequência */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] uppercase font-bold text-muted-foreground whitespace-nowrap">Período:</label>
              <select
                value={periodo}
                onChange={(e) => onFilterChange({ periodo: e.target.value })}
                className="bg-surface-1 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
              >
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="trimestre">Trimestre (90 dias)</option>
                <option value="ano">Ano Letivo</option>
                <option value="todos">Todo o Período</option>
              </select>
            </div>

            <button
              onClick={handlePrintReport}
              className="bg-[#185FA5] hover:bg-[#185FA5]/90 text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors shadow-sm whitespace-nowrap"
            >
              <Printer className="w-4 h-4" /> Imprimir Relatório (A4)
            </button>
          </div>
        </div>

        {/* Linha de Seletores e Ordenação */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2 border-t border-border/60">
          {/* Seletor Individual de Aluno */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Aluno Específico</label>
            <select
              value={selectedAlunoId}
              onChange={(e) => setSelectedAlunoId(e.target.value)}
              className="bg-surface-1 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary w-full truncate"
            >
              <option value="todos">Todos os alunos ({alunos.length})</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Turma */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Turma</label>
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="bg-surface-1 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary w-full truncate"
            >
              <option value="todos">Todas as turmas</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.turno || 'Geral'})
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Turno */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Turno</label>
            <select
              value={selectedTurno}
              onChange={(e) => setSelectedTurno(e.target.value)}
              className="bg-surface-1 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary w-full truncate"
            >
              <option value="todos">Todos os turnos</option>
              {turnosDisponiveis.map((turno) => (
                <option key={turno} value={turno}>
                  {turno}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Disciplina */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Disciplina</label>
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="bg-surface-1 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary w-full truncate"
            >
              <option value="todos">Todas as disciplinas</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Trimestre */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Trimestre</label>
            <select
              value={selectedUnidade}
              onChange={(e) => setSelectedUnidade(e.target.value)}
              className="bg-surface-1 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary w-full truncate"
            >
              <option value="todos">Todos os trimestres</option>
              <option value="1">1º Trimestre</option>
              <option value="2">2º Trimestre</option>
              <option value="3">3º Trimestre</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Ordenar Por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-surface-1 border border-border rounded-xl px-2.5 py-1.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary w-full truncate"
            >
              <option value="nome_asc">Nome (A - Z)</option>
              <option value="nome_desc">Nome (Z - A)</option>
              <option value="assiduidade_desc">Maior Assiduidade (%)</option>
              <option value="assiduidade_asc">Menor Assiduidade (%)</option>
              <option value="desempenho_desc">Maior Desempenho (Média)</option>
              <option value="desempenho_asc">Menor Desempenho (Média)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cabeçalho de Impressão (Fidelidade Visual A4) */}
      <div className="hidden print:block w-full">
        <PrintHeader
          escolaNome={school.nome}
          escolaLogoUrl={school.logo_url ?? undefined}
          docTitulo="RELATÓRIO ANALÍTICO DA UNIDADE ESCOLAR"
          docSubtitulo={`Documento Oficial da Rede — Gerado em: ${new Date().toLocaleDateString('pt-BR')}`}
        />
      </div>

      {/* Indicadores Principais (KPIs) com Cores de Alto Contraste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* KPI 1: Alunos */}
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total de Estudantes</p>
            <p className="text-xl font-black text-foreground">{alunos.length}</p>
          </div>
        </div>

        {/* KPI 2: Assiduidade */}
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl">
            <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Assiduidade Geral</p>
            <p className={`text-xl font-black ${assiduidadeEscola !== null && assiduidadeEscola < 75.0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {assiduidadeEscola !== null ? `${assiduidadeEscola}%` : 'S/R'}
            </p>
          </div>
        </div>

        {/* KPI 3: Alerta Notas */}
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-rose-500/10 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Abaixo da Média (&lt; 5.0)</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400">{alunosEmRiscoNotas.length}</p>
          </div>
        </div>

        {/* KPI 4: Risco Evasão */}
        <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="p-2.5 bg-rose-500/10 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Risco de Evasão (&lt; 75%)</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400">{alunosEmRiscoEvasao.length}</p>
          </div>
        </div>
      </div>

      {/* Alerta de Notas Baixas (Alto Contraste WCAG Acessível) */}
      {alunosEmRiscoNotas.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs shadow-sm no-print">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <div>
            <strong className="text-rose-950 dark:text-rose-100 font-bold">Atenção Gestão Escolar (Notas):</strong> Existem {alunosEmRiscoNotas.length} alunos com média final consolidada abaixo de 5.0 (Risco de recuperação pedagógica). É recomendada a verificação das notas e aplicação de reforço.
          </div>
        </div>
      )}

      {/* Alerta de Baixa Frequência / Evasão (Alto Contraste WCAG Acessível) */}
      {alunosEmRiscoEvasao.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs shadow-sm no-print">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <div>
            <strong className="text-rose-950 dark:text-rose-100 font-bold">Atenção Gestão Escolar (Evasão):</strong> Existem {alunosEmRiscoEvasao.length} alunos com taxa de frequência abaixo de 75% (Limite mínimo exigido por lei). Risco crítico de evasão escolar!
          </div>
        </div>
      )}

      {/* Grade de Alunos com Paginação de 20 Itens */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Grade Consolidada de Desempenho & Assiduidade
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Exibindo <strong>{alunosFiltrados.length}</strong> estudante(s) filtrado(s) — Limite de 20 por página
            </p>
          </div>

          <div className="flex items-center gap-2 no-print">
            <span className="text-[10px] bg-surface-1 border border-border text-muted-foreground px-2.5 py-1 rounded-lg font-semibold">
              {selectedTurma === 'todos' ? 'Todas as turmas' : turmas.find((t) => t.id === selectedTurma)?.nome} | Média Mínima: 5.0 | Freq. Mínima: 75%
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground animate-pulse">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <span className="text-xs font-semibold">Carregando diário de notas e assiduidade...</span>
          </div>
        ) : alunosFiltrados.length === 0 ? (
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
                  <th className="p-3">Turno</th>
                  <th className="p-3 text-center">Assiduidade</th>
                  <th className="p-3 text-center">Média Geral</th>
                  <th className="p-3 text-center">Situação</th>
                  <th className="p-3 text-right no-print">Detalhamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alunosPaginados.map((aluno) => {
                  const isExpanded = !!expandedAlunos[aluno.id]
                  const isRiscoNota = aluno.mediaGeralAluno !== null && aluno.mediaGeralAluno < 5.0
                  const isRiscoFreq = aluno.frequenciaPct !== null && aluno.frequenciaPct < 75.0

                  // Filtrar matérias do aluno de acordo com o filtro selecionado
                  const materiasExibicao = aluno.detalhesMaterias.filter((m) => {
                    if (selectedMateria !== 'todos' && m.materiaId !== selectedMateria) {
                      return false
                    }
                    return true
                  })

                  return (
                    <React.Fragment key={aluno.id}>
                      <tr className="hover:bg-hoverCustom transition-colors group">
                        <td className="p-3 font-bold text-foreground uppercase tracking-wide">
                          {aluno.nome}
                        </td>
                        <td className="p-3 font-semibold text-muted-foreground">
                          {aluno.turmaNome}
                        </td>
                        <td className="p-3 font-semibold text-muted-foreground">
                          {aluno.turno}
                        </td>
                        <td className="p-3 text-center">
                          {aluno.frequenciaPct !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold border text-[11px] ${
                                isRiscoFreq
                                  ? 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800/60'
                                  : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60'
                              }`}
                            >
                              {aluno.frequenciaPct}%
                              {isRiscoFreq && ' (Risco)'}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">S/R</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-black">
                          {aluno.mediaGeralAluno !== null ? (
                            <span
                              className={`px-2.5 py-0.5 rounded border text-[11px] ${
                                isRiscoNota
                                  ? 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800/60'
                                  : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60'
                              }`}
                            >
                              {aluno.mediaGeralAluno.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-normal">Sem notas</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isRiscoNota || isRiscoFreq ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800/60">
                              <AlertTriangle className="w-3 h-3" /> Atenção
                            </span>
                          ) : aluno.mediaGeralAluno !== null ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                              <CheckCircle2 className="w-3 h-3" /> Regular
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Pendente</span>
                          )}
                        </td>
                        <td className="p-3 text-right no-print">
                          <button
                            onClick={() => toggleExpandAluno(aluno.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-1 border border-border hover:border-primary/50 text-foreground transition-colors cursor-pointer"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" /> Ocultar Notas
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" /> Ver Notas ({aluno.detalhesMaterias.length})
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Linha Expandida: Detalhamento por Disciplina & Trimestre */}
                      {isExpanded && (
                        <tr className="bg-surface-1/40 border-b border-border">
                          <td colSpan={7} className="p-4">
                            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between border-b border-border pb-2">
                                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase">
                                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                                  Detalhamento Disciplinar — {aluno.nome}
                                </h4>
                                <span className="text-[10px] text-muted-foreground">
                                  {materiasExibicao.length} disciplina(s) avaliada(s)
                                </span>
                              </div>

                              {materiasExibicao.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic py-2">
                                  Nenhuma disciplina cadastrada ou vinculada a este aluno.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left border-collapse">
                                    <thead className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold bg-surface-1">
                                      <tr className="border-b border-border">
                                        <th className="p-2">Disciplina</th>
                                        <th className="p-2 text-center">1º Trimestre</th>
                                        <th className="p-2 text-center">2º Trimestre</th>
                                        <th className="p-2 text-center">3º Trimestre</th>
                                        <th className="p-2 text-right">Média da Matéria</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                      {materiasExibicao.map((mat) => {
                                        const t1 = mat.unidades.find((u) => u.unidade === 1)?.mediaTrimestre ?? null
                                        const t2 = mat.unidades.find((u) => u.unidade === 2)?.mediaTrimestre ?? null
                                        const t3 = mat.unidades.find((u) => u.unidade === 3)?.mediaTrimestre ?? null
                                        const isMateriaRisco = mat.mediaMateria !== null && mat.mediaMateria < 5.0

                                        return (
                                          <tr key={mat.materiaId} className="hover:bg-surface-1/50">
                                            <td className="p-2 font-bold text-foreground">
                                              {mat.materiaNome}
                                            </td>
                                            <td className="p-2 text-center font-mono font-semibold">
                                              {t1 !== null ? (
                                                <span className={t1 < 5.0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}>
                                                  {t1.toFixed(1)}
                                                </span>
                                              ) : '-'}
                                            </td>
                                            <td className="p-2 text-center font-mono font-semibold">
                                              {t2 !== null ? (
                                                <span className={t2 < 5.0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}>
                                                  {t2.toFixed(1)}
                                                </span>
                                              ) : '-'}
                                            </td>
                                            <td className="p-2 text-center font-mono font-semibold">
                                              {t3 !== null ? (
                                                <span className={t3 < 5.0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}>
                                                  {t3.toFixed(1)}
                                                </span>
                                              ) : '-'}
                                            </td>
                                            <td className="p-2 text-right font-mono font-black">
                                              {mat.mediaMateria !== null ? (
                                                <span
                                                  className={`px-2 py-0.5 rounded text-[11px] border ${
                                                    isMateriaRisco
                                                      ? 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800/60'
                                                      : 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800/60'
                                                  }`}
                                                >
                                                  {mat.mediaMateria.toFixed(1)}
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé de Paginação (20 Alunos por Página) */}
        {!loading && alunosFiltrados.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border no-print">
            <div className="text-xs text-muted-foreground">
              Mostrando <strong>{startIndex + 1}</strong> a <strong>{Math.min(endIndex, alunosFiltrados.length)}</strong> de <strong>{alunosFiltrados.length}</strong> estudantes
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-surface-1 hover:bg-hoverCustom disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-foreground transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-surface-1 text-foreground border-border hover:bg-hoverCustom'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  }
                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                    return <span key={pageNum} className="text-muted-foreground text-xs px-0.5">...</span>
                  }
                  return null
                })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-border bg-surface-1 hover:bg-hoverCustom disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 text-foreground transition-colors cursor-pointer"
              >
                Próximo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
