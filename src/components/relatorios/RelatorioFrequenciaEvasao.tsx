'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Escola } from '@/store/useSchoolStore'
import { 
  TrendingDown, 
  Printer, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  UserX, 
  Users, 
  FileSpreadsheet, 
  ArrowUpDown,
  Phone,
  GraduationCap,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  PrintRelatorioFrequenciaEvasao, 
  AlunoFrequenciaPrint, 
  ResumoFrequenciaPrint 
} from '@/components/print/print-relatorio-frequencia-evasao'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RelatorioFrequenciaEvasaoProps {
  selectedEscola: Escola | null
}

export default function RelatorioFrequenciaEvasao({ selectedEscola }: RelatorioFrequenciaEvasaoProps) {
  const [loading, setLoading] = useState(true)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [periodoFiltro, setPeriodoFiltro] = useState<'7d' | '15d' | '30d' | '90d' | 'ano'>('30d')
  const [turmaFiltro, setTurmaFiltro] = useState<string>('todas')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'critico' | 'alerta' | 'regular'>('todos')
  const [busca, setBusca] = useState('')

  const [turmas, setTurmas] = useState<any[]>([])
  const [alunosLista, setAlunosLista] = useState<AlunoFrequenciaPrint[]>([])

  const supabase = createClient() as any

  // Calcular data de corte do período
  const dataCorte = useMemo(() => {
    const d = new Date()
    if (periodoFiltro === '7d') d.setDate(d.getDate() - 7)
    else if (periodoFiltro === '15d') d.setDate(d.getDate() - 15)
    else if (periodoFiltro === '30d') d.setDate(d.getDate() - 30)
    else if (periodoFiltro === '90d') d.setDate(d.getDate() - 90)
    else if (periodoFiltro === 'ano') d.setMonth(0, 1) // 01 de janeiro do ano atual
    return d.toISOString().split('T')[0]
  }, [periodoFiltro])

  const periodoLabels = {
    '7d': 'Últimos 7 dias',
    '15d': 'Últimos 15 dias',
    '30d': 'Últimos 30 dias',
    '90d': 'Últimos 90 dias (Trimestre)',
    'ano': 'Ano Letivo Vigente'
  }

  // Carregar turmas e dados de frequência
  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setLoading(true)

        // 1. Buscar Turmas
        let queryTurmas = supabase
          .from('turmas')
          .select('id, nome, serie, turno, escola_id')
          .order('nome', { ascending: true })

        if (selectedEscola) {
          queryTurmas = queryTurmas.eq('escola_id', selectedEscola.id)
        }

        const { data: turmasData, error: turmasError } = await queryTurmas
        if (turmasError) throw turmasError
        if (isMounted) setTurmas(turmasData || [])

        // 2. Buscar Alunos
        let queryAlunos = supabase
          .from('alunos')
          .select(`
            id,
            nome,
            turma_id,
            escola_id,
            serie,
            dados_matricula,
            deleted_at,
            turmas (id, nome)
          `)
          .is('deleted_at', null)

        if (selectedEscola) {
          queryAlunos = queryAlunos.eq('escola_id', selectedEscola.id)
        }

        const { data: alunosData, error: alunosError } = await queryAlunos
        if (alunosError) throw alunosError

        const alunos = alunosData || []
        const alunoIds = alunos.map((a: any) => a.id)

        if (alunoIds.length === 0) {
          if (isMounted) {
            setAlunosLista([])
            setLoading(false)
          }
          return
        }

        // 3. Buscar registros de Frequência do período
        // Processar em chunks se houver muitos alunos
        let frequenciasData: any[] = []
        const chunkSize = 200
        for (let i = 0; i < alunoIds.length; i += chunkSize) {
          const chunk = alunoIds.slice(i, i + chunkSize)
          const { data: fChunk, error: fError } = await supabase
            .from('frequencias')
            .select('aluno_id, presenca, data')
            .in('aluno_id', chunk)
            .gte('data', dataCorte)

          if (!fError && fChunk) {
            frequenciasData = frequenciasData.concat(fChunk)
          }
        }

        // 4. Mapear e calcular frequências por aluno
        const freqMap: Record<string, { total: number; presencas: number; faltas: number }> = {}

        frequenciasData.forEach((f: any) => {
          if (!freqMap[f.aluno_id]) {
            freqMap[f.aluno_id] = { total: 0, presencas: 0, faltas: 0 }
          }
          freqMap[f.aluno_id].total += 1
          if (f.presenca) {
            freqMap[f.aluno_id].presencas += 1
          } else {
            freqMap[f.aluno_id].faltas += 1
          }
        })

        const mappedAlunos: AlunoFrequenciaPrint[] = alunos.map((a: any) => {
          const stats = freqMap[a.id] || { total: 0, presencas: 0, faltas: 0 }
          const totalAulas = stats.total
          const percentual = totalAulas > 0 ? (stats.presencas / totalAulas) * 100 : 100

          let statusRisco: 'critico' | 'alerta' | 'regular' = 'regular'
          if (totalAulas > 0) {
            if (percentual < 75) statusRisco = 'critico'
            else if (percentual < 85) statusRisco = 'alerta'
          }

          const dm = (a.dados_matricula as any) || {}
          const respNome = dm.nomeMae || dm.nomePai || dm.nomeResponsavel || undefined
          const respTel = dm.telefoneMae || dm.telefonePai || dm.telefoneResponsavel || dm.celular || undefined

          return {
            id: a.id,
            nome: a.nome,
            turma_nome: (a.turmas as any)?.nome || 'Sem Turma',
            serie: a.serie || undefined,
            total_aulas: totalAulas,
            total_presencas: stats.presencas,
            total_faltas: stats.faltas,
            percentual_frequencia: percentual,
            status_risco: statusRisco,
            responsavel_nome: respNome,
            responsavel_telefone: respTel,
          }
        })

        // Ordenar prioritariamente por maior risco (menor frequência)
        mappedAlunos.sort((a, b) => a.percentual_frequencia - b.percentual_frequencia)

        if (isMounted) {
          setAlunosLista(mappedAlunos)
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados de frequência:', err)
        if (isMounted) {
          toast.error('Erro ao carregar os dados de frequência.')
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [selectedEscola, dataCorte])

  // Filtragem dos Alunos
  const alunosFiltrados = useMemo(() => {
    return alunosLista.filter(a => {
      if (turmaFiltro !== 'todas' && a.turma_nome !== turmaFiltro) return false
      if (statusFiltro !== 'todos' && a.status_risco !== statusFiltro) return false
      if (busca.trim() !== '') {
        const query = busca.toLowerCase()
        const matchNome = a.nome.toLowerCase().includes(query)
        const matchTurma = a.turma_nome.toLowerCase().includes(query)
        const matchResp = a.responsavel_nome?.toLowerCase().includes(query)
        if (!matchNome && !matchTurma && !matchResp) return false
      }
      return true
    })
  }, [alunosLista, turmaFiltro, statusFiltro, busca])

  // Resumo Estatístico Consolidado
  const resumo: ResumoFrequenciaPrint = useMemo(() => {
    const total = alunosLista.length
    if (total === 0) {
      return { total_alunos: 0, frequencia_media: 100, total_criticos: 0, total_alerta: 0, total_regulares: 0 }
    }

    let somaPerc = 0
    let criticos = 0
    let alerta = 0
    let regulares = 0

    alunosLista.forEach(a => {
      somaPerc += a.percentual_frequencia
      if (a.status_risco === 'critico') criticos++
      else if (a.status_risco === 'alerta') alerta++
      else regulares++
    })

    return {
      total_alunos: total,
      frequencia_media: somaPerc / total,
      total_criticos: criticos,
      total_alerta: alerta,
      total_regulares: regulares
    }
  }, [alunosLista])

  // Exportar para CSV
  const handleExportCSV = () => {
    if (alunosFiltrados.length === 0) {
      toast.warning('Nenhum dado para exportar.')
      return
    }

    const headers = ['Nome do Aluno', 'Turma', 'Série', 'Aulas Totais', 'Presenças', 'Faltas', '% Frequência', 'Situação', 'Responsável', 'Telefone']
    const rows = alunosFiltrados.map(a => [
      `"${a.nome.replace(/"/g, '""')}"`,
      `"${a.turma_nome.replace(/"/g, '""')}"`,
      `"${a.serie || ''}"`,
      a.total_aulas,
      a.total_presencas,
      a.total_faltas,
      `${a.percentual_frequencia.toFixed(1)}%`,
      `"${a.status_risco === 'critico' ? 'Risco Crítico' : a.status_risco === 'alerta' ? 'Alerta' : 'Regular'}"`,
      `"${(a.responsavel_nome || '').replace(/"/g, '""')}"`,
      `"${a.responsavel_telefone || ''}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_frequencia_evasao_${selectedEscola?.nome || 'rede'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Planilha exportada com sucesso!')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Modal de Impressão Oficial A4 */}
      {showPrintModal && (
        <PrintRelatorioFrequenciaEvasao
          escolaNome={selectedEscola?.nome ?? null}
          periodoLabel={periodoLabels[periodoFiltro]}
          turmaNome={turmaFiltro !== 'todas' ? turmaFiltro : undefined}
          statusFiltro={statusFiltro}
          resumo={resumo}
          alunos={alunosFiltrados}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Barra de Título & Ações Principais */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <TrendingDown className="w-5 h-5 text-rose-500" />
            <span>Frequência & Controle de Evasão Escolar</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedEscola ? selectedEscola.nome : 'Consolidado de Todas as Escolas da Rede'} • Acompanhamento nominal com alerta de infrequência LDB
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="border-border hover:bg-hoverCustom text-foreground rounded-xl gap-2 text-xs font-semibold cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exportar CSV</span>
          </Button>

          <Button
            onClick={() => setShowPrintModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2 text-xs font-bold shadow-md cursor-pointer px-4"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas e KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Frequência Geral */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Frequência Geral</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : `${resumo.frequencia_media.toFixed(1)}%`}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Média de assiduidade no período
            </p>
          </div>
        </div>

        {/* Card 2: Risco Crítico (< 75%) */}
        <div className="p-4 rounded-2xl bg-card border border-rose-500/30 flex flex-col justify-between shadow-2xs bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Risco Crítico (&lt; 75%)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {loading ? '...' : resumo.total_criticos}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Alunos com risco de reprovação/evasão
            </p>
          </div>
        </div>

        {/* Card 3: Estado de Alerta (75% a 85%) */}
        <div className="p-4 rounded-2xl bg-card border border-amber-500/30 flex flex-col justify-between shadow-2xs bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Alerta (75% a 85%)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? '...' : resumo.total_alerta}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Necessitam acompanhamento preventivo
            </p>
          </div>
        </div>

        {/* Card 4: Frequência Regular (> 85%) */}
        <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 flex flex-col justify-between shadow-2xs bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Regulares (&gt; 85%)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? '...' : resumo.total_regulares}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Assiduidade satisfatória no período
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Busca por Nome */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar aluno ou responsável..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 bg-background border-border rounded-xl text-xs h-9"
            />
          </div>

          {/* Filtro de Turma */}
          <select
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            aria-label="Filtrar por Turma"
            className="h-9 px-3 bg-background border border-border text-foreground rounded-xl text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="todas">Todas as Turmas ({turmas.length})</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.nome}>
                {t.nome} {t.turno ? `(${t.turno})` : ''}
              </option>
            ))}
          </select>

          {/* Filtro de Período */}
          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            {(['7d', '15d', '30d', '90d', 'ano'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodoFiltro(p)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  periodoFiltro === p
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p === '7d' ? '7 dias' : p === '15d' ? '15 dias' : p === '30d' ? '30 dias' : p === '90d' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de Risco */}
        <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setStatusFiltro('todos')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              statusFiltro === 'todos'
                ? 'bg-muted text-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Todos ({alunosLista.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro('critico')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
              statusFiltro === 'critico'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-500'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Crítico ({resumo.total_criticos})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro('alerta')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
              statusFiltro === 'alerta'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-600 dark:text-amber-400 hover:text-amber-500'
            )}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Alerta ({resumo.total_alerta})</span>
          </button>
        </div>
      </div>

      {/* Tabela de Alunos e Frequências */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse font-semibold">
            Calculando dados de frequência e histórico de chamadas...
          </div>
        ) : alunosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <Users className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold">Nenhum aluno encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <th className="p-3.5 w-12 text-center">Nº</th>
                  <th className="p-3.5">Nome do Aluno</th>
                  <th className="p-3.5">Turma / Série</th>
                  <th className="p-3.5 text-center">Aulas Registradas</th>
                  <th className="p-3.5 text-center">Presenças</th>
                  <th className="p-3.5 text-center">Faltas</th>
                  <th className="p-3.5 text-center">% Frequência</th>
                  <th className="p-3.5 text-center">Situação</th>
                  <th className="p-3.5">Responsável / Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {alunosFiltrados.map((aluno, index) => {
                  const isCritico = aluno.status_risco === 'critico'
                  const isAlerta = aluno.status_risco === 'alerta'

                  return (
                    <tr
                      key={aluno.id}
                      className={cn(
                        'hover:bg-hoverCustom transition-colors',
                        isCritico && 'bg-rose-500/5',
                        isAlerta && 'bg-amber-500/5'
                      )}
                    >
                      <td className="p-3.5 text-center font-mono text-muted-foreground">{index + 1}</td>
                      <td className="p-3.5 font-bold text-foreground">
                        {aluno.nome}
                      </td>
                      <td className="p-3.5 text-muted-foreground font-medium">
                        {aluno.turma_nome} {aluno.serie ? `• ${aluno.serie}` : ''}
                      </td>
                      <td className="p-3.5 text-center font-semibold text-foreground">{aluno.total_aulas}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {aluno.total_presencas}
                      </td>
                      <td className="p-3.5 text-center font-bold text-rose-600 dark:text-rose-400">
                        {aluno.total_faltas}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={cn(
                            'text-sm font-extrabold',
                            isCritico
                              ? 'text-rose-600 dark:text-rose-400'
                              : isAlerta
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {aluno.percentual_frequencia.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider',
                            isCritico
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                              : isAlerta
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                          )}
                        >
                          {isCritico && <AlertTriangle className="w-3 h-3" />}
                          {isAlerta && <AlertCircle className="w-3 h-3" />}
                          {aluno.status_risco === 'critico' ? 'Risco Crítico' : aluno.status_risco === 'alerta' ? 'Alerta' : 'Regular'}
                        </span>
                      </td>
                      <td className="p-3.5 text-muted-foreground text-[11px]">
                        {aluno.responsavel_nome ? (
                          <div>
                            <span className="font-semibold text-foreground">{aluno.responsavel_nome}</span>
                            {aluno.responsavel_telefone && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <Phone className="w-3 h-3 text-muted-foreground" />
                                <span>{aluno.responsavel_telefone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground/60">Não informado</span>
                        )}
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
