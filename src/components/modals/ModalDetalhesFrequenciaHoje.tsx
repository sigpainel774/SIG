'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Loader2,
  Users,
  BookOpen,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PrintDetalhesFrequencia, FrequenciaPrintData } from '@/components/print/PrintDetalhesFrequencia'

interface MateriaDetalhe {
  materiaId: string | null
  materiaNome: string
  professorNome?: string | null
  totalAlunosFrequencia: number
  presencas: number
  faltas: number
  percentualPresenca: number
  status: 'lancada' | 'pendente'
  horarioLancamento?: string | null
}

interface TurmaDetalhe {
  turmaId: string
  turmaNome: string
  turno: string | null
  totalAlunos: number
  statusTurma: 'completa' | 'parcial' | 'pendente'
  materiasLancadasCount: number
  materiasTotalCount: number
  materias: MateriaDetalhe[]
}

interface FrequenciaDetalhesResponse {
  data: string
  escolaId: string
  totalTurmas: number
  turmasComFrequencia: number
  totalPresencasGeral: number
  totalFaltasGeral: number
  percentualPresencaGeral: number
  turmas: TurmaDetalhe[]
}

interface ModalDetalhesFrequenciaHojeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  escolaId: string | null | undefined
  escolaNome?: string
  escolaLogoUrl?: string | null
}

export function ModalDetalhesFrequenciaHoje({
  open,
  onOpenChange,
  escolaId,
  escolaNome = 'Escola',
  escolaLogoUrl,
}: ModalDetalhesFrequenciaHojeProps) {
  // Configuração da data inicial (fuso de Brasília UTC-3)
  const getHojeISO = () => {
    return new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  }

  const [dataSelecionada, setDataSelecionada] = useState<string>(getHojeISO())
  const [detalhes, setDetalhes] = useState<FrequenciaDetalhesResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<'todas' | 'completa' | 'parcial' | 'pendente'>('todas')
  const [turmaExpandida, setTurmaExpandida] = useState<Record<string, boolean>>({})

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Carregar detalhamento de frequência quando abre ou altera a data / escola
  const fetchDetalhes = useCallback(async (selectedDate: string, targetEscolaId: string) => {
    if (isMounted.current) setLoading(true)
    try {
      const res = await fetch(`/api/home/frequencia-detalhes?escolaId=${targetEscolaId}&data=${selectedDate}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: FrequenciaDetalhesResponse = await res.json()
      if (isMounted.current) {
        setDetalhes(data)
        // Por padrão, abre a expansão de todas as turmas que possuem lançamentos
        const expandMap: Record<string, boolean> = {}
        data.turmas?.forEach((t) => {
          expandMap[t.turmaId] = t.materiasLancadasCount > 0
        })
        setTurmaExpandida(expandMap)
      }
    } catch (err) {
      console.error('[ModalDetalhesFrequenciaHoje] Erro ao carregar frequência:', err)
      toast.error('Não foi possível carregar os detalhes da frequência.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && escolaId) {
      fetchDetalhes(dataSelecionada, escolaId)
    }
  }, [open, escolaId, dataSelecionada, fetchDetalhes])

  // Navegação de dias
  const handleDiaAnterior = () => {
    const dateObj = new Date(`${dataSelecionada}T12:00:00`)
    dateObj.setDate(dateObj.getDate() - 1)
    setDataSelecionada(dateObj.toISOString().split('T')[0])
  }

  const handleProximoDia = () => {
    const dateObj = new Date(`${dataSelecionada}T12:00:00`)
    dateObj.setDate(dateObj.getDate() + 1)
    setDataSelecionada(dateObj.toISOString().split('T')[0])
  }

  const handleIrParaHoje = () => {
    setDataSelecionada(getHojeISO())
  }

  // Formatação amigável da data exibida
  const formatarDataPorExtenso = (isoDate: string) => {
    try {
      const [ano, mes, dia] = isoDate.split('-').map(Number)
      const d = new Date(ano, mes - 1, dia, 12, 0, 0)
      const formatador = new Intl.DateTimeFormat('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      const texto = formatador.format(d)
      return texto.charAt(0).toUpperCase() + texto.slice(1)
    } catch {
      return isoDate
    }
  }

  // Impressão
  const handleImprimir = () => {
    if (!detalhes) {
      toast.error('Aguarde os dados serem carregados antes de imprimir.')
      return
    }
    window.print()
  }

  // Alternar expansão de turma
  const toggleExpand = (turmaId: string) => {
    setTurmaExpandida((prev) => ({
      ...prev,
      [turmaId]: !prev[turmaId],
    }))
  }

  // Filtrar turmas por termo de busca e status
  const turmasFiltradas = (detalhes?.turmas || []).filter((turma) => {
    const matchSearch = turma.turmaNome.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchSearch) return false

    if (filterStatus === 'todas') return true
    return turma.statusTurma === filterStatus
  })

  // Dados para o portal de impressão
  const printData: FrequenciaPrintData | null = detalhes
    ? {
        data: detalhes.data,
        escolaNome,
        escolaLogoUrl,
        totalTurmas: detalhes.totalTurmas,
        turmasComFrequencia: detalhes.turmasComFrequencia,
        totalPresencasGeral: detalhes.totalPresencasGeral,
        totalFaltasGeral: detalhes.totalFaltasGeral,
        percentualPresencaGeral: detalhes.percentualPresencaGeral,
        turmas: detalhes.turmas,
      }
    : null

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Detalhamento da Frequência Diária"
        description={`Registro de presença e chamadas lançadas por turma e matéria — ${escolaNome}`}
        maxWidth="sm:max-w-5xl"
      >
        <div className="space-y-5">
          {/* ── BARRA DE CONTROLE DE DATA & AÇÕES ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-2 border border-borderCustom p-3.5 rounded-2xl shadow-sm">
            {/* Navegador de datas com setas */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-surface-1 border border-borderCustom rounded-xl p-1 shadow-sm">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDiaAnterior}
                  title="Dia anterior"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-surface-2 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-2 px-2.5">
                  <CalendarIcon className="w-4 h-4 text-highlight shrink-0" />
                  <input
                    type="date"
                    value={dataSelecionada}
                    onChange={(e) => e.target.value && setDataSelecionada(e.target.value)}
                    className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer border-none p-0"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleProximoDia}
                  title="Próximo dia"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-surface-2 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleIrParaHoje}
                disabled={dataSelecionada === getHojeISO()}
                className="h-9 text-xs font-semibold border-borderCustom hover:bg-surface-3 rounded-xl gap-1.5"
              >
                Hoje
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => escolaId && fetchDetalhes(dataSelecionada, escolaId)}
                disabled={loading}
                title="Atualizar dados"
                className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-surface-3 rounded-xl"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
            </div>

            {/* Texto de data por extenso & Botão Imprimir */}
            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-borderCustom">
              <span className="text-xs font-semibold text-muted-foreground hidden lg:inline">
                {formatarDataPorExtenso(dataSelecionada)}
              </span>

              <Button
                onClick={handleImprimir}
                disabled={loading || !detalhes}
                className="bg-highlight hover:bg-highlight/90 text-background font-bold text-xs h-9 px-4 rounded-xl gap-2 shadow-sm shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Relatório</span>
              </Button>
            </div>
          </div>

          {/* ── PAINEL RESUMO DE INDICADORES DO DIA ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-surface-1 border-borderCustom p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Turmas Registradas</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {loading ? '...' : `${detalhes?.turmasComFrequencia ?? 0} / ${detalhes?.totalTurmas ?? 0}`}
                </p>
              </div>
            </Card>

            <Card className="bg-surface-1 border-borderCustom p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-mutedmerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Presenças</p>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">
                  {loading ? '...' : (detalhes?.totalPresencasGeral ?? 0)}
                </p>
              </div>
            </Card>

            <Card className="bg-surface-1 border-borderCustom p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Faltas</p>
                <p className="text-lg font-bold text-rose-400 tabular-nums">
                  {loading ? '...' : (detalhes?.totalFaltasGeral ?? 0)}
                </p>
              </div>
            </Card>

            <Card className="bg-surface-1 border-borderCustom p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground">Presença Geral</p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {loading ? '...' : `${detalhes?.percentualPresencaGeral ?? 0}%`}
                </p>
              </div>
            </Card>
          </div>

          {/* ── BARRA DE FILTROS & BUSCA ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar turma por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-surface-1 border-borderCustom rounded-xl focus:ring-1 focus:ring-highlight"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'todas', label: 'Todas' },
                { id: 'completa', label: 'Completa' },
                { id: 'parcial', label: 'Parcial' },
                { id: 'pendente', label: 'Pendente' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
                    filterStatus === tab.id
                      ? 'bg-highlight text-background shadow-sm'
                      : 'bg-surface-1 text-muted-foreground hover:text-foreground hover:bg-surface-2 border border-borderCustom'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── LISTA DE TURMAS E DETALHAMENTO DE MATÉRIAS ── */}
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 border border-dashed border-borderCustom rounded-2xl bg-surface-1/50">
              <Loader2 className="w-8 h-8 animate-spin text-highlight" />
              <p className="text-xs text-muted-foreground font-medium">Buscando detalhamento de frequência...</p>
            </div>
          ) : turmasFiltradas.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-borderCustom rounded-2xl bg-surface-1/50 p-6">
              <AlertCircle className="w-10 h-10 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-sm font-semibold text-foreground">Nenhuma turma encontrada</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Não há registros de frequência que correspondam aos filtros selecionados para o dia{' '}
                <span className="font-bold text-foreground">{dataSelecionada}</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {turmasFiltradas.map((turma) => {
                const isExpanded = turmaExpandida[turma.turmaId] ?? true
                return (
                  <Card
                    key={turma.turmaId}
                    className="bg-surface-1 border-borderCustom rounded-2xl overflow-hidden shadow-sm transition-all"
                  >
                    {/* Cabeçalho do Card da Turma */}
                    <div
                      onClick={() => toggleExpand(turma.turmaId)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-2/60 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-surface-2 border border-borderCustom flex items-center justify-center text-xs font-bold text-highlight">
                          {turma.turmaNome.slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-foreground">{turma.turmaNome}</h4>
                            {turma.turno && (
                              <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-surface-2 border border-borderCustom font-medium">
                                {turma.turno}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {turma.totalAlunos} aluno{turma.totalAlunos !== 1 ? 's' : ''} • {turma.materiasLancadasCount} de {turma.materiasTotalCount} matéria(s) lançada(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status da Turma */}
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider',
                            turma.statusTurma === 'completa'
                              ? 'bg-mutedmerald-500/10 text-emerald-400 border-emerald-500/20'
                              : turma.statusTurma === 'parcial'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          )}
                        >
                          {turma.statusTurma}
                        </span>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? (
                            <ChevronRight className="w-4 h-4 rotate-90 transition-transform" />
                          ) : (
                            <ChevronRight className="w-4 h-4 transition-transform" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Detalhamento das Matérias */}
                    {isExpanded && (
                      <div className="border-t border-borderCustom bg-background p-3">
                        {turma.materias.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2 text-center">
                            Nenhuma disciplina cadastrada nesta turma.
                          </p>
                        ) : (
                          <div className="rounded-xl border border-borderCustom overflow-hidden overflow-x-auto">
                            <table className="w-full text-xs text-left min-w-[620px]">
                              <thead className="bg-surface-2/80 text-muted-foreground uppercase text-[10px] font-bold border-b border-borderCustom">
                                <tr>
                                  <th className="py-2 px-3">Disciplina</th>
                                  <th className="py-2 px-3">Professor</th>
                                  <th className="py-2 px-3 text-center">Status</th>
                                  <th className="py-2 px-3 text-center">Presenças</th>
                                  <th className="py-2 px-3 text-center">Faltas</th>
                                  <th className="py-2 px-3 text-center">% Presença</th>
                                  <th className="py-2 px-3 text-right">Horário</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-borderCustom/60 text-foreground">
                                {turma.materias.map((mat, idx) => (
                                  <tr
                                    key={mat.materiaId || `mat-${idx}`}
                                    className="hover:bg-surface-2/40 transition-colors"
                                  >
                                    <td className="py-2 px-3 font-semibold text-foreground">
                                      {mat.materiaNome}
                                    </td>
                                    <td className="py-2 px-3 text-muted-foreground text-[11px]">
                                      {mat.professorNome ?? 'Professor não vinculado'}
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {mat.status === 'lancada' ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-mutedmerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                          <CheckCircle2 className="w-3 h-3" /> Lançada
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                          <Clock className="w-3 h-3" /> Pendente
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold text-emerald-400 tabular-nums">
                                      {mat.presencas}
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold text-rose-400 tabular-nums">
                                      {mat.faltas}
                                    </td>
                                    <td className="py-2 px-3 text-center font-bold tabular-nums">
                                      {mat.status === 'lancada' ? (
                                        <span
                                          className={cn(
                                            mat.percentualPresenca >= 80
                                              ? 'text-emerald-400'
                                              : mat.percentualPresenca >= 50
                                              ? 'text-amber-400'
                                              : 'text-rose-400'
                                          )}
                                        >
                                          {mat.percentualPresenca}%
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-right text-muted-foreground font-mono text-[11px]">
                                      {mat.horarioLancamento ?? '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </StandardDialog>

      {/* Renderização oculta para Portal de Impressão Física */}
      <PrintDetalhesFrequencia data={printData} />
    </>
  )
}
