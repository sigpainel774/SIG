'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { StandardTable } from '@/components/ui/table'
import { CachedImage } from '@/components/ui/cached-image'
import { getAvatarUrl } from '@/lib/photoHelper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  BarChart3,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Search,
  School,
  Smartphone,
  Eye,
  Loader2,
  RefreshCw,
  BellRing,
} from 'lucide-react'

export interface TelemetriaData {
  comunicado_id: string
  titulo: string
  status: string
  scheduled_for: string | null
  disparado_em: string | null
  total_disparos: number
  total_entregues: number
  total_alvo: number
  total_lidos: number
  total_pendentes: number
  taxa_entrega: number
  taxa_leitura_ctr: number
  lidos: {
    usuario_id: string
    auth_user_id: string
    nome: string
    cargo: string | null
    foto_url: string | null
    foto_avatar_path: string | null
    escola_nome: string
    lido_em: string
  }[]
  pendentes: {
    usuario_id: string
    auth_user_id: string
    nome: string
    cargo: string | null
    foto_url: string | null
    foto_avatar_path: string | null
    escola_nome: string
    tem_push_ativo: boolean
  }[]
}

interface ModalTelemetriaComunicadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comunicadoId: string | null
  comunicadoTitulo?: string
}

export function ModalTelemetriaComunicado({
  open,
  onOpenChange,
  comunicadoId,
  comunicadoTitulo,
}: ModalTelemetriaComunicadoProps) {
  const [data, setData] = useState<TelemetriaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'lidos' | 'pendentes'>('lidos')
  const [busca, setBusca] = useState('')
  const [notificando, setNotificando] = useState(false)
  const isMountedRef = useRef(true)

  const fetchTelemetria = async () => {
    if (!comunicadoId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: resData, error } = await (supabase as any).rpc('obter_telemetria_comunicado', {
        p_comunicado_id: comunicadoId,
      })

      if (error) {
        toast.error('Erro ao carregar telemetria do comunicado: ' + error.message)
      } else if (resData && !resData.erro && isMountedRef.current) {
        setData(resData as TelemetriaData)
      }
    } catch (err: any) {
      console.error('[ModalTelemetria] Erro ao buscar dados:', err)
      toast.error('Falha ao obter telemetria do comunicado.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    if (open && comunicadoId) {
      fetchTelemetria()
    }
    return () => {
      isMountedRef.current = false
    }
  }, [open, comunicadoId])

  const lidosFiltrados = useMemo(() => {
    if (!data?.lidos) return []
    if (!busca.trim()) return data.lidos
    const term = busca.toLowerCase()
    return data.lidos.filter(
      (u) =>
        u.nome.toLowerCase().includes(term) ||
        (u.cargo ?? '').toLowerCase().includes(term) ||
        (u.escola_nome ?? '').toLowerCase().includes(term)
    )
  }, [data?.lidos, busca])

  const pendentesFiltrados = useMemo(() => {
    if (!data?.pendentes) return []
    if (!busca.trim()) return data.pendentes
    const term = busca.toLowerCase()
    return data.pendentes.filter(
      (u) =>
        u.nome.toLowerCase().includes(term) ||
        (u.cargo ?? '').toLowerCase().includes(term) ||
        (u.escola_nome ?? '').toLowerCase().includes(term)
    )
  }, [data?.pendentes, busca])

  const handleCobrarLeitura = async (alvosAuthUserIds: string[]) => {
    if (!comunicadoId || alvosAuthUserIds.length === 0) return

    setNotificando(true)
    try {
      const res = await fetch('/api/comunicados/notify-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comunicadoId,
          authUserIds: alvosAuthUserIds,
        }),
      })

      const json = await res.json()
      if (json.ok) {
        if (json.sent > 0) {
          toast.success(`Lembrete push enviado com sucesso para ${json.sent} dispositivo(s)!`)
        } else {
          toast.info('Lembrete registrado (nenhum dispositivo push ativo nos usuários selecionados).')
        }
      } else {
        toast.error('Erro ao disparar lembrete: ' + (json.error || 'Falha no servidor'))
      }
    } catch (err: any) {
      toast.error('Falha ao solicitar cobrança de leitura.')
      console.error(err)
    } finally {
      if (isMountedRef.current) setNotificando(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Métricas & Telemetria de Leitura"
      description={comunicadoTitulo || data?.titulo || 'Acompanhamento nominal de engajamento do comunicado'}
      maxWidth="sm:max-w-4xl"
    >
      <div className="space-y-5">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-highlight" />
            <span className="text-sm">Consolidando dados nominais e telemetria...</span>
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-muted-foreground">
            Não foi possível carregar as informações deste comunicado.
          </div>
        ) : (
          <>
            {/* Top KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Destinatários Alvo */}
              <div className="p-3.5 rounded-xl border border-borderCustom bg-input/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Destinatários Alvo</span>
                  <Users className="w-4 h-4 text-highlight" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-foreground">{data.total_alvo}</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">Servidores elegíveis</span>
                </div>
              </div>

              {/* 2. Disparos & Entregas Push */}
              <div className="p-3.5 rounded-xl border border-borderCustom bg-input/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Entrega Push</span>
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-400">{data.taxa_entrega}%</span>
                    <span className="text-xs text-muted-foreground font-medium">({data.total_entregues}/{data.total_disparos})</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">Dispositivos notificados</span>
                </div>
              </div>

              {/* 3. Taxa de Leitura / CTR */}
              <div className="p-3.5 rounded-xl border border-borderCustom bg-input/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Taxa de Abertura (CTR)</span>
                  <Eye className="w-4 h-4 text-sky-400" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-sky-400">{data.taxa_leitura_ctr}%</span>
                    <span className="text-xs text-muted-foreground font-medium">({data.total_lidos} lidos)</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">Confirmação de visualização</span>
                </div>
              </div>

              {/* 4. Pendentes */}
              <div className="p-3.5 rounded-xl border border-borderCustom bg-input/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs font-semibold uppercase tracking-wider">Pendentes</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-amber-400">{data.total_pendentes}</span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">Aguardando leitura</span>
                </div>
              </div>
            </div>

            {/* Status & Metadados do Comunicado */}
            <div className="p-3 rounded-xl border border-borderCustom/80 bg-surface-2/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-foreground">Status do Comunicado:</span>
                {data.status === 'agendado' ? (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    <Clock className="w-3.5 h-3.5" />
                    Agendado para {data.scheduled_for ? new Date(data.scheduled_for).toLocaleString('pt-BR') : 'Horário futuro'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Publicado {data.disparado_em ? `em ${new Date(data.disparado_em).toLocaleString('pt-BR')}` : ''}
                  </span>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={fetchTelemetria}
                className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar</span>
              </Button>
            </div>

            {/* Tabs & Search Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              {/* Tabs */}
              <div className="flex items-center p-1 bg-input/60 border border-borderCustom rounded-xl w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('lidos')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'lidos'
                      ? 'bg-highlight/20 text-highlight border border-highlight/30 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmaram Leitura ({data.total_lidos})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pendentes')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'pendentes'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pendentes ({data.total_pendentes})</span>
                </button>
              </div>

              {/* Search & Batch Action */}
              <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nome, cargo ou escola..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="h-9 pl-9 text-xs bg-input border-borderCustom text-foreground"
                  />
                </div>

                {activeTab === 'pendentes' && data.total_pendentes > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={notificando}
                    onClick={() => {
                      const ids = data.pendentes.map((p) => p.auth_user_id).filter(Boolean)
                      handleCobrarLeitura(ids)
                    }}
                    className="h-9 text-xs bg-amber-500 hover:bg-amber-400 text-black font-extrabold cursor-pointer shrink-0 gap-1.5 shadow-sm"
                  >
                    {notificando ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BellRing className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Cobrar Todos</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Nominal List Table Container */}
            <div className="border border-borderCustom rounded-xl overflow-hidden bg-input/20 max-h-[380px] overflow-y-auto">
              {activeTab === 'lidos' ? (
                lidosFiltrados.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    {busca ? 'Nenhum servidor encontrado para este filtro.' : 'Nenhuma confirmação de leitura registrada até o momento.'}
                  </div>
                ) : (
                  <StandardTable
                    columns={[
                      {
                        header: 'Servidor',
                        accessor: (u: any) => (
                          <div className="flex items-center gap-2.5 py-1">
                            <CachedImage
                              src={getAvatarUrl({ foto_url: u.foto_url, foto_avatar_path: u.foto_avatar_path })}
                              alt={u.nome}
                              className="w-8 h-8 rounded-full object-cover border border-borderCustom shrink-0 bg-surface-2"
                              fallback={
                                <div className="w-8 h-8 rounded-full bg-highlight/10 text-highlight font-bold text-xs flex items-center justify-center border border-highlight/20 shrink-0">
                                  {u.nome.slice(0, 2).toUpperCase()}
                                </div>
                              }
                            />
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-foreground block truncate">
                                {u.nome}
                              </span>
                              <span className="text-[11px] text-muted-foreground block truncate">
                                {u.cargo ?? 'Servidor Municipal'}
                              </span>
                            </div>
                          </div>
                        ),
                      },
                      {
                        header: 'Lotação / Escola',
                        accessor: (u: any) => (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <School className="w-3.5 h-3.5 shrink-0 text-highlight" />
                            <span className="truncate max-w-[180px]">{u.escola_nome}</span>
                          </div>
                        ),
                      },
                      {
                        header: 'Data / Hora da Leitura',
                        accessor: (u: any) => (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              {u.lido_em ? new Date(u.lido_em).toLocaleString('pt-BR') : 'Confirmado'}
                            </span>
                          </div>
                        ),
                      },
                    ]}
                    data={lidosFiltrados}
                  />
                )
              ) : pendentesFiltrados.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {busca ? 'Nenhum servidor pendente encontrado para este filtro.' : '🎉 Todos os servidores elegíveis já confirmaram a leitura deste comunicado!'}
                </div>
              ) : (
                <StandardTable
                  columns={[
                    {
                      header: 'Servidor Pendente',
                      accessor: (u: any) => (
                        <div className="flex items-center gap-2.5 py-1">
                          <CachedImage
                            src={getAvatarUrl({ foto_url: u.foto_url, foto_avatar_path: u.foto_avatar_path })}
                            alt={u.nome}
                            className="w-8 h-8 rounded-full object-cover border border-borderCustom shrink-0 bg-surface-2 opacity-80"
                            fallback={
                              <div className="w-8 h-8 rounded-full bg-surface-3 text-muted-foreground font-bold text-xs flex items-center justify-center border border-borderCustom shrink-0">
                                {u.nome.slice(0, 2).toUpperCase()}
                              </div>
                            }
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-foreground block truncate">
                              {u.nome}
                            </span>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {u.cargo ?? 'Servidor Municipal'}
                            </span>
                          </div>
                        </div>
                      ),
                    },
                    {
                      header: 'Lotação / Escola',
                      accessor: (u: any) => (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <School className="w-3.5 h-3.5 shrink-0 text-amber-400/80" />
                          <span className="truncate max-w-[180px]">{u.escola_nome}</span>
                        </div>
                      ),
                    },
                    {
                      header: 'Dispositivo Push',
                      accessor: (u: any) => (
                        <div className="flex items-center gap-1.5 text-xs">
                          {u.tem_push_ativo ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              <Smartphone className="w-3 h-3" />
                              Ativo no Celular
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-input px-2 py-0.5 rounded-md border border-borderCustom">
                              Sem Push
                            </span>
                          )}
                        </div>
                      ),
                    },
                    {
                      header: 'Ação',
                      accessor: (u: any) => (
                        <div className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={notificando || !u.auth_user_id}
                            onClick={() => handleCobrarLeitura([u.auth_user_id])}
                            className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                          >
                            <BellRing className="w-3 h-3 mr-1" />
                            Cobrar
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                  data={pendentesFiltrados}
                />
              )}
            </div>
          </>
        )}
      </div>
    </StandardDialog>
  )
}
