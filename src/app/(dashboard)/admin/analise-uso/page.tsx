'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import {
  Activity,
  Play,
  Monitor,
  Wifi,
  Search,
  RefreshCw,
  Clock,
  User,
  School,
  Compass,
  AlertTriangle,
  Radio,
  Sliders,
  Calendar,
  Layers,
  Zap,
  MousePointer,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ModalSessionReplay } from '@/components/admin/ModalSessionReplay'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SessaoAtiva {
  session_id: string
  user_id: string
  funcionario_id: string | null
  funcionario_nome: string
  funcionario_email: string
  funcionario_cargo: string
  escola_nome: string
  foto_url: string | null
  created_at: string
  refreshed_at: string | null
  current_pathname: string | null
  total_active_seconds_today: number
  ip: string | null
  user_agent: string | null
  last_interaction_at?: number
  last_action_desc?: string
  active_modal?: { isOpen: boolean; title: string } | null
  is_actively_using?: boolean
  is_tab_focused?: boolean
}

interface SessaoGravada {
  session_id: string
  funcionario_id: string | null
  funcionario_nome: string
  funcionario_email: string
  funcionario_cargo: string
  escola_nome: string
  total_events: number
  total_clicks: number
  total_errors: number
  first_event_at: string
  last_event_at: string
  duration_seconds: number
  last_pathname: string
  avg_rtt: number
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function getTempoRelativo(timestampMs?: number): string {
  if (!timestampMs) return 'agora'
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000))
  if (diffSec < 5) return 'agora mesmo'
  if (diffSec < 60) return `há ${diffSec}s`
  const min = Math.floor(diffSec / 60)
  return `há ${min}m`
}

type StatusSessao = 'em_uso_real' | 'ocioso' | 'segundo_plano'

function calcularStatusSessao(s: SessaoAtiva): StatusSessao {
  const isFocused = s.is_tab_focused !== false
  const lastTs = s.last_interaction_at || (s.refreshed_at ? new Date(s.refreshed_at).getTime() : 0)
  const diffSec = Math.floor((Date.now() - lastTs) / 1000)

  if (!isFocused) {
    return 'segundo_plano'
  }
  if (s.is_actively_using === true || diffSec <= 50) {
    return 'em_uso_real'
  }
  return 'ocioso'
}

export default function AnaliseUsoPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  // Abas: 'ao-vivo' | 'historico'
  const [tab, setTab] = useState<'ao-vivo' | 'historico'>('ao-vivo')

  // Sub-filtro de status para a aba Ao Vivo: 'ALL' | 'EM_USO' | 'OCIOSO' | 'SEGUNDO_PLANO'
  const [filtroStatusAoVivo, setFiltroStatusAoVivo] = useState<'ALL' | 'EM_USO' | 'OCIOSO' | 'SEGUNDO_PLANO'>('ALL')

  // Dados
  const [sessoesAtivas, setSessoesAtivas] = useState<SessaoAtiva[]>([])
  const [sessoesGravadas, setSessoesGravadas] = useState<SessaoGravada[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Filtros de Data para o Histórico
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('')
  const [filtroDataFim, setFiltroDataFim] = useState<string>('')

  // Modal de Replay
  const [modalReplayState, setModalReplayState] = useState<{
    open: boolean
    session: {
      sessionId: string
      funcionarioNome: string
      funcionarioEmail?: string
      funcionarioCargo?: string
      escolaNome?: string
      isLive?: boolean
      currentPathname?: string
      initialActiveModal?: { isOpen: boolean; title: string } | null
    } | null
  }>({
    open: false,
    session: null,
  })

  const isMounted = useRef<boolean>(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // 1. Carregar Sessões Ao Vivo (via API com fallback multi-tabelas)
  const carregarSessoesAtivas = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session-events?mode=active')
      if (res.ok) {
        const data = await res.json()
        if (data.active_sessions && isMounted.current) {
          setSessoesAtivas((prevPresences) => {
            const map = new Map<string, SessaoAtiva>()
            data.active_sessions.forEach((s: SessaoAtiva) => {
              const key = s.funcionario_id || s.user_id || s.session_id
              map.set(key, s)
            })
            prevPresences.forEach((p) => {
              const key = p.funcionario_id || p.user_id || p.session_id
              map.set(key, { ...map.get(key), ...p })
            })
            return Array.from(map.values())
          })
          return
        }
      }

      // Fallback via RPC
      const { data: rpcData, error } = await (supabase as any).rpc('get_all_active_sessions_admin')
      if (!error && rpcData && isMounted.current) {
        setSessoesAtivas(rpcData as SessaoAtiva[])
      }
    } catch (err) {
      console.error('[AnaliseUso] Falha ao carregar sessões ativas:', err)
    }
  }, [supabase])

  // 1.1 Conectar ao Realtime Presence Global (para detecção instantânea 0ms)
  useEffect(() => {
    const presenceChannel = supabase.channel('sig_live_presence', {
      config: { presence: { key: 'admin_dashboard' } },
    })

    const syncPresences = () => {
      if (!isMounted.current) return
      const state = presenceChannel.presenceState()
      const liveList: SessaoAtiva[] = []

      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => {
          if (p.user_id && p.funcionario_nome) {
            liveList.push({
              session_id: p.session_id || p.user_id,
              user_id: p.user_id,
              funcionario_id: p.funcionario_id || null,
              funcionario_nome: p.funcionario_nome || 'Servidor Online',
              funcionario_email: p.funcionario_email || '-',
              funcionario_cargo: p.funcionario_cargo || 'Servidor',
              escola_nome: p.escola_nome || 'Rede Municipal',
              foto_url: p.foto_url || null,
              created_at: p.online_at || new Date().toISOString(),
              refreshed_at: new Date().toISOString(),
              current_pathname: p.current_pathname || '/home',
              total_active_seconds_today: p.active_time_seconds || 10,
              ip: null,
              user_agent: null,
              last_interaction_at: p.last_interaction_at || Date.now(),
              last_action_desc: p.last_action_desc || 'Interagindo no sistema',
              active_modal: p.active_modal || null,
              is_actively_using: p.is_actively_using,
              is_tab_focused: p.is_tab_focused,
            })
          }
        })
      })

      if (liveList.length > 0) {
        setSessoesAtivas((prev) => {
          const map = new Map<string, SessaoAtiva>()
          prev.forEach((s) => map.set(s.funcionario_id || s.user_id || s.session_id, s))
          liveList.forEach((s) => map.set(s.funcionario_id || s.user_id || s.session_id, s))
          return Array.from(map.values())
        })
      }
    }

    presenceChannel
      .on('presence', { event: 'sync' }, syncPresences)
      .on('presence', { event: 'join' }, syncPresences)
      .on('presence', { event: 'leave' }, syncPresences)
      .subscribe()

    return () => {
      supabase.removeChannel(presenceChannel)
    }
  }, [supabase])

  // 2. Carregar Histórico de Sessões Gravadas
  const carregarSessoesGravadas = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filtroDataInicio) params.append('start_date', filtroDataInicio)
      if (filtroDataFim) params.append('end_date', filtroDataFim)

      const res = await fetch(`/api/admin/session-events?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (isMounted.current) {
          setSessoesGravadas(data.sessions || [])
        }
      }
    } catch (err) {
      console.error('[AnaliseUso] Falha ao carregar sessões gravadas:', err)
    }
  }, [filtroDataInicio, filtroDataFim])

  const carregarTudo = useCallback(async () => {
    setLoading(true)
    await Promise.all([carregarSessoesAtivas(), carregarSessoesGravadas()])
    if (isMounted.current) setLoading(false)
  }, [carregarSessoesAtivas, carregarSessoesGravadas])

  useEffect(() => {
    carregarTudo()

    // Polling suave a cada 10s para atualizar indicador de quem está ao vivo
    const interval = setInterval(carregarSessoesAtivas, 10000)
    return () => clearInterval(interval)
  }, [carregarTudo, carregarSessoesAtivas])

  // Métricas Calculadas
  const totalAoVivo = sessoesAtivas.length
  const totalEmUsoReal = useMemo(() => {
    return sessoesAtivas.filter((s) => calcularStatusSessao(s) === 'em_uso_real').length
  }, [sessoesAtivas])
  const totalOciosos = useMemo(() => {
    return sessoesAtivas.filter((s) => calcularStatusSessao(s) === 'ocioso').length
  }, [sessoesAtivas])
  const totalSegundoPlano = useMemo(() => {
    return sessoesAtivas.filter((s) => calcularStatusSessao(s) === 'segundo_plano').length
  }, [sessoesAtivas])

  // Filtragem de Busca e Sub-filtro
  const filteredAtivas = useMemo(() => {
    let list = sessoesAtivas

    if (filtroStatusAoVivo === 'EM_USO') {
      list = list.filter((s) => calcularStatusSessao(s) === 'em_uso_real')
    } else if (filtroStatusAoVivo === 'OCIOSO') {
      list = list.filter((s) => calcularStatusSessao(s) === 'ocioso')
    } else if (filtroStatusAoVivo === 'SEGUNDO_PLANO') {
      list = list.filter((s) => calcularStatusSessao(s) === 'segundo_plano')
    }

    if (!searchTerm.trim()) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (s) =>
        s.funcionario_nome?.toLowerCase().includes(q) ||
        s.funcionario_cargo?.toLowerCase().includes(q) ||
        s.escola_nome?.toLowerCase().includes(q) ||
        s.current_pathname?.toLowerCase().includes(q)
    )
  }, [sessoesAtivas, searchTerm, filtroStatusAoVivo])

  const filteredGravadas = useMemo(() => {
    if (!searchTerm.trim()) return sessoesGravadas
    const q = searchTerm.toLowerCase()
    return sessoesGravadas.filter(
      (s) =>
        s.funcionario_nome?.toLowerCase().includes(q) ||
        s.funcionario_cargo?.toLowerCase().includes(q) ||
        s.escola_nome?.toLowerCase().includes(q) ||
        s.last_pathname?.toLowerCase().includes(q)
    )
  }, [sessoesGravadas, searchTerm])

  // Abrir Modal no Modo Ao Vivo
  const handleAssistirAoVivo = (s: SessaoAtiva) => {
    setModalReplayState({
      open: true,
      session: {
        sessionId: s.session_id,
        funcionarioNome: s.funcionario_nome,
        funcionarioEmail: s.funcionario_email,
        funcionarioCargo: s.funcionario_cargo,
        escolaNome: s.escola_nome,
        isLive: true,
        currentPathname: s.current_pathname || '/',
        initialActiveModal: s.active_modal || null,
      },
    })
  }

  // Abrir Modal no Modo Histórico / Playback
  const handleAssistirPlayback = (s: SessaoGravada) => {
    setModalReplayState({
      open: true,
      session: {
        sessionId: s.session_id,
        funcionarioNome: s.funcionario_nome,
        funcionarioEmail: s.funcionario_email,
        funcionarioCargo: s.funcionario_cargo,
        escolaNome: s.escola_nome,
        isLive: false,
        currentPathname: s.last_pathname || '/',
      },
    })
  }

  const totalCliquesHoje = sessoesGravadas.reduce((acc, curr) => acc + (Number(curr.total_clicks) || 0), 0)
  const totalErrosHoje = sessoesGravadas.reduce((acc, curr) => acc + (Number(curr.total_errors) || 0), 0)
  const avgRttRede = sessoesGravadas.length > 0
    ? Math.round(sessoesGravadas.reduce((acc, curr) => acc + (Number(curr.avg_rtt) || 45), 0) / sessoesGravadas.length)
    : 42

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header Principal do Módulo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-sky-500 dark:text-sky-400" />
              Análise Avançada de Uso & Telemetria
            </h1>
            <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs font-semibold">
              ROOT / SUPERADMIN
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Diferenciação em tempo real entre servidores em uso ativo (cliques/digitação) e sessões conectadas em standby.
          </p>
        </div>

        <Button
          onClick={carregarTudo}
          disabled={loading}
          variant="outline"
          className="bg-card hover:bg-muted border-border text-foreground h-10 px-4 rounded-xl cursor-pointer"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin text-sky-500 dark:text-sky-400')} />
          Atualizar Dados
        </Button>
      </div>

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Em Uso Real Agora */}
        <Card className="p-4 bg-card border-border rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-emerald-500" />
              Em Uso Real Agora
            </div>
            <div className="text-2xl font-bold text-foreground flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400">{totalEmUsoReal}</span>
              {totalEmUsoReal > 0 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                  INTERAGINDO
                </span>
              ) : (
                <span className="text-xs text-muted-foreground font-normal">Sem interação</span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Total conectados: <span className="font-semibold text-foreground">{totalAoVivo}</span> ({totalOciosos} ociosos)
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Radio className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          </div>
        </Card>

        {/* Card 2: Latência Média */}
        <Card className="p-4 bg-card border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Latência Média da Rede</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {avgRttRede} <span className="text-sm font-normal text-muted-foreground">ms</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Tempo de resposta médio</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
        </Card>

        {/* Card 3: Cliques Registrados */}
        <Card className="p-4 bg-card border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Cliques & Comandos Registrados</div>
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-1">{totalCliquesHoje}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Ações registradas hoje</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <MousePointer className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
        </Card>

        {/* Card 4: Erros Capturados */}
        <Card className="p-4 bg-card border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Falhas / Erros JS</div>
            <div className={cn('text-2xl font-bold mt-1', totalErrosHoje > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
              {totalErrosHoje}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {totalErrosHoje === 0 ? 'Nenhum erro reportado' : 'Erros capturados na sessão'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
        </Card>
      </div>

      {/* Seletor de Abas & Barra de Busca */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setTab('ao-vivo')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer',
              tab === 'ao-vivo'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Radio className="w-4 h-4" />
            Sessões Ao Vivo ({sessoesAtivas.length})
            {totalEmUsoReal > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('historico')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer',
              tab === 'historico'
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Clock className="w-4 h-4" />
            Gravações & Playback Histórico
          </button>
        </div>

        {/* Input de Busca */}
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar servidor, escola ou tela..."
              className="bg-background border-border text-foreground placeholder:text-muted-foreground pl-9 h-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo da Aba 1: Sessões Ao Vivo com Diferenciação Visual */}
      {tab === 'ao-vivo' && (
        <div className="space-y-4">
          {/* Sub-filtros Rápidos de Status */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-muted-foreground font-semibold mr-1">Filtrar por Status:</span>

            <button
              type="button"
              onClick={() => setFiltroStatusAoVivo('ALL')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border',
                filtroStatusAoVivo === 'ALL'
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              Todos ({sessoesAtivas.length})
            </button>

            <button
              type="button"
              onClick={() => setFiltroStatusAoVivo('EM_USO')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border',
                filtroStatusAoVivo === 'EM_USO'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Em Uso Real ({totalEmUsoReal})
            </button>

            <button
              type="button"
              onClick={() => setFiltroStatusAoVivo('OCIOSO')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border',
                filtroStatusAoVivo === 'OCIOSO'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 font-bold'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Ociosos / Standby ({totalOciosos})
            </button>

            <button
              type="button"
              onClick={() => setFiltroStatusAoVivo('SEGUNDO_PLANO')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border',
                filtroStatusAoVivo === 'SEGUNDO_PLANO'
                  ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/40 font-bold'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Em 2º Plano ({totalSegundoPlano})
            </button>
          </div>

          {filteredAtivas.length === 0 ? (
            <Card className="p-12 text-center bg-card border-border rounded-2xl shadow-sm">
              <Radio className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-foreground">Nenhuma sessão encontrada para este filtro</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Assim que qualquer servidor interagir com o SIG, a sessão atualizará automaticamente seu estado em tempo real.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAtivas.map((s) => {
                const statusSessao = calcularStatusSessao(s)
                const isEmUso = statusSessao === 'em_uso_real'
                const isSegundoPlano = statusSessao === 'segundo_plano'

                return (
                  <Card
                    key={s.session_id}
                    className={cn(
                      'p-5 rounded-2xl shadow-sm transition-all flex flex-col justify-between gap-4 group relative overflow-hidden',
                      isEmUso
                        ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-500/[0.05] to-card ring-1 ring-emerald-500/25 shadow-emerald-500/5'
                        : isSegundoPlano
                        ? 'border-indigo-500/30 bg-gradient-to-b from-indigo-500/[0.03] to-card'
                        : 'border-border bg-card hover:border-border/80'
                    )}
                  >
                    <div className="space-y-3">
                      {/* Header do Card com Diferenciação Visual Clara */}
                      <div className="flex items-center justify-between gap-2">
                        {isEmUso ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            EM USO REAL AGORA
                          </Badge>
                        ) : isSegundoPlano ? (
                          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[11px] font-medium flex items-center gap-1.5">
                            <EyeOff className="w-3 h-3 text-indigo-400" />
                            EM SEGUNDO PLANO
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            CONECTADO (OCIOSO)
                          </Badge>
                        )}

                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatDuration(s.total_active_seconds_today)}
                        </span>
                      </div>

                      {/* Dados do Servidor */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {s.foto_url ? (
                            <img
                              src={s.foto_url}
                              alt={s.funcionario_nome}
                              className="w-12 h-12 rounded-xl object-cover border border-border"
                            />
                          ) : (
                            <div className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm border',
                              isEmUso ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400'
                            )}>
                              {s.funcionario_nome?.slice(0, 2).toUpperCase() || 'US'}
                            </div>
                          )}

                          {/* Ponto indicador de status no Avatar */}
                          <span
                            className={cn(
                              'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background',
                              isEmUso ? 'bg-emerald-500 animate-pulse' : isSegundoPlano ? 'bg-indigo-400' : 'bg-amber-400'
                            )}
                            title={isEmUso ? 'Interagindo ativamente' : isSegundoPlano ? 'Aba minimizada' : 'Conectado mas ocioso'}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-foreground truncate">{s.funcionario_nome}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.funcionario_cargo || 'Servidor'}</div>
                          <div className="text-[11px] text-muted-foreground/80 truncate flex items-center gap-1 mt-0.5">
                            <School className="w-3 h-3 shrink-0" />
                            {s.escola_nome || 'Rede Municipal'}
                          </div>
                        </div>
                      </div>

                      {/* Linha de Atividade em Tempo Real */}
                      <div className="space-y-1.5">
                        <div className="bg-muted/70 border border-border rounded-xl p-2.5 px-3 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0 font-mono text-sky-600 dark:text-sky-300">
                            <Compass className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                            <span className="truncate">{s.current_pathname || '/home'}</span>
                          </div>
                          {s.active_modal?.isOpen && (
                            <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 text-[10px] shrink-0 font-semibold flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{s.active_modal.title}</span>
                            </Badge>
                          )}
                        </div>

                        {/* Indicador de Última Ação do Usuário */}
                        <div className="flex items-center justify-between text-[11px] px-1">
                          {isEmUso ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 truncate">
                              <Zap className="w-3 h-3 shrink-0 fill-current" />
                              <span className="truncate">{s.last_action_desc || 'Interagindo ativamente'}</span>
                            </span>
                          ) : isSegundoPlano ? (
                            <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 truncate">
                              <EyeOff className="w-3 h-3 shrink-0" />
                              <span>Janela em 2º plano</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-1 truncate">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>Sem cliques recentes</span>
                            </span>
                          )}

                          <span className="text-muted-foreground text-[10px] shrink-0">
                            {getTempoRelativo(s.last_interaction_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Espelhar Comandos Ao Vivo */}
                    <Button
                      onClick={() => handleAssistirAoVivo(s)}
                      className={cn(
                        'w-full font-semibold rounded-xl h-10 flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all',
                        isEmUso
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      )}
                    >
                      <Monitor className="w-4 h-4" />
                      {isEmUso ? 'Espelhar Interação Ao Vivo' : 'Espelhar Tela da Sessão'}
                    </Button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Gravações & Playback Histórico */}
      {tab === 'historico' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Período */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-card border border-border rounded-2xl text-xs shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">Período:</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">De</span>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="bg-background border-border text-foreground h-9 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Até</span>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="bg-background border-border text-foreground h-9 rounded-xl text-xs"
              />
            </div>

            <Button
              size="sm"
              onClick={carregarSessoesGravadas}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-9 cursor-pointer ml-auto"
            >
              Filtrar Gravações
            </Button>
          </div>

          {/* Tabela de Sessões Gravadas */}
          {filteredGravadas.length === 0 ? (
            <Card className="p-12 text-center bg-card border-border rounded-2xl shadow-sm">
              <Clock className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
              <h3 className="text-base font-bold text-foreground">Nenhuma gravação histórica encontrada</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                As sessões dos servidores são gravadas automaticamente para auditoria e você pode reproduzir os cliques e comandos de qualquer dia passado.
              </p>
            </Card>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-muted-foreground">
                  <thead className="bg-muted/60 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-3.5 px-4">Servidor / Cargo</th>
                      <th className="py-3.5 px-4">Unidade Escolar</th>
                      <th className="py-3.5 px-4">Data / Hora</th>
                      <th className="py-3.5 px-4">Duração</th>
                      <th className="py-3.5 px-4">Cliques</th>
                      <th className="py-3.5 px-4">Erros</th>
                      <th className="py-3.5 px-4">Última Tela</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredGravadas.map((g) => (
                      <tr key={g.session_id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground">{g.funcionario_nome}</div>
                          <div className="text-[11px] text-muted-foreground">{g.funcionario_cargo}</div>
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground">
                          {g.escola_nome || 'Rede Municipal'}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-foreground/90">
                          {g.last_event_at ? new Date(g.last_event_at).toLocaleString('pt-BR') : '-'}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-muted-foreground">
                          {formatDuration(g.duration_seconds)}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs">
                            {g.total_clicks || 0} cliques
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4">
                          {g.total_errors > 0 ? (
                            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs">
                              {g.total_errors} erros
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/60">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-sky-600 dark:text-sky-400 max-w-[160px] truncate">
                          {g.last_pathname || '/'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleAssistirPlayback(g)}
                            className="bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground border border-border font-semibold rounded-xl h-8 px-3 text-xs transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                            Ver Replay
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Replay (Ao Vivo / Playback) */}
      {modalReplayState.session && (
        <ModalSessionReplay
          open={modalReplayState.open}
          onOpenChange={(open) => setModalReplayState((prev) => ({ ...prev, open }))}
          session={modalReplayState.session}
        />
      )}
    </div>
  )
}
