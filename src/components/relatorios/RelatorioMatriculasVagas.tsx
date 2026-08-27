'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Escola } from '@/store/useSchoolStore'
import { 
  GraduationCap, 
  Printer, 
  Search, 
  FileSpreadsheet, 
  Building2, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  PieChart,
  BarChart3,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  PrintRelatorioMatriculasVagas, 
  TurmaVagasPrint, 
  ModalidadeBreakdownPrint, 
  ResumoMatriculasVagasPrint 
} from '@/components/print/print-relatorio-matriculas-vagas'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RelatorioMatriculasVagasProps {
  selectedEscola: Escola | null
}

export default function RelatorioMatriculasVagas({ selectedEscola }: RelatorioMatriculasVagasProps) {
  const [loading, setLoading] = useState(true)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroTurno, setFiltroTurno] = useState<string>('todos')
  const [filtroLotacao, setFiltroLotacao] = useState<'todos' | 'livre' | 'limite' | 'lotada'>('todos')

  const [turmasLista, setTurmasLista] = useState<TurmaVagasPrint[]>([])
  const [modalidadesLista, setModalidadesLista] = useState<ModalidadeBreakdownPrint[]>([])

  const supabase = createClient() as any

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setLoading(true)

        // 1. Buscar Turmas
        let queryTurmas = supabase
          .from('turmas')
          .select(`
            id,
            nome,
            serie,
            turno,
            capacidade_maxima,
            escola_id,
            escolas (id, nome)
          `)
          .order('nome', { ascending: true })

        if (selectedEscola) {
          queryTurmas = queryTurmas.eq('escola_id', selectedEscola.id)
        }

        const { data: turmasData, error: turmasError } = await queryTurmas
        if (turmasError) throw turmasError

        // 2. Buscar Alunos Ativos
        let queryAlunos = supabase
          .from('alunos')
          .select(`
            id,
            nome,
            turma_id,
            escola_id,
            serie,
            dados_matricula,
            deleted_at
          `)
          .is('deleted_at', null)

        if (selectedEscola) {
          queryAlunos = queryAlunos.eq('escola_id', selectedEscola.id)
        }

        const { data: alunosData, error: alunosError } = await queryAlunos
        if (alunosError) throw alunosError

        const alunos = alunosData || []
        const turmas = turmasData || []

        // Mapear contagem de alunos por turma
        const alunosPorTurma: Record<string, number> = {}
        const modalidadeContagem: Record<string, number> = {}

        alunos.forEach((a: any) => {
          if (a.turma_id) {
            alunosPorTurma[a.turma_id] = (alunosPorTurma[a.turma_id] || 0) + 1
          }

          // Extrair modalidade dos dados de matrícula
          const dm = (a.dados_matricula as any) || {}
          let mod = dm.modalidade || dm.etapa || 'Ensino Regular'
          if (/eja/i.test(mod) || /eja/i.test(a.serie || '')) mod = 'EJA'
          else if (/infantil|creche|pré/i.test(mod) || /infantil|creche/i.test(a.serie || '')) mod = 'Educação Infantil'
          else if (/fundamental/i.test(mod) || /ano/i.test(a.serie || '')) mod = 'Ensino Fundamental'
          else if (/especial|aee/i.test(mod)) mod = 'AEE / Especial'

          modalidadeContagem[mod] = (modalidadeContagem[mod] || 0) + 1
        })

        // Estruturar dados das turmas
        const mappedTurmas: TurmaVagasPrint[] = turmas.map((t: any) => {
          const matriculados = alunosPorTurma[t.id] || 0
          const capacidade = Number(t.capacidade_maxima) > 0 ? Number(t.capacidade_maxima) : 30 // Capacidade padrão 30
          const vagasLivres = Math.max(0, capacidade - matriculados)
          const taxa = (matriculados / capacidade) * 100

          let statusLotacao: 'livre' | 'ideal' | 'limite' | 'lotada' = 'ideal'
          if (taxa >= 100) statusLotacao = 'lotada'
          else if (taxa >= 90) statusLotacao = 'limite'
          else if (taxa <= 60) statusLotacao = 'livre'

          return {
            id: t.id,
            escola_nome: (t.escolas as any)?.nome || 'Unidade Escolar',
            turma_nome: t.nome,
            serie_etapa: t.serie || 'Regular',
            turno: t.turno || 'Matutino',
            capacidade: capacidade,
            matriculados: matriculados,
            vagas_livres: vagasLivres,
            taxa_ocupacao: taxa,
            status_lotacao: statusLotacao
          }
        })

        // Estruturar modalidades
        const totalAlunos = alunos.length
        const mappedModalidades: ModalidadeBreakdownPrint[] = Object.entries(modalidadeContagem).map(([mod, count]) => ({
          modalidade: mod,
          total_alunos: count,
          percentual: totalAlunos > 0 ? (count / totalAlunos) * 100 : 0
        })).sort((a, b) => b.total_alunos - a.total_alunos)

        if (isMounted) {
          setTurmasLista(mappedTurmas)
          setModalidadesLista(mappedModalidades)
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados de matrículas e vagas:', err)
        if (isMounted) {
          toast.error('Erro ao carregar os dados de vagas.')
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [selectedEscola])

  // Filtragem de Turmas
  const turmasFiltradas = useMemo(() => {
    return turmasLista.filter(t => {
      if (filtroTurno !== 'todos' && t.turno !== filtroTurno) return false
      if (filtroLotacao !== 'todos' && t.status_lotacao !== filtroLotacao) return false
      if (busca.trim() !== '') {
        const query = busca.toLowerCase()
        const matchNome = t.turma_nome.toLowerCase().includes(query)
        const matchEscola = t.escola_nome.toLowerCase().includes(query)
        const matchSerie = t.serie_etapa.toLowerCase().includes(query)
        if (!matchNome && !matchEscola && !matchSerie) return false
      }
      return true
    })
  }, [turmasLista, filtroTurno, filtroLotacao, busca])

  // Resumo Geral Consolidado
  const resumo: ResumoMatriculasVagasPrint = useMemo(() => {
    const totalTurmas = turmasLista.length
    let totalMatriculados = 0
    let totalCapacidade = 0
    let totalVagasLivres = 0
    let turmasLotadas = 0

    turmasLista.forEach(t => {
      totalMatriculados += t.matriculados
      totalCapacidade += t.capacidade
      totalVagasLivres += t.vagas_livres
      if (t.status_lotacao === 'lotada') turmasLotadas++
    })

    const taxaGeral = totalCapacidade > 0 ? (totalMatriculados / totalCapacidade) * 100 : 0

    return {
      total_matriculados: totalMatriculados,
      capacidade_total: totalCapacidade,
      taxa_ocupacao_geral: taxaGeral,
      vagas_disponiveis: totalVagasLivres,
      total_turmas: totalTurmas,
      turmas_lotadas: turmasLotadas
    }
  }, [turmasLista])

  // Exportar para CSV
  const handleExportCSV = () => {
    if (turmasFiltradas.length === 0) {
      toast.warning('Nenhum dado para exportar.')
      return
    }

    const headers = ['Escola', 'Turma', 'Série / Etapa', 'Turno', 'Capacidade', 'Matriculados', 'Vagas Livres', '% Ocupação', 'Situação']
    const rows = turmasFiltradas.map(t => [
      `"${t.escola_nome.replace(/"/g, '""')}"`,
      `"${t.turma_nome.replace(/"/g, '""')}"`,
      `"${t.serie_etapa.replace(/"/g, '""')}"`,
      `"${t.turno}"`,
      t.capacidade,
      t.matriculados,
      t.vagas_livres,
      `${t.taxa_ocupacao.toFixed(0)}%`,
      `"${t.status_lotacao === 'lotada' ? 'Lotada (100%+)' : t.status_lotacao === 'limite' ? 'No Limite' : 'Vagas Disponíveis'}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `censo_matriculas_vagas_${selectedEscola?.nome || 'rede'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Planilha exportada com sucesso!')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Modal de Impressão Oficial A4 */}
      {showPrintModal && (
        <PrintRelatorioMatriculasVagas
          escolaNome={selectedEscola?.nome ?? null}
          resumo={resumo}
          turmas={turmasFiltradas}
          modalidades={modalidadesLista}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Barra Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-primary" />
            <span>Matrículas & Ocupação de Vagas (Censo)</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedEscola ? selectedEscola.nome : 'Consolidado de Vagas da Rede Municipal'} • Diagnóstico de capacidade instalada e turmas
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
            <span>Imprimir Censo</span>
          </Button>
        </div>
      </div>

      {/* Cards de KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Card 1: Total Matriculados */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Alunos Ativos</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : resumo.total_matriculados}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Matrículas ativas no sistema
            </p>
          </div>
        </div>

        {/* Card 2: Capacidade Total */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Capacidade Total</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : resumo.capacidade_total}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Vagas homologadas nas salas
            </p>
          </div>
        </div>

        {/* Card 3: Taxa de Ocupação */}
        <div className="p-4 rounded-2xl bg-card border border-primary/30 flex flex-col justify-between shadow-2xs bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary">Taxa de Ocupação</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-primary">
              {loading ? '...' : `${resumo.taxa_ocupacao_geral.toFixed(1)}%`}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Média de preenchimento
            </p>
          </div>
        </div>

        {/* Card 4: Vagas Disponíveis */}
        <div className="p-4 rounded-2xl bg-card border border-emerald-500/30 flex flex-col justify-between shadow-2xs bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Vagas Livres</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {loading ? '...' : resumo.vagas_disponiveis}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Vagas disponíveis para ingresso
            </p>
          </div>
        </div>

        {/* Card 5: Turmas Lotadas */}
        <div className="p-4 rounded-2xl bg-card border border-rose-500/30 flex flex-col justify-between shadow-2xs bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Turmas Lotadas</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {loading ? '...' : `${resumo.turmas_lotadas} / ${resumo.total_turmas}`}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Turmas em 100% da capacidade
            </p>
          </div>
        </div>
      </div>

      {/* Distribuição por Modalidade de Ensino */}
      {modalidadesLista.length > 0 && (
        <div className="p-5 rounded-2xl bg-card border border-border shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3.5 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Matrículas por Etapa & Modalidade</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {modalidadesLista.map((m) => (
              <div key={m.modalidade} className="p-3.5 rounded-xl bg-surface-1 border border-border">
                <div className="text-xs font-bold text-foreground truncate">{m.modalidade}</div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-lg font-black text-foreground">{m.total_alunos}</span>
                  <span className="text-xs font-bold text-primary">{m.percentual.toFixed(1)}%</span>
                </div>
                {/* Barra percentual mini */}
                <div className="w-full bg-border/50 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, m.percentual)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar turma, escola ou série..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 bg-background border-border rounded-xl text-xs h-9"
            />
          </div>

          <select
            value={filtroTurno}
            onChange={(e) => setFiltroTurno(e.target.value)}
            aria-label="Filtrar por Turno"
            className="h-9 px-3 bg-background border border-border text-foreground rounded-xl text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="todos">Todos os Turnos</option>
            <option value="Matutino">Matutino</option>
            <option value="Vespertino">Vespertino</option>
            <option value="Noturno">Noturno</option>
            <option value="Integral">Integral</option>
          </select>
        </div>

        <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setFiltroLotacao('todos')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              filtroLotacao === 'todos'
                ? 'bg-muted text-foreground font-bold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Todas ({turmasLista.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroLotacao('lotada')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
              filtroLotacao === 'lotada'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:text-rose-500'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Lotadas ({resumo.turmas_lotadas})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroLotacao('livre')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
              filtroLotacao === 'livre'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Com Vagas</span>
          </button>
        </div>
      </div>

      {/* Tabela Detalhada de Turmas e Capacidade */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse font-semibold">
            Consolidando dados de turmas e matrículas...
          </div>
        ) : turmasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <GraduationCap className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold">Nenhuma turma encontrada para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <th className="p-3.5 w-12 text-center">Nº</th>
                  {!selectedEscola && <th className="p-3.5">Unidade Escolar</th>}
                  <th className="p-3.5">Turma</th>
                  <th className="p-3.5">Série / Etapa</th>
                  <th className="p-3.5 text-center">Turno</th>
                  <th className="p-3.5 text-center">Capacidade</th>
                  <th className="p-3.5 text-center">Matriculados</th>
                  <th className="p-3.5 text-center">Vagas Livres</th>
                  <th className="p-3.5 w-44 text-center">% Ocupação</th>
                  <th className="p-3.5 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {turmasFiltradas.map((turma, index) => {
                  const isLotada = turma.status_lotacao === 'lotada'
                  const isLimite = turma.status_lotacao === 'limite'

                  return (
                    <tr
                      key={turma.id}
                      className={cn(
                        'hover:bg-hoverCustom transition-colors',
                        isLotada && 'bg-rose-500/5',
                        isLimite && 'bg-amber-500/5'
                      )}
                    >
                      <td className="p-3.5 text-center font-mono text-muted-foreground">{index + 1}</td>
                      {!selectedEscola && (
                        <td className="p-3.5 text-muted-foreground font-medium max-w-[160px] truncate">
                          {turma.escola_nome}
                        </td>
                      )}
                      <td className="p-3.5 font-bold text-foreground">{turma.turma_nome}</td>
                      <td className="p-3.5 text-muted-foreground">{turma.serie_etapa}</td>
                      <td className="p-3.5 text-center text-muted-foreground">{turma.turno}</td>
                      <td className="p-3.5 text-center font-semibold text-foreground">{turma.capacidade}</td>
                      <td className="p-3.5 text-center font-bold text-foreground">{turma.matriculados}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {turma.vagas_livres > 0 ? turma.vagas_livres : 0}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-border/50 h-2 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-300',
                                isLotada ? 'bg-rose-500' : isLimite ? 'bg-amber-500' : 'bg-primary'
                              )}
                              style={{ width: `${Math.min(100, turma.taxa_ocupacao)}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              'text-xs font-bold w-10 text-right',
                              isLotada ? 'text-rose-600 dark:text-rose-400' : isLimite ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                            )}
                          >
                            {turma.taxa_ocupacao.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider',
                            isLotada
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30'
                              : isLimite
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                          )}
                        >
                          {isLotada && <AlertTriangle className="w-3 h-3" />}
                          {isLotada ? 'Lotada (100%+)' : isLimite ? 'No Limite' : 'Vagas Abertas'}
                        </span>
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
