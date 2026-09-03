'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getHojeBrasilia } from '@/lib/dateUtils'
import {
  Building2,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  X,
  RefreshCw,
  Users,
  Clock,
  Printer,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  UserCheck,
  FileBarChart,
  FileText,
  Pin,
  Activity,
  Heart,
  UserPlus,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useDashboardMetricsSWR } from '@/lib/swr/useSigSWR'
import { toast } from 'sonner'
import { KPICard } from '@/components/KPICard'
import { FrequenciaBar } from '@/components/FrequenciaBar'
import { getSchoolIconProps } from '@/lib/schoolLogoUtils'
import { createClient } from '@/lib/supabaseClient'

const ModalDetalhesTurma = dynamic(
  () => import('@/components/ModalDetalhesTurma').then((m) => m.ModalDetalhesTurma),
  { ssr: false }
)
const ModalDetalhesFrequenciaHoje = dynamic(
  () => import('@/components/modals/ModalDetalhesFrequenciaHoje').then((m) => m.ModalDetalhesFrequenciaHoje),
  { ssr: false }
)
const ModalServidoresDiscriminados = dynamic(
  () => import('@/components/modals/modal-servidores-discriminados').then((m) => m.ModalServidoresDiscriminados),
  { ssr: false }
)
const RelatorioServidores = dynamic(
  () => import('@/components/relatorios/RelatorioServidores'),
  { ssr: false }
)

interface KPIData {
  totalAlunos: number
  totalTurmas: number
  ocorrenciasMes: number
  transferenciasPendentes: number
  turmasComFrequenciaHoje: number
  totalTurmasAtivas: number
  atividadesPendentesSecretaria: number
}

interface SaudeKPIData {
  totalProfissionais: number
  escalasHoje: number
  atestadosMes: number
  documentosMes: number
}

interface EmaeeKPIData {
  totalPacientes: number
  filaEspera: number
  profissionaisAee: number
  relatoriosPendentes: number
}

interface SemedKPIData {
  totalAlunos: number
  totalEscolas: number
  totalTurmas: number
  totalProfessores: number
  transferenciasPendentes: number
  ocorrenciasMes: number
  calendarioPublicado: boolean
  anoLetivo: number
}

const ACESSO_RAPIDO_ITEMS = [
  { label: 'Alunos', icon: GraduationCap, href: '/alunos' },
  { label: 'Turmas', icon: BookOpen, href: '/turmas' },
  { label: 'Avaliações', icon: ClipboardList, href: '/avaliacoes' },
  { label: 'Ocorrências', icon: AlertTriangle, href: '/ocorrencias', warn: true },
  { label: 'Transferências', icon: ArrowLeftRight, href: '/transferencias' },
  { label: 'Funcionários', icon: Users, href: '/funcionarios' },
] as const

const ACESSO_RAPIDO_SEMED_ITEMS = [
  { label: 'Alunos da Rede', icon: GraduationCap, href: '/alunos' },
  { label: 'Matrículas', icon: BookOpen, href: '/matriculas' },
  { label: 'Calendário Acadêmico', icon: Calendar, href: '/calendario-academico' },
  { label: 'Transferências', icon: ArrowLeftRight, href: '/transferencias' },
  { label: 'Ocorrências', icon: AlertTriangle, href: '/ocorrencias', warn: true },
  { label: 'Servidores da Educação', icon: Users, href: '/funcionarios' },
  { label: 'Relatórios da Rede', icon: FileBarChart, href: '/relatorios' },
] as const

const ACESSO_RAPIDO_SAUDE_ITEMS = [
  { label: 'Servidores', icon: Users, href: '/funcionarios' },
  { label: 'Escalas & Plantões', icon: UserCheck, href: '/painel-chefe' },
  { label: 'Atestados Médicos', icon: Stethoscope, href: '/atestados' },
  { label: 'Documentos', icon: FileText, href: '/documentos' },
  { label: 'Relatórios', icon: FileBarChart, href: '/relatorios' },
  { label: 'Mural de Avisos', icon: Pin, href: '/mural' },
] as const

const ACESSO_RAPIDO_EMAEE_ITEMS = [
  { label: 'Pastas de Alunos', icon: Heart, href: '/emaee/pacientes' },
  { label: 'Fila de Espera', icon: Clock, href: '/emaee/fila-espera' },
  { label: 'Profissionais AEE', icon: UserPlus, href: '/emaee/vincular-profissionais' },
  { label: 'Calendário de Atendimentos', icon: Calendar, href: '/emaee/calendario-atendimentos' },
  { label: 'Relatórios Pendentes', icon: FileSpreadsheet, href: '/emaee/solicitacoes-escola' },
  { label: 'Servidores', icon: Users, href: '/funcionarios' },
  { label: 'Mural de Avisos', icon: Pin, href: '/mural' },
] as const

interface SecretariaItem {
  id: string
  nome: string
  logo_url: string | null
}

export default function HomePage() {
  const router = useRouter()
  const { escolas, selectedEscola, setSelectedEscola, selectedSecretaria, setSelectedSecretaria, loadEscolas } = useSchoolStore()
  const { funcionario, acessos, vinculos, escolaAtivaId, isAdminGlobalOrRoot, isContaEja, isSecretarioEducacao } = useAuthStore()

  useEffect(() => {
    if (isContaEja()) {
      router.replace('/eja')
    }
  }, [isContaEja, router])

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const vinculosAtivos = useMemo(() => vinculos?.filter((v) => v.ativo) || [], [vinculos])
  const isProfessor = useMemo(
    () => acessos.some(a => a.nivel === 4 || a.nivel === 5) || Boolean(funcionario?.cargo?.toLowerCase().includes('professor')),
    [acessos, funcionario?.cargo]
  )
  const isMultiLotadoDocente = isProfessor && vinculosAtivos.length > 1

  const isSuperAdmin = Boolean(funcionario?.is_superadmin)
  const isNivel1 = useMemo(
    () => isSuperAdmin || acessos.some(a => a.nivel === 1 && a.ativo),
    [isSuperAdmin, acessos]
  )

  // IDs de secretarias que o nível 1 pode acessar (null = todas)
  const secretariasIdsPermitidas = useMemo<string[] | null>(() => {
    if (isSuperAdmin) return null
    if (!isNivel1) return null
    const acessoNivel1 = acessos.find(a => a.nivel === 1 && a.ativo)
    return (acessoNivel1 as any)?.secretarias_ids ?? null
  }, [isSuperAdmin, isNivel1, acessos])

  // Lista de secretarias do banco (para o fluxo nível 1)
  const [secretarias, setSecretarias] = useState<SecretariaItem[]>([])
  const [loadingSecretarias, setLoadingSecretarias] = useState(false)

  // Estados para o Widget de Relatório de Servidores
  const [widgetStats, setWidgetStats] = useState<{ total: number; concursados: number; contratados: number; nomeados: number; outros: number } | null>(null)
  const [loadingWidgetStats, setLoadingWidgetStats] = useState(false)
  const [isRelatorioServidoresModalOpen, setIsRelatorioServidoresModalOpen] = useState(false)
  const [isDiscriminadosModalOpen, setIsDiscriminadosModalOpen] = useState(false)
  const [selectedTipoVinculoModal, setSelectedTipoVinculoModal] = useState<string>('Total')

  const handleOpenDiscriminadosModal = (e: React.MouseEvent, vinculo: string) => {
    e.stopPropagation()
    setSelectedTipoVinculoModal(vinculo)
    setIsDiscriminadosModalOpen(true)
  }

  // Carrega estatísticas resumidas para o widget de servidores (apenas Nível 1 na visão geral de secretarias)
  useEffect(() => {
    if (!isNivel1 || selectedSecretaria) {
      setWidgetStats(null)
      return
    }
    let active = true
    setLoadingWidgetStats(true)
    const carregarStats = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_relatorio_servidores', {})
        if (!active) return
        if (!error && data && (data as any).resumo) {
          const res = (data as any).resumo
          setWidgetStats({
            total: res.total_servidores_unicos ?? 0,
            concursados: res.total_concursados ?? 0,
            contratados: res.total_contratados ?? 0,
            nomeados: res.total_nomeados ?? 0,
            outros: res.total_outros ?? 0,
          })
        }
      } catch (err) {
        console.error('Erro ao carregar estatísticas do widget:', err)
      } finally {
        if (active) setLoadingWidgetStats(false)
      }
    }
    carregarStats()
    return () => { active = false }
  }, [isNivel1, selectedSecretaria])

  // Carrega secretarias do banco para o fluxo nível 1
  useEffect(() => {
    if (!isNivel1) return
    let active = true
    setLoadingSecretarias(true)
    const supabase = createClient()
    supabase
      .from('secretarias')
      .select('id, nome, logo_url')
      .is('deleted_at', null)
      .eq('ativo', true)
      .order('nome')
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          console.error('[home] Erro ao carregar secretarias:', error)
          toast.error('Erro ao carregar lista de secretarias.')
        } else if (data) {
          // Filtra pelas secretarias permitidas ao nível 1 (null = todas)
          const filtradas = secretariasIdsPermitidas
            ? data.filter(s => secretariasIdsPermitidas.includes(s.id))
            : data
          setSecretarias(filtradas)
        }
        setLoadingSecretarias(false)
      })
    return () => { active = false }
  }, [isNivel1, secretariasIdsPermitidas])

  // Escolas filtradas pela secretaria selecionada (para o passo 2 do fluxo nível 1)
  const escolasDaSecretaria = useMemo(() => {
    if (!selectedSecretaria) return []
    return escolas.filter(e => !e.is_teste && e.secretaria_id === selectedSecretaria.id)
  }, [escolas, selectedSecretaria])

  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [saudeKpi, setSaudeKpi] = useState<SaudeKPIData | null>(null)
  const [emaeeKpi, setEmaeeKpi] = useState<EmaeeKPIData | null>(null)
  const [loadingKpi, setLoadingKpi] = useState(false)

  // ── Detecção Estrita de EMAEE x Saúde x Educação Regular ──
  const isEMAEE = useMemo(() => {
    if (!selectedEscola) return false
    return selectedEscola.tipo === 'EMAEE' || /emaee/i.test(selectedEscola.nome || '')
  }, [selectedEscola])

  const secNome = selectedSecretaria?.nome || selectedEscola?.secretariaNome || (selectedEscola?.secretarias as any)?.nome || ''
  const isSaudeUnit = useMemo(() => {
    if (isEMAEE) return false
    if (selectedSecretaria && /sa[uú]de/i.test(selectedSecretaria.nome)) return true
    if (selectedEscola) {
      if (selectedEscola.tipo === 'SAUDE' || selectedEscola.tipo === 'UNIDADE_SAUDE') return true
      if (/sa[uú]de/i.test(selectedEscola.secretariaNome || '')) return true
      if (/sa[uú]de|posto|ubs|usf|hospital|upa/i.test(selectedEscola.nome)) return true
    }
    return Boolean(secNome && /sa[uú]de/i.test(secNome))
  }, [isEMAEE, selectedSecretaria, selectedEscola, secNome])

  const isSecretario = useMemo(
    () => isSuperAdmin || (isSecretarioEducacao?.() ?? false),
    [isSuperAdmin, isSecretarioEducacao, acessos, funcionario?.cargo, funcionario?.is_superadmin]
  )

  const isSemedContext = useMemo(() => {
    if (isEMAEE || isSaudeUnit) return false
    const nome = (selectedSecretaria?.nome || '').toLowerCase()
    const isEducacaoSec = /educa|semed|ensino/i.test(nome) || (!selectedSecretaria?.nome?.match(/sa[uú]de|social|obras|transporte/i))
    return Boolean((isSecretario || isSuperAdmin || isNivel1) && isEducacaoSec)
  }, [isEMAEE, isSaudeUnit, selectedSecretaria?.nome, isSecretario, isSuperAdmin, isNivel1])

  const [semedKpi, setSemedKpi] = useState<SemedKPIData | null>(null)

  // Estados para Professor
  interface TeacherKPIData {
    totalTurmas: number
    totalAlunos: number
    chamadasPendentes: number
    atividadesImpressao: number
  }
  const [teacherKpi, setTeacherKpi] = useState<TeacherKPIData | null>(null)
  const [loadingTeacherKpi, setLoadingTeacherKpi] = useState(false)
  const [aulasHoje, setAulasHoje] = useState<any[]>([])
  const [loadingAulasHoje, setLoadingAulasHoje] = useState(false)
  
  const [schoolStats, setSchoolStats] = useState<Record<string, { turmas: number; aulasHoje: number; chamadasPendentes: number }>>({})
  const [loadingSchoolStats, setLoadingSchoolStats] = useState(false)
  
  // Modal de Chamada do Professor
  const [selectedTurmaChamada, setSelectedTurmaChamada] = useState<any | null>(null)
  const [selectedAulaChamada, setSelectedAulaChamada] = useState<any | null>(null)
  const [isModalChamadaOpen, setIsModalChamadaOpen] = useState(false)
  const [isModalFrequenciaOpen, setIsModalFrequenciaOpen] = useState(false)

  useEffect(() => {
    loadEscolas()
  }, [loadEscolas])

  const isAdmin = isAdminGlobalOrRoot?.() ?? false

  // Determina o nível do usuário na escola selecionada (para exibição de KPIs)
  const nivelNaEscola = selectedEscola
    ? acessos.find(a => a.escola_id === selectedEscola.id)?.nivel ?? 99
    : 99
  const podeVerKpiGerencial = isAdmin || nivelNaEscola <= 3
  const isVisaoDocente = isProfessor && !podeVerKpiGerencial

  const activeEscolaId = selectedEscola?.id || escolaAtivaId
  const deveBuscarKpiEscola = !isEMAEE && !isSaudeUnit && !isVisaoDocente
  const { data: dashboardSwrMetrics } = useDashboardMetricsSWR(deveBuscarKpiEscola ? activeEscolaId : null)

  const dashboardSwrMetricsRef = useRef(dashboardSwrMetrics)
  useEffect(() => {
    dashboardSwrMetricsRef.current = dashboardSwrMetrics
  }, [dashboardSwrMetrics])

  useEffect(() => {
    if (dashboardSwrMetrics && !isEMAEE && !isSaudeUnit && !isVisaoDocente) {
      setKpi(prev => ({
        totalAlunos: dashboardSwrMetrics.totalAlunos ?? prev?.totalAlunos ?? 0,
        totalTurmas: dashboardSwrMetrics.totalTurmas ?? prev?.totalTurmas ?? 0,
        ocorrenciasMes: dashboardSwrMetrics.ocorrenciasMes ?? prev?.ocorrenciasMes ?? 0,
        transferenciasPendentes: prev?.transferenciasPendentes ?? 0,
        turmasComFrequenciaHoje: prev?.turmasComFrequenciaHoje ?? 0,
        totalTurmasAtivas: dashboardSwrMetrics.totalTurmas ?? prev?.totalTurmasAtivas ?? 0,
        atividadesPendentesSecretaria: dashboardSwrMetrics.diariosPendentes ?? prev?.atividadesPendentesSecretaria ?? 0,
      }))
    }
  }, [dashboardSwrMetrics, isEMAEE, isSaudeUnit, isVisaoDocente])

  const fetchKpis = useCallback(async (escolaId: string, signal?: AbortSignal) => {
    if (isMounted.current && !dashboardSwrMetricsRef.current) setLoadingKpi(true)
    try {
      const res = await fetch(`/api/home/admin-kpis?escolaId=${escolaId}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: KPIData = await res.json()
      if (isMounted.current) setKpi(data)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('[home] Erro ao carregar KPIs gerenciais:', err)
    } finally {
      if (isMounted.current) setLoadingKpi(false)
    }
  }, [])

  const fetchSaudeKpis = useCallback(async (unidadeId: string, signal?: AbortSignal) => {
    if (isMounted.current) setLoadingKpi(true)
    try {
      const res = await fetch(`/api/home/saude-kpis?escolaId=${unidadeId}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: SaudeKPIData = await res.json()
      if (isMounted.current) setSaudeKpi(data)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('[home] Erro ao carregar KPIs da Saúde:', err)
    } finally {
      if (isMounted.current) setLoadingKpi(false)
    }
  }, [])

  const fetchEmaeeKpis = useCallback(async (escolaId: string, signal?: AbortSignal) => {
    if (isMounted.current) setLoadingKpi(true)
    try {
      const res = await fetch(`/api/home/emaee-kpis?escolaId=${escolaId}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: EmaeeKPIData = await res.json()
      if (isMounted.current) setEmaeeKpi(data)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('[home] Erro ao carregar KPIs do EMAEE:', err)
    } finally {
      if (isMounted.current) setLoadingKpi(false)
    }
  }, [])

  const fetchSemedKpis = useCallback(async (secId: string, signal?: AbortSignal) => {
    if (isMounted.current) setLoadingKpi(true)
    try {
      const res = await fetch(`/api/home/semed-kpis?secretariaId=${secId}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: SemedKPIData = await res.json()
      if (isMounted.current) setSemedKpi(data)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('[home] Erro ao carregar KPIs da SEMED:', err)
    } finally {
      if (isMounted.current) setLoadingKpi(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEscola?.id) {
      const controller = new AbortController()
      if (isEMAEE) {
        setKpi(null)
        setSaudeKpi(null)
        fetchEmaeeKpis(selectedEscola.id, controller.signal)
      } else if (isSaudeUnit) {
        setKpi(null)
        setEmaeeKpi(null)
        fetchSaudeKpis(selectedEscola.id, controller.signal)
      } else if (!isVisaoDocente) {
        setSaudeKpi(null)
        setEmaeeKpi(null)
        fetchKpis(selectedEscola.id, controller.signal)
      }
      return () => controller.abort()
    }
  }, [selectedEscola?.id, isEMAEE, isSaudeUnit, isVisaoDocente, fetchKpis, fetchSaudeKpis, fetchEmaeeKpis])

  useEffect(() => {
    if (selectedSecretaria?.id && isSemedContext && !selectedEscola) {
      const controller = new AbortController()
      fetchSemedKpis(selectedSecretaria.id, controller.signal)
      return () => controller.abort()
    }
  }, [selectedSecretaria?.id, isSemedContext, selectedEscola, fetchSemedKpis])

  // Buscar estatísticas rápidas por escola para professores multi-lotados
  const fetchSchoolStats = useCallback(async (signal?: AbortSignal) => {
    if (!funcionario?.id || vinculosAtivos.length === 0) return
    if (isMounted.current) setLoadingSchoolStats(true)
    try {
      const escolaIds = vinculosAtivos
        .map((v) => v.escola_id)
        .filter((id): id is string => Boolean(id))
      const escolaIdsParam = encodeURIComponent(JSON.stringify(escolaIds))
      const res = await fetch(
        `/api/home/school-stats?funcionarioId=${funcionario.id}&escolaIds=${escolaIdsParam}`,
        { signal }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { stats } = await res.json()
      if (isMounted.current) setSchoolStats(stats ?? {})
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('[home] Erro ao buscar estatísticas das escolas:', err)
      toast.error('Não foi possível carregar os dados das escolas.')
    } finally {
      if (isMounted.current) setLoadingSchoolStats(false)
    }
  }, [funcionario?.id, vinculosAtivos])

  useEffect(() => {
    if (isProfessor && vinculosAtivos.length > 0 && !selectedEscola) {
      const controller = new AbortController()
      fetchSchoolStats(controller.signal)
      return () => controller.abort()
    }
  }, [isProfessor, vinculosAtivos, selectedEscola, fetchSchoolStats])

  // Buscar dados específicos do professor para a escola selecionada
  const fetchTeacherDashboard = useCallback(async (escolaId: string, signal?: AbortSignal) => {
    if (!funcionario?.id) return
    if (isMounted.current) {
      setLoadingTeacherKpi(true)
      setLoadingAulasHoje(true)
    }
    try {
      const res = await fetch(
        `/api/home/teacher-kpis?escolaId=${escolaId}&funcionarioId=${funcionario.id}`,
        { signal }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { kpi: tKpi, aulasHoje: aulas } = await res.json()
      if (isMounted.current) {
        setTeacherKpi(tKpi ?? null)
        setAulasHoje(aulas ?? [])
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      console.error('[home] Erro ao buscar painel do professor:', err)
      toast.error('Não foi possível carregar os dados do painel do docente.')
    } finally {
      if (isMounted.current) {
        setLoadingTeacherKpi(false)
        setLoadingAulasHoje(false)
      }
    }
  }, [funcionario?.id])

  useEffect(() => {
    if (selectedEscola?.id && isProfessor) {
      const controller = new AbortController()
      fetchTeacherDashboard(selectedEscola.id, controller.signal)
      return () => controller.abort()
    }
  }, [selectedEscola?.id, isProfessor, fetchTeacherDashboard])

  // Auto-seleção de escola para usuários não administradores (Diretores, etc.)
  useEffect(() => {
    if (isMultiLotadoDocente) return
    if (selectedEscola?.is_teste) return

    if (!isAdmin && escolas.length > 0) {
      const acessoEscolar = acessos.find(a => a.nivel && a.nivel >= 2 && a.nivel <= 6 && a.ativo)
      const targetId = acessoEscolar?.escola_id || escolaAtivaId
      if (targetId) {
        const escola = escolas.find(e => e.id === targetId)
        if (escola && selectedEscola?.id !== escola.id) {
          setSelectedEscola(escola)
        }
      }
    }
  }, [isAdmin, escolas, acessos, escolaAtivaId, selectedEscola, setSelectedEscola, isMultiLotadoDocente])

  if (isContaEja()) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-surface-1 border border-borderCustom rounded-2xl">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm text-muted-foreground">Redirecionando para o Portal EJA...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 -mt-2">

      {/* ── INDICADOR DE UNIDADE/ESCOLA SELECIONADA ── */}
      {selectedEscola && (
        <div className="bg-surface-2 border border-borderCustom rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isSaudeUnit ? 'Unidade Selecionada:' : 'Escola Selecionada:'}
            </span>
            <div className="flex items-center gap-2 bg-highlight/10 text-highlight border border-highlight/30 px-3 py-1.5 rounded-xl text-sm font-medium">
              <div className={`w-5 h-5 rounded-full overflow-hidden ${selectedEscola.logo_url ? 'bg-transparent' : selectedEscola.color || 'bg-blue-600'} flex items-center justify-center text-white text-xs font-bold`}>
                {selectedEscola.logo_url ? (
                  <img src={selectedEscola.logo_url} alt={selectedEscola.nome || 'Escola'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  (selectedEscola.nome || 'E')[0]
                )}
              </div>
              <span>{selectedEscola.nome}</span>
            </div>
          </div>
          {(isAdmin || isMultiLotadoDocente || isSecretario) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEscola(null)}
              className="text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" /> {isSecretario ? 'Voltar para a Rede' : isSaudeUnit ? 'Trocar Unidade' : 'Trocar Escola'}
            </Button>
          )}
        </div>
      )}

      {/* ── VISÃO 1A: NÍVEL 1 — SELEÇÃO DE SECRETARIA & PAINEL DE WIDGETS ── */}
      {isNivel1 && !selectedSecretaria ? (
        <div className="space-y-10">
          {/* Seção Superior: Secretarias em Linha Horizontal (Desktop/Grid) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Secretarias da Rede Municipal</h1>
                  <p className="text-xs text-muted-foreground">Selecione uma secretaria para filtrar unidades e serviços</p>
                </div>
              </div>
            </div>

            {loadingSecretarias ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 bg-surface-1 border border-borderCustom rounded-2xl">
                <Loader2 className="w-7 h-7 animate-spin text-sky-400" />
                <p className="text-xs text-muted-foreground">Carregando secretarias...</p>
              </div>
            ) : secretarias.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 bg-surface-1 border border-borderCustom rounded-2xl">
                <Building2 className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Nenhuma secretaria disponível para o seu acesso.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {secretarias.map((secretaria) => (
                  <div
                    key={secretaria.id}
                    onClick={() => setSelectedSecretaria(secretaria)}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-surface-1 border border-borderCustom hover:border-sky-500/50 hover:bg-sky-500/5 transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center bg-white p-2 border border-borderCustom shrink-0 group-hover:scale-105 transition-transform">
                      {secretaria.logo_url ? (
                        <img src={secretaria.logo_url} alt={secretaria.nome} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-7 h-7 text-sky-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-foreground group-hover:text-sky-400 transition-colors truncate">
                        {secretaria.nome}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Clique para acessar o painel
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção Inferior: Widgets com Dados Importantes */}
          <div className="space-y-4 pt-6 border-t border-borderCustom">
            <div className="flex items-center gap-2.5">
              <FileBarChart className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-foreground">Indicadores & Relatórios Consolidados</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Widget 1: Relatório de Servidores */}
              <div
                onClick={() => setIsRelatorioServidoresModalOpen(true)}
                className="group bg-surface-1 border border-borderCustom hover:border-emerald-500/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                        Relatório de Servidores
                      </h3>
                      <p className="text-xs text-muted-foreground">Consolidado por Vínculo Empregatício</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Ver Detalhes
                  </span>
                </div>

                {/* Métricas resumidas no widget */}
                {loadingWidgetStats ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div
                      onClick={(e) => handleOpenDiscriminadosModal(e, 'Total')}
                      className="bg-background/50 hover:bg-background/80 p-3 rounded-xl border border-borderCustom/50 hover:border-primary/50 transition-all cursor-pointer group/item"
                      title="Clique para ver todos os servidores discriminados por secretarias"
                    >
                      <span className="text-[11px] text-muted-foreground block font-medium group-hover/item:text-foreground transition-colors">Total de Servidores</span>
                      <span className="text-xl font-bold text-foreground">{widgetStats?.total ?? 0}</span>
                    </div>

                    <div
                      onClick={(e) => handleOpenDiscriminadosModal(e, 'Concursado')}
                      className="bg-background/50 hover:bg-background/80 p-3 rounded-xl border border-borderCustom/50 hover:border-blue-500/50 transition-all cursor-pointer group/item"
                      title="Clique para ver Concursados discriminados por secretarias"
                    >
                      <span className="text-[11px] text-blue-400 block font-medium group-hover/item:underline">Concursados</span>
                      <span className="text-xl font-bold text-blue-400">{widgetStats?.concursados ?? 0}</span>
                    </div>

                    <div
                      onClick={(e) => handleOpenDiscriminadosModal(e, 'Contratado')}
                      className="bg-background/50 hover:bg-background/80 p-3 rounded-xl border border-borderCustom/50 hover:border-emerald-500/50 transition-all cursor-pointer group/item"
                      title="Clique para ver Contratados discriminados por secretarias"
                    >
                      <span className="text-[11px] text-emerald-400 block font-medium group-hover/item:underline">Contratados</span>
                      <span className="text-xl font-bold text-emerald-400">{widgetStats?.contratados ?? 0}</span>
                    </div>

                    <div
                      onClick={(e) => handleOpenDiscriminadosModal(e, 'Nomeado')}
                      className="bg-background/50 hover:bg-background/80 p-3 rounded-xl border border-borderCustom/50 hover:border-purple-500/50 transition-all cursor-pointer group/item"
                      title="Clique para ver Nomeados discriminados por secretarias"
                    >
                      <span className="text-[11px] text-purple-400 block font-medium group-hover/item:underline">Nomeados</span>
                      <span className="text-xl font-bold text-purple-400">{widgetStats?.nomeados ?? 0}</span>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between border-t border-borderCustom/40">
                  <span>Clique para abrir o relatório gerencial completo</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>

          {/* Modal de Relatório de Servidores */}
          {isRelatorioServidoresModalOpen && (
            <StandardDialog
              open={isRelatorioServidoresModalOpen}
              onOpenChange={setIsRelatorioServidoresModalOpen}
              title="Relatório Geral de Servidores da Rede Municipal"
              description="Consolidado de pessoal, distribuição por cargos, modalidades e tipos de vínculo."
              maxWidth="sm:max-w-6xl"
            >
              <div className="py-2">
                <RelatorioServidores />
              </div>
            </StandardDialog>
          )}

          {/* Modal de Servidores Discriminados por Secretaria e Unidades */}
          {isDiscriminadosModalOpen && (
            <ModalServidoresDiscriminados
              open={isDiscriminadosModalOpen}
              onOpenChange={setIsDiscriminadosModalOpen}
              tipoVinculoInicial={selectedTipoVinculoModal}
            />
          )}
        </div>

      ) : isNivel1 && isSemedContext && selectedSecretaria && !selectedEscola ? (
        /* ── VISÃO 1B: SEMED — PAINEL E KPIS DA REDE MUNICIPAL ── */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSecretaria(null)}
                className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Secretarias
              </Button>
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-surface-1 border-[0.5px] border-borderCustom shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                  {selectedSecretaria.logo_url ? (
                    <img
                      src={selectedSecretaria.logo_url}
                      alt={selectedSecretaria.nome}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-sky-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      {selectedSecretaria.nome}
                    </h1>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
                      Visão de Rede
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Painel Gerencial Consolidado da Rede Municipal de Ensino
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchSemedKpis(selectedSecretaria.id)}
                disabled={loadingKpi}
                className="text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
              >
                <RefreshCw className={cn('w-4 h-4', loadingKpi && 'animate-spin')} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* ── GRID DE KPIs DA REDE SEMED ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              icon={GraduationCap}
              label="Alunos da Rede"
              value={semedKpi?.totalAlunos ?? 0}
              loading={loadingKpi}
              color="blue"
              href="/alunos"
            />
            <KPICard
              icon={Building2}
              label="Escolas Ativas"
              value={semedKpi?.totalEscolas ?? 0}
              loading={loadingKpi}
              color="emerald"
            />
            <KPICard
              icon={BookOpen}
              label="Turmas Ativas"
              value={semedKpi?.totalTurmas ?? 0}
              loading={loadingKpi}
              color="violet"
            />
            <KPICard
              icon={Users}
              label="Docentes / Professores"
              value={semedKpi?.totalProfessores ?? 0}
              loading={loadingKpi}
              color="blue"
              href="/funcionarios"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KPICard
              icon={ArrowLeftRight}
              label="Transferências Pendentes"
              value={semedKpi?.transferenciasPendentes ?? 0}
              loading={loadingKpi}
              color="amber"
              href="/transferencias"
            />
            <KPICard
              icon={AlertTriangle}
              label="Ocorrências da Rede (Mês)"
              value={semedKpi?.ocorrenciasMes ?? 0}
              loading={loadingKpi}
              color="rose"
              href="/ocorrencias"
            />
            <KPICard
              icon={Calendar}
              label={`Calendário ${semedKpi?.anoLetivo ?? new Date().getFullYear()}`}
              value={semedKpi?.calendarioPublicado ? 'Publicado' : 'Em Elaboração'}
              loading={loadingKpi}
              color={semedKpi?.calendarioPublicado ? 'emerald' : 'amber'}
              href="/calendario-academico"
            />
          </div>

          {/* ── UNIDADES DA REDE (SELETOR DE ESCOLA DA SEMED) ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-foreground">Escolas da Rede ({escolasDaSecretaria.length})</h2>
              </div>
              <span className="text-xs text-muted-foreground">Clique para inspecionar uma escola individual</span>
            </div>

            {escolasDaSecretaria.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 bg-surface-1 border border-borderCustom rounded-2xl">
                <Building2 className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Nenhuma escola vinculada a esta secretaria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8 justify-items-center pt-2">
                {escolasDaSecretaria.map((escola) => {
                  const iconProps = getSchoolIconProps(escola)
                  return (
                    <div
                      key={escola.id}
                      onClick={() => setSelectedEscola(escola)}
                      className="flex flex-col items-center cursor-pointer group w-32"
                    >
                      <div
                        className="w-20 h-20 rounded-[20px] overflow-hidden flex items-center justify-center shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg active:scale-95"
                        style={iconProps.style}
                      >
                        {iconProps.content}
                      </div>
                      <span className="mt-2.5 text-xs font-semibold text-center text-foreground group-hover:text-highlight transition-colors line-clamp-2 max-w-[110px] leading-snug">
                        {escola.nome}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── ACESSO RÁPIDO DA SEMED ── */}
          <div className="pt-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Acesso Rápido — SEMED
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {ACESSO_RAPIDO_SEMED_ITEMS.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Card className={cn(
                      'bg-surface-1 hover:bg-surface-2 border-borderCustom hover:border-sky-500/40 transition-all duration-200 cursor-pointer p-3 flex flex-col items-center justify-center text-center gap-2 min-h-[80px] rounded-xl group shadow-sm',
                    )}>
                      <Icon className={cn(
                        'w-5 h-5 transition-colors',
                        'warn' in item && item.warn
                          ? 'text-amber-400 group-hover:text-amber-300'
                          : 'text-sky-400 group-hover:text-sky-300'
                      )} />
                      <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground leading-tight">
                        {item.label}
                      </span>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

      ) : isNivel1 && selectedSecretaria && !selectedEscola ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSecretaria(null)}
                className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Secretarias
              </Button>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                {selectedSecretaria.logo_url ? (
                  <img src={selectedSecretaria.logo_url} alt={selectedSecretaria.nome} loading="lazy" decoding="async" className="w-7 h-7 object-contain rounded-lg bg-white p-0.5" />
                ) : (
                  <Building2 className="w-6 h-6 text-sky-400" />
                )}
                {selectedSecretaria.nome}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground hidden md:block">
              {/sa[uú]de/i.test(selectedSecretaria?.nome || '') ? 'Clique em uma unidade de saúde para acessar o painel' : 'Clique em uma escola para acessar o painel'}
            </p>
          </div>

          {escolasDaSecretaria.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 bg-surface-1 border border-borderCustom rounded-2xl">
              <Building2 className="w-10 h-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma unidade vinculada a esta secretaria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8 justify-items-center pt-6">
              {escolasDaSecretaria.map((escola) => {
                const iconProps = getSchoolIconProps(escola)
                return (
                  <div
                    key={escola.id}
                    onClick={() => setSelectedEscola(escola)}
                    className="flex flex-col items-center cursor-pointer group w-32"
                  >
                    <div
                      className="w-20 h-20 rounded-[20px] overflow-hidden flex items-center justify-center shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg active:scale-95"
                      style={iconProps.style}
                    >
                      {iconProps.content}
                    </div>
                    <span className="mt-2.5 text-xs font-semibold text-center text-foreground group-hover:text-highlight transition-colors line-clamp-2 max-w-[110px] leading-snug">
                      {escola.nome}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : !selectedEscola ? (
        !isAdmin && !isMultiLotadoDocente ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-surface-1 border border-borderCustom rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-[#185FA5] dark:text-[#3ea6ff]" />
            <p className="text-sm text-muted-foreground">Carregando painel da unidade...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                <Building2 className="w-8 h-8 text-[#185FA5] dark:text-[#3ea6ff]" />
                {isSaudeUnit ? 'Selecione uma Unidade de Saúde' : 'Selecione uma Escola'}
              </h1>
              <p className="text-sm text-muted-foreground hidden md:block">
                {isSaudeUnit ? 'Clique em uma unidade de saúde para acessar o painel' : 'Clique em uma escola para acessar o painel'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8 justify-items-center pt-6">
              {(isAdmin ? escolas.filter(e => !e.is_teste) : escolas.filter(e => !e.is_teste && vinculosAtivos.some(v => v.escola_id === e.id))).map((escola) => {
                const stats = schoolStats[escola.id]
                const iconProps = getSchoolIconProps(escola)
                return (
                  <div
                    key={escola.id}
                    onClick={() => setSelectedEscola(escola)}
                    className="flex flex-col items-center cursor-pointer group w-32"
                  >
                    <div
                      className="w-20 h-20 rounded-[20px] overflow-hidden flex items-center justify-center shadow-md transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg active:scale-95"
                      style={iconProps.style}
                    >
                      {iconProps.content}
                    </div>
                    <span className="mt-2.5 text-xs font-semibold text-center text-foreground group-hover:text-highlight transition-colors line-clamp-2 max-w-[110px] leading-snug">
                      {escola.nome}
                    </span>

                    {isProfessor && (
                      <div className="flex flex-col items-center mt-1">
                        {loadingSchoolStats ? (
                          <div className="h-3 w-12 bg-muted/20 rounded animate-pulse" />
                        ) : stats ? (
                          <>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {stats.turmas} T • {stats.aulasHoje} A
                            </span>
                            {stats.chamadasPendentes > 0 && (
                              <span className="mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                {stats.chamadasPendentes} Pendente{stats.chamadasPendentes > 1 ? 's' : ''}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Sem dados</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      ) : !podeVerKpiGerencial && isProfessor ? (
        /* ── VISÃO 3: DASHBOARD DO PROFESSOR ── */
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Header da escola */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-1 border-[0.5px] border-borderCustom shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {selectedEscola.logo_url ? (
                  <img
                    src={selectedEscola.logo_url}
                    alt={selectedEscola.nome}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <GraduationCap className="w-8 h-8 text-[#185FA5] dark:text-[#3ea6ff]" />
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {selectedEscola.nome}
                </h1>
                <p className="text-sm text-muted-foreground">Painel do Docente — Atividades de hoje</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchTeacherDashboard(selectedEscola.id)}
              disabled={loadingTeacherKpi}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RefreshCw className={cn('w-4 h-4', loadingTeacherKpi && 'animate-spin')} />
              Atualizar
            </Button>
          </div>

          {/* KPIs do Professor */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              icon={Users}
              label="Minhas Turmas"
              value={teacherKpi?.totalTurmas ?? 0}
              loading={loadingTeacherKpi}
              color="violet"
            />
            <KPICard
              icon={GraduationCap}
              label="Meus Alunos"
              value={teacherKpi?.totalAlunos ?? 0}
              loading={loadingTeacherKpi}
              color="blue"
            />
            <KPICard
              icon={Clock}
              label="Chamadas Pendentes"
              value={teacherKpi?.chamadasPendentes ?? 0}
              loading={loadingTeacherKpi}
              color="amber"
            />
            <KPICard
              icon={Printer}
              label="Atividades na Fila"
              value={teacherKpi?.atividadesImpressao ?? 0}
              loading={loadingTeacherKpi}
              color="emerald"
              href="/avaliacoes"
            />
          </div>

          {/* Minhas Aulas Hoje */}
          <Card className="bg-surface-1 border-borderCustom rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-highlight" />
              Minha Agenda de Aulas — Hoje
            </h3>

            {loadingAulasHoje ? (
              <div className="space-y-3 py-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-highlight" />
                <span>Buscando agenda de aulas...</span>
              </div>
            ) : aulasHoje.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-borderCustom rounded-2xl text-muted-foreground text-sm">
                Nenhuma aula programada na agenda para o dia de hoje.
              </div>
            ) : (
              <div className="rounded-xl border border-borderCustom overflow-hidden bg-[#0d0d0d] overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader className="bg-[#080808]">
                    <TableRow className="border-borderCustom hover:bg-transparent">
                      <TableHead className="text-white">Horário</TableHead>
                      <TableHead className="text-white text-center">Turma</TableHead>
                      <TableHead className="text-white text-center">Disciplina</TableHead>
                      <TableHead className="text-white text-center">Status</TableHead>
                      <TableHead className="text-white text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aulasHoje.map((aula) => (
                      <TableRow key={aula.id} className="border-borderCustom hover:bg-[#151517] transition-colors">
                        <TableCell className="font-semibold text-white font-mono text-xs">
                          {aula.horario_inicio.slice(0, 5)} - {aula.horario_fim.slice(0, 5)}
                        </TableCell>
                        <TableCell className="text-center text-white font-bold">
                          {aula.turmas?.nome ?? '-'}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground font-medium">
                          {aula.materias?.nome ?? '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            aula.status === 'normal'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : aula.status === 'alterado'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {aula.status.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => {
                              setSelectedTurmaChamada({
                                id: aula.turma_id,
                                nome: aula.turmas?.nome || 'Turma'
                              })
                              setSelectedAulaChamada(aula)
                              setIsModalChamadaOpen(true)
                            }}
                            disabled={aula.status === 'cancelado'}
                            className="bg-highlight hover:bg-highlight/90 text-background font-bold text-xs h-8 rounded-lg cursor-pointer"
                          >
                            Lançar Presença
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* ── VISÃO 2: DASHBOARD DE KPIs DA UNIDADE DE SAÚDE, ESCOLA OU EMAEE ── */
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* Header da escola / unidade */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-1 border-[0.5px] border-borderCustom shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {selectedEscola.logo_url ? (
                  <img
                    src={selectedEscola.logo_url}
                    alt={selectedEscola.nome}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain p-1"
                  />
                ) : isEMAEE ? (
                  <Heart className="w-8 h-8 text-rose-400" />
                ) : isSaudeUnit ? (
                  <Stethoscope className="w-8 h-8 text-emerald-400" />
                ) : (
                  <GraduationCap className="w-8 h-8 text-[#185FA5] dark:text-[#3ea6ff]" />
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {selectedEscola.nome}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isEMAEE
                    ? 'Espaço Municipal de Apoio e Educação Especializada'
                    : isSaudeUnit
                    ? 'Painel de Gestão da Unidade de Saúde'
                    : 'Painel de situação em tempo real'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isEMAEE) fetchEmaeeKpis(selectedEscola.id)
                else if (isSaudeUnit) fetchSaudeKpis(selectedEscola.id)
                else fetchKpis(selectedEscola.id)
              }}
              disabled={loadingKpi}
              className="text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
            >
              <RefreshCw className={cn('w-4 h-4', loadingKpi && 'animate-spin')} />
              Atualizar
            </Button>
          </div>

          {/* ── GRID DE KPIs PRINCIPAIS (EMAEE, SAÚDE OU EDUCAÇÃO) ── */}
          {isEMAEE ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                icon={Heart}
                label="Pacientes Ativos"
                value={emaeeKpi?.totalPacientes ?? 0}
                loading={loadingKpi}
                color="rose"
                href="/emaee/pacientes"
              />
              <KPICard
                icon={Clock}
                label="Fila de Espera"
                value={emaeeKpi?.filaEspera ?? 0}
                loading={loadingKpi}
                color="amber"
                href="/emaee/fila-espera"
              />
              <KPICard
                icon={UserPlus}
                label="Profissionais AEE"
                value={emaeeKpi?.profissionaisAee ?? 0}
                loading={loadingKpi}
                color="blue"
                href="/emaee/vincular-profissionais"
              />
              <KPICard
                icon={FileSpreadsheet}
                label="Relatórios das Escolas"
                value={emaeeKpi?.relatoriosPendentes ?? 0}
                loading={loadingKpi}
                color="violet"
                href="/emaee/solicitacoes-escola"
              />
            </div>
          ) : isSaudeUnit ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                icon={Users}
                label="Servidores"
                value={saudeKpi?.totalProfissionais ?? 0}
                loading={loadingKpi}
                color="blue"
                href="/funcionarios"
              />
              <KPICard
                icon={UserCheck}
                label="Plantões Hoje"
                value={saudeKpi?.escalasHoje ?? 0}
                loading={loadingKpi}
                color="violet"
                href="/painel-chefe"
              />
              <KPICard
                icon={Stethoscope}
                label="Atestados Médicos (Mês)"
                value={saudeKpi?.atestadosMes ?? 0}
                loading={loadingKpi}
                color="amber"
                href="/atestados"
              />
              <KPICard
                icon={FileText}
                label="Documentos / Solicit."
                value={saudeKpi?.documentosMes ?? 0}
                loading={loadingKpi}
                color="emerald"
                href="/documentos"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                icon={GraduationCap}
                label="Alunos Ativos"
                value={kpi?.totalAlunos ?? 0}
                loading={loadingKpi}
                color="blue"
                href="/alunos"
              />
              <KPICard
                icon={BookOpen}
                label="Turmas Ativas"
                value={kpi?.totalTurmas ?? 0}
                loading={loadingKpi}
                color="violet"
                href="/turmas"
              />
              <KPICard
                icon={AlertTriangle}
                label="Ocorrências (Mês)"
                value={kpi?.ocorrenciasMes ?? 0}
                loading={loadingKpi}
                color="amber"
                href="/ocorrencias"
              />
              <KPICard
                icon={ArrowLeftRight}
                label="Transf. Pendentes"
                value={kpi?.transferenciasPendentes ?? 0}
                loading={loadingKpi}
                color="rose"
                href="/transferencias"
              />
            </div>
          )}

          {/* ── BARRA DE FREQUÊNCIA + ATIVIDADES SECRETARIA (Apenas para Educação Regular) ── */}
          {!isSaudeUnit && !isEMAEE && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FrequenciaBar
                feitas={kpi?.turmasComFrequenciaHoje ?? 0}
                total={kpi?.totalTurmasAtivas ?? 0}
                loading={loadingKpi}
                onClick={() => setIsModalFrequenciaOpen(true)}
              />

              {/* Atividades pendentes na secretaria */}
              <Card className="bg-surface-1 border-borderCustom rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#3ea6ff]" />
                    <span className="text-sm font-semibold text-foreground">Atividades — Secretaria</span>
                  </div>
                  <Link href="/avaliacoes">
                    <Button variant="ghost" size="sm" className="text-xs text-[#3ea6ff] hover:text-[#3ea6ff] h-7 px-2">
                      Ver todas →
                    </Button>
                  </Link>
                </div>
                {loadingKpi ? (
                  <div className="space-y-2">
                    <div className="h-8 w-16 bg-muted/20 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-muted/20 rounded animate-pulse" />
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-foreground tabular-nums">
                      {kpi?.atividadesPendentesSecretaria ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi?.atividadesPendentesSecretaria === 0
                        ? 'Nenhuma atividade aguardando impressão'
                        : `atividade${(kpi?.atividadesPendentesSecretaria ?? 0) > 1 ? 's' : ''} aguardando impressão`}
                    </p>
                  </>
                )}
              </Card>
            </div>
          )}

          {/* ── ACESSO RÁPIDO (links de atalho compactos) ── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Acesso Rápido
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {(isEMAEE ? ACESSO_RAPIDO_EMAEE_ITEMS : isSaudeUnit ? ACESSO_RAPIDO_SAUDE_ITEMS : ACESSO_RAPIDO_ITEMS).map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Card className={cn(
                      'bg-surface-1 hover:bg-surface-2 border-borderCustom hover:border-highlight/40 transition-all duration-200 cursor-pointer p-3 flex flex-col items-center justify-center text-center gap-2 min-h-[80px] rounded-xl group shadow-sm',
                    )}>
                      <Icon className={cn(
                        'w-5 h-5 transition-colors',
                        'warn' in item && item.warn
                          ? 'text-amber-400 group-hover:text-amber-300'
                          : 'text-[#3ea6ff] group-hover:text-highlight'
                      )} />
                      <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground leading-tight">
                        {item.label}
                      </span>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

        </div>
      )}

      {isModalChamadaOpen && selectedTurmaChamada && (
        <ModalDetalhesTurma
          open={isModalChamadaOpen}
          onOpenChange={setIsModalChamadaOpen}
          turma={selectedTurmaChamada}
          initialMateriaId={selectedAulaChamada?.materia_id}
          initialAgendaAulaId={selectedAulaChamada?.id}
          initialData={getHojeBrasilia()}
        />
      )}

      {isModalFrequenciaOpen && (
        <ModalDetalhesFrequenciaHoje
          open={isModalFrequenciaOpen}
          onOpenChange={setIsModalFrequenciaOpen}
          escolaId={selectedEscola?.id}
          escolaNome={selectedEscola?.nome}
          escolaLogoUrl={selectedEscola?.logo_url}
        />
      )}
    </div>
  )
}
