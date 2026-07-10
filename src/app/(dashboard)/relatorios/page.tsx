'use client'

import { useState, useEffect } from 'react'
import { SchoolSelector } from '@/components/SchoolSelector'
import { useSchoolStore, Escola } from '@/store/useSchoolStore'
import { PrintFicha } from '@/components/print/print-ficha'
import { MapaGlobal } from '@/components/map/MapWrapper'
import { createClient } from '@/lib/supabaseClient'
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

type ReportType = 'desempenho' | 'frequencia' | 'censo' | 'ocorrencias' | 'mapa' | 'presenca' | null

export default function RelatoriosPage() {
  const { escolas, selectedEscola, setSelectedEscola, loadEscolas } = useSchoolStore()

  useEffect(() => {
    loadEscolas()
  }, [loadEscolas])
  const [activeReport, setActiveReport] = useState<ReportType>(null)
  const [printableSubView, setPrintableSubView] = useState<'boletim' | 'ficha' | 'diario' | null>(null)
  const [mapData, setMapData] = useState<any[]>([])
  const [isLoadingMap, setIsLoadingMap] = useState(false)

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
              .filter(v => v.funcionarios?.latitude != null && v.funcionarios?.longitude != null)
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

  // Report cards definition matching user screenshot
  const reportCards = [
    {
      id: 'desempenho' as const,
      title: 'Desempenho Escolar',
      description: 'Boletim vermelho e métricas de notas.',
      icon: TrendingUp,
      iconColor: 'text-[#38bdf8]',
    },
    {
      id: 'frequencia' as const,
      title: 'Frequência e Evasão',
      description: 'Controle de faltas e risco de evasão.',
      icon: CalendarCheck,
      iconColor: 'text-[#34d399]',
    },
    {
      id: 'censo' as const,
      title: 'Censo e Logística',
      description: 'Métricas gerais e infraestrutura.',
      icon: PieChart,
      iconColor: 'text-[#fb923c]',
    },
    {
      id: 'ocorrencias' as const,
      title: 'Ocorrências',
      description: 'Registro de comportamento e alertas.',
      icon: AlertTriangle,
      iconColor: 'text-[#f87171]',
    },
    {
      id: 'mapa' as const,
      title: 'Mapa Logístico',
      description: 'Geolocalização de funcionários.',
      icon: MapIcon,
      iconColor: 'text-[#c084fc]',
    },
    {
      id: 'presenca' as const,
      title: 'Registros de Presença',
      description: 'Logs de ponto e ronda (App Mobile).',
      icon: Scan,
      iconColor: 'text-[#22d3ee]',
    },
  ]

  // Global print function
  const handleGlobalPrint = () => {
    window.print()
  }



  if (printableSubView === 'ficha') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between no-print pb-2 border-b border-[#27272a]">
          <Button variant="ghost" onClick={() => setPrintableSubView(null)} className="text-gray-300 hover:bg-[#27272a] gap-2">
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
        <div className="flex flex-wrap items-center justify-between gap-4 no-print pb-4 border-b border-[#26304d]">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveReport(null)}
              className="bg-[#182030] hover:bg-[#20293d] border-[#2e3b56] text-white gap-2 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Relatórios
            </Button>

            <div className="h-6 w-px bg-[#2e3b56]" />

            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {reportCards.find(r => r.id === activeReport)?.title}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedEscola ? `Filtro: ${selectedEscola.nome}` : 'Visão Geral da Rede (Macro Sapeaçu)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">


            {activeReport === 'frequencia' && (
              <Button
                onClick={() => setPrintableSubView('ficha')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl gap-2"
              >
                <FileCheck className="w-4 h-4" /> Visualizar Ficha Cadastral (A4)
              </Button>
            )}

            <Button
              onClick={handleGlobalPrint}
              className="bg-[#222226] hover:bg-[#2d2d34] text-white border border-[#37373e] rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Imprimir (A4)
            </Button>
          </div>
        </div>

        {/* Dynamic Content based on Macro vs School Specific */}
        {activeReport === 'desempenho' ? (
          !selectedEscola ? (
          /* ==================== MACRO REDE REPORT DETAILS ==================== */
          <div className="space-y-6">
            <div className="bg-[#182030] border border-[#26304d] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[#26304d] pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Relatório Macro da Rede</span>
                  <h3 className="text-xl font-bold text-white mt-0.5">Consolidado Geral — Rede</h3>
                </div>
                <div className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-3 py-1 rounded-xl text-xs font-semibold">
                  {escolas.length} Escolas Integradas
                </div>
              </div>

              {/* Macro Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#141a27] p-4 rounded-xl border border-[#232d42]">
                  <p className="text-xs text-slate-400">Total de Alunos</p>
                  <p className="text-2xl font-black text-white mt-1">-</p>
                  <span className="text-[10px] text-emerald-400 font-semibold">Em breve</span>
                </div>
                <div className="bg-[#141a27] p-4 rounded-xl border border-[#232d42]">
                  <p className="text-xs text-slate-400">Média Geral da Rede</p>
                  <p className="text-2xl font-black text-sky-400 mt-1">- / 10</p>
                  <span className="text-[10px] text-slate-400">Todas as disciplinas</span>
                </div>
                <div className="bg-[#141a27] p-4 rounded-xl border border-[#232d42]">
                  <p className="text-xs text-slate-400">Frequência Média</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">-%</p>
                  <span className="text-[10px] text-emerald-400">Módulo em dev</span>
                </div>
                <div className="bg-[#141a27] p-4 rounded-xl border border-[#232d42]">
                  <p className="text-xs text-slate-400">Alertas Disciplinares</p>
                  <p className="text-2xl font-black text-rose-400 mt-1">-</p>
                  <span className="text-[10px] text-rose-400">Aguardando dados</span>
                </div>
              </div>

              {/* Tabela por Escola da Rede */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#131926] text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-3 rounded-l-lg">Unidade Escolar</th>
                      <th className="p-3">Alunos</th>
                      <th className="p-3">Média Notas</th>
                      <th className="p-3">Frequência</th>
                      <th className="p-3">Boletim Vermelho</th>
                      <th className="p-3 rounded-r-lg text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#20293d]">
                    {escolas.map((escola: any) => (
                      <tr key={escola.id} className="hover:bg-[#1f283b] transition-colors">
                        <td className="p-3 font-semibold text-white flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${escola.color || 'bg-slate-500'}`} />
                          {escola.nome}
                        </td>
                        <td className="p-3 font-mono">{escola.totalAlunos || '-'}</td>
                        <td className="p-3 font-mono font-bold text-sky-300">-</td>
                        <td className="p-3 font-mono text-emerald-400">-%</td>
                        <td className="p-3 font-mono text-rose-400 font-semibold">-</td>
                        <td className="p-3 text-right">
                          <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            N/D
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* ==================== DETAILED SCHOOL REPORT ==================== */
          <div className="space-y-6">
            <div className="bg-[#182030] border border-[#26304d] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[#26304d] pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${selectedEscola.color} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                    {selectedEscola.nome[0]}
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Relatório Detalhado da Unidade</span>
                    <h3 className="text-xl font-bold text-white">{selectedEscola.nome}</h3>
                  </div>
                </div>
                <div className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-1 rounded-xl text-xs font-semibold">
                  Código: {selectedEscola.codigo || 'ET-01'}
                </div>
              </div>

              {/* School Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#141a27] p-4 rounded-xl border border-[#232d42]">
                  <p className="text-xs text-slate-400">Matriculados na Escola</p>
                  <p className="text-2xl font-black text-white mt-1">{selectedEscola.totalAlunos}</p>
                </div>
                <div className="bg-[#141a27] p-4 rounded-xl border border-[#232d42]">
                  <p className="text-xs text-slate-400">Quadro de Professores</p>
                  <p className="text-2xl font-black text-sky-400 mt-1">{selectedEscola.totalProfessores}</p>
                </div>
                <div className="bg-[#141a27] p-4 rounded-xl border border-[#232d42]">
                  <p className="text-xs text-slate-400">Turmas Ativas</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{selectedEscola.totalTurmas}</p>
                </div>
                <div className="bg-[#141a27] p-4 rounded-xl border border-[#232d42]">
                  <p className="text-xs text-slate-400">Taxa de Assiduidade</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">94.8%</p>
                </div>
              </div>

              {/* Turmas / Detalhamento da Escola */}
              <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider text-slate-300">
                Desempenho por Turma da Escola
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['6º Ano A', '7º Ano B', '8º Ano A', '9º Ano A', '9º Ano B'].map((turma, i) => (
                  <div key={turma} className="bg-[#131926] p-4 rounded-xl border border-[#222b3e] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{turma}</p>
                      <p className="text-xs text-slate-400">32 Alunos | Turno Matutino</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">Média 8.{i + 1}</p>
                      <p className="text-[10px] text-slate-400">Frequência 95%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )
        ) : activeReport === 'mapa' ? (
          <div className="space-y-6">
            <div className="bg-[#182030] border border-[#26304d] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[#26304d] pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Relatório Logístico</span>
                  <h3 className="text-xl font-bold text-white mt-0.5">Geolocalização de Funcionários</h3>
                </div>
                <div className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-3 py-1 rounded-xl text-xs font-semibold">
                  {selectedEscola ? 'Visão da Unidade' : 'Visão Geral da Rede'}
                </div>
              </div>
              {isLoadingMap ? (
                <div className="w-full h-[520px] rounded-2xl bg-[#141a27] border border-[#232d42] flex items-center justify-center text-slate-400 animate-pulse">
                  <span className="text-sm font-semibold">Buscando dados geográficos...</span>
                </div>
              ) : (
                <MapaGlobal funcionarios={mapData} />
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center border border-dashed border-[#26304d] rounded-2xl bg-[#182030]/50 py-16 px-6 text-center shadow-inner mt-6">
            <h3 className="text-xl font-bold text-white mb-3">
              Módulo de Relatório em Construção
            </h3>
            <p className="text-slate-400 max-w-md text-sm">
              Os dados e gráficos para o relatório de <strong className="text-sky-400">{reportCards.find(r => r.id === activeReport)?.title}</strong> estão sendo estruturados.
              Eles serão disponibilizados nas próximas etapas do projeto.
            </p>
          </div>
        )}
      </div>
    )
  }

  // MAIN PAGE LAYOUT MATCHING USER SCREENSHOT EXACTLY
  return (
    <div className="space-y-7 -mt-2">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title & Icon on Left */}
        <div className="flex items-center gap-3.5">
          <BarChart3 className="w-8 h-8 text-white stroke-[2.5]" />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              {selectedEscola ? `Visão Geral — ${selectedEscola.nome}` : 'Visão Geral da Rede'}
            </h1>
          </div>
        </div>

        {/* Right side: School Selector + Print Button */}
        <div className="flex items-center gap-3 no-print">
          <SchoolSelector />

          <button
            onClick={handleGlobalPrint}
            className="bg-[#222226] hover:bg-[#2d2d34] text-white border border-[#37373e] rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-gray-300" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Mode Banner Indicator if School Selected */}
      {selectedEscola && (
        <div className="bg-[#182030]/90 border border-blue-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-200">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${selectedEscola.color}`} />
            <span>
              Relatórios filtrados especificamente para: <strong>{selectedEscola.nome}</strong>
            </span>
          </div>
          <span className="text-slate-400">Clique na escola no topo para alternar para Visão Macro</span>
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
              className="bg-[#182030] hover:bg-[#1f2a3f] border border-[#26334d] hover:border-sky-500/50 transition-all duration-200 cursor-pointer rounded-2xl p-6 md:p-7 flex flex-col justify-between group shadow-lg min-h-[160px]"
            >
              <div>
                {/* Top Icon */}
                <div className="flex items-center justify-between">
                  <Icon className={`w-8 h-8 ${card.iconColor} stroke-[2.25] group-hover:scale-110 transition-transform duration-200`} />
                </div>

                {/* Title */}
                <h3 className="text-white font-bold text-lg md:text-xl mt-5 mb-1.5 group-hover:text-sky-300 transition-colors">
                  {card.title}
                </h3>

                {/* Subtitle */}
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
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
