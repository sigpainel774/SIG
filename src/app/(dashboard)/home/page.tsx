'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  X,
  ArrowLeft,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  Loader2
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { ModalDetalhesTurma } from '@/components/ModalDetalhesTurma'

interface KPIData {
  totalAlunos: number
  totalTurmas: number
  ocorrenciasMes: number
  transferenciasPendentes: number
  turmasComFrequenciaHoje: number
  totalTurmasAtivas: number
  atividadesPendentesSecretaria: number
}

function KPICard({
  icon: Icon,
  label,
  value,
  subLabel,
  color = 'blue',
  loading,
  href,
}: {
  icon: any
  label: string
  value: number | string
  subLabel?: string
  color?: 'blue' | 'amber' | 'emerald' | 'violet' | 'rose'
  loading?: boolean
  href?: string
}) {
  const colors = {
    blue:    { bg: 'bg-[#1b253b]', text: 'text-[#3ea6ff]', border: 'border-[#3ea6ff]/20' },
    amber:   { bg: 'bg-[#2c1a0e]', text: 'text-amber-400', border: 'border-amber-500/20' },
    emerald: { bg: 'bg-[#0d1f18]', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    violet:  { bg: 'bg-[#1e1b2e]', text: 'text-violet-400', border: 'border-violet-500/20' },
    rose:    { bg: 'bg-[#1f0d0d]', text: 'text-rose-400', border: 'border-rose-500/20' },
  }
  const c = colors[color]

  const content = (
    <Card className={cn(
      'bg-surface-1 border-borderCustom rounded-2xl p-5 flex flex-col gap-3 shadow-sm',
      href && 'hover:border-highlight/40 hover:bg-surface-2 transition-all duration-200 cursor-pointer'
    )}>
      <div className="flex items-center justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', c.bg, 'border', c.border)}>
          <Icon className={cn('w-5 h-5', c.text)} />
        </div>
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-muted/20 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
      )}
      {subLabel && !loading && (
        <p className="text-xs text-muted-foreground">{subLabel}</p>
      )}
    </Card>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}

function FrequenciaBar({ feitas, total, loading }: { feitas: number; total: number; loading: boolean }) {
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0
  return (
    <Card className="bg-surface-1 border-borderCustom rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-foreground">Frequência de Hoje</span>
        </div>
        {!loading && (
          <span className={cn(
            'text-sm font-bold tabular-nums',
            pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'
          )}>
            {pct}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-muted/20 rounded-full animate-pulse" />
          <div className="h-3 w-1/2 bg-muted/20 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="w-full bg-muted/20 rounded-full h-2.5 overflow-hidden">
            <div
              className={cn(
                'h-2.5 rounded-full transition-all duration-700',
                pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {feitas} de {total} turmas registraram presença hoje
          </p>
        </>
      )}
    </Card>
  )
}

function getSchoolIconProps(escola: any) {
  if (escola.logo_url) {
    const logoSrc = escola.logo_url.startsWith('data:') 
      ? escola.logo_url 
      : `${escola.logo_url}${escola.logo_url.includes('?') ? '&' : '?'}t=${Date.now()}`

    return {
      style: {},
      content: (
        <img
          src={logoSrc}
          alt={escola.nome}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      )
    }
  }

  const nomeLower = escola.nome.toLowerCase()
  
  if (nomeLower.includes('moisés alves') || nomeLower.includes('moises alves')) {
    return {
      style: { backgroundColor: '#1d4ed8' },
      content: <span className="text-white font-extrabold text-2xl tracking-tight select-none">EMV</span>
    }
  }
  
  if (nomeLower.includes('teste 1')) {
    return {
      style: { backgroundColor: '#4f46e5' },
      content: <span className="text-white font-extrabold text-4xl select-none">1</span>
    }
  }

  if (nomeLower.includes('teste 2')) {
    return {
      style: { backgroundColor: '#c2410c' },
      content: <span className="text-white font-extrabold text-4xl select-none">2</span>
    }
  }

  if (nomeLower.includes('eraldo tinoco')) {
    return {
      style: { backgroundColor: '#1b4e9b' },
      content: <Building2 className="w-10 h-10 text-white" />
    }
  }

  // Fallback para as outras escolas sem logo
  const words = escola.nome
    .replace(/(municipal|colégio|colegio|escola|centro|educacional|de|da|do|para)/gi, '')
    .trim()
    .split(/\s+/)
  const initials = words
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)

  const colors = [
    '#1d4ed8', // blue
    '#059669', // emerald
    '#7c3aed', // violet
    '#db2777', // pink
    '#d97706', // amber
    '#dc2626', // red
    '#0891b2'  // cyan
  ]
  const charCodeSum = escola.nome.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0)
  const bgStyle = { backgroundColor: colors[charCodeSum % colors.length] }

  return {
    style: bgStyle,
    content: initials ? (
      <span className="text-white font-extrabold text-xl select-none">{initials}</span>
    ) : (
      <Building2 className="w-10 h-10 text-white" />
    )
  }
}

export default function HomePage() {
  const { escolas, selectedEscola, setSelectedEscola, loadEscolas } = useSchoolStore()
  const { funcionario, acessos, vinculos, escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()

  const isProfessor = acessos.some(a => a.nivel === 4 || a.nivel === 5) || funcionario?.cargo?.toLowerCase().includes('professor')
  const vinculosAtivos = vinculos?.filter((v) => v.ativo) || []
  const isMultiLotadoDocente = isProfessor && vinculosAtivos.length > 1

  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [loadingKpi, setLoadingKpi] = useState(false)
  const [loadingEscolas, setLoadingEscolas] = useState(false)

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

  useEffect(() => {
    loadEscolas()
  }, [loadEscolas])

  const isAdmin = isAdminGlobalOrRoot?.() ?? false

  const fetchKpis = useCallback(async (escolaId: string) => {
    setLoadingKpi(true)
    const supabase = createClient()
    const hoje = new Date().toISOString().split('T')[0]
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    try {
      const [
        { count: totalAlunos },
        { count: totalTurmas },
        { count: ocorrenciasMes },
        { count: transferenciasPendentes },
        { count: atividadesPendentes },
        { data: turmasHoje },
        { data: todasTurmas },
      ] = await Promise.all([
        // 1. Total de alunos ativos
        supabase
          .from('alunos')
          .select('id', { count: 'exact', head: true })
          .eq('escola_id', escolaId)
          .is('deleted_at', null),

        // 2. Total de turmas ativas
        supabase
          .from('turmas')
          .select('id', { count: 'exact', head: true })
          .eq('escola_id', escolaId)
          .is('deleted_at', null),

        // 3. Ocorrências do mês
        supabase
          .from('ocorrencias')
          .select('id', { count: 'exact', head: true })
          .eq('escola_id', escolaId)
          .gte('created_at', inicioMes),

        // 4. Transferências pendentes (escola como destino)
        supabase
          .from('transferencias_alunos')
          .select('id', { count: 'exact', head: true })
          .eq('escola_destino_id', escolaId)
          .eq('status', 'pendente'),

        // 5. Atividades pendentes de impressão
        (supabase as any)
          .from('atividades_secretaria')
          .select('id', { count: 'exact', head: true })
          .eq('escola_id', escolaId)
          .in('status', ['recebida', 'em_impressao']),

        // 6. Turmas que registraram frequência hoje
        supabase
          .from('frequencias')
          .select('turma_id')
          .eq('escola_id', escolaId)
          .eq('data', hoje),

        // 7. Todas as turmas (para denominar a % de frequência)
        supabase
          .from('turmas')
          .select('id')
          .eq('escola_id', escolaId)
          .is('deleted_at', null),
      ])

      // Turmas únicas com frequência hoje
      const turmasComFreq = new Set((turmasHoje ?? []).map((f: any) => f.turma_id)).size

      setKpi({
        totalAlunos: totalAlunos ?? 0,
        totalTurmas: totalTurmas ?? 0,
        ocorrenciasMes: ocorrenciasMes ?? 0,
        transferenciasPendentes: transferenciasPendentes ?? 0,
        turmasComFrequenciaHoje: turmasComFreq,
        totalTurmasAtivas: todasTurmas?.length ?? 0,
        atividadesPendentesSecretaria: atividadesPendentes ?? 0,
      })
    } catch (err) {
      console.error('Erro ao carregar KPIs:', err)
    } finally {
      setLoadingKpi(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEscola?.id) {
      fetchKpis(selectedEscola.id)
    }
  }, [selectedEscola?.id, fetchKpis])

  // Buscar estatísticas rápidas por escola para professores multi-lotados
  const fetchSchoolStats = useCallback(async () => {
    if (!funcionario?.id || vinculosAtivos.length === 0) return
    setLoadingSchoolStats(true)
    const supabase = createClient() as any
    const hoje = new Date().toISOString().split('T')[0]
    
    const stats: Record<string, { turmas: number; aulasHoje: number; chamadasPendentes: number }> = {}

    try {
      await Promise.all(
        vinculosAtivos.map(async (v) => {
          const escolaId = v.escola_id
          
          // 1. Contagem de turmas vinculadas ao professor nesta escola
          const { data: vtData } = await supabase
            .from('vinculos_turmas')
            .select('turma_id')
            .eq('funcionario_id', funcionario.id)
            .eq('escola_id', escolaId)
          
          const tIds = (vtData || []).map((vt: any) => vt.turma_id)
          const turmasCount = tIds.length

          // 2. Aulas hoje
          const { data: aulasHojeData } = await supabase
            .from('agenda_aulas')
            .select('id, materia_id')
            .eq('professor_id', funcionario.id)
            .eq('escola_id', escolaId)
            .eq('data', hoje)
            .neq('status', 'cancelado')

          const aulasHojeCount = aulasHojeData?.length ?? 0

          // 3. Chamadas pendentes
          let chamadasPendentesCount = 0
          if (aulasHojeCount > 0) {
            const { data: freqData } = await supabase
              .from('frequencias')
              .select('agenda_aula_id, materia_id')
              .eq('escola_id', escolaId)
              .eq('data', hoje)

            const frequenciasLancadas = new Set(
              (freqData || []).map((f: any) => f.agenda_aula_id || f.materia_id)
            )

            const pendentes = (aulasHojeData || []).filter(
              (aula: any) => !frequenciasLancadas.has(aula.id) && !frequenciasLancadas.has(aula.materia_id)
            )
            chamadasPendentesCount = pendentes.length
          }

          stats[escolaId] = {
            turmas: turmasCount,
            aulasHoje: aulasHojeCount,
            chamadasPendentes: chamadasPendentesCount
          }
        })
      )
      setSchoolStats(stats)
    } catch (err) {
      console.error('Erro ao buscar estatísticas das escolas:', err)
    } finally {
      setLoadingSchoolStats(false)
    }
  }, [funcionario?.id, vinculosAtivos])

  useEffect(() => {
    if (isProfessor && vinculosAtivos.length > 0 && !selectedEscola) {
      fetchSchoolStats()
    }
  }, [isProfessor, vinculosAtivos, selectedEscola, fetchSchoolStats])

  // Buscar dados específicos do professor para a escola selecionada
  const fetchTeacherDashboard = useCallback(async (escolaId: string) => {
    if (!funcionario?.id) return
    setLoadingTeacherKpi(true)
    setLoadingAulasHoje(true)
    const supabase = createClient() as any
    const hoje = new Date().toISOString().split('T')[0]

    try {
      // 1. Minhas Turmas
      const { data: vtData, error: vtError } = await supabase
        .from('vinculos_turmas')
        .select('turma_id')
        .eq('funcionario_id', funcionario.id)
        .eq('escola_id', escolaId)

      if (vtError) throw vtError
      const tIds = (vtData || []).map((vt: any) => vt.turma_id)

      // 2. Meus Alunos
      let totalAlunos = 0
      if (tIds.length > 0) {
        const { count, error: aluError } = await supabase
          .from('alunos')
          .select('id', { count: 'exact', head: true })
          .in('turma_id', tIds)
          .is('deleted_at', null)

        if (aluError) throw aluError
        totalAlunos = count ?? 0
      }

      // 3. Aulas Hoje
      const { data: aulasHojeData, error: ahError } = await supabase
        .from('agenda_aulas')
        .select(`
          id,
          horario_inicio,
          horario_fim,
          status,
          materia_id,
          turma_id,
          turmas:turma_id (nome),
          materias:materia_id (nome)
        `)
        .eq('professor_id', funcionario.id)
        .eq('escola_id', escolaId)
        .eq('data', hoje)
        .order('horario_inicio')

      if (ahError) throw ahError
      setAulasHoje(aulasHojeData || [])

      // 4. Chamadas Pendentes Hoje
      const aulasAtivas = (aulasHojeData || []).filter((a: any) => a.status !== 'cancelado')
      let chamadasPendentesCount = 0
      if (aulasAtivas.length > 0) {
        const { data: freqData } = await supabase
          .from('frequencias')
          .select('agenda_aula_id, materia_id')
          .eq('escola_id', escolaId)
          .eq('data', hoje)

        const frequenciasLancadas = new Set(
          (freqData || []).map((f: any) => f.agenda_aula_id || f.materia_id)
        )

        const pendentes = aulasAtivas.filter(
          (aula: any) => !frequenciasLancadas.has(aula.id) && !frequenciasLancadas.has(aula.materia_id)
        )
        chamadasPendentesCount = pendentes.length
      }

      // 5. Atividades Secretaria
      const { count: atividadesCount, error: atError } = await supabase
        .from('atividades_secretaria')
        .select('id', { count: 'exact', head: true })
        .eq('professor_id', funcionario.id)
        .eq('escola_id', escolaId)
        .in('status', ['recebida', 'em_impressao'])

      if (atError) throw atError

      setTeacherKpi({
        totalTurmas: tIds.length,
        totalAlunos,
        chamadasPendentes: chamadasPendentesCount,
        atividadesImpressao: atividadesCount ?? 0
      })
    } catch (err) {
      console.error('Erro ao buscar dados do painel do professor:', err)
    } finally {
      setLoadingTeacherKpi(false)
      setLoadingAulasHoje(false)
    }
  }, [funcionario?.id])

  useEffect(() => {
    if (selectedEscola?.id && isProfessor) {
      fetchTeacherDashboard(selectedEscola.id)
    }
  }, [selectedEscola?.id, isProfessor, fetchTeacherDashboard])

  // Auto-seleção de escola para usuários não administradores (Diretores, etc.)
  useEffect(() => {
    if (isMultiLotadoDocente) return

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

  // Determina o nível do usuário na escola selecionada (para exibição de KPIs)
  const nivelNaEscola = selectedEscola
    ? acessos.find(a => a.escola_id === selectedEscola.id)?.nivel ?? 99
    : 99
  const podeVerKpiGerencial = isAdmin || nivelNaEscola <= 3

  return (
    <div className="space-y-8 -mt-2">

      {/* ── INDICADOR DE ESCOLA SELECIONADA ── */}
      {selectedEscola && (
        <div className="bg-surface-2 border border-borderCustom rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escola Selecionada:</span>
            <div className="flex items-center gap-2 bg-highlight/10 text-highlight border border-highlight/30 px-3 py-1.5 rounded-xl text-sm font-medium">
              <div className={`w-5 h-5 rounded-full overflow-hidden ${selectedEscola.logo_url ? 'bg-transparent' : selectedEscola.color || 'bg-blue-600'} flex items-center justify-center text-white text-xs font-bold`}>
                {selectedEscola.logo_url ? (
                  <img src={selectedEscola.logo_url} alt={selectedEscola.nome} className="w-full h-full object-cover" />
                ) : (
                  selectedEscola.nome[0]
                )}
              </div>
              <span>{selectedEscola.nome}</span>
            </div>
          </div>
          {(isAdmin || isMultiLotadoDocente) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedEscola(null)}
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="w-4 h-4" /> Trocar Escola
            </Button>
          )}
        </div>
      )}

      {/* ── VISÃO 1: SELEÇÃO DE ESCOLA ── */}
      {!selectedEscola ? (
        !isAdmin && !isMultiLotadoDocente ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-surface-1 border border-borderCustom rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-[#185FA5] dark:text-[#3ea6ff]" />
            <p className="text-sm text-muted-foreground">Carregando painel da escola...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                <Building2 className="w-8 h-8 text-[#185FA5] dark:text-[#3ea6ff]" />
                Selecione uma Escola
              </h1>
              <p className="text-sm text-muted-foreground hidden md:block">
                Clique em uma escola para acessar o painel
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-8 justify-items-center pt-6">
              {(isAdmin ? escolas : escolas.filter(e => vinculosAtivos.some(v => v.escola_id === e.id))).map((escola) => {
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
        /* ── VISÃO 2: DASHBOARD DE KPIs DA ESCOLA ── */
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* Header da escola */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-1 border-[0.5px] border-borderCustom shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {selectedEscola.logo_url ? (
                  <img
                    src={selectedEscola.logo_url}
                    alt={selectedEscola.nome}
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
                <p className="text-sm text-muted-foreground">Painel de situação em tempo real</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchKpis(selectedEscola.id)}
              disabled={loadingKpi}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RefreshCw className={cn('w-4 h-4', loadingKpi && 'animate-spin')} />
              Atualizar
            </Button>
          </div>

          {/* ── GRID DE KPIs PRINCIPAIS ── */}
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

          {/* ── BARRA DE FREQUÊNCIA + ATIVIDADES SECRETARIA ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FrequenciaBar
              feitas={kpi?.turmasComFrequenciaHoje ?? 0}
              total={kpi?.totalTurmasAtivas ?? 0}
              loading={loadingKpi}
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

          {/* ── ACESSO RÁPIDO (links de atalho compactos) ── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Acesso Rápido
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                { label: 'Alunos', icon: GraduationCap, href: '/alunos' },
                { label: 'Turmas', icon: BookOpen, href: '/turmas' },
                { label: 'Avaliações', icon: ClipboardList, href: '/avaliacoes' },
                { label: 'Ocorrências', icon: AlertTriangle, href: '/ocorrencias', warn: true },
                { label: 'Transferências', icon: ArrowLeftRight, href: '/transferencias' },
                { label: 'Funcionários', icon: Users, href: '/funcionarios' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.href} href={item.href}>
                    <Card className={cn(
                      'bg-surface-1 hover:bg-surface-2 border-borderCustom hover:border-highlight/40 transition-all duration-200 cursor-pointer p-3 flex flex-col items-center justify-center text-center gap-2 min-h-[80px] rounded-xl group shadow-sm',
                    )}>
                      <Icon className={cn(
                        'w-5 h-5 transition-colors',
                        item.warn
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

      {selectedTurmaChamada && (
        <ModalDetalhesTurma
          open={isModalChamadaOpen}
          onOpenChange={setIsModalChamadaOpen}
          turma={selectedTurmaChamada}
          initialMateriaId={selectedAulaChamada?.materia_id}
          initialAgendaAulaId={selectedAulaChamada?.id}
          initialData={new Date().toISOString().split('T')[0]}
        />
      )}
    </div>
  )
}
