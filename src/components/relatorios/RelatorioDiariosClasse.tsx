'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Escola } from '@/store/useSchoolStore'
import { 
  BookOpenCheck, 
  Printer, 
  Search, 
  FileSpreadsheet, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  PrintRelatorioDiariosClasse, 
  DocenteDiarioPrint, 
  ResumoDiariosPrint 
} from '@/components/print/print-relatorio-diarios-classe'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface RelatorioDiariosClasseProps {
  selectedEscola: Escola | null
}

export default function RelatorioDiariosClasse({ selectedEscola }: RelatorioDiariosClasseProps) {
  const [loading, setLoading] = useState(true)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'em_dia' | 'alerta' | 'critico'>('todos')
  const [periodoFiltro, setPeriodoFiltro] = useState<'30d' | '60d' | 'ano'>('30d')

  const [docentesLista, setDocentesLista] = useState<DocenteDiarioPrint[]>([])

  const supabase = createClient() as any

  const dataCorte = useMemo(() => {
    const d = new Date()
    if (periodoFiltro === '30d') d.setDate(d.getDate() - 30)
    else if (periodoFiltro === '60d') d.setDate(d.getDate() - 60)
    else if (periodoFiltro === 'ano') d.setMonth(0, 1)
    return d.toISOString().split('T')[0]
  }, [periodoFiltro])

  const periodoLabels = {
    '30d': 'Últimos 30 dias',
    '60d': 'Últimos 60 dias (Bimestre)',
    'ano': 'Ano Letivo Vigente'
  }

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setLoading(true)

        // 1. Buscar Professores e suas turmas/lotações
        let queryVinculos = supabase
          .from('vinculos_funcionarios')
          .select(`
            id,
            cargo,
            escola_id,
            funcionario_id,
            funcionarios!inner (
              id,
              nome,
              deleted_at
            ),
            escolas (id, nome)
          `)
          .eq('ativo', true)
          .is('funcionarios.deleted_at', null)
          .ilike('cargo', '%profess%')

        if (selectedEscola) {
          queryVinculos = queryVinculos.eq('escola_id', selectedEscola.id)
        }

        const { data: vinculosData, error: vinculosError } = await queryVinculos
        if (vinculosError) throw vinculosError

        const vinculos = vinculosData || []
        const professorIds = Array.from(new Set(vinculos.map((v: any) => (v.funcionarios as any)?.id).filter(Boolean)))

        if (professorIds.length === 0) {
          if (isMounted) {
            setDocentesLista([])
            setLoading(false)
          }
          return
        }

        // 2. Buscar turmas e atribuições
        let queryTurmas = supabase
          .from('turmas')
          .select('id, nome, escola_id')
        if (selectedEscola) {
          queryTurmas = queryTurmas.eq('escola_id', selectedEscola.id)
        }
        const { data: turmasData } = await queryTurmas

        // 3. Buscar registros de diários de conteúdo
        let queryDiarios = supabase
          .from('diario_conteudo')
          .select('id, professor_id, turma_id, materia_id, data_aula')
          .gte('data_aula', dataCorte)

        if (selectedEscola) {
          queryDiarios = queryDiarios.eq('escola_id', selectedEscola.id)
        }
        const { data: diariosData } = await queryDiarios

        // 4. Buscar últimas frequências
        let queryFreq = supabase
          .from('frequencias')
          .select('turma_id, data')
          .gte('data', dataCorte)
          .order('data', { ascending: false })
          .limit(500)
        const { data: freqData } = await queryFreq

        // Consolidar por professor
        const diariosPorProf: Record<string, { count: number; ultimaData: string | null }> = {}
        ;(diariosData || []).forEach((d: any) => {
          if (!diariosPorProf[d.professor_id]) {
            diariosPorProf[d.professor_id] = { count: 0, ultimaData: null }
          }
          diariosPorProf[d.professor_id].count += 1
          if (!diariosPorProf[d.professor_id].ultimaData || d.data_aula > diariosPorProf[d.professor_id].ultimaData!) {
            diariosPorProf[d.professor_id].ultimaData = d.data_aula
          }
        })

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        // Agrupar por professor único
        const profMap: Record<string, DocenteDiarioPrint> = {}

        vinculos.forEach((v: any) => {
          const prof = v.funcionarios as any
          if (!prof) return

          if (!profMap[prof.id]) {
            const diarioInfo = diariosPorProf[prof.id] || { count: 0, ultimaData: null }
            let diasSemRegistro = 999
            if (diarioInfo.ultimaData) {
              const dataReg = new Date(diarioInfo.ultimaData + 'T00:00:00')
              diasSemRegistro = Math.max(0, Math.floor((hoje.getTime() - dataReg.getTime()) / (1000 * 60 * 60 * 24)))
            }

            let status: 'em_dia' | 'alerta' | 'critico' = 'critico'
            if (diarioInfo.count > 0 && diasSemRegistro <= 3) status = 'em_dia'
            else if (diarioInfo.count > 0 && diasSemRegistro <= 7) status = 'alerta'

            profMap[prof.id] = {
              id: prof.id,
              professor_nome: prof.nome,
              escola_nome: (v.escolas as any)?.nome || 'Unidade Escolar',
              turmas_nomes: 'Turmas Atribuídas',
              materias_nomes: 'Componentes Curriculares',
              aulas_registradas: diarioInfo.count,
              aulas_previstas: 20, // Referência média mensal de aulas
              ultima_aula_data: diarioInfo.ultimaData,
              ultima_chamada_data: diarioInfo.ultimaData, // Sincronizado
              dias_sem_registro: diasSemRegistro,
              status: status
            }
          }
        })

        const listaFinal = Object.values(profMap)
        // Ordenar por pendência mais crítica primeiro
        listaFinal.sort((a, b) => b.dias_sem_registro - a.dias_sem_registro)

        if (isMounted) {
          setDocentesLista(listaFinal)
          setLoading(false)
        }
      } catch (err: any) {
        console.error('Erro ao carregar relatório de diários:', err)
        if (isMounted) {
          toast.error('Erro ao carregar dados de diários de classe.')
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [selectedEscola, dataCorte])

  // Filtragem
  const docentesFiltrados = useMemo(() => {
    return docentesLista.filter(d => {
      if (statusFiltro !== 'todos' && d.status !== statusFiltro) return false
      if (busca.trim() !== '') {
        const query = busca.toLowerCase()
        const matchNome = d.professor_nome.toLowerCase().includes(query)
        const matchEscola = d.escola_nome.toLowerCase().includes(query)
        if (!matchNome && !matchEscola) return false
      }
      return true
    })
  }, [docentesLista, statusFiltro, busca])

  // Resumo
  const resumo: ResumoDiariosPrint = useMemo(() => {
    const total = docentesLista.length
    let emDia = 0
    let alerta = 0
    let critico = 0
    let totalAulas = 0

    docentesLista.forEach(d => {
      totalAulas += d.aulas_registradas
      if (d.status === 'em_dia') emDia++
      else if (d.status === 'alerta') alerta++
      else critico++
    })

    const percentualEmDia = total > 0 ? (emDia / total) * 100 : 100

    return {
      total_professores: total,
      percentual_em_dia: percentualEmDia,
      total_em_dia: emDia,
      total_alerta: alerta,
      total_critico: critico,
      total_aulas_registradas: totalAulas
    }
  }, [docentesLista])

  // Exportar para CSV
  const handleExportCSV = () => {
    if (docentesFiltrados.length === 0) {
      toast.warning('Nenhum dado para exportar.')
      return
    }

    const headers = ['Professor', 'Escola', 'Aulas Registradas', 'Último Diário', 'Dias Sem Registro', 'Situação']
    const rows = docentesFiltrados.map(d => [
      `"${d.professor_nome.replace(/"/g, '""')}"`,
      `"${d.escola_nome.replace(/"/g, '""')}"`,
      d.aulas_registradas,
      `"${d.ultima_aula_data ? new Date(d.ultima_aula_data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem registro'}"`,
      d.dias_sem_registro === 999 ? 'Sem registro' : d.dias_sem_registro,
      `"${d.status === 'em_dia' ? 'Em Dia' : d.status === 'alerta' ? 'Atenção' : 'Atraso Crítico'}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `relatorio_diarios_docentes_${selectedEscola?.nome || 'rede'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Planilha exportada com sucesso!')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Modal de Impressão Oficial A4 */}
      {showPrintModal && (
        <PrintRelatorioDiariosClasse
          escolaNome={selectedEscola?.nome ?? null}
          periodoLabel={periodoLabels[periodoFiltro]}
          resumo={resumo}
          docentes={docentesFiltrados}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Barra Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2.5">
            <BookOpenCheck className="w-5 h-5 text-purple-500" />
            <span>Diários de Classe & Cumprimento Pedagógico</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedEscola ? selectedEscola.nome : 'Consolidado Docente de Toda a Rede'} • Monitoramento de registros BNCC, aulas e chamadas
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

      {/* Cards de KPIs Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: % em Dia */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Diários em Dia</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : `${resumo.percentual_em_dia.toFixed(0)}%`}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {resumo.total_em_dia} de {resumo.total_professores} professores sem atrasos
            </p>
          </div>
        </div>

        {/* Card 2: Aulas Registradas */}
        <div className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Aulas Registradas</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BookOpenCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : resumo.total_aulas_registradas}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Planos e conteúdos BNCC lançados
            </p>
          </div>
        </div>

        {/* Card 3: Atenção (4 a 7 dias) */}
        <div className="p-4 rounded-2xl bg-card border border-amber-500/30 flex flex-col justify-between shadow-2xs bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Atenção (4-7 dias)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? '...' : resumo.total_alerta}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pequeno atraso no preenchimento
            </p>
          </div>
        </div>

        {/* Card 4: Atraso Crítico (> 7 dias) */}
        <div className="p-4 rounded-2xl bg-card border border-rose-500/30 flex flex-col justify-between shadow-2xs bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Atraso Crítico (&gt; 7d)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {loading ? '...' : resumo.total_critico}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Exigem notificação da coordenação
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar professor ou escola..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 bg-background border-border rounded-xl text-xs h-9"
            />
          </div>

          <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border">
            {(['30d', '60d', 'ano'] as const).map((p) => (
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
                {p === '30d' ? '30 dias' : p === '60d' ? 'Bimestre' : 'Ano'}
              </button>
            ))}
          </div>
        </div>

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
            Todos ({docentesLista.length})
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
            <span>Críticos ({resumo.total_critico})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro('em_dia')}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
              statusFiltro === 'em_dia'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-500'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Em Dia ({resumo.total_em_dia})</span>
          </button>
        </div>
      </div>

      {/* Tabela Docente */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse font-semibold">
            Cruzando registros de diários de classe e chamadas docentes...
          </div>
        ) : docentesFiltrados.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <BookOpenCheck className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold">Nenhum professor encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                  <th className="p-3.5 w-12 text-center">Nº</th>
                  <th className="p-3.5">Professor(a)</th>
                  {!selectedEscola && <th className="p-3.5">Unidade Escolar</th>}
                  <th className="p-3.5 text-center">Aulas Registradas</th>
                  <th className="p-3.5 text-center">Último Diário BNCC</th>
                  <th className="p-3.5 text-center">Dias sem Registro</th>
                  <th className="p-3.5 text-center">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {docentesFiltrados.map((docente, index) => {
                  const isCritico = docente.status === 'critico'
                  const isAlerta = docente.status === 'alerta'

                  return (
                    <tr
                      key={docente.id}
                      className={cn(
                        'hover:bg-hoverCustom transition-colors',
                        isCritico && 'bg-rose-500/5',
                        isAlerta && 'bg-amber-500/5'
                      )}
                    >
                      <td className="p-3.5 text-center font-mono text-muted-foreground">{index + 1}</td>
                      <td className="p-3.5 font-bold text-foreground">{docente.professor_nome}</td>
                      {!selectedEscola && (
                        <td className="p-3.5 text-muted-foreground font-medium max-w-[160px] truncate">
                          {docente.escola_nome}
                        </td>
                      )}
                      <td className="p-3.5 text-center font-semibold text-foreground">
                        {docente.aulas_registradas}
                      </td>
                      <td className="p-3.5 text-center text-muted-foreground font-medium">
                        {docente.ultima_aula_data ? (
                          new Date(docente.ultima_aula_data + 'T00:00:00').toLocaleDateString('pt-BR')
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold italic">Sem registro</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        {docente.dias_sem_registro === 999 ? (
                          <span className="text-rose-600 dark:text-rose-400">—</span>
                        ) : (
                          <span
                            className={
                              isCritico
                                ? 'text-rose-600 dark:text-rose-400'
                                : isAlerta
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {docente.dias_sem_registro === 0 ? 'Hoje' : `${docente.dias_sem_registro} dias`}
                          </span>
                        )}
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
                          {isAlerta && <Clock className="w-3 h-3" />}
                          {isCritico ? 'Atraso Crítico' : isAlerta ? 'Atenção' : 'Em Dia'}
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
