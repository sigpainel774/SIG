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

export default function AnaliseUsoPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  // Abas: 'ao-vivo' | 'historico'
  const [tab, setTab] = useState<'ao-vivo' | 'historico'>('ao-vivo')

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

  // 1. Carregar Sessões Ao Vivo
  const carregarSessoesAtivas = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any).rpc('get_all_active_sessions_admin')
      if (error) {
        console.error('[AnaliseUso] Erro ao buscar sessões ativas:', error.message)
      } else if (data && isMounted.current) {
        setSessoesAtivas(data as SessaoAtiva[])
      }
    } catch (err) {
      console.error('[AnaliseUso] Falha ao carregar sessões ativas:', err)
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

  // Filtragem de Busca
  const filteredAtivas = useMemo(() => {
    if (!searchTerm.trim()) return sessoesAtivas
    const q = searchTerm.toLowerCase()
    return sessoesAtivas.filter(
      (s) =>
        s.funcionario_nome?.toLowerCase().includes(q) ||
        s.funcionario_cargo?.toLowerCase().includes(q) ||
        s.escola_nome?.toLowerCase().includes(q) ||
        s.current_pathname?.toLowerCase().includes(q)
    )
  }, [sessoesAtivas, searchTerm])

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

  // Métricas Totais
  const totalAoVivo = sessoesAtivas.length
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
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-sky-400" />
              Análise Avançada de Uso & Telemetria
            </h1>
            <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-xs font-semibold">
              ROOT / SUPERADMIN
            </Badge>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Monitoramento de comandos em tempo real, visualização de cliques, simulação de tela e histórico de uso dos servidores.
          </p>
        </div>

        <Button
          onClick={carregarTudo}
          disabled={loading}
          variant="outline"
          className="bg-neutral-900 border-neutral-800 text-white hover:bg-neutral-800 h-10 px-4 rounded-xl cursor-pointer"
        >
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin text-sky-400')} />
          Atualizar Dados
        </Button>
      </div>

      {/* KPI Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ao Vivo */}
        <Card className="p-4 bg-[#141417] border-neutral-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-neutral-400">Usuários Ao Vivo Agora</div>
            <div className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
              {totalAoVivo}
              {totalAoVivo > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 animate-pulse border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                  ONLINE
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Radio className="w-5 h-5 text-emerald-400" />
          </div>
        </Card>

        {/* Card 2: Latência Média */}
        <Card className="p-4 bg-[#141417] border-neutral-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-neutral-400">Latência Média da Rede</div>
            <div className="text-2xl font-bold text-white mt-1">
              {avgRttRede} <span className="text-sm font-normal text-neutral-400">ms</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-sky-400" />
          </div>
        </Card>

        {/* Card 3: Cliques Registrados */}
        <Card className="p-4 bg-[#141417] border-neutral-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-neutral-400">Cliques & Comandos Registrados</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">{totalCliquesHoje}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <MousePointer className="w-5 h-5 text-sky-400" />
          </div>
        </Card>

        {/* Card 4: Erros Capturados */}
        <Card className="p-4 bg-[#141417] border-neutral-800/80 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-neutral-400">Possíveis Falhas / Erros JS</div>
            <div className={cn('text-2xl font-bold mt-1', totalErrosHoje > 0 ? 'text-rose-400' : 'text-neutral-400')}>
              {totalErrosHoje}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
        </Card>
      </div>

      {/* Seletor de Abas & Barra de Busca */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('ao-vivo')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer',
              tab === 'ao-vivo'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            )}
          >
            <Radio className="w-4 h-4" />
            Sessões Ao Vivo ({sessoesAtivas.length})
            {sessoesAtivas.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('historico')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer',
              tab === 'historico'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            )}
          >
            <Clock className="w-4 h-4" />
            Gravações & Playback Histórico
          </button>
        </div>

        {/* Input de Busca */}
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar servidor, escola ou tela..."
              className="bg-neutral-900 border-neutral-800 text-white pl-9 h-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Conteúdo da Aba 1: Sessões Ao Vivo */}
      {tab === 'ao-vivo' && (
        <div className="space-y-4">
          {filteredAtivas.length === 0 ? (
            <Card className="p-12 text-center bg-[#141417] border-neutral-800/80 rounded-2xl">
              <Radio className="w-10 h-10 mx-auto text-neutral-600 mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-white">Nenhuma sessão com atividade ao vivo no momento</h3>
              <p className="text-sm text-neutral-400 mt-1 max-w-md mx-auto">
                Assim que qualquer servidor acessar qualquer tela do SIG, a sessão aparecerá aqui em tempo real com o indicador de transmissão ao vivo.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAtivas.map((s) => (
                <Card
                  key={s.session_id}
                  className="p-5 bg-[#141417] border-neutral-800/80 rounded-2xl hover:border-neutral-700 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-3">
                    {/* Header do Card com Indicador Ao Vivo */}
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        AO VIVO
                      </Badge>

                      <span className="text-xs text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(s.total_active_seconds_today)}
                      </span>
                    </div>

                    {/* Dados do Servidor */}
                    <div className="flex items-center gap-3">
                      {s.foto_url ? (
                        <img
                          src={s.foto_url}
                          alt={s.funcionario_nome}
                          className="w-11 h-11 rounded-xl object-cover border border-neutral-700"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sky-400">
                          {s.funcionario_nome?.slice(0, 2).toUpperCase() || 'US'}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">{s.funcionario_nome}</div>
                        <div className="text-xs text-neutral-400 truncate">{s.funcionario_cargo || 'Servidor'}</div>
                        <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1 mt-0.5">
                          <School className="w-3 h-3 shrink-0" />
                          {s.escola_nome || 'Rede Municipal'}
                        </div>
                      </div>
                    </div>

                    {/* Tela Atual Sendo Usada */}
                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 px-3 flex items-center gap-2 text-xs font-mono text-sky-300">
                      <Compass className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="truncate">{s.current_pathname || '/home'}</span>
                    </div>
                  </div>

                  {/* Botão de Espelhar Comandos Ao Vivo */}
                  <Button
                    onClick={() => handleAssistirAoVivo(s)}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl h-10 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-sky-600/20"
                  >
                    <Monitor className="w-4 h-4" />
                    Espelhar Comandos Ao Vivo
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo da Aba 2: Gravações & Playback Histórico */}
      {tab === 'historico' && (
        <div className="space-y-4">
          {/* Barra de Filtros de Período */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-[#141417] border border-neutral-800/80 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-300 font-semibold">Período:</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-neutral-400">De</span>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
                className="bg-neutral-900 border-neutral-800 text-white h-9 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Até</span>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
                className="bg-neutral-900 border-neutral-800 text-white h-9 rounded-lg text-xs"
              />
            </div>

            <Button
              size="sm"
              onClick={carregarSessoesGravadas}
              className="bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg h-9 cursor-pointer ml-auto"
            >
              Filtrar Gravações
            </Button>
          </div>

          {/* Tabela de Sessões Gravadas */}
          {filteredGravadas.length === 0 ? (
            <Card className="p-12 text-center bg-[#141417] border-neutral-800/80 rounded-2xl">
              <Clock className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
              <h3 className="text-base font-bold text-white">Nenhuma gravação histórica encontrada</h3>
              <p className="text-sm text-neutral-400 mt-1 max-w-md mx-auto">
                As sessões dos servidores são gravadas automaticamente para auditoria e você pode reproduzir os cliques e comandos de qualquer dia passado.
              </p>
            </Card>
          ) : (
            <div className="bg-[#141417] border border-neutral-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-[#18181d] border-b border-neutral-800 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
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
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredGravadas.map((g) => (
                      <tr key={g.session_id} className="hover:bg-neutral-900/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{g.funcionario_nome}</div>
                          <div className="text-[11px] text-neutral-400">{g.funcionario_cargo}</div>
                        </td>

                        <td className="py-3.5 px-4 text-neutral-400">
                          {g.escola_nome || 'Rede Municipal'}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-neutral-300">
                          {g.last_event_at ? new Date(g.last_event_at).toLocaleString('pt-BR') : '-'}
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          {formatDuration(g.duration_seconds)}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-xs">
                            {g.total_clicks || 0} cliques
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4">
                          {g.total_errors > 0 ? (
                            <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs">
                              {g.total_errors} erros
                            </Badge>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-sky-300 max-w-[160px] truncate">
                          {g.last_pathname || '/'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleAssistirPlayback(g)}
                            className="bg-neutral-800 hover:bg-sky-600 text-white font-semibold rounded-xl h-8 px-3 text-xs transition-colors cursor-pointer"
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
