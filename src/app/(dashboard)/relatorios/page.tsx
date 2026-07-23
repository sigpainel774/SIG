'use client'

import { useState, useEffect } from 'react'
import { SchoolSelector } from '@/components/SchoolSelector'
import { useSchoolStore, Escola } from '@/store/useSchoolStore'
import { PrintFicha } from '@/components/print/print-ficha'
import { MapaGlobal, MapaAlunos } from '@/components/map/MapWrapper'
import RelatorioNotas from '@/components/relatorios/RelatorioNotas'
import RelatorioNecessidades from '@/components/relatorios/RelatorioNecessidades'
import RelatorioOcorrencias from '@/components/relatorios/RelatorioOcorrencias'
import { createClient } from '@/lib/supabaseClient'
import { IconTile } from '@/components/ui/icon-tile'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  Printer, 
  TrendingUp, 
  CalendarCheck, 
  PieChart, 
  AlertTriangle, 
  Map as MapIcon, 
  Scan,
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  FileCheck,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
  Search,
  Filter,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type ReportType = 'desempenho' | 'censo' | 'ocorrencias' | 'mapa' | 'presenca' | 'necessidades_especiais' | null
type MapaAba = 'funcionarios' | 'alunos'

export default function RelatoriosPage() {
  const { escolas, selectedEscola, setSelectedEscola, loadEscolas } = useSchoolStore()

  useEffect(() => {
    loadEscolas()
  }, [loadEscolas])
  const [activeReport, setActiveReport] = useState<ReportType>(null)
  const [printableSubView, setPrintableSubView] = useState<'boletim' | 'ficha' | 'diario' | null>(null)
  const [mapData, setMapData] = useState<any[]>([])
  const [mapDataAlunos, setMapDataAlunos] = useState<any[]>([])
  const [isLoadingMap, setIsLoadingMap] = useState(false)
  const [isLoadingMapAlunos, setIsLoadingMapAlunos] = useState(false)
  const [mapaAba, setMapaAba] = useState<MapaAba>('funcionarios')

  // Fetch data for the Mapa Logístico
  useEffect(() => {
    if (activeReport === 'mapa') {
      const fetchMapData = async () => {
        setIsLoadingMap(true)
        const supabase = createClient()
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
                foto_url,
                latitude,
                longitude
              )
            `)
            .eq('ativo', true)

          if (selectedEscola) {
            query = query.eq('escola_id', selectedEscola.id)
          }

          const { data, error } = await query

          if (error) throw error

          if (data) {
            const anyData = data as any[]
            const mapped = anyData
              .filter(v => 
                v.funcionarios?.latitude != null && 
                v.funcionarios?.longitude != null &&
                Number(v.funcionarios.latitude) !== 0 &&
                Number(v.funcionarios.longitude) !== 0 &&
                !isNaN(Number(v.funcionarios.latitude)) &&
                !isNaN(Number(v.funcionarios.longitude))
              )
              .map(v => ({
                id: v.funcionarios.id,
                nome: v.funcionarios.nome,
                cargo: v.cargo || 'Funcionário',
                escola: v.escolas?.nome || 'Escola Não Informada',
                foto_url: v.funcionarios.foto_url,
                latitude: Number(v.funcionarios.latitude),
                longitude: Number(v.funcionarios.longitude)
              }))
            
            // Deduplicate by Funcionario ID
            const uniqueMap = new Map<string, any>()
            mapped.forEach(item => uniqueMap.set(item.id, item))
            setMapData(Array.from(uniqueMap.values()))
          }
        } catch (err) {
          console.error("Erro ao buscar dados do mapa:", err)
        } finally {
          setIsLoadingMap(false)
        }
      }
      fetchMapData()
    }
  }, [activeReport, selectedEscola])

  // Fetch data para o Mapa de Alunos
  useEffect(() => {
    if (activeReport === 'mapa' && mapaAba === 'alunos') {
      const fetchMapDataAlunos = async () => {
        setIsLoadingMapAlunos(true)
        const supabase = createClient()
        try {
          let query = supabase
            .from('alunos')
            .select(`
              id,
              nome,
              foto_url,
              latitude,
              longitude,
              escola_id,
              turma_id,
              escolas (nome),
              turmas (nome)
            `)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)

          if (selectedEscola) {
            query = query.eq('escola_id', selectedEscola.id)
          }

          const { data, error } = await query
          if (error) throw error

          if (data) {
            const anyData = data as any[]
            const mapped = anyData
              .filter(a => 
                Number(a.latitude) !== 0 && 
                Number(a.longitude) !== 0 && 
                !isNaN(Number(a.latitude)) && 
                !isNaN(Number(a.longitude))
              )
              .map((a) => ({
                id: a.id,
                nome: a.nome,
                foto_url: a.foto_url,
                escola: (a.escolas as any)?.nome ?? 'Escola Não Informada',
                turma: (a.turmas as any)?.nome ?? undefined,
                latitude: Number(a.latitude),
                longitude: Number(a.longitude),
              }))
            setMapDataAlunos(mapped)
          }
        } catch (err) {
          console.error('Erro ao buscar dados do mapa de alunos:', err)
        } finally {
          setIsLoadingMapAlunos(false)
        }
      }
      fetchMapDataAlunos()
    }
  }, [activeReport, mapaAba, selectedEscola])

  // Report cards definition matching user screenshot
  const reportCards = [
    {
      id: 'desempenho' as const,
      title: 'Desempenho & Assiduidade',
      description: 'Boletim vermelho, controle de faltas e risco de evasão.',
      icon: TrendingUp,
      variant: 'primary' as const,
    },
    {
      id: 'censo' as const,
      title: 'Censo e Logística',
      description: 'Métricas gerais e infraestrutura.',
      icon: PieChart,
      variant: 'primary' as const,
    },
    {
      id: 'ocorrencias' as const,
      title: 'Ocorrências',
      description: 'Registro de comportamento e alertas.',
      icon: AlertTriangle,
      variant: 'destructive' as const,
    },
    {
      id: 'mapa' as const,
      title: 'Mapa Logístico',
      description: 'Geolocalização de funcionários.',
      icon: MapIcon,
      variant: 'primary' as const,
    },
    {
      id: 'presenca' as const,
      title: 'Registros de Presença',
      description: 'Logs de ponto e ronda (App Mobile).',
      icon: Scan,
      variant: 'primary' as const,
    },
    {
      id: 'necessidades_especiais' as const,
      title: 'Necessidades Especiais',
      description: 'Módulo em desenvolvimento. Informações de AEE e Ficha de Saúde.',
      icon: ShieldAlert,
      variant: 'warning' as const,
    },
  ]

  // Global print function
  const handleGlobalPrint = () => {
    window.print()
  }



  if (printableSubView === 'ficha') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between no-print pb-2 border-b border-border">
          <Button variant="ghost" onClick={() => setPrintableSubView(null)} className="text-muted-foreground hover:bg-hoverCustom gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Relatório
          </Button>
        </div>
        <PrintFicha />
      </div>
    )
  }

  // Render Detailed Report View (When a report card is clicked)
  if (activeReport) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Top Navigation & Print Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 no-print pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveReport(null)}
              className="bg-secondary hover:bg-hoverCustom border-border text-foreground gap-2 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Relatórios
            </Button>

            <div className="h-6 w-px bg-border" />

            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                {reportCards.find(r => r.id === activeReport)?.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedEscola ? `Filtro: ${selectedEscola.nome}` : 'Visão Geral da Rede (Macro Sapeaçu)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">


            {activeReport === 'desempenho' && selectedEscola && (
              <Button
                onClick={() => setPrintableSubView('ficha')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl gap-2"
              >
                <FileCheck className="w-4 h-4" /> Visualizar Ficha Cadastral (A4)
              </Button>
            )}

            <Button
              onClick={handleGlobalPrint}
              className="bg-secondary hover:bg-hoverCustom text-foreground border border-border rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir (A4)
            </Button>
          </div>
        </div>

        {/* Dynamic Content based on Macro vs School Specific */}
        {activeReport === 'desempenho' ? (
          <RelatorioNotas selectedEscola={selectedEscola} />
        ) : activeReport === 'mapa' ? (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Relatório Logístico</span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">Mapa de Geolocalização</h3>
                </div>
                <div className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 rounded-xl text-xs font-semibold">
                  {selectedEscola ? 'Visão da Unidade' : 'Visão Geral da Rede'}
                </div>
              </div>

              {/* Abas: Funcionários / Alunos */}
              <div className="flex items-center gap-1 bg-secondary/60 border border-border rounded-xl p-1 w-fit mb-6">
                <button
                  onClick={() => setMapaAba('funcionarios')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                    mapaAba === 'funcionarios'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
                  )}
                >
                  <Users className="w-4 h-4" />
                  Funcionários
                </button>
                <button
                  onClick={() => setMapaAba('alunos')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                    mapaAba === 'alunos'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
                  )}
                >
                  <GraduationCap className="w-4 h-4" />
                  Alunos
                </button>
              </div>

              {/* Conteúdo da aba ativa */}
              {mapaAba === 'funcionarios' ? (
                isLoadingMap ? (
                  <div className="w-full h-[520px] rounded-2xl bg-surface-1 border border-border flex items-center justify-center text-muted-foreground animate-pulse">
                    <span className="text-sm font-semibold">Buscando dados geográficos...</span>
                  </div>
                ) : (
                  <MapaGlobal funcionarios={mapData} />
                )
              ) : (
                isLoadingMapAlunos ? (
                  <div className="w-full h-[520px] rounded-2xl bg-surface-1 border border-border flex items-center justify-center text-muted-foreground animate-pulse">
                    <span className="text-sm font-semibold">Buscando dados geográficos dos alunos...</span>
                  </div>
                ) : (
                  <MapaAlunos alunos={mapDataAlunos} />
                )
              )}
            </div>
          </div>
        ) : activeReport === 'necessidades_especiais' ? (
          <RelatorioNecessidades selectedEscola={selectedEscola} />
        ) : activeReport === 'ocorrencias' ? (
          <RelatorioOcorrencias selectedEscola={selectedEscola} />
        ) : (
          <div className="flex flex-col items-center justify-center border border-dashed border-border rounded-2xl bg-card/50 py-16 px-6 text-center shadow-inner mt-6">
            <h3 className="text-xl font-bold text-foreground mb-3">
              Módulo de Relatório em Construção
            </h3>
            <p className="text-muted-foreground max-w-md text-sm">
              Os dados e gráficos para o relatório de <strong className="text-primary">{reportCards.find(r => r.id === activeReport)?.title}</strong> estão sendo estruturados.
              Eles serão disponibilizados nas próximas etapas do projeto.
            </p>
          </div>
        )}
      </div>
    )
  }

  // MAIN PAGE LAYOUT MATCHING USER SCREENSHOT EXACTLY
  const borderColors = {
    primary: 'bg-primary',
    success: 'bg-success',
    destructive: 'bg-destructive',
    warning: 'bg-warning',
  }

  return (
    <div className="space-y-7 -mt-2">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title & Icon on Left */}
        <div className="flex items-center gap-3.5">
          <BarChart3 className="w-8 h-8 text-foreground stroke-[2.5]" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-3">
              {selectedEscola ? `Visão Geral — ${selectedEscola.nome}` : 'Visão Geral da Rede'}
            </h1>
          </div>
        </div>

        {/* Right side: School Selector + Print Button */}
        <div className="flex items-center gap-3 no-print">
          <SchoolSelector />

          <button
            onClick={handleGlobalPrint}
            className="bg-secondary hover:bg-hoverCustom text-foreground border border-border rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-muted-foreground" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Mode Banner Indicator if School Selected */}
      {selectedEscola && (
        <div className="bg-card border border-primary/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${selectedEscola.color}`} />
            <span>
              Relatórios filtrados especificamente para: <strong>{selectedEscola.nome}</strong>
            </span>
          </div>
          <span className="text-muted-foreground">Clique na escola no topo para alternar para Visão Macro</span>
        </div>
      )}

      {/* Grid of 6 Cards Matching Screenshot Layout & Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {reportCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.id}
              onClick={() => setActiveReport(card.id)}
              className="relative overflow-hidden bg-card hover:bg-hoverCustom border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer rounded-2xl p-6 md:p-7 pl-9 md:pl-10 flex flex-col justify-between group shadow-lg min-h-[160px]"
            >
              <span className={cn(
                "absolute left-0 top-4 bottom-4 w-1 rounded-full",
                borderColors[card.variant]
              )} />
              <div>
                {/* Top Icon */}
                <div className="flex items-center justify-between">
                  <IconTile icon={Icon} variant={card.variant} />
                </div>

                {/* Title */}
                <h3 className="text-foreground font-semibold text-base mt-5 mb-1.5 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>

                {/* Subtitle */}
                <p className="text-muted-foreground text-sm font-normal leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
