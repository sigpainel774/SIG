'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { SchoolSelector } from '@/components/SchoolSelector'
import { useSchoolStore, Escola } from '@/store/useSchoolStore'
import { MapaGlobal, MapaAlunos } from '@/components/map/MapWrapper'
import { createClient } from '@/lib/supabaseClient'
import { preloadFotos } from '@/lib/mapCache'
import { getAvatarUrl } from '@/lib/photoHelper'

// Importações dinâmicas para otimizar o bundle inicial
const RelatorioNotas = dynamic(() => import('@/components/relatorios/RelatorioNotas'), {
  loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse font-semibold">Carregando relatório de desempenho...</div>
})
const RelatorioNecessidades = dynamic(() => import('@/components/relatorios/RelatorioNecessidades'), {
  loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse font-semibold">Carregando relatório...</div>
})
const RelatorioOcorrencias = dynamic(() => import('@/components/relatorios/RelatorioOcorrencias'), {
  loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse font-semibold">Carregando ocorrências...</div>
})
const RelatorioServidores = dynamic(() => import('@/components/relatorios/RelatorioServidores'), {
  loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse font-semibold">Carregando painel de servidores...</div>
})
const PrintFicha = dynamic(() => import('@/components/print/print-ficha').then(m => ({ default: m.PrintFicha })), {
  loading: () => <div className="p-8 text-center text-muted-foreground animate-pulse font-semibold">Carregando ficha...</div>
})
import { useAuthStore } from '@/store/useAuthStore'
import { IconTile } from '@/components/ui/icon-tile'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
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
  Download,
  Activity,
  Briefcase
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type ReportType = 'desempenho' | 'censo' | 'ocorrencias' | 'mapa' | 'presenca' | 'necessidades_especiais' | 'atividades' | 'servidores' | null
type MapaAba = 'funcionarios' | 'alunos'

// Report cards definition moved to module scope for stable reference
const REPORT_CARDS = [
  {
    id: 'servidores' as const,
    title: 'Relatório de Servidores',
    description: 'Quadro geral de servidores ativos, cargos ocupados, vínculos e modalidades.',
    icon: Users,
    variant: 'primary' as const,
  },
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
    id: 'atividades' as const,
    title: 'Central de Atividades',
    description: 'Trilha de auditoria, matrículas, edições e acessos a fichas.',
    icon: Activity,
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

export default function RelatoriosPage() {
  const router = useRouter()
  const { escolas, selectedEscola, setSelectedEscola, loadEscolas } = useSchoolStore()
  const { acessos, isAdminGlobalOrRoot } = useAuthStore()

  const isSuperAdminOrNivel1 = isAdminGlobalOrRoot() || acessos?.some(a => a.nivel === 1 && a.ativo)
  const isDiretor = acessos?.some(a => a.nivel === 2 && a.ativo)
  const [podeVerRelatorioServidores, setPodeVerRelatorioServidores] = useState<boolean>(false)

  useEffect(() => {
    let isMounted = true
    if (isSuperAdminOrNivel1 || isDiretor) {
      setPodeVerRelatorioServidores(true)
      return
    }

    const acessoSecretario = acessos?.find(a => a.nivel === 3 && a.ativo)
    if (!acessoSecretario || !acessoSecretario.id) {
      setPodeVerRelatorioServidores(false)
      return
    }

    const idSecretario = acessoSecretario.id

    async function checarPermissaoSecretario() {
      try {
        const supabase = createClient()
        const { data, error } = await (supabase as any)
          .from('acessos_usuarios_permissoes')
          .select('permitido')
          .eq('acesso_usuario_id', idSecretario)
          .eq('permissao', 'relatorios.servidores')
          .maybeSingle()

        if (!error && data && data.permitido && isMounted) {
          setPodeVerRelatorioServidores(true)
        } else if (isMounted) {
          setPodeVerRelatorioServidores(false)
        }
      } catch (e) {
        if (isMounted) setPodeVerRelatorioServidores(false)
      }
    }

    checarPermissaoSecretario()
    return () => {
      isMounted = false
    }
  }, [isSuperAdminOrNivel1, isDiretor, acessos])

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

  // Fetch data for the Mapa Logístico de Funcionários (com cache em sessionStorage)
  useEffect(() => {
    let active = true
    if (activeReport === 'mapa') {
      const cacheKey = `sig_map_func_${selectedEscola?.id || 'all'}`
      
      // Tenta recuperar do sessionStorage para exibição instantânea
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0 && active) {
            setMapData(parsed)
          }
        }
      } catch (e) {
        // Ignora erro de parse de cache
      }

      const fetchMapData = async () => {
        if (!sessionStorage.getItem(cacheKey)) {
          setIsLoadingMap(true)
        }
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
                foto_avatar_path,
                foto_visualizacao_path,
                foto_updated_at,
                latitude,
                longitude,
                modalidade_ensino,
                tipo_vinculo,
                deleted_at
              )
            `)
            .eq('ativo', true)
            .is('funcionarios.deleted_at', null)
            .not('funcionarios.latitude', 'is', null)
            .not('funcionarios.longitude', 'is', null)

          if (selectedEscola) {
            query = query.eq('escola_id', selectedEscola.id)
          }

          const { data, error } = await query

          if (error) throw error

          if (data && active) {
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
              .map(v => {
                const rawMod = (v.funcionarios?.modalidade_ensino || '').toString().toUpperCase()
                const rawCargo = (v.cargo || '').toString().toUpperCase()
                const isEJA = rawMod.includes('EJA') || rawCargo.includes('EJA')

                return {
                  id: v.funcionarios.id,
                  nome: v.funcionarios.nome,
                  cargo: v.cargo || 'Funcionário',
                  escola: v.escolas?.nome || 'Escola Não Informada',
                  foto_url: getAvatarUrl(v.funcionarios) || v.funcionarios.foto_url,
                  foto_avatar_path: v.funcionarios.foto_avatar_path,
                  foto_visualizacao_path: v.funcionarios.foto_visualizacao_path,
                  foto_updated_at: v.funcionarios.foto_updated_at,
                  latitude: Number(v.funcionarios.latitude),
                  longitude: Number(v.funcionarios.longitude),
                  modalidade: isEJA ? 'EJA' : 'Regular',
                  tipo_vinculo: v.funcionarios.tipo_vinculo || null
                }
              })
            
            // Deduplicate by Funcionario ID, mantendo EJA se qualquer vínculo for EJA
            const uniqueMap = new Map<string, any>()
            mapped.forEach(item => {
              if (uniqueMap.has(item.id)) {
                const existing = uniqueMap.get(item.id)
                if (item.modalidade === 'EJA') {
                  existing.modalidade = 'EJA'
                }
              } else {
                uniqueMap.set(item.id, item)
              }
            })
            const result = Array.from(uniqueMap.values())
            setMapData(result)
            preloadFotos(result.map(f => f.foto_url).filter(Boolean))
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(result))
            } catch (e) {}
          }
        } catch (err) {
          console.error("Erro ao buscar dados do mapa:", err)
        } finally {
          if (active) {
            setIsLoadingMap(false)
          }
        }
      }
      fetchMapData()
    }

    return () => {
      active = false
    }
  }, [activeReport, selectedEscola])

  // Fetch data para o Mapa de Alunos (com cache em sessionStorage)
  useEffect(() => {
    let active = true
    if (activeReport === 'mapa' && mapaAba === 'alunos') {
      const cacheKey = `sig_map_alunos_${selectedEscola?.id || 'all'}`
      
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0 && active) {
            setMapDataAlunos(parsed)
          }
        }
      } catch (e) {}

      const fetchMapDataAlunos = async () => {
        if (!sessionStorage.getItem(cacheKey)) {
          setIsLoadingMapAlunos(true)
        }
        const supabase = createClient()
        try {
          let query = supabase
            .from('alunos')
            .select(`
              id,
              nome,
              foto_url,
              foto_avatar_path,
              foto_visualizacao_path,
              foto_updated_at,
              latitude,
              longitude,
              escola_id,
              turma_id,
              serie,
              modalidade_mat:dados_matricula->>modalidade,
              etapa_mat:dados_matricula->>etapa,
              escolas (nome),
              turmas (nome)
            `)
            .is('deleted_at', null)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)

          if (selectedEscola) {
            query = query.eq('escola_id', selectedEscola.id)
          }

          const { data, error } = await query
          if (error) throw error

          if (data && active) {
            const anyData = data as any[]
            const mapped = anyData
              .filter(a => 
                Number(a.latitude) !== 0 && 
                Number(a.longitude) !== 0 && 
                !isNaN(Number(a.latitude)) && 
                !isNaN(Number(a.longitude))
              )
              .map((a) => {
                const turmaNome = (a.turmas as any)?.nome ?? ''
                const serieNome = a.serie ?? ''
                const matMod = a.modalidade_mat || a.etapa_mat || ''

                const isEJA = 
                  turmaNome.toUpperCase().includes('EJA') ||
                  serieNome.toUpperCase().includes('EJA') ||
                  String(matMod).toUpperCase().includes('EJA')

                return {
                  id: a.id,
                  nome: a.nome,
                  foto_url: getAvatarUrl(a) || a.foto_url,
                  foto_avatar_path: a.foto_avatar_path,
                  foto_visualizacao_path: a.foto_visualizacao_path,
                  foto_updated_at: a.foto_updated_at,
                  escola: (a.escolas as any)?.nome ?? 'Escola Não Informada',
                  turma: turmaNome || undefined,
                  latitude: Number(a.latitude),
                  longitude: Number(a.longitude),
                  modalidade: isEJA ? 'EJA' : 'Regular'
                }
              })
            setMapDataAlunos(mapped)
            preloadFotos(mapped.map(a => a.foto_url).filter(Boolean))
            try {
              sessionStorage.setItem(cacheKey, JSON.stringify(mapped))
            } catch (e) {}
          }
        } catch (err) {
          console.error("Erro ao buscar alunos para mapa:", err)
        } finally {
          if (active) {
            setIsLoadingMapAlunos(false)
          }
        }
      }
      fetchMapDataAlunos()
    }

    return () => {
      active = false
    }
  }, [activeReport, mapaAba, selectedEscola])

  // Global print function
  const handleGlobalPrint = () => {
    if (activeReport === 'mapa') {
      return
    }
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
                {REPORT_CARDS.find(r => r.id === activeReport)?.title}
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

            {activeReport !== 'mapa' && (
              <Button
                onClick={handleGlobalPrint}
                className="bg-secondary hover:bg-hoverCustom text-foreground border border-border rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-muted-foreground" />
                Imprimir (A4)
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Content based on Macro vs School Specific */}
        {activeReport === 'servidores' ? (
          <RelatorioServidores />
        ) : activeReport === 'desempenho' ? (
          <RelatorioNotas selectedEscola={selectedEscola} />
        ) : activeReport === 'mapa' ? (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Relatório Logístico</span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">Mapa de Geolocalização</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 rounded-xl text-xs font-semibold">
                    {selectedEscola ? 'Visão da Unidade' : 'Visão Geral da Rede'}
                  </div>
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
              Os dados e gráficos para o relatório de <strong className="text-primary">{REPORT_CARDS.find(r => r.id === activeReport)?.title}</strong> estão sendo estruturados.
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

      {/* Grid of Cards Matching Screenshot Layout & Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {REPORT_CARDS.filter((card) => {
          if (card.id === 'servidores') {
            return podeVerRelatorioServidores
          }
          return true
        }).map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.id}
              onClick={() => {
                if (card.id === 'atividades') {
                  router.push(`/relatorios/atividades${selectedEscola ? `?escola_id=${selectedEscola.id}` : ''}`)
                } else {
                  setActiveReport(card.id)
                }
              }}
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
