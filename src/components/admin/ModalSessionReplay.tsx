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
  Home,
  Users,
  GraduationCap,
  UserPlus,
  ClipboardList,
  MessageSquare,
  FileBarChart,
  Settings,
  Search,
  Plus,
  Filter,
  Table,
  Download,
  BookOpen,
  Calendar,
  Eye,
  Check,
  Building2,
  Phone,
  Mail,
  FileCheck,
  AlertCircle,
  Hash,
  ShieldCheck,
  Heart,
  Camera,
  Save,
  Printer,
  Sparkles,
  MapPin,
  Lock,
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
    initialActiveModal?: { isOpen: boolean; title: string } | null
  } | null
}

interface ActiveModalState {
  isOpen: boolean
  title: string
  fieldFocus?: string
  lastTypingField?: string
  characterCount?: number
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

  // Estado do Modal Aberto na Transmissão
  const [activeModal, setActiveModal] = useState<ActiveModalState | null>(() => {
    if (session?.initialActiveModal?.isOpen) {
      return {
        isOpen: true,
        title: session.initialActiveModal.title,
      }
    }
    return null
  })

  useEffect(() => {
    if (session?.initialActiveModal?.isOpen) {
      setActiveModal({
        isOpen: true,
        title: session.initialActiveModal.title,
      })
    } else if (!isLiveMode) {
      setActiveModal(null)
    }
  }, [open, session?.sessionId, session?.initialActiveModal, isLiveMode])

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
    totalModals: number
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
    totalModals: 0,
    totalErrors: 0,
  })

  const channelRef = useRef<any>(null)
  const userChannelRef = useRef<any>(null)
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMounted = useRef<boolean>(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Sincronizar pathname inicial vindo da sessão selecionada
  useEffect(() => {
    if (session?.currentPathname) {
      setTelemetry((prev) => ({ ...prev, currentPathname: session.currentPathname || '/' }))
    }
  }, [session?.currentPathname])

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
          const inputs = loaded.filter((ev) => ev.event_type === 'input_focus' || ev.event_type === 'input_change').length
          const modals = loaded.filter((ev) => ev.event_type === 'modal_open').length
          const errors = loaded.filter((ev) => ev.event_type === 'error').length
          const lastEvent = loaded[loaded.length - 1]
          const lastNet = lastEvent?.event_data

          setTelemetry((prev) => ({
            ...prev,
            totalClicks: clicks,
            totalInputs: inputs,
            totalModals: modals,
            totalErrors: errors,
            rtt: lastNet?.rtt ?? prev.rtt,
            downlink: lastNet?.downlink ?? prev.downlink,
            effectiveType: lastNet?.effective_type ?? prev.effectiveType,
            packetLossPct: lastNet?.packet_loss_estimate_pct ?? prev.packetLossPct,
            currentPathname: lastEvent?.event_data?.pathname || prev.currentPathname,
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
      const baseUserId = session.sessionId.includes('_') ? session.sessionId.split('_')[0] : null
      
      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: true } },
      })

      const handleIncomingBroadcast = ({ payload }: { payload: ReplayEventItem }) => {
        if (!isMounted.current || !payload) return

        setEvents((prev) => [...prev, payload])

        // A. Cliques
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

        // B. Navegação em Tempo Real
        if (payload.event_type === 'navigation' && payload.event_data.pathname) {
          setTelemetry((prev) => ({
            ...prev,
            currentPathname: payload.event_data.pathname || prev.currentPathname,
          }))
          // Ao navegar para outra rota, fecha qualquer modal aberto
          setActiveModal(null)
        }

        // C. Abertura e Fechamento de Modais
        if (payload.event_type === 'modal_open') {
          setActiveModal({
            isOpen: true,
            title: payload.event_data.modal_title || 'Janela de Formulário do SIG',
          })
        } else if (payload.event_type === 'modal_close') {
          setActiveModal(null)
        }

        // D. Foco e Digitação em Campos
        if (payload.event_type === 'input_focus') {
          setActiveModal((prev) => {
            if (prev) return { ...prev, fieldFocus: payload.event_data.field_name }
            return {
              isOpen: true,
              title: payload.event_data.modal_title || 'Formulário / Ficha de Matrícula',
              fieldFocus: payload.event_data.field_name,
            }
          })
        } else if (payload.event_type === 'input_change') {
          setActiveModal((prev) => {
            if (prev) {
              return {
                ...prev,
                lastTypingField: payload.event_data.field_name,
                characterCount: payload.event_data.character_count,
              }
            }
            return {
              isOpen: true,
              title: payload.event_data.modal_title || 'Formulário / Ficha de Matrícula',
              lastTypingField: payload.event_data.field_name,
              characterCount: payload.event_data.character_count,
            }
          })
        }

        // E. Atualizar telemetria consolidada
        setTelemetry((prev) => ({
          rtt: payload.event_data.rtt ?? prev.rtt,
          downlink: payload.event_data.downlink ?? prev.downlink,
          effectiveType: payload.event_data.effective_type ?? prev.effectiveType,
          packetLossPct: payload.event_data.packet_loss_estimate_pct ?? prev.packetLossPct,
          activeSeconds: payload.event_data.active_time_seconds ?? prev.activeSeconds + 1,
          currentPathname: payload.event_data.pathname || prev.currentPathname,
          totalClicks: payload.event_type === 'click' ? prev.totalClicks + 1 : prev.totalClicks,
          totalInputs: payload.event_type === 'input_focus' || payload.event_type === 'input_change' ? prev.totalInputs + 1 : prev.totalInputs,
          totalModals: payload.event_type === 'modal_open' ? prev.totalModals + 1 : prev.totalModals,
          totalErrors: payload.event_type === 'error' ? prev.totalErrors + 1 : prev.totalErrors,
        }))
      }

      channel.on('broadcast', { event: 'event' }, handleIncomingBroadcast).subscribe()
      channelRef.current = channel

      // Canal secundário pelo user_id para garantir recepção de broadcast
      let secondaryChannel: any = null
      if (baseUserId && baseUserId !== session.sessionId) {
        secondaryChannel = supabase.channel(`session_replay:${baseUserId}`, {
          config: { broadcast: { self: true } },
        })
        secondaryChannel.on('broadcast', { event: 'event' }, handleIncomingBroadcast).subscribe()
        userChannelRef.current = secondaryChannel
      }

      return () => {
        supabase.removeChannel(channel)
        if (secondaryChannel) {
          supabase.removeChannel(secondaryChannel)
        }
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

    const currentTs = currentEv?.event_data?.timestamp || 0
    const nextTs = nextEv?.event_data?.timestamp || currentTs + 1000
    let delay = (nextTs - currentTs) / playbackSpeed

    // Limitar delay entre 100ms e 2200ms para playback fluído
    delay = Math.max(100, Math.min(2200, delay))

    playTimerRef.current = setTimeout(() => {
      if (!isMounted.current) return
      setCurrentIndex((prev) => {
        const nextIdx = prev + 1
        const ev = events[nextIdx]

        if (ev) {
          // A. Animar cursor
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

          // B. Modais no Playback
          if (ev.event_type === 'modal_open') {
            setActiveModal({
              isOpen: true,
              title: ev.event_data.modal_title || 'Janela Modal do SIG',
            })
          } else if (ev.event_type === 'modal_close') {
            setActiveModal(null)
          }

          // C. Navegação no Playback
          if (ev.event_type === 'navigation' && ev.event_data.pathname) {
            setActiveModal(null)
          }

          // D. Atualizar telemetria daquele ponto no tempo
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
    setActiveModal(null)
    setCursorPos({ x: 50, y: 50, active: false })
  }

  // Eventos filtrados para o painel de log
  const filteredLogs = useMemo(() => {
    if (filtroTipoLog === 'ALL') return events
    if (filtroTipoLog === 'modal') return events.filter((e) => e.event_type === 'modal_open' || e.event_type === 'modal_close')
    if (filtroTipoLog === 'input') return events.filter((e) => e.event_type === 'input_focus' || e.event_type === 'input_blur' || e.event_type === 'input_change')
    return events.filter((e) => e.event_type === filtroTipoLog)
  }, [events, filtroTipoLog])

  const path = (telemetry.currentPathname || '/').toLowerCase()

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
                    TRANSMISSÃO AO VIVO
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px]">
                    PLAYBACK HISTÓRICO
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {session?.funcionarioCargo || 'Servidor'} • {session?.escolaNome || 'Rede Municipal'} • Sessão:{' '}
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
              <span className="text-muted-foreground">Perda:</span>
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

              {/* Rota Atual da Sessão em Tempo Real */}
              <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-md border border-border font-mono text-[11px] text-sky-600 dark:text-sky-300 max-w-sm truncate shadow-xs">
                <Compass className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                <span className="font-bold">{telemetry.currentPathname || '/'}</span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Eventos: {events.length}</span>
              </div>
            </div>

            {/* Viewport Interativo com Cursor Virtual e Ripple de Clique */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-3 sm:p-4 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Esqueleto Representativo de Alta Fidelidade da UI do SIG */}
              <div className="w-full h-full max-w-5xl max-h-[640px] bg-card border border-border rounded-xl shadow-2xl relative overflow-hidden flex flex-col pointer-events-none text-foreground">
                {/* Header Mock com Identidade SIG */}
                <div className="h-12 border-b border-border bg-muted/40 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-xs">
                      SIG
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Painel Escolar</span>
                      <span className="text-muted-foreground/50 text-xs">•</span>
                      <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {session?.escolaNome || 'Escola Municipal de Ensino Fundamental'}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Pesquisa Simulada & Usuário */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background border border-border text-[11px] text-muted-foreground w-44 justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="truncate">Buscar no sistema...</span>
                      </div>
                      <kbd className="text-[9px] font-mono px-1 rounded bg-muted border border-border">⌘K</kbd>
                    </div>

                    <div className="flex items-center gap-2 pl-2 border-l border-border">
                      <div className="w-6 h-6 rounded-full bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-[10px] font-bold text-sky-600 dark:text-sky-400">
                        {session?.funcionarioNome ? session.funcionarioNome.slice(0, 2).toUpperCase() : 'US'}
                      </div>
                      <span className="text-xs font-semibold text-foreground hidden md:inline truncate max-w-[100px]">
                        {session?.funcionarioNome?.split(' ')[0] || 'Servidor'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conteúdo Mock: Sidebar com Menus Reais + Área Principal com Espelhamento Dinâmico */}
                <div className="flex-1 flex overflow-hidden relative">
                  {/* Sidebar Mock Realista com Menus do SIG sincronizados com a rota atual */}
                  <div className="w-44 border-r border-border bg-muted/20 p-2 space-y-1 hidden sm:flex flex-col justify-between shrink-0">
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 px-2 py-1">
                        Menu Principal
                      </div>

                      {[
                        { label: 'Início', icon: Home, active: path === '/' || path.includes('home') },
                        { label: 'Alunos', icon: Users, active: path.includes('aluno') },
                        { label: 'Turmas', icon: GraduationCap, active: path.includes('turma') },
                        { label: 'Matrículas', icon: UserPlus, active: path.includes('matricula') },
                        { label: 'Notas & Diário', icon: ClipboardList, active: path.includes('avaliacao') || path.includes('nota') },
                        { label: 'Mural de Avisos', icon: MessageSquare, active: path.includes('mural') },
                        { label: 'Documentos', icon: FileText, active: path.includes('documento') },
                        { label: 'Relatórios', icon: FileBarChart, active: path.includes('relatorio') },
                        { label: 'Auditoria & Logs', icon: Activity, active: path.includes('analise-uso') || path.includes('admin') },
                      ].map((item, idx) => {
                        const Icon = item.icon
                        return (
                          <div
                            key={idx}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all',
                              item.active
                                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 font-bold border border-sky-500/30 shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/50'
                            )}
                          >
                            <Icon className={cn('w-3.5 h-3.5 shrink-0', item.active ? 'text-sky-600 dark:text-sky-400' : 'text-muted-foreground')} />
                            <span className="truncate">{item.label}</span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground">
                        <Settings className="w-3.5 h-3.5" />
                        <span>Configurações</span>
                      </div>
                    </div>
                  </div>

                  {/* Main Canvas: Conteúdo Dinâmico com Fidelidade de Telas do SIG */}
                  <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto flex flex-col justify-between">
                    {/* 1. TELA: RELATÓRIOS (ex: /relatorios ou /admin/relatorios) */}
                    {path.includes('relatorio') ? (
                      <div className="space-y-4 animate-in fade-in-50 duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <FileBarChart className="w-4 h-4 text-sky-500" />
                              Relatórios e Indicadores Educacionais
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Geração de atas de rendimento, estatísticas de frequência e boletins consolidados
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-2.5 py-1 rounded-lg bg-muted border border-border text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Filter className="w-3 h-3" /> Filtrar Período
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                              <Download className="w-3 h-3" /> Exportar Relatório
                            </div>
                          </div>
                        </div>

                        {/* Grid de Modelos de Relatórios */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { title: 'Ata de Rendimento Bimestral', desc: 'Médias, faltas e situação final', count: '100% Emitido' },
                            { title: 'Frequência e Infrequência', desc: 'Controle de faltas e infrequentes', count: '14 Avisos' },
                            { title: 'Quadro de Matrículas e Vagas', desc: 'Ocupação por série e turno', count: '412 Alunos' },
                            { title: 'Censo Escolar / MEC', desc: 'Dados padronizados do censo', count: 'Atualizado' },
                            { title: 'Rotas de Transporte Escolar', desc: 'Quilometragem e alunos atendidos', count: '8 Rotas' },
                            { title: 'Atestados e Licenças', desc: 'Afastamentos médicos de servidores', count: '3 Ativos' },
                          ].map((rep, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-card border border-border space-y-1.5 hover:border-sky-500/40 transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">DOC #{idx + 1}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{rep.count}</span>
                              </div>
                              <div className="text-xs font-bold text-foreground">{rep.title}</div>
                              <div className="text-[10px] text-muted-foreground line-clamp-1">{rep.desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : path.includes('aluno') ? (
                      /* 2. TELA: ALUNOS (ex: /alunos) */
                      <div className="space-y-4 animate-in fade-in-50 duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <Users className="w-4 h-4 text-sky-500" />
                              Gestão e Fichas de Alunos
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Consulta cadastral, matrículas ativas, históricos escolares e transferências
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-2.5 py-1 rounded-lg bg-muted border border-border text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Filter className="w-3 h-3" /> Filtrar Turma
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                              <Plus className="w-3 h-3" /> + Novo Aluno
                            </div>
                          </div>
                        </div>

                        {/* Tabela de Alunos */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          <div className="p-2.5 px-3 bg-muted/40 border-b border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Table className="w-3.5 h-3.5" />
                              <span>Fichas de Matrícula Ativas</span>
                            </div>
                            <span className="text-[10px] font-mono">Total: 412 alunos</span>
                          </div>
                          <div className="divide-y divide-border text-[11px]">
                            {[
                              { cod: 'MAT-00194', nome: 'Gabriel Henrique Silva', turma: '9º Ano A • Matutino', resp: 'Patrícia Silva', status: 'Ativo' },
                              { cod: 'MAT-00195', nome: 'Ana Beatriz Souza', turma: '8º Ano B • Vespertino', resp: 'Carlos Souza', status: 'Ativo' },
                              { cod: 'MAT-00196', nome: 'Lucas Matheus Costa', turma: '1º Ano EM • Integral', resp: 'Marcos Costa', status: 'Pendente' },
                              { cod: 'MAT-00197', nome: 'Mariana Oliveira Ramos', turma: '7º Ano A • Matutino', resp: 'Luciana Ramos', status: 'Ativo' },
                            ].map((row, idx) => (
                              <div key={idx} className="p-2.5 px-3 flex items-center justify-between hover:bg-muted/20">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-mono text-[10px] text-muted-foreground">{row.cod}</span>
                                  <div>
                                    <div className="font-semibold text-foreground">{row.nome}</div>
                                    <div className="text-[10px] text-muted-foreground">{row.turma} • Resp: {row.resp}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', row.status === 'Ativo' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30')}>
                                    {row.status}
                                  </span>
                                  <div className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] text-muted-foreground font-semibold">
                                    Ficha
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : path.includes('turma') ? (
                      /* 3. TELA: TURMAS (ex: /turmas) */
                      <div className="space-y-4 animate-in fade-in-50 duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-sky-500" />
                              Turmas, Salas e Enturmação
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Distribuição de estudantes, matriz curricular por turno e professores regentes
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                              <Plus className="w-3 h-3" /> + Nova Turma
                            </div>
                          </div>
                        </div>

                        {/* Cards de Turmas */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { name: '6º Ano A', turno: 'Matutino', alunos: '32 / 35', prof: 'Prof. Ricardo' },
                            { name: '7º Ano A', turno: 'Matutino', alunos: '34 / 35', prof: 'Profa. Cristina' },
                            { name: '8º Ano B', turno: 'Vespertino', alunos: '30 / 35', prof: 'Prof. Marcos' },
                            { name: '9º Ano A', turno: 'Matutino', alunos: '28 / 35', prof: 'Profa. Vanessa' },
                            { name: '1º Ano EM', turno: 'Integral', alunos: '35 / 35', prof: 'Prof. André' },
                            { name: '2º Ano EM', turno: 'Integral', alunos: '31 / 35', prof: 'Profa. Juliana' },
                          ].map((t, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-card border border-border space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">{t.name}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold">{t.turno}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground">Capacidade: <span className="font-semibold text-foreground">{t.alunos}</span></div>
                              <div className="text-[10px] text-muted-foreground truncate">Regente: {t.prof}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : path.includes('matricula') ? (
                      /* 4. TELA: MATRÍCULAS (ex: /matriculas) */
                      <div className="space-y-4 animate-in fade-in-50 duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <UserPlus className="w-4 h-4 text-sky-500" />
                              Matrículas e Rematrículas Escolares
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Acompanhamento de novas solicitações, validação de documentos e vagas
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                              <Plus className="w-3 h-3" /> + Nova Matrícula
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                            <div className="text-[10px] font-semibold text-muted-foreground">SOLICITAÇÕES ABERTAS</div>
                            <div className="text-base font-bold text-sky-600 dark:text-sky-400">48 Candidatos</div>
                          </div>
                          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                            <div className="text-[10px] font-semibold text-muted-foreground">DOCUMENTOS PENDENTES</div>
                            <div className="text-base font-bold text-amber-600 dark:text-amber-400">12 Aguardando</div>
                          </div>
                          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                            <div className="text-[10px] font-semibold text-muted-foreground">EFETIVADAS</div>
                            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">180 Alunos</div>
                          </div>
                        </div>
                      </div>
                    ) : path.includes('avaliacao') || path.includes('nota') ? (
                      /* 5. TELA: NOTAS E DIÁRIO DE CLASSE (ex: /avaliacoes) */
                      <div className="space-y-4 animate-in fade-in-50 duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <ClipboardList className="w-4 h-4 text-sky-500" />
                              Lançamento de Notas e Diário de Classe
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Registro de notas bimestrais, conceitos, frequência diária e recuperações
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                              <Check className="w-3 h-3" /> Salvar Diário
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          <div className="p-2.5 px-3 bg-muted/40 border-b border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                            <span>Turma: 9º Ano A • Disciplina: Matemática • 2º Bimestre</span>
                            <span className="text-[10px] font-mono">32 Alunos</span>
                          </div>
                          <div className="divide-y divide-border text-[11px]">
                            {[
                              { aluno: 'Gabriel Henrique Silva', n1: '8.5', n2: '9.0', media: '8.8', faltas: '2' },
                              { aluno: 'Ana Beatriz Souza', n1: '7.0', n2: '8.0', media: '7.5', faltas: '0' },
                              { aluno: 'Lucas Matheus Costa', n1: '6.0', n2: '5.5', media: '5.8', faltas: '4' },
                            ].map((row, idx) => (
                              <div key={idx} className="p-2.5 px-3 flex items-center justify-between">
                                <div className="font-semibold text-foreground">{row.aluno}</div>
                                <div className="flex items-center gap-3 text-xs font-mono">
                                  <span>N1: <strong>{row.n1}</strong></span>
                                  <span>N2: <strong>{row.n2}</strong></span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Média: {row.media}</span>
                                  <span className="text-muted-foreground">Faltas: {row.faltas}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* 6. TELA PADRÃO / PAINEL GERAL (ex: /home ou /admin) */
                      <div className="space-y-4 animate-in fade-in-50 duration-200">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                              Painel Integrado de Gestão Escolar (SIG)
                            </h3>
                            <p className="text-[11px] text-muted-foreground">
                              Visão unificada das rotinas acadêmicas, registros de presença e telemetria da unidade
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="px-2.5 py-1 rounded-lg bg-muted border border-border text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Filter className="w-3 h-3" /> Filtrar Dados
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1 shadow-xs">
                              <Plus className="w-3 h-3" /> + Novo Registro
                            </div>
                          </div>
                        </div>

                        {/* Cards de Métricas Gerais */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Total Cadastrado</div>
                            <div className="text-base font-bold text-foreground">412 Alunos</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">● 98% Regular</div>
                          </div>

                          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Turmas Ativas</div>
                            <div className="text-base font-bold text-sky-600 dark:text-sky-400">18 Turmas</div>
                            <div className="text-[10px] text-muted-foreground">Turno Matutino / Vespertino</div>
                          </div>

                          <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pendências / Avisos</div>
                            <div className="text-base font-bold text-amber-600 dark:text-amber-400">0 Pendentes</div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Tudo sincronizado</div>
                          </div>
                        </div>

                        {/* Tabela Estruturada Geral */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          <div className="p-2.5 px-3 bg-muted/40 border-b border-border flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Table className="w-3.5 h-3.5" />
                              <span>Registros e Acessos Recentes</span>
                            </div>
                            <span className="text-[10px] font-mono">Exibindo 4 registros</span>
                          </div>

                          <div className="divide-y divide-border text-[11px]">
                            {[
                              { cod: '00194', nome: 'Gabriel Henrique Silva', desc: '9º Ano A • Matutino', status: 'Ativo' },
                              { cod: '00195', nome: 'Ana Beatriz Souza', desc: '8º Ano B • Vespertino', status: 'Ativo' },
                              { cod: '00196', nome: 'Lucas Matheus Costa', desc: '1º Ano EM • Integral', status: 'Pendente' },
                              { cod: '00197', nome: 'Mariana Oliveira Ramos', desc: '7º Ano A • Matutino', status: 'Ativo' },
                            ].map((row, idx) => (
                              <div key={idx} className="p-2.5 px-3 flex items-center justify-between hover:bg-muted/20">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-mono text-[10px] text-muted-foreground">{row.cod}</span>
                                  <div>
                                    <div className="font-semibold text-foreground">{row.nome}</div>
                                    <div className="text-[10px] text-muted-foreground">{row.desc}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                      row.status === 'Ativo'
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                    )}
                                  >
                                    {row.status}
                                  </span>
                                  <div className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] text-muted-foreground font-semibold">
                                    Detalhes
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      REPRODUÇÃO IMERSIVA DE MODAL (ABRE AO VIVO QUANDO O USUÁRIO ABRE)
                     ───────────────────────────────────────────────────────────── */}
                  {Boolean(activeModal?.isOpen) && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-[4px] flex items-center justify-center p-3 sm:p-5 z-20 animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-full max-w-3xl max-h-[92%] bg-card text-foreground border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        {/* Header do Modal Reproduzido */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 shrink-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                              <Layers className="w-5 h-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm sm:text-base font-bold text-foreground truncate">
                                {activeModal?.title || 'Ficha de Matrícula AEE 2026 — SIG'}
                              </h4>
                              <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>Janela de Diálogo / Modal Interativo Ao Vivo</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>LGPD: Dados Mascarados</span>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground cursor-default">
                              <XCircle className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        {/* Conteúdo Contextual do Modal (Scrollável com visual idêntico ao original) */}
                        <div className="p-4 sm:p-5 overflow-y-auto max-h-[62vh] space-y-5 text-xs">
                          {(() => {
                            const modalTitleLower = (activeModal?.title || '').toLowerCase()

                            if (modalTitleLower.includes('matricula') || modalTitleLower.includes('emaee') || modalTitleLower.includes('paciente') || path.includes('emaee') || path.includes('paciente')) {
                              // A. Modal Completo de Matrícula EMAEE / Paciente AEE (Fidelidade Total + LGPD Mask)
                              return (
                                <div className="space-y-5">
                                  {/* Sub-cabeçalho de Identificação */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                                    <div>
                                      <p className="text-[10px] font-extrabold text-primary uppercase tracking-wider">EMAEE • Ano letivo 2026</p>
                                      <h2 className="text-sm font-bold text-foreground">Ficha de Matrícula para AEE</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                        Edição de Matrícula
                                      </span>
                                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Rascunho salvo
                                      </span>
                                    </div>
                                  </div>

                                  {/* Stepper de 4 Passos */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="flex items-center gap-2 p-2 rounded-xl border border-primary/40 bg-primary/10 text-foreground font-bold text-[11px] shadow-sm">
                                      <span className="w-5 h-5 rounded-md bg-primary text-primary-foreground grid place-items-center text-[10px] font-extrabold">1</span>
                                      <span className="truncate">Aluno e Endereço</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-muted/40 text-muted-foreground text-[11px]">
                                      <span className="w-5 h-5 rounded-md bg-primary/10 text-primary grid place-items-center text-[10px] font-extrabold">2</span>
                                      <span className="truncate">Escola regular</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-muted/40 text-muted-foreground text-[11px]">
                                      <span className="w-5 h-5 rounded-md bg-primary/10 text-primary grid place-items-center text-[10px] font-extrabold">3</span>
                                      <span className="truncate">Dados clínicos</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 rounded-xl border border-border bg-muted/40 text-muted-foreground text-[11px]">
                                      <span className="w-5 h-5 rounded-md bg-primary/10 text-primary grid place-items-center text-[10px] font-extrabold">4</span>
                                      <span className="truncate">Assinaturas</span>
                                    </div>
                                  </div>

                                  {/* Seção 1: Dados do Aluno e Endereço */}
                                  <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-2.5 p-3.5 bg-muted/40 border-b border-border">
                                      <span className="grid place-items-center w-6 h-6 rounded-lg bg-primary/10 font-bold text-xs text-primary">01</span>
                                      <div>
                                        <h3 className="font-bold text-foreground text-xs">Dados do Aluno, Endereço e Localização</h3>
                                        <p className="text-[10px] text-muted-foreground">Cadastral, filiação, endereço com CEP e localização no EMAEE</p>
                                      </div>
                                    </div>

                                    <div className="p-4 space-y-3.5">
                                      {/* Foto 3x4 + Busca de Aluno */}
                                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                                        <div className="sm:col-span-1 border border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center text-center bg-muted/20">
                                          <div className="w-14 h-16 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground mb-1.5">
                                            <Camera className="w-6 h-6 text-muted-foreground/60" />
                                          </div>
                                          <span className="text-[9px] font-semibold text-muted-foreground">Foto 3x4 (EMAEE)</span>
                                        </div>

                                        <div className="sm:col-span-3 space-y-2">
                                          <div>
                                            <label className="text-[10px] font-semibold text-muted-foreground flex items-center justify-between mb-1">
                                              <span>Nome Completo do Aluno</span>
                                              {(activeModal?.fieldFocus?.toLowerCase().includes('nome') || activeModal?.lastTypingField?.toLowerCase().includes('nome') || activeModal?.fieldFocus?.toLowerCase().includes('aluno')) && (
                                                <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[9px] h-4">EM FOCO AO VIVO</Badge>
                                              )}
                                            </label>
                                            <div className={cn('h-8 px-3 rounded-xl bg-muted/50 border flex items-center justify-between text-[11px] font-mono select-none', (activeModal?.fieldFocus?.toLowerCase().includes('nome') || activeModal?.lastTypingField?.toLowerCase().includes('nome') || activeModal?.fieldFocus?.toLowerCase().includes('aluno')) ? 'border-sky-500 ring-2 ring-sky-500/20 text-sky-500' : 'border-border text-muted-foreground')}>
                                              <span>{activeModal?.lastTypingField?.toLowerCase().includes('nome') ? 'Digitando nome...' : '••••••••••••••••••••••••••••••'}</span>
                                              <Lock className="w-3 h-3 text-muted-foreground/60" />
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">CPF do Estudante</label>
                                              <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                                                <span>•••.•••.•••-••</span>
                                                <Lock className="w-3 h-3 text-muted-foreground/60" />
                                              </div>
                                            </div>
                                            <div>
                                              <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Data de Nascimento</label>
                                              <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                                ••/••/••••
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Documentos & Filiação */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/60">
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Cartão SUS</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                            ••• •••• •••• ••••
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Nome da Mãe</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                            ••••••••••••••••••••
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Nome do Pai</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                            ••••••••••••••••••••
                                          </div>
                                        </div>
                                      </div>

                                      {/* Endereço Residencial */}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/60">
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">CEP</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                            •••••-•••
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Endereço / Bairro</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                            ••••••••••••••••••••
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Zona Residencial</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-foreground text-[11px]">
                                            Urbana • Sede
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Seção 2: Escola Regular */}
                                  <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-2.5 p-3.5 bg-muted/40 border-b border-border">
                                      <span className="grid place-items-center w-6 h-6 rounded-lg bg-primary/10 font-bold text-xs text-primary">02</span>
                                      <div>
                                        <h3 className="font-bold text-foreground text-xs">Escola Regular e Turma de Origem</h3>
                                        <p className="text-[10px] text-muted-foreground">Vínculo escolar da rede municipal de ensino</p>
                                      </div>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Escola Regular</label>
                                        <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-foreground text-[11px] truncate">
                                          Escola Municipal Vinculada
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Ano / Turma</label>
                                        <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-foreground text-[11px]">
                                          9º Ano B Regular
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Turno Regular</label>
                                        <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-foreground text-[11px]">
                                          Matutino
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Seção 3: Dados Clínicos & CID */}
                                  <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-2.5 p-3.5 bg-muted/40 border-b border-border">
                                      <span className="grid place-items-center w-6 h-6 rounded-lg bg-primary/10 font-bold text-xs text-primary">03</span>
                                      <div>
                                        <h3 className="font-bold text-foreground text-xs">Dados Clínicos, Diagnóstico e Especialidades</h3>
                                        <p className="text-[10px] text-muted-foreground">Classificação internacional de doenças e plano multidisciplinar</p>
                                      </div>
                                    </div>
                                    <div className="p-4 space-y-3">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground flex items-center justify-between mb-0.5">
                                            <span>Diagnóstico Clínico / CID-10</span>
                                            {activeModal?.fieldFocus?.toLowerCase().includes('cid') && (
                                              <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[9px] h-4">FOCADO</Badge>
                                            )}
                                          </label>
                                          <div className={cn('h-8 px-3 rounded-xl bg-muted/50 border flex items-center justify-between text-[11px]', activeModal?.fieldFocus?.toLowerCase().includes('cid') ? 'border-sky-500 ring-2 ring-sky-500/20 text-sky-500 font-bold' : 'border-border text-foreground font-mono')}>
                                            <span>F84.0 — Transtorno do Espectro Autista</span>
                                            <Badge variant="outline" className="text-[9px] h-4">CID-10</Badge>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Queixa Principal / Motivo</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] truncate">
                                            Acolhimento clínico e desenvolvimento multidisciplinar
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-1">Especialidades Vinculadas no EMAEE</label>
                                        <div className="flex flex-wrap gap-1.5">
                                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                            Psicologia Clínica
                                          </span>
                                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                            Fonoaudiologia
                                          </span>
                                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                            Psicopedagogia
                                          </span>
                                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            Atendimento Multidisciplinar
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Seção 4: Assinaturas */}
                                  <div className="border border-border rounded-2xl bg-card overflow-hidden shadow-sm">
                                    <div className="flex items-center gap-2.5 p-3.5 bg-muted/40 border-b border-border">
                                      <span className="grid place-items-center w-6 h-6 rounded-lg bg-primary/10 font-bold text-xs text-primary">04</span>
                                      <div>
                                        <h3 className="font-bold text-foreground text-xs">Assinaturas e Termo de Compromisso</h3>
                                        <p className="text-[10px] text-muted-foreground">Responsável legal e equipe multidisciplinar do EMAEE</p>
                                      </div>
                                    </div>
                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="p-3 rounded-xl border border-dashed border-border bg-muted/30 text-center">
                                        <div className="text-[10px] font-bold text-foreground mb-1">Responsável Legal</div>
                                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Assinatura Eletrônica Registrada
                                        </div>
                                      </div>
                                      <div className="p-3 rounded-xl border border-dashed border-border bg-muted/30 text-center">
                                        <div className="text-[10px] font-bold text-foreground mb-1">Especialista / EMAEE</div>
                                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Equipe Técnica Acreditada
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            } else if (modalTitleLower.includes('aluno') || modalTitleLower.includes('cadastr') || path.includes('aluno')) {
                              // B. Modal Completo de Aluno Regular (Fidelidade + LGPD)
                              return (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                                    <div className="sm:col-span-1 border border-dashed border-border rounded-xl p-3 flex flex-col items-center justify-center text-center bg-muted/20">
                                      <div className="w-14 h-16 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground mb-1.5">
                                        <Camera className="w-6 h-6 text-muted-foreground/60" />
                                      </div>
                                      <span className="text-[9px] font-semibold text-muted-foreground">Foto 3x4</span>
                                    </div>

                                    <div className="sm:col-span-3 space-y-2">
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Nome Completo do Aluno</label>
                                        <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between text-muted-foreground text-[11px] font-mono">
                                          <span>••••••••••••••••••••••••••••••</span>
                                          <Lock className="w-3 h-3 text-muted-foreground/60" />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Data de Nascimento</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                            ••/••/••••
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Turma Pretendida</label>
                                          <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-foreground text-[11px]">
                                            9º Ano A • Matutino
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border">
                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">CPF do Estudante</label>
                                      <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                        •••.•••.•••-••
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Nome da Mãe / Responsável</label>
                                      <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                        ••••••••••••••••••••
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">CEP Residencial</label>
                                      <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-muted-foreground text-[11px] font-mono">
                                        •••••-•••
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            } else {
                              // C. Modal Dinâmico Contextual
                              return (
                                <div className="space-y-4">
                                  <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Usuário em Atividade</label>
                                        <div className="h-8 px-3 rounded-xl bg-muted/50 border border-border flex items-center text-foreground font-semibold text-[11px]">
                                          {session?.funcionarioNome || 'Servidor SIG'}
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Status de Interação</label>
                                        <div className="h-8 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center text-[10px] font-semibold">
                                          <CheckCircle2 className="w-3 h-3 mr-1.5" /> Em edição ativa no modal
                                        </div>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">Campo / Ação em Foco</label>
                                      <div className="h-8 px-3 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center text-[11px] font-mono">
                                        {activeModal?.fieldFocus || 'Interagindo no formulário do SIG'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            }
                          })()}
                        </div>

                        {/* Rodapé Fiel do Modal com Botões e LGPD */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-border bg-muted/30 shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 rounded-xl bg-card border border-border text-[11px] text-foreground font-semibold flex items-center gap-1.5 shadow-sm">
                              <Printer className="w-3.5 h-3.5 text-primary" /> Imprimir Ficha
                            </div>
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                              • Protegido pela Lei Geral de Proteção de Dados
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-[11px] text-muted-foreground font-semibold cursor-default">
                              Cancelar
                            </div>
                            <div className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold flex items-center gap-1.5 shadow-md cursor-default">
                              <Save className="w-3.5 h-3.5" /> Salvar Matrícula AEE
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                      if (ev?.event_type === 'modal_open') {
                        setActiveModal({ isOpen: true, title: ev.event_data.modal_title || 'Modal' })
                      } else if (ev?.event_type === 'modal_close') {
                        setActiveModal(null)
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
            {/* Resumo Estatístico Consolidado */}
            <div className="p-4 border-b border-border bg-muted/30 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                Telemetria da Sessão
              </h3>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-2 rounded-xl bg-background border border-border">
                  <div className="text-[9px] text-muted-foreground">Cliques</div>
                  <div className="text-sm font-bold text-sky-600 dark:text-sky-400">{telemetry.totalClicks}</div>
                </div>
                <div className="p-2 rounded-xl bg-background border border-border">
                  <div className="text-[9px] text-muted-foreground">Campos</div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{telemetry.totalInputs}</div>
                </div>
                <div className="p-2 rounded-xl bg-background border border-border">
                  <div className="text-[9px] text-muted-foreground">Modais</div>
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{telemetry.totalModals}</div>
                </div>
                <div className="p-2 rounded-xl bg-background border border-border">
                  <div className="text-[9px] text-muted-foreground">Erros</div>
                  <div className={cn('text-sm font-bold', telemetry.totalErrors > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
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
                <option value="navigation">Navegação</option>
                <option value="modal">Modais</option>
                <option value="input">Campos</option>
                <option value="click">Cliques</option>
                <option value="error">Erros</option>
              </select>
            </div>

            {/* Lista com Rolagem dos Eventos em Tempo Real */}
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
                          ? 'bg-sky-500/10 border-sky-500/50 shadow-xs'
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
                          {ev.event_type === 'modal_open' && (
                            <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 text-[10px]">
                              <Layers className="w-3 h-3 mr-1" /> ABRIU MODAL
                            </Badge>
                          )}
                          {ev.event_type === 'modal_close' && (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              <XCircle className="w-3 h-3 mr-1" /> FECHOU MODAL
                            </Badge>
                          )}
                          {(ev.event_type === 'input_focus' || ev.event_type === 'input_change') && (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                              <FileText className="w-3 h-3 mr-1" /> {ev.event_type === 'input_change' ? 'DIGITAÇÃO' : 'CAMPO'}
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

                        <span className="text-[10px] text-muted-foreground font-mono">
                          {ev.event_data?.timestamp ? new Date(ev.event_data.timestamp).toLocaleTimeString('pt-BR') : ''}
                        </span>
                      </div>

                      {/* Detalhes do Evento */}
                      <div className="text-[11px] text-foreground/90 break-words font-sans">
                        {ev.event_type === 'click' && (
                          <div>
                            Elemento: <span className="text-sky-600 dark:text-sky-300 font-bold">{ev.event_data.target_tag}</span>{' '}
                            {ev.event_data.target_text && `("${ev.event_data.target_text}")`}
                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                              Posição: {ev.event_data.x_pct}% x {ev.event_data.y_pct}%
                            </div>
                          </div>
                        )}

                        {ev.event_type === 'navigation' && (
                          <div>
                            Navegou para a tela: <span className="text-purple-600 dark:text-purple-300 font-bold font-mono">{ev.event_data.pathname}</span>
                          </div>
                        )}

                        {ev.event_type === 'modal_open' && (
                          <div className="text-indigo-600 dark:text-indigo-300 font-medium">
                            Abriu modal: <span className="font-bold">{ev.event_data.modal_title}</span>
                          </div>
                        )}

                        {ev.event_type === 'modal_close' && (
                          <div className="text-muted-foreground">
                            Fechou modal {ev.event_data.modal_title ? `"${ev.event_data.modal_title}"` : ''}
                          </div>
                        )}

                        {ev.event_type === 'input_focus' && (
                          <div>
                            Focou no campo: <span className="text-emerald-600 dark:text-emerald-300 font-bold">{ev.event_data.field_name}</span> ({ev.event_data.field_type})
                          </div>
                        )}

                        {ev.event_type === 'input_change' && (
                          <div>
                            Digitando no campo: <span className="text-emerald-600 dark:text-emerald-300 font-bold">{ev.event_data.field_name}</span>
                            {ev.event_data.character_count !== undefined && (
                              <span className="text-[10px] text-muted-foreground ml-1">({ev.event_data.character_count} caracteres)</span>
                            )}
                          </div>
                        )}

                        {ev.event_type === 'error' && (
                          <div className="text-rose-600 dark:text-rose-300 font-semibold">
                            {ev.event_data.error_message}
                          </div>
                        )}

                        {ev.event_type === 'heartbeat' && (
                          <div className="text-muted-foreground">
                            Sessão conectada na rota {ev.event_data.pathname}
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

