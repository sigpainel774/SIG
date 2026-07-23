'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  LogOut,
  RefreshCw,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabaseClient'
import { parseUserAgent } from '@/lib/parseUserAgent'
import { toast } from 'sonner'

interface ActiveSession {
  id: string
  created_at: string
  refreshed_at: string | null
  user_agent: string | null
  ip: string | null
}

function getSessionIdFromJwt(accessToken: string): string | null {
  try {
    const base64Url = accessToken.split('.')[1]
    if (!base64Url) return null
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const parsed = JSON.parse(jsonPayload)
    return parsed.session_id ?? null
  } catch (err) {
    console.error('Erro ao extrair session_id do JWT:', err)
    return null
  }
}

export function SessoesAtivasTab() {
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [revokingAll, setRevokingAll] = useState(false)

  const supabase = createClient()

  const fetchActiveSessions = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // 1. Pega sessão local atual e decodifica o session_id do JWT
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.access_token) {
        const decodedSessionId = getSessionIdFromJwt(session.access_token)
        setCurrentSessionId(decodedSessionId)
      }

      // 2. Chama RPC para listar sessões do usuário
      const { data, error } = await (supabase.rpc as any)('get_my_active_sessions')

      if (error) {
        console.error('Erro RPC get_my_active_sessions:', error)
        toast.error('Não foi possível carregar suas sessões ativas.')
        return
      }

      setSessions((data as ActiveSession[]) || [])
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao buscar conexões ativas.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchActiveSessions()
  }, [fetchActiveSessions])

  const handleRevokeSingle = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      const confirmAction = window.confirm(
        'Você está prestes a encerrar a sessão DESTE dispositivo. Você precisará fazer login novamente. Continuar?'
      )
      if (!confirmAction) return
    }

    setRevokingId(sessionId)

    try {
      const { data, error } = await (supabase.rpc as any)('revoke_my_session', {
        target_session_id: sessionId,
      })

      if (error) {
        toast.error(`Erro ao encerrar sessão: ${error.message}`)
        return
      }

      if (data) {
        toast.success('Sessão encerrada com sucesso!')

        if (isCurrent) {
          await supabase.auth.signOut()
          window.location.href = '/login'
          return
        }

        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } else {
        toast.error('Sessão não encontrada ou já expirou.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Erro inesperado ao revogar a sessão.')
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeAllOthers = async () => {
    if (!currentSessionId) {
      toast.error('Não foi possível identificar com segurança a sessão do dispositivo atual.')
      return
    }

    const otherSessionsCount = sessions.filter((s) => s.id !== currentSessionId).length
    if (otherSessionsCount === 0) {
      toast.info('Não há outras sessões ativas no momento.')
      return
    }

    const confirmAction = window.confirm(
      `Tem certeza que deseja desconectar ${otherSessionsCount} outra(s) sessão(ões) ativa(s)?`
    )
    if (!confirmAction) return

    setRevokingAll(true)

    try {
      const { data, error } = await (supabase.rpc as any)('revoke_all_other_sessions', {
        current_session_id: currentSessionId,
      })

      if (error) {
        toast.error(`Erro ao encerrar outras sessões: ${error.message}`)
        return
      }

      toast.success(`${data ?? otherSessionsCount} outra(s) sessão(ões) encerrada(s) com sucesso!`)
      setSessions((prev) => prev.filter((s) => s.id === currentSessionId))
    } catch (err: any) {
      console.error(err)
      toast.error('Erro inesperado ao revogar sessões.')
    } finally {
      setRevokingAll(false)
    }
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Não registrada'
    try {
      const d = new Date(dateStr)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    } catch {
      return dateStr
    }
  }

  const otherSessionsCount = sessions.filter((s) => s.id !== currentSessionId).length

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Header com resumo e ações em lote */}
      <Card className="border-borderCustom bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foregroundCustom">
              <ShieldCheck className="h-5 w-5 text-[#185FA5] dark:text-[#3ea6ff]" />
              Sessões &amp; Dispositivos Conectados
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Abaixo estão listados todos os dispositivos e navegadores que possuem acesso ativo com a sua conta no momento.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchActiveSessions(true)}
              disabled={loading || refreshing}
              className="border-borderCustom text-foregroundCustom hover:bg-hoverCustom"
            >
              <RefreshCw className={cn('h-4 w-4 mr-1.5', refreshing ? 'animate-spin' : '')} />
              Atualizar
            </Button>

            {otherSessionsCount > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRevokeAllOthers}
                disabled={loading || revokingAll || !currentSessionId}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                {revokingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Encerrando...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-1.5" />
                    Encerrar Outras ({otherSessionsCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Alerta de Segurança */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
        <div className="text-xs leading-5">
          <span className="font-semibold text-sm block mb-0.5">Reconhece todas as conexões?</span>
          Se você visualizar algum dispositivo ou localização desconhecida na lista abaixo, clique em{' '}
          <strong className="font-semibold">Encerrar Sessão</strong> imediatamente e altere sua senha de acesso na aba &quot;Meu Perfil&quot;.
        </div>
      </div>

      {/* Lista de Sessões */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((idx) => (
              <Card key={idx} className="border-borderCustom bg-card p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="w-48 h-4 rounded bg-muted" />
                    <div className="w-32 h-3 rounded bg-muted" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-borderCustom bg-card p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold text-foregroundCustom">Nenhuma sessão encontrada</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Não foi possível listar as conexões ativas. Tente atualizar a página.
            </p>
          </Card>
        ) : (
          sessions.map((sess) => {
            const isCurrent = sess.id === currentSessionId
            const uaInfo = parseUserAgent(sess.user_agent)

            return (
              <Card
                key={sess.id}
                className={cn(
                  'border transition-all p-5 bg-card',
                  isCurrent
                    ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 bg-emerald-950/10'
                    : 'border-borderCustom hover:border-borderCustom/80'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Ícone e dados do dispositivo */}
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'p-3 rounded-xl shrink-0 flex items-center justify-center',
                        isCurrent
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {uaInfo.deviceType === 'mobile' ? (
                        <Smartphone className="h-6 w-6" />
                      ) : uaInfo.deviceType === 'tablet' ? (
                        <Tablet className="h-6 w-6" />
                      ) : uaInfo.deviceType === 'desktop' ? (
                        <Laptop className="h-6 w-6" />
                      ) : (
                        <Globe className="h-6 w-6" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foregroundCustom text-base">
                          {uaInfo.browser} &bull; {uaInfo.os}
                        </h3>

                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Este Dispositivo
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                          IP: <code className="font-mono text-foregroundCustom/80">{sess.ip || 'Oculto'}</code>
                        </span>

                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                          Última Atividade: {formatDateTime(sess.refreshed_at || sess.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botão de revogação */}
                  <div className="sm:self-center shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSingle(sess.id, isCurrent)}
                      disabled={revokingId === sess.id}
                      className={cn(
                        'w-full sm:w-auto font-medium cursor-pointer',
                        isCurrent
                          ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                          : 'text-red-500 hover:text-red-600 hover:bg-red-500/10'
                      )}
                    >
                      {revokingId === sess.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          Encerrando...
                        </>
                      ) : (
                        <>
                          <LogOut className="h-4 w-4 mr-1.5" />
                          {isCurrent ? 'Sair Deste Dispositivo' : 'Encerrar Sessão'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
