'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Wifi,
  AlertTriangle,
  Clock,
  MousePointer,
  Radio,
  Sliders,
  Layers,
  Monitor,
  Terminal,
  FileText,
  ShieldAlert,
  FastForward,
  Compass,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReplayEventItem } from '@/hooks/useSessionReplay'

interface ModalSessionReplayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: {
    sessionId: string
    funcionarioNome: string
    funcionarioEmail?: string
    funcionarioCargo?: string
    escolaNome?: string
    isLive?: boolean
    currentPathname?: string
  } | null
}

export function ModalSessionReplay({
  open,
  onOpenChange,
  session,
}: ModalSessionReplayProps) {
  const supabase = createClient()

  // Modo: 'live' se a sessão estiver ativa, ou 'playback' para histórico
  const isLiveMode = Boolean(session?.isLive)

  // Estados de dados
  const [events, setEvents] = useState<ReplayEventItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(isLiveMode)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [filtroTipoLog, setFiltroTipoLog] = useState<string>('ALL')

  // Cursor simulado atual
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; active: boolean; text?: string; tag?: string }>({
    x: 50,
    y: 50,
    active: false,
  })

  // Telemetria ao vivo / atual
  const [telemetry, setTelemetry] = useState<{
    rtt: number
    downlink: number
    effectiveType: string
    packetLossPct: number
    activeSeconds: number
    currentPathname: string
    totalClicks: number
    totalInputs: number
    totalErrors: number
  }>({
    rtt: 45,
    downlink: 10,
    effectiveType: '4g',
    packetLossPct: 0,
    activeSeconds: 0,
    currentPathname: session?.currentPathname || '/',
    totalClicks: 0,
    totalInputs: 0,
    totalErrors: 0,
  })

  const channelRef = useRef<any>(null)
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef<boolean>(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // 1. Carregar histórico de eventos se for modo Playback ou inicial
  const loadHistoricalEvents = useCallback(async (sid: string) => {
    setLoadingEvents(true)
    try {
      const res = await fetch(`/api/admin/session-events?session_id=${encodeURIComponent(sid)}`)
      if (res.ok) {
        const data = await res.json()
        const loaded: ReplayEventItem[] = (data.events || []).map((e: any) => ({
          session_id: e.session_id,
          funcionario_id: e.funcionario_id,
          funcionario_nome: e.funcionario_nome,
          escola_id: e.escola_id,
          event_type: e.event_type,
          event_data: e.event_data || {},
        }))

        if (isMounted.current) {
          setEvents(loaded)
          setCurrentIndex(0)

          // Calcular totais iniciais de telemetria
          const clicks = loaded.filter((ev) => ev.event_type === 'click').length
          const inputs = loaded.filter((ev) => ev.event_type === 'input_focus').length
          const errors = loaded.filter((ev) => ev.event_type === 'error').length
          const lastNet = loaded[loaded.length - 1]?.event_data

          setTelemetry((prev) => ({
            ...prev,
            totalClicks: clicks,
            totalInputs: inputs,
            totalErrors: errors,
            rtt: lastNet?.rtt ?? prev.rtt,
            downlink: lastNet?.downlink ?? prev.downlink,
            effectiveType: lastNet?.effective_type ?? prev.effectiveType,
            packetLossPct: lastNet?.packet_loss_estimate_pct ?? prev.packetLossPct,
            currentPathname: loaded[loaded.length - 1]?.event_data?.pathname || prev.currentPathname,
          }))
        }
      }
    } catch (err) {
      console.warn('[ModalSessionReplay] Erro ao carregar eventos:', err)
    } finally {
      if (isMounted.current) setLoadingEvents(false)
    }
  }, [])

  // 2. Conectar ao canal Realtime se for Modo AO VIVO
  useEffect(() => {
    if (!open || !session?.sessionId) return

    if (isLiveMode) {
      setIsPlaying(true)
      const channelName = `session_replay:${session.sessionId}`
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: true } },
      })

      channel
        .on('broadcast', { event: 'event' }, ({ payload }: { payload: ReplayEventItem }) => {
          if (!isMounted.current || !payload) return

          setEvents((prev) => [...prev, payload])

          // Executar visualização do clique instantaneamente
          if (payload.event_type === 'click' && payload.event_data.x_pct !== undefined && payload.event_data.y_pct !== undefined) {
            setCursorPos({
              x: payload.event_data.x_pct,
              y: payload.event_data.y_pct,
              active: true,
              text: payload.event_data.target_text,
              tag: payload.event_data.target_tag,
            })
            setTimeout(() => {
              if (isMounted.current) setCursorPos((p) => ({ ...p, active: false }))
            }, 1200)
          }

          // Atualizar telemetria em tempo real
          setTelemetry((prev) => ({
            rtt: payload.event_data.rtt ?? prev.rtt,
            downlink: payload.event_data.downlink ?? prev.downlink,
            effectiveType: payload.event_data.effective_type ?? prev.effectiveType,
            packetLossPct: payload.event_data.packet_loss_estimate_pct ?? prev.packetLossPct,
            activeSeconds: payload.event_data.active_time_seconds ?? prev.activeSeconds + 1,
            currentPathname: payload.event_data.pathname || prev.currentPathname,
            totalClicks: payload.event_type === 'click' ? prev.totalClicks + 1 : prev.totalClicks,
            totalInputs: payload.event_type === 'input_focus' ? prev.totalInputs + 1 : prev.totalInputs,
            totalErrors: payload.event_type === 'error' ? prev.totalErrors + 1 : prev.totalErrors,
          }))
        })
        .subscribe()

      channelRef.current = channel

      return () => {
        supabase.removeChannel(channel)
      }
    } else {
      // Modo Playback Histórico
      loadHistoricalEvents(session.sessionId)
    }
  }, [open, session?.sessionId, isLiveMode, loadHistoricalEvents, supabase])

  // 3. Mecanismo do Player no modo Playback
  useEffect(() => {
    if (isLiveMode || !isPlaying || events.length === 0) {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
      return
    }

    if (currentIndex >= events.length - 1) {
      setIsPlaying(false)
      return
    }

    const currentEv = events[currentIndex]
    const nextEv = events[currentIndex + 1]

    // Calcular intervalo real entre eventos com compensação de velocidade
    const currentTs = currentEv?.event_data?.timestamp || 0
    const nextTs = nextEv?.event_data?.timestamp || currentTs + 1000
    let delay = (nextTs - currentTs) / playbackSpeed

    // Limitar delay entre 100ms e 2500ms para evitar longos períodos ociosos
    delay = Math.max(120, Math.min(2500, delay))

    playTimerRef.current = setTimeout(() => {
      if (!isMounted.current) return
      setCurrentIndex((prev) => {
        const nextIdx = prev + 1
        const ev = events[nextIdx]

        if (ev) {
          // Animar cursor
          if (ev.event_type === 'click' && ev.event_data.x_pct !== undefined && ev.event_data.y_pct !== undefined) {
            setCursorPos({
              x: ev.event_data.x_pct,
              y: ev.event_data.y_pct,
              active: true,
              text: ev.event_data.target_text,
              tag: ev.event_data.target_tag,
            })
            setTimeout(() => {
              if (isMounted.current) setCursorPos((p) => ({ ...p, active: false }))
            }, 800)
          }

          // Atualizar telemetria daquele ponto no tempo
          setTelemetry((prevTel) => ({
            ...prevTel,
            rtt: ev.event_data.rtt ?? prevTel.rtt,
            downlink: ev.event_data.downlink ?? prevTel.downlink,
            effectiveType: ev.event_data.effective_type ?? prevTel.effectiveType,
            packetLossPct: ev.event_data.packet_loss_estimate_pct ?? prevTel.packetLossPct,
            currentPathname: ev.event_data.pathname || prevTel.currentPathname,
          }))
        }

        return nextIdx
      })
    }, delay)

    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current)
    }
  }, [currentIndex, isPlaying, events, playbackSpeed, isLiveMode])

  // Controles de Playback
  const handleTogglePlay = () => setIsPlaying((prev) => !prev)
  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
    setCursorPos({ x: 50, y: 50, active: false })
  }

  // Eventos filtrados para o painel de log
  const filteredLogs = useMemo(() => {
    if (filtroTipoLog === 'ALL') return events
    return events.filter((e) => e.event_type === filtroTipoLog)
  }, [events, filtroTipoLog])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] xl:max-w-7xl h-[92vh] flex flex-col p-0 gap-0 bg-card text-foreground border border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* Header Superior com Identificação e Status */}
        <div className="p-4 px-6 bg-card border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
              <Monitor className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground truncate">
                  {session?.funcionarioNome || 'Replay de Sessão'}
                </h2>
                {isLiveMode ? (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                    AO VIVO TRANSMITINDO
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">
                    PLAYBACK HISTÓRICO
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {session?.funcionarioCargo || 'Servidor'} • {session?.escolaNome || 'Rede Municipal'} • ID:{' '}
                <span className="font-mono text-foreground/80">{session?.sessionId?.slice(0, 16)}...</span>
              </p>
            </div>
          </div>

          {/* KPI Pills de Conexão */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/70 border border-border text-xs">
              <Wifi className={cn('w-3.5 h-3.5', telemetry.rtt < 100 ? 'text-emerald-500 dark:text-emerald-400' : telemetry.rtt < 300 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400')} />
              <span className="text-muted-foreground">Latência:</span>
              <span className="font-mono font-bold text-foreground">{telemetry.rtt}ms</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/70 border border-border text-xs">
              <Zap className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
              <span className="text-muted-foreground">Velocidade:</span>
              <span className="font-mono font-bold text-foreground">{telemetry.downlink} Mbps ({telemetry.effectiveType.toUpperCase()})</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/70 border border-border text-xs">
              <Activity className={cn('w-3.5 h-3.5', telemetry.packetLossPct === 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400')} />
              <span className="text-muted-foreground">Perda Pacotes:</span>
              <span className="font-mono font-bold text-foreground">{telemetry.packetLossPct}%</span>
            </div>
          </div>
        </div>

        {/* Corpo Principal: Canvas de Visualização + Console Lateral de Telemetria */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-background">
          {/* Painel Esquerdo: Tela de Simulação Visual dos Comandos */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-card/40 relative select-none">
            {/* Barra da Janela Simulada */}
            <div className="p-2.5 px-4 bg-muted/70 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-foreground/80 ml-2">Painel Escolar SIG</span>
              </div>

              {/* Rota Atual da Sessão */}
              <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-md border border-border font-mono text-[11px] text-sky-600 dark:text-sky-300 max-w-sm truncate">
                <Compass className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                <span>{telemetry.currentPathname || '/'}</span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Eventos: {events.length}</span>
              </div>
            </div>

            {/* Viewport Interativo com Cursor Virtual e Ripple de Clique */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Esqueleto Representativo da UI do SIG */}
              <div className="w-full h-full max-w-5xl max-h-[640px] bg-card border border-border rounded-xl shadow-2xl relative overflow-hidden flex flex-col pointer-events-none">
                {/* Header Mock */}
                <div className="h-12 border-b border-border bg-muted/40 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-500/40" />
                    <div className="w-28 h-3.5 rounded bg-muted-foreground/20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-6 rounded-md bg-muted-foreground/20" />
                    <div className="w-7 h-7 rounded-full bg-muted-foreground/30" />
                  </div>
                </div>

                {/* Conteúdo Mock */}
                <div className="flex-1 flex">
                  {/* Sidebar Mock */}
                  <div className="w-48 border-r border-border bg-muted/20 p-3 space-y-2 hidden sm:block">
                    <div className="w-full h-7 rounded-lg bg-muted-foreground/15" />
                    <div className="w-full h-7 rounded-lg bg-sky-500/10 border border-sky-500/30" />
                    <div className="w-full h-7 rounded-lg bg-muted-foreground/10" />
                    <div className="w-full h-7 rounded-lg bg-muted-foreground/10" />
                  </div>

                  {/* Main Canvas Mock */}
                  <div className="flex-1 p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1.5">
                        <div className="w-40 h-5 rounded bg-muted-foreground/25" />
                        <div className="w-64 h-3.5 rounded bg-muted-foreground/15" />
                      </div>
                      <div className="w-24 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-20 rounded-xl bg-muted/30 border border-border p-3" />
                      <div className="h-20 rounded-xl bg-muted/30 border border-border p-3" />
                      <div className="h-20 rounded-xl bg-muted/30 border border-border p-3" />
                    </div>

                    <div className="h-44 rounded-xl bg-muted/20 border border-border p-4 space-y-2">
                      <div className="w-full h-6 rounded bg-muted-foreground/20" />
                      <div className="w-full h-6 rounded bg-muted-foreground/15" />
                      <div className="w-full h-6 rounded bg-muted-foreground/15" />
                      <div className="w-full h-6 rounded bg-muted-foreground/15" />
                    </div>
                  </div>
                </div>

                {/* Cursor Virtual & Indicador de Onda de Choque do Clique */}
                <div
                  className="absolute pointer-events-none transition-all duration-150 ease-out z-30"
                  style={{
                    left: `${cursorPos.x}%`,
                    top: `${cursorPos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {/* Onda de choque (Ripple) quando há clique */}
                  {cursorPos.active && (
                    <div className="absolute -inset-4 rounded-full border-2 border-sky-400 bg-sky-400/20 animate-ping" />
                  )}

                  {/* Cursor de Mouse */}
                  <div className="relative flex items-start gap-1.5">
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform',
                        cursorPos.active ? 'scale-125 bg-sky-500 text-white shadow-sky-500/50' : 'bg-background/95 text-sky-600 dark:text-sky-400 border border-sky-400/60'
                      )}
                    >
                      <MousePointer className="w-4 h-4 fill-current" />
                    </div>

                    {/* Balão com Identificação do Componente Clicado */}
                    {cursorPos.text && (
                      <div className="bg-popover border border-border text-[10px] text-popover-foreground px-2 py-0.5 rounded-md shadow-lg whitespace-nowrap animate-in fade-in zoom-in-90 duration-150">
                        <span className="font-bold uppercase text-sky-600 dark:text-sky-400">{cursorPos.tag || 'ELEMENT'}:</span> {cursorPos.text}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de Controles de Playback (Modo Histórico) */}
            {!isLiveMode && (
              <div className="p-3 px-6 bg-card border-t border-border flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTogglePlay}
                    className="bg-secondary hover:bg-muted text-foreground border-border h-9 px-4 rounded-xl cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 mr-1.5 fill-current" /> : <Play className="w-4 h-4 mr-1.5 fill-current" />}
                    {isPlaying ? 'Pausar' : 'Reproduzir'}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleReset}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted h-9 rounded-xl cursor-pointer"
                    title="Voltar ao início"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  {/* Seletor de Velocidade */}
                  <div className="flex items-center bg-muted/60 border border-border rounded-xl p-0.5 text-xs font-semibold">
                    {[0.5, 1, 2, 4].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setPlaybackSpeed(spd)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
                          playbackSpeed === spd ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrubber / Barra de Progresso */}
                <div className="flex-1 max-w-md flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">
                    {currentIndex + 1}/{Math.max(1, events.length)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, events.length - 1)}
                    value={currentIndex}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value, 10)
                      setCurrentIndex(idx)
                      const ev = events[idx]
                      if (ev?.event_data?.x_pct && ev?.event_data?.y_pct) {
                        setCursorPos({
                          x: ev.event_data.x_pct,
                          y: ev.event_data.y_pct,
                          active: true,
                          text: ev.event_data.target_text,
                          tag: ev.event_data.target_tag,
                        })
                      }
                    }}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Painel Direito: Console de Telemetria e Linha do Tempo de Ações */}
          <div className="w-full lg:w-96 flex flex-col bg-card border-t lg:border-t-0 lg:border-l border-border">
            {/* Resumo Estatístico */}
            <div className="p-4 border-b border-border bg-muted/30 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                Telemetria Consolidada
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-background border border-border">
                  <div className="text-[10px] text-muted-foreground">Cliques</div>
                  <div className="text-base font-bold text-sky-600 dark:text-sky-400">{telemetry.totalClicks}</div>
                </div>
                <div className="p-2 rounded-xl bg-background border border-border">
                  <div className="text-[10px] text-muted-foreground">Formulários</div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{telemetry.totalInputs}</div>
                </div>
                <div className="p-2 rounded-xl bg-background border border-border">
                  <div className="text-[10px] text-muted-foreground">Erros JS</div>
                  <div className={cn('text-base font-bold', telemetry.totalErrors > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                    {telemetry.totalErrors}
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros da Linha do Tempo */}
            <div className="p-2.5 px-4 border-b border-border flex items-center justify-between text-xs bg-muted/40">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                Linha do Tempo
              </span>

              <select
                aria-label="Filtrar eventos da linha do tempo"
                value={filtroTipoLog}
                onChange={(e) => setFiltroTipoLog(e.target.value)}
                className="bg-background border border-border text-foreground text-[11px] rounded-lg px-2 py-1 outline-none cursor-pointer"
              >
                <option value="ALL">Todos Eventos</option>
                <option value="click">Cliques / Toques</option>
                <option value="navigation">Navegação</option>
                <option value="input_focus">Campos</option>
                <option value="error">Erros</option>
              </select>
            </div>

            {/* Lista com Rolagem dos Eventos */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
              {loadingEvents ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                  <Activity className="w-6 h-6 animate-spin text-sky-500" />
                  <span>Carregando telemetria da sessão...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center px-4">
                  <FileText className="w-6 h-6 mb-1 text-muted-foreground/60" />
                  <span>Nenhum evento registrado ainda para este filtro.</span>
                </div>
              ) : (
                filteredLogs.map((ev, i) => {
                  const isCurrent = isLiveMode ? i === filteredLogs.length - 1 : i === currentIndex
                  return (
                    <div
                      key={i}
                      className={cn(
                        'p-2.5 rounded-xl border transition-all duration-150',
                        isCurrent
                          ? 'bg-sky-500/10 border-sky-500/50 shadow-sm'
                          : 'bg-muted/40 border-border hover:bg-muted/80 text-muted-foreground'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-sans font-semibold">
                          {ev.event_type === 'click' && (
                            <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30 text-[10px]">
                              <MousePointer className="w-3 h-3 mr-1" /> CLIQUE
                            </Badge>
                          )}
                          {ev.event_type === 'navigation' && (
                            <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 text-[10px]">
                              <Compass className="w-3 h-3 mr-1" /> NAVEGAÇÃO
                            </Badge>
                          )}
                          {ev.event_type === 'input_focus' && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                              <FileText className="w-3 h-3 mr-1" /> CAMPO
                            </Badge>
                          )}
                          {ev.event_type === 'error' && (
                            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30 text-[10px]">
                              <AlertTriangle className="w-3 h-3 mr-1" /> ERRO
                            </Badge>
                          )}
                          {ev.event_type === 'heartbeat' && (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              <Activity className="w-3 h-3 mr-1" /> STATUS
                            </Badge>
                          )}
                        </div>

                        <span className="text-[10px] text-muted-foreground">
                          {ev.event_data?.timestamp ? new Date(ev.event_data.timestamp).toLocaleTimeString('pt-BR') : ''}
                        </span>
                      </div>

                      {/* Detalhes do Evento */}
                      <div className="text-[11px] text-foreground/90 break-words">
                        {ev.event_type === 'click' && (
                          <div>
                            Elemento: <span className="text-sky-600 dark:text-sky-300 font-bold">{ev.event_data.target_tag}</span>{' '}
                            {ev.event_data.target_text && `("${ev.event_data.target_text}")`}
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Posição: {ev.event_data.x_pct}% x {ev.event_data.y_pct}%
                            </div>
                          </div>
                        )}

                        {ev.event_type === 'navigation' && (
                          <div>
                            Entrou em: <span className="text-purple-600 dark:text-purple-300 font-bold">{ev.event_data.pathname}</span>
                          </div>
                        )}

                        {ev.event_type === 'input_focus' && (
                          <div>
                            Focou no campo: <span className="text-emerald-600 dark:text-emerald-300 font-bold">{ev.event_data.field_name}</span> ({ev.event_data.field_type})
                          </div>
                        )}

                        {ev.event_type === 'error' && (
                          <div className="text-rose-600 dark:text-rose-300">
                            Erro: {ev.event_data.error_message}
                          </div>
                        )}

                        {ev.event_type === 'heartbeat' && (
                          <div className="text-muted-foreground">
                            Sessão ativa na tela {ev.event_data.pathname}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
