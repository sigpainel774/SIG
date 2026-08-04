'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { 
  Users, 
  Briefcase, 
  PieChart as PieChartIcon, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  Building2, 
  GraduationCap, 
  DollarSign,
  FileSpreadsheet,
  Printer,
  Eye,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { StandardDialog } from '@/components/ui/standard-dialog'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { PrintRelatorioServidores, ServidorNominalPrint } from '@/components/print/print-relatorio-servidores'
import { ModalServidoresDiscriminados } from '@/components/modals/modal-servidores-discriminados'

interface ResumoData {
  total_servidores_unicos: number
  total_cargos_ocupados: number
  total_contratados: number
  total_concursados: number
  total_nomeados: number
  total_outros: number
  total_regular: number
  total_eja: number
}

interface CargoBreakdown {
  cargo: string
  ocupacoes: number
  regular: number
  eja: number
  concursados: number
  contratados: number
  nomeados: number
  outros: number
}

interface OcupanteCargo {
  id: string
  vinculo_id: string
  nome: string
  cpf?: string | null
  cargoCalculado: string
  orgao: string
  modalidade: string
  vinculo: string
  status: string
}

interface RelatorioServidoresPayload {
  resumo: ResumoData
  cargos: CargoBreakdown[]
}

const COLORS_VINCULO = {
  Concursado: '#3b82f6', // azul
  Contratado: '#10b981', // verde
  Nomeado: '#8b5cf6',    // roxo
  Outros: '#f59e0b',     // âmbar
}

const PALETTE_CARGOS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', 
  '#06b6d4', '#f97316', '#64748b', '#14b8a6', '#a855f7'
]

export default function RelatorioServidores() {
  const supabase = createClient()
  const { escolas, selectedEscola } = useSchoolStore()
  const { acessos, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()

  const isSuperAdminOrNivel1 = isAdminGlobalOrRoot() || acessos?.some(a => a.nivel === 1 && a.ativo)

  const [activeTab, setActiveTab] = useState<'geral' | 'orcamento'>('geral')
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [reportData, setReportData] = useState<RelatorioServidoresPayload>({
    resumo: {
      total_servidores_unicos: 0,
      total_cargos_ocupados: 0,
      total_contratados: 0,
      total_concursados: 0,
      total_nomeados: 0,
      total_outros: 0,
      total_regular: 0,
      total_eja: 0,
    },
    cargos: [],
  })

  // Estados do Modal de Impressão A4
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [printModoView, setPrintModoView] = useState<'sintetico' | 'nominal'>('sintetico')
  const [servidoresNominais, setServidoresNominais] = useState<ServidorNominalPrint[]>([])
  const [isLoadingNominal, setIsLoadingNominal] = useState(false)

  // Estados do Modal de Detalhamento de Servidores por Vínculo (Secretarias/Unidades)
  const [isDiscriminadosModalOpen, setIsDiscriminadosModalOpen] = useState(false)
  const [selectedVinculoModal, setSelectedVinculoModal] = useState<string>('Total')

  const handleAbrirDiscriminadosModal = useCallback((tipoVinculo: string) => {
    setSelectedVinculoModal(tipoVinculo)
    setIsDiscriminadosModalOpen(true)
  }, [])

  // Estados do Modal de Detalhamento dos Ocupantes por Cargo
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false)
  const [cargoModalName, setCargoModalName] = useState<string>('')
  const [occupantsList, setOccupantsList] = useState<OcupanteCargo[]>([])
  const [isLoadingOccupants, setIsLoadingOccupants] = useState(false)
  const [occupantSearch, setOccupantSearch] = useState('')
  const occupantRequestCounter = useRef(0)

  const isMountedRef = useRef(true)
  const requestCounter = useRef(0)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Filtros em tempo real
  const [filtroEscolaId, setFiltroEscolaId] = useState<string>('')
  const [filtroCargo, setFiltroCargo] = useState<string>('')
  const [filtroModalidade, setFiltroModalidade] = useState<string>('Todos')
  const [filtroVinculo, setFiltroVinculo] = useState<string>('Todos')

  // Abertura e carga do modal de ocupantes por cargo
  const handleOpenCargoModal = useCallback(async (cargoName: string) => {
    setCargoModalName(cargoName)
    setIsCargoModalOpen(true)
    setIsLoadingOccupants(true)
    setOccupantSearch('')

    const currentReq = ++occupantRequestCounter.current

    try {
      let query = supabase
        .from('vinculos_funcionarios')
        .select(`
          id,
          cargo,
          escola_id,
          escolas (nome),
          funcionarios!inner (
            id,
            nome,
            cpf,
            status,
            cargo,
            modalidade_ensino,
            tipo_vinculo,
            is_conta_especial,
            deleted_at
          )
        `)
        .eq('ativo', true)
        .is('funcionarios.deleted_at', null)

      if (filtroEscolaId) {
        query = query.eq('escola_id', filtroEscolaId)
      }

      const { data, error } = await query

      if (!isMountedRef.current || currentReq !== occupantRequestCounter.current) return

      if (error) {
        console.error('Erro ao buscar ocupantes do cargo:', error)
        toast.error('Erro ao carregar lista de ocupantes do cargo.')
        setOccupantsList([])
        return
      }

      if (data) {
        const filteredAndMapped: OcupanteCargo[] = (data as any[])
          .filter((v) => !v.funcionarios?.is_conta_especial)
          .filter((v) => {
            const statusUpper = (v.funcionarios?.status ?? 'ATIVO').toUpperCase()
            return statusUpper === 'ATIVO' || statusUpper === ''
          })
          .map((v) => {
            const f = v.funcionarios
            const cargoFinal = (v.cargo || f.cargo || 'Cargo não informado').trim()

            const tipoVincUpper = (f.tipo_vinculo ?? '').toUpperCase()
            let vinculoTipoFinal = 'Outros'
            if (tipoVincUpper.includes('EFETIVO') || tipoVincUpper.includes('CONCURSADO')) {
              vinculoTipoFinal = 'Concursado / Efetivo'
            } else if (
              tipoVincUpper.includes('CONTRATADO') ||
              tipoVincUpper.includes('SUBSTITUTO') ||
              tipoVincUpper.includes('PRESTADOR') ||
              tipoVincUpper.includes('RESERVISTA')
            ) {
              vinculoTipoFinal = 'Contratado'
            } else if (tipoVincUpper.includes('NOMEADO')) {
              vinculoTipoFinal = 'Nomeado'
            }

            const modUpper = (f.modalidade_ensino ?? '').toUpperCase()
            const cargoUpper = cargoFinal.toUpperCase()
            let modalidadeFinal = 'Regular'
            if (modUpper.includes('EJA') || cargoUpper.includes('EJA')) {
              modalidadeFinal = 'EJA'
            }

            return {
              id: f.id,
              vinculo_id: v.id,
              nome: f.nome,
              cpf: f.cpf,
              cargoCalculado: cargoFinal,
              orgao: v.escolas?.nome ?? 'Escola Não Informada',
              modalidade: modalidadeFinal,
              vinculo: vinculoTipoFinal,
              status: f.status ?? 'ativo',
            }
          })
          .filter((item) => {
            const matchCargo = item.cargoCalculado.toLowerCase() === cargoName.trim().toLowerCase()
            const matchMod = filtroModalidade === 'Todos' || item.modalidade.toUpperCase().includes(filtroModalidade.toUpperCase())
            const matchVinc = filtroVinculo === 'Todos' || item.vinculo.toUpperCase().includes(filtroVinculo.toUpperCase())
            return matchCargo && matchMod && matchVinc
          })
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

        setOccupantsList(filteredAndMapped)
      }
    } catch (err) {
      if (!isMountedRef.current || currentReq !== occupantRequestCounter.current) return
      console.error('Exceção ao buscar ocupantes:', err)
      toast.error('Ocorreu um erro ao carregar os ocupantes.')
      setOccupantsList([])
    } finally {
      if (isMountedRef.current && currentReq === occupantRequestCounter.current) {
        setIsLoadingOccupants(false)
      }
    }
  }, [supabase, filtroEscolaId, filtroModalidade, filtroVinculo])

  // Filtro de ocupantes pesquisados no modal
  const filteredOccupants = useMemo(() => {
    if (!occupantSearch.trim()) return occupantsList
    const term = occupantSearch.toLowerCase().trim()
    return occupantsList.filter(
      (o) =>
        o.nome.toLowerCase().includes(term) ||
        o.orgao.toLowerCase().includes(term) ||
        (o.cpf && o.cpf.includes(term))
    )
  }, [occupantsList, occupantSearch])

  // Sincroniza a escola selecionada globalmente se houver (travando para Nível 2 / Nível 3)
  useEffect(() => {
    setIsMounted(true)
    const escolaIdAlvo = selectedEscola?.id || escolaAtivaId || ''
    if (isSuperAdminOrNivel1) {
      setFiltroEscolaId(selectedEscola?.id || '')
    } else {
      setFiltroEscolaId(escolaIdAlvo)
    }
  }, [selectedEscola, escolaAtivaId, isSuperAdminOrNivel1])

  // Busca lista única de cargos disponíveis para o select de filtro
  const listaCargosDisponiveis = useMemo(() => {
    if (!reportData.cargos || reportData.cargos.length === 0) return []
    return reportData.cargos.map((c) => c.cargo).sort()
  }, [reportData.cargos])

  const loadRelatorio = useCallback(async () => {
    if (!isMountedRef.current) return
    const currentRequest = ++requestCounter.current
    
    setIsLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_relatorio_servidores', {
        p_escola_id: filtroEscolaId || undefined,
        p_cargo: filtroCargo || undefined,
        p_modalidade: filtroModalidade === 'Todos' ? undefined : filtroModalidade,
        p_vinculo_tipo: filtroVinculo === 'Todos' ? undefined : filtroVinculo,
      })

      if (!isMountedRef.current || currentRequest !== requestCounter.current) return

      if (error) {
        console.error('Erro ao buscar RPC get_relatorio_servidores:', error)
        toast.error('Erro ao carregar dados do relatório de servidores.')
        return
      }

      if (data) {
        const payload = data as any
        setReportData({
          resumo: payload.resumo ?? {
            total_servidores_unicos: 0,
            total_cargos_ocupados: 0,
            total_contratados: 0,
            total_concursados: 0,
            total_nomeados: 0,
            total_outros: 0,
            total_regular: 0,
            total_eja: 0,
          },
          cargos: Array.isArray(payload.cargos) ? payload.cargos : [],
        })
      }
    } catch (err) {
      if (!isMountedRef.current || currentRequest !== requestCounter.current) return
      console.error('Exceção no carregamento do relatório de servidores:', err)
      toast.error('Ocorreu um erro ao carregar os dados.')
    } finally {
      if (isMountedRef.current && currentRequest === requestCounter.current) {
        setIsLoading(false)
      }
    }
  }, [supabase, filtroEscolaId, filtroCargo, filtroModalidade, filtroVinculo])

  useEffect(() => {
    if (activeTab === 'geral') {
      loadRelatorio()
    }
  }, [loadRelatorio, activeTab])

  // Ação de abertura da impressão (Sintética A4 ou Lista Nominal)
  const handleAbrirImpressao = async (modo: 'sintetico' | 'nominal') => {
    setPrintModoView(modo)
    if (modo === 'nominal') {
      setIsLoadingNominal(true)
      try {
        let query = supabase
          .from('vinculos_funcionarios')
          .select(`
            id,
            cargo,
            escola_id,
            escolas (nome),
            funcionarios!inner (
              id,
              nome,
              cpf,
              status,
              modalidade_ensino,
              tipo_vinculo,
              is_conta_especial,
              deleted_at
            )
          `)
          .eq('ativo', true)
          .is('funcionarios.deleted_at', null)

        if (filtroEscolaId) {
          query = query.eq('escola_id', filtroEscolaId)
        }

        const { data, error } = await query
        if (error) throw error

        if (data) {
          const mapped = (data as any[])
            .filter((v) => !v.funcionarios?.is_conta_especial)
            .map((v) => {
              const f = v.funcionarios
              return {
                id: f.id,
                nome: f.nome,
                cpf: f.cpf,
                cargo: v.cargo || f.cargo,
                status: f.status || 'ativo',
                orgao: v.escolas?.nome || 'Escola Não Informada',
                modalidade_ensino: f.modalidade_ensino || 'Regular',
                vinculo_tipo: f.tipo_vinculo || 'Não informado',
              }
            })
            .filter((s) => {
              const matchCargo = !filtroCargo || s.cargo === filtroCargo
              const matchMod = filtroModalidade === 'Todos' || (s.modalidade_ensino ?? '').toUpperCase().includes(filtroModalidade.toUpperCase())
              const matchVinc = filtroVinculo === 'Todos' || (s.vinculo_tipo ?? '').toUpperCase().includes(filtroVinculo.toUpperCase())
              return matchCargo && matchMod && matchVinc
            })
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

          setServidoresNominais(mapped)
        }
      } catch (err) {
        console.error('Erro ao buscar lista nominal de servidores:', err)
        toast.error('Erro ao gerar lista nominal para impressão.')
      } finally {
        setIsLoadingNominal(false)
      }
    }
    setIsPrintModalOpen(true)
  }

  // Nome da Escola Selecionada
  const nomeEscolaAtiva = useMemo(() => {
    if (selectedEscola) return selectedEscola.nome
    if (filtroEscolaId) {
      const esc = escolas.find(e => e.id === filtroEscolaId)
      if (esc) return esc.nome
    }
    return 'Rede Municipal (Todas as Escolas)'
  }, [selectedEscola, filtroEscolaId, escolas])

  // Dados para o Gráfico de Pizza de Vínculos
  const chartDataVinculos = useMemo(() => {
    const { total_concursados, total_contratados, total_nomeados, total_outros } = reportData.resumo
    return [
      { name: 'Concursados', value: total_concursados ?? 0, color: COLORS_VINCULO.Concursado },
      { name: 'Contratados', value: total_contratados ?? 0, color: COLORS_VINCULO.Contratado },
      { name: 'Nomeados', value: total_nomeados ?? 0, color: COLORS_VINCULO.Nomeado },
      { name: 'Outros / Não informado', value: total_outros ?? 0, color: COLORS_VINCULO.Outros },
    ].filter((item) => item.value > 0)
  }, [reportData.resumo])

  // Dados para o Gráfico de Pizza de Cargos (Top cargos + Outros)
  const chartDataCargos = useMemo(() => {
    if (!reportData.cargos || reportData.cargos.length === 0) return []

    const sorted = [...reportData.cargos].sort((a, b) => b.ocupacoes - a.ocupacoes)
    const top = sorted.slice(0, 6)
    const rest = sorted.slice(6)

    const result = top.map((item, index) => ({
      name: item.cargo,
      value: item.ocupacoes,
      color: PALETTE_CARGOS[index % PALETTE_CARGOS.length],
    }))

    if (rest.length > 0) {
      const restTotal = rest.reduce((acc, curr) => acc + curr.ocupacoes, 0)
      result.push({
        name: 'Demais Cargos',
        value: restTotal,
        color: PALETTE_CARGOS[6],
      })
    }

    return result
  }, [reportData.cargos])

  const totalCargosCalculado = useMemo(() => {
    return reportData.resumo.total_cargos_ocupados ?? 0
  }, [reportData.resumo])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Componente de Impressão Portal A4 */}
      {isPrintModalOpen && (
        <PrintRelatorioServidores
          modoView={printModoView}
          escolaNome={nomeEscolaAtiva}
          filtroCargo={filtroCargo}
          filtroModalidade={filtroModalidade}
          filtroVinculo={filtroVinculo}
          resumo={reportData.resumo}
          cargos={reportData.cargos}
          servidoresNominais={servidoresNominais}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* Abas Superiores do Relatório + Botões de Impressão */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 no-print">
        <div className="flex items-center gap-2 bg-secondary/60 border border-border p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('geral')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer',
              activeTab === 'geral'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
            )}
          >
            <Users className="w-4 h-4" />
            Visão Geral de Servidores
          </button>
          <button
            onClick={() => setActiveTab('orcamento')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer',
              activeTab === 'orcamento'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
            )}
          >
            <DollarSign className="w-4 h-4" />
            Execução Orçamentária
          </button>
        </div>

        {activeTab === 'geral' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={loadRelatorio}
              disabled={isLoading}
              className="bg-card hover:bg-hoverCustom border-border text-foreground text-xs gap-2 rounded-xl"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              Atualizar
            </Button>

            <Button
              onClick={() => handleAbrirImpressao('sintetico')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs rounded-xl gap-2 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Relatório (A4)
            </Button>

            <Button
              variant="outline"
              onClick={() => handleAbrirImpressao('nominal')}
              disabled={isLoadingNominal}
              className="bg-secondary hover:bg-hoverCustom border-border text-foreground text-xs gap-2 rounded-xl cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
              {isLoadingNominal ? 'Carregando...' : 'Imprimir Lista Nominal'}
            </Button>
          </div>
        )}
      </div>

      {/* Conteúdo da Aba Execução Orçamentária (Em Desenvolvimento) */}
      {activeTab === 'orcamento' ? (
        <div className="bg-card border border-amber-500/30 rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-4 shadow-lg my-8">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              Em Desenvolvimento
            </span>
            <h3 className="text-xl font-bold text-foreground mt-3">
              Módulo de Execução Orçamentária & Folha Financeira
            </h3>
            <p className="text-sm text-muted-foreground max-w-lg mt-2 leading-relaxed">
              Esta área está preparada para integrar as métricas de despesas de pessoal, remuneração média, adicionais salariais e filtros por período orçamentário municipal.
            </p>
          </div>
        </div>
      ) : (
        /* Conteúdo da Aba Principal: Visão Geral de Servidores */
        <div className="space-y-6">
          {/* Painel de Filtros em Tempo Real */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 no-print">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Filter className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Filtros do Relatório</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Select Escola */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Unidade / Escola
                </label>
                <select
                  value={filtroEscolaId}
                  onChange={(e) => setFiltroEscolaId(e.target.value)}
                  disabled={!isSuperAdminOrNivel1}
                  className={cn(
                    "w-full bg-secondary/50 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary font-medium cursor-pointer",
                    !isSuperAdminOrNivel1 && "opacity-80 cursor-not-allowed bg-secondary/30"
                  )}
                >
                  {isSuperAdminOrNivel1 && <option value="">Rede Municipal (Todas as Escolas)</option>}
                  {escolas.map((esc) => (
                    <option key={esc.id} value={esc.id}>
                      {esc.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Cargo */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Cargo / Função
                </label>
                <select
                  value={filtroCargo}
                  onChange={(e) => setFiltroCargo(e.target.value)}
                  className="w-full bg-secondary/50 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary font-medium cursor-pointer"
                >
                  <option value="">Todos os Cargos</option>
                  {listaCargosDisponiveis.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Modalidade */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Modalidade
                </label>
                <select
                  value={filtroModalidade}
                  onChange={(e) => setFiltroModalidade(e.target.value)}
                  className="w-full bg-secondary/50 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary font-medium cursor-pointer"
                >
                  <option value="Todos">Todas as Modalidades</option>
                  <option value="Regular">Ensino Regular</option>
                  <option value="EJA">EJA (Educação de Jovens e Adultos)</option>
                </select>
              </div>

              {/* Select Vínculo */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Tipo de Vínculo
                </label>
                <select
                  value={filtroVinculo}
                  onChange={(e) => setFiltroVinculo(e.target.value)}
                  className="w-full bg-secondary/50 border border-border text-foreground text-xs rounded-xl px-3 py-2.5 outline-none focus:border-primary font-medium cursor-pointer"
                >
                  <option value="Todos">Todos os Vínculos</option>
                  <option value="Concursado">Concursado / Efetivo</option>
                  <option value="Contratado">Contratado / Substituto</option>
                  <option value="Nomeado">Nomeado (Cargo Comissionado)</option>
                  <option value="Outros">Outros / Não informado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cards KPI (Destaques) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Servidores Únicos */}
            <div
              onClick={() => handleAbrirDiscriminadosModal('Total')}
              className="bg-card border border-border hover:border-primary/60 rounded-2xl p-5 flex items-center gap-4 shadow-sm cursor-pointer transition-all group"
              title="Clique para ver a lista de servidores discriminada por secretarias e unidades"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold group-hover:text-primary transition-colors">Total de Servidores (Pessoas)</p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {isLoading ? '...' : reportData.resumo.total_servidores_unicos ?? 0}
                </h3>
                <span className="text-[10px] text-blue-400 font-medium">Clique para ver secretarias</span>
              </div>
            </div>

            {/* KPI 2: Cargos Ocupados */}
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Total de Cargos Ocupados</p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {isLoading ? '...' : reportData.resumo.total_cargos_ocupados ?? 0}
                </h3>
                <span className="text-[10px] text-emerald-400 font-medium">Total de postos/vínculos</span>
              </div>
            </div>

            {/* KPI 3: Servidores no Regular */}
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Ensino Regular</p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {isLoading ? '...' : reportData.resumo.total_regular ?? 0}
                </h3>
                <span className="text-[10px] text-purple-400 font-medium">
                  {totalCargosCalculado > 0
                    ? `${Math.round(((reportData.resumo.total_regular ?? 0) / totalCargosCalculado) * 100)}% das ocupações`
                    : '0%'}
                </span>
              </div>
            </div>

            {/* KPI 4: Servidores no EJA */}
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Modalidade EJA</p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {isLoading ? '...' : reportData.resumo.total_eja ?? 0}
                </h3>
                <span className="text-[10px] text-amber-400 font-medium">
                  {totalCargosCalculado > 0
                    ? `${Math.round(((reportData.resumo.total_eja ?? 0) / totalCargosCalculado) * 100)}% das ocupações`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* Seção de Gráficos (Pizza/Donut Recharts) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Vínculos */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  <h4 className="text-base font-bold text-foreground">Distribuição por Vínculo</h4>
                </div>
                <span className="text-xs text-muted-foreground">Concursados × Contratados</span>
              </div>

              {isLoading ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs animate-pulse">
                  Carregando gráfico...
                </div>
              ) : chartDataVinculos.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <span>Nenhum vínculo encontrado para os filtros selecionados</span>
                </div>
              ) : (
                isMounted && (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartDataVinculos}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {chartDataVinculos.map((entry, index) => (
                            <Cell key={`cell-v-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                          formatter={(val: any) => [`${val} ocupação(ões)`, 'Total']}
                        />
                        <Legend
                          formatter={(value, entry: any) => (
                            <span className="text-xs font-semibold text-foreground">
                              {value} ({entry.payload.value})
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )
              )}
            </div>

            {/* Gráfico 2: Cargos Ocupados */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-base font-bold text-foreground">Distribuição dos Cargos Ocupados</h4>
                </div>
                <span className="text-xs text-muted-foreground">Postos Principais</span>
              </div>

              {isLoading ? (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-xs animate-pulse">
                  Carregando gráfico...
                </div>
              ) : chartDataCargos.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <span>Nenhum cargo encontrado para os filtros</span>
                </div>
              ) : (
                isMounted && (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartDataCargos}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartDataCargos.map((entry, index) => (
                            <Cell key={`cell-c-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                          formatter={(val: any, name: any) => [
                            `${val} ocupação(ões) (${totalCargosCalculado > 0 ? Math.round((Number(val) / totalCargosCalculado) * 100) : 0}%)`,
                            name,
                          ]}
                        />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          formatter={(value, entry: any) => (
                            <span className="text-[11px] font-medium text-foreground truncate max-w-[140px] inline-block">
                              {value}: {entry.payload.value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Tabela Consolidada por Cargo */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <h4 className="text-base font-bold text-foreground">Detalhamento Consolidado por Cargo</h4>
              </div>
              <span className="text-xs text-muted-foreground">
                {reportData.cargos.length} cargo(s) encontrado(s)
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-muted-foreground text-sm animate-pulse">
                Carregando tabela consolidada...
              </div>
            ) : reportData.cargos.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mb-1" />
                <p className="font-semibold text-foreground">Nenhum registro encontrado</p>
                <p className="text-xs text-muted-foreground">Tente ajustar ou limpar os filtros de busca no topo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/70 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="py-3 px-4 font-bold">Cargo / Função</th>
                      <th className="py-3 px-4 font-bold text-center">Total Ocupações</th>
                      <th className="py-3 px-4 font-bold text-center">Ensino Regular</th>
                      <th className="py-3 px-4 font-bold text-center">EJA</th>
                      <th className="py-3 px-4 font-bold text-center">Concursados</th>
                      <th className="py-3 px-4 font-bold text-center">Contratados</th>
                      <th className="py-3 px-4 font-bold text-center">Nomeados</th>
                      <th className="py-3 px-4 font-bold text-center">Outros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.cargos.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-hoverCustom/60 transition-colors text-foreground font-medium"
                      >
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <button
                            onClick={() => handleOpenCargoModal(item.cargo)}
                            className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none"
                            title="Clique para ver a lista de ocupantes deste cargo"
                          >
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 group-hover:scale-125 transition-transform" />
                            <span className="text-primary font-bold group-hover:underline group-hover:text-primary/80 transition-colors">
                              {item.cargo}
                            </span>
                            <Eye className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-primary">
                          {item.ocupacoes}
                        </td>
                        <td className="py-3 px-4 text-center">{item.regular}</td>
                        <td className="py-3 px-4 text-center">
                          {item.eja > 0 ? (
                            <span className="bg-amber-500/10 text-amber-400 font-semibold px-2 py-0.5 rounded-full border border-amber-500/20">
                              {item.eja}
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center text-blue-400 font-semibold">
                          {item.concursados}
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-400 font-semibold">
                          {item.contratados}
                        </td>
                        <td className="py-3 px-4 text-center text-purple-400 font-semibold">
                          {item.nomeados}
                        </td>
                        <td className="py-3 px-4 text-center text-muted-foreground">
                          {item.outros}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Linha de Totais da Tabela */}
                  <tfoot className="bg-secondary/80 font-bold text-foreground border-t-2 border-border text-xs">
                    <tr>
                      <td className="py-3.5 px-4">TOTAL GERAL MUNICIPAL</td>
                      <td className="py-3.5 px-4 text-center text-primary font-extrabold text-sm">
                        <button
                          onClick={() => handleAbrirDiscriminadosModal('Total')}
                          className="hover:underline focus:outline-none cursor-pointer"
                          title="Ver todos por secretarias e unidades"
                        >
                          {reportData.resumo.total_cargos_ocupados ?? 0}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center">{reportData.resumo.total_regular ?? 0}</td>
                      <td className="py-3.5 px-4 text-center text-amber-400">{reportData.resumo.total_eja ?? 0}</td>
                      <td className="py-3.5 px-4 text-center text-blue-400">
                        <button
                          onClick={() => handleAbrirDiscriminadosModal('Concursado')}
                          className="hover:underline focus:outline-none cursor-pointer"
                          title="Ver Concursados discriminados por secretarias"
                        >
                          {reportData.resumo.total_concursados ?? 0}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center text-emerald-400">
                        <button
                          onClick={() => handleAbrirDiscriminadosModal('Contratado')}
                          className="hover:underline focus:outline-none cursor-pointer"
                          title="Ver Contratados discriminados por secretarias"
                        >
                          {reportData.resumo.total_contratados ?? 0}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center text-purple-400">
                        <button
                          onClick={() => handleAbrirDiscriminadosModal('Nomeado')}
                          className="hover:underline focus:outline-none cursor-pointer"
                          title="Ver Nomeados discriminados por secretarias"
                        >
                          {reportData.resumo.total_nomeados ?? 0}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center text-muted-foreground">{reportData.resumo.total_outros ?? 0}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhamento dos Ocupantes do Cargo */}
      <StandardDialog
        open={isCargoModalOpen}
        onOpenChange={setIsCargoModalOpen}
        title={`Ocupantes do Cargo: ${cargoModalName}`}
        description={`Listagem oficial de servidores cadastrados como ${cargoModalName}`}
        maxWidth="sm:max-w-4xl"
      >
        <div className="space-y-4">
          {/* Header de Estatísticas do Cargo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/40 p-3.5 rounded-xl border border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold">Total de Ocupantes:</span>
              <strong className="text-primary text-base font-extrabold">{occupantsList.length}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold">Ensino Regular:</span>
              <strong className="text-purple-400 text-sm">{occupantsList.filter(o => o.modalidade === 'Regular').length}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold">Modalidade EJA:</span>
              <strong className="text-amber-400 text-sm">{occupantsList.filter(o => o.modalidade === 'EJA').length}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-semibold">Efetivos / Concursados:</span>
              <strong className="text-blue-400 text-sm">{occupantsList.filter(o => o.vinculo.includes('Concursado')).length}</strong>
            </div>
          </div>

          {/* Campo de Busca de Ocupantes */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome do servidor, CPF ou escola..."
              value={occupantSearch}
              onChange={(e) => setOccupantSearch(e.target.value)}
              className="w-full bg-secondary/50 border border-border text-foreground text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-primary font-medium"
            />
            {occupantSearch && (
              <button
                onClick={() => setOccupantSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Tabela de Ocupantes */}
          {isLoadingOccupants ? (
            <div className="p-10 text-center text-muted-foreground text-xs animate-pulse">
              Carregando lista de ocupantes...
            </div>
          ) : filteredOccupants.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-xs flex flex-col items-center justify-center space-y-2 border border-dashed border-border rounded-xl">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <p className="font-semibold text-foreground">Nenhum servidor encontrado</p>
              <p className="text-muted-foreground text-[11px]">
                {occupantSearch ? 'Tente buscar por outro termo' : 'Nenhum ocupante atende aos filtros atuais.'}
              </p>
            </div>
          ) : (
            <>
              {/* Visão Desktop: Tabela Tradicional */}
              <div className="hidden sm:block border border-border rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/80 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Nome do Servidor</th>
                      <th className="py-2.5 px-3">Unidade / Escola</th>
                      <th className="py-2.5 px-3 text-center">Modalidade</th>
                      <th className="py-2.5 px-3 text-center">Tipo de Vínculo</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOccupants.map((serv, idx) => (
                      <tr key={serv.vinculo_id || idx} className="hover:bg-hoverCustom/60 transition-colors font-medium">
                        <td className="py-2.5 px-3 text-center font-bold text-muted-foreground text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {serv.nome}
                          {serv.cpf && (
                            <span className="block font-mono text-[10px] text-muted-foreground font-normal">
                              CPF: {serv.cpf}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{serv.orgao}</td>
                        <td className="py-2.5 px-3 text-center">
                          {serv.modalidade === 'EJA' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              EJA
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              Ensino Regular
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {serv.vinculo.includes('Concursado') ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              Concursado / Efetivo
                            </span>
                          ) : serv.vinculo === 'Contratado' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Contratado
                            </span>
                          ) : serv.vinculo === 'Nomeado' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              Nomeado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-muted-foreground border border-border">
                              {serv.vinculo}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center uppercase text-[10px] font-bold">
                          <span className={serv.status === 'ativo' ? 'text-emerald-400' : 'text-muted-foreground'}>
                            {serv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Visão Mobile: Cards Inteligentes e Compactos */}
              <div className="block sm:hidden space-y-2.5 max-h-[55vh] overflow-y-auto pr-0.5">
                {filteredOccupants.map((serv, idx) => (
                  <div
                    key={serv.vinculo_id || idx}
                    className="bg-card border border-borderCustom/70 rounded-xl p-3.5 space-y-2 shadow-2xs text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-foreground text-xs leading-tight">{serv.nome}</h4>
                          {serv.cpf && (
                            <span className="text-[10px] font-mono text-muted-foreground block">
                              CPF: {serv.cpf}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] uppercase font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        {serv.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-semibold text-foreground">Unidade: </span>
                      {serv.orgao}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      {serv.vinculo.includes('Concursado') ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          Concursado / Efetivo
                        </span>
                      ) : serv.vinculo === 'Contratado' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Contratado
                        </span>
                      ) : serv.vinculo === 'Nomeado' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          Nomeado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground border border-border">
                          {serv.vinculo}
                        </span>
                      )}

                      {serv.modalidade === 'EJA' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          EJA
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Ensino Regular
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </StandardDialog>

      {/* Modal Reutilizável de Servidores Discriminados por Secretaria e Unidades */}
      <ModalServidoresDiscriminados
        open={isDiscriminadosModalOpen}
        onOpenChange={setIsDiscriminadosModalOpen}
        tipoVinculoInicial={selectedVinculoModal}
        escolaIdAlvo={filtroEscolaId}
      />
    </div>
  )
}
