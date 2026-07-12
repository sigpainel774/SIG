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
  Printer
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'

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

export default function HomePage() {
  const { escolas, selectedEscola, setSelectedEscola, loadEscolas } = useSchoolStore()
  const { funcionario, acessos, escolaAtivaId, isAdminGlobalOrRoot } = useAuthStore()

  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [loadingKpi, setLoadingKpi] = useState(false)
  const [loadingEscolas, setLoadingEscolas] = useState(false)

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEscola(null)}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="w-4 h-4" /> Trocar Escola
          </Button>
        </div>
      )}

      {/* ── VISÃO 1: SELEÇÃO DE ESCOLA ── */}
      {!selectedEscola ? (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {escolas.map((escola) => (
              <Card
                key={escola.id}
                onClick={() => setSelectedEscola(escola)}
                className="bg-surface-1 hover:bg-surface-2 border-[0.5px] border-borderCustom hover:border-highlight/50 transition-all duration-200 cursor-pointer p-5 flex flex-col items-center justify-center text-center space-y-4 min-h-[170px] group shadow-md rounded-2xl"
              >
                <div className={`w-16 h-16 rounded-full overflow-hidden ${escola.logo_url ? 'bg-transparent border border-borderCustom' : escola.color || 'bg-[#185FA5]'} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
                  {escola.logo_url ? (
                    <img src={escola.logo_url} alt={escola.nome} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8" />
                  )}
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-highlight transition-colors text-sm leading-snug">
                  {escola.nome}
                </h3>
              </Card>
            ))}
          </div>
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
    </div>
  )
}
