'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { usePermissionSimulationStore } from '@/store/usePermissionSimulationStore'
import { toast } from 'sonner'

interface TimeoutRule {
  id: string
  nome: string
  horarios: string[]
  dias_semana: number[] | null
  tolerancia_minutos: number
  escopo: string
}

const BROADCAST_CHANNEL_NAME = 'sig_session_timeout_sync'

export function SessionTimeoutWatcher() {
  const router = useRouter()
  const supabase = createClient()
  const { funcionario, logout } = useAuthStore()
  const { isSimulating } = usePermissionSimulationStore()

  const [rules, setRules] = useState<TimeoutRule[]>([])
  const warnedSlotsRef = useRef<Set<string>>(new Set()) // guarda slots "HH:MM-dia" já avisados
  const loggedOutRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(true)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  // 1. Carregar regras aplicáveis ao usuário logado
  const fetchRules = useCallback(async () => {
    if (!funcionario?.id) return
    if (funcionario?.is_superadmin || isSimulating) {
      setRules([])
      return
    }

    try {
      const { data, error } = await supabase.rpc('get_session_timeout_rules_for_user')
      if (error) {
        console.error('Erro ao consultar regras de tempo de sessão:', error)
        return
      }
      if (isMountedRef.current) {
        setRules((data as unknown as TimeoutRule[]) ?? [])
      }
    } catch (err) {
      console.error('Falha inesperada ao carregar regras de sessão:', err)
    }
  }, [funcionario?.id, funcionario?.is_superadmin, isSimulating, supabase])

  // Efeito para sincronização e Realtime
  useEffect(() => {
    isMountedRef.current = true

    fetchRules()

    // Configurar BroadcastChannel para comunicação multi-abas
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
        broadcastChannelRef.current = bc

        bc.onmessage = async (event) => {
          if (event.data?.type === 'FORCE_LOGOUT') {
            if (!loggedOutRef.current) {
              loggedOutRef.current = true
              toast.error(event.data?.message ?? 'Sessão encerrada por política de segurança de horário.')
              await logout(supabase)
              router.push('/login?reason=session_timeout')
            }
          } else if (event.data?.type === 'RULES_UPDATED') {
            fetchRules()
          }
        }
      } catch (e) {
        console.warn('BroadcastChannel não suportado neste navegador:', e)
      }
    }

    // Escuta Realtime na tabela de regras
    const channel = supabase
      .channel('realtime_session_timeout_rules')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_timeout_rules',
        },
        () => {
          fetchRules()
        }
      )
      .subscribe()

    return () => {
      isMountedRef.current = false
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close()
      }
      supabase.removeChannel(channel)
    }
  }, [fetchRules, logout, router, supabase])

  // Executar encerramento compulsório
  const triggerLogout = useCallback(
    async (ruleName: string, horario: string) => {
      if (loggedOutRef.current) return
      loggedOutRef.current = true

      const msg = `Sessão encerrada às ${horario} (${ruleName}) para proteção do posto de trabalho.`
      toast.error(msg, { duration: 6000 })

      // Notifica outras abas
      try {
        broadcastChannelRef.current?.postMessage({
          type: 'FORCE_LOGOUT',
          message: msg,
        })
      } catch {
        // ignora erro de broadcast
      }

      await logout(supabase)
      router.push('/login?reason=session_timeout')
    },
    [logout, router, supabase]
  )

  // 2. Avaliador de horários e tolerância
  const evaluateTimeouts = useCallback(() => {
    if (!rules.length || loggedOutRef.current) return
    if (funcionario?.is_superadmin || isSimulating) return

    const now = new Date()
    const currentDay = now.getDay() // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const currentHours = now.getHours()
    const currentMinutes = now.getMinutes()
    const currentTotalMinutes = currentHours * 60 + currentMinutes

    for (const rule of rules) {
      // Checar se o dia da semana é atendido (se dias_semana for vazio ou null, aplica todos os dias)
      if (rule.dias_semana && rule.dias_semana.length > 0) {
        if (!rule.dias_semana.includes(currentDay)) {
          continue
        }
      }

      const tolerance = Number(rule.tolerancia_minutos) || 5

      for (const rawHorario of rule.horarios || []) {
        const parts = rawHorario.split(':')
        if (parts.length !== 2) continue

        const ruleHours = parseInt(parts[0], 10)
        const ruleMinutes = parseInt(parts[1], 10)
        if (isNaN(ruleHours) || isNaN(ruleMinutes)) continue

        const targetTotalMinutes = ruleHours * 60 + ruleMinutes
        const minutesDiff = currentTotalMinutes - targetTotalMinutes

        // Slot identificador único no dia: "12:00-dia3-regraId"
        const slotKey = `${rawHorario}-${currentDay}-${rule.id}`

        // A) Aviso Prévio: 5 minutos antes até 1 minuto antes
        if (minutesDiff >= -5 && minutesDiff < 0) {
          if (!warnedSlotsRef.current.has(slotKey)) {
            warnedSlotsRef.current.add(slotKey)
            const faltam = Math.abs(minutesDiff)
            toast.warning(
              `Atenção: Sua sessão será encerrada em ${faltam} minuto(s) (às ${rawHorario}) por política de segurança de horário da rede. Salve suas alterações pendentes!`,
              { duration: 10000 }
            )
          }
        }

        // B) Logoff compulsório: Se atingiu o horário alvo dentro da janela de tolerância [0, tolerance]
        if (minutesDiff >= 0 && minutesDiff <= tolerance) {
          triggerLogout(rule.nome, rawHorario)
          return
        }
      }
    }
  }, [rules, funcionario?.is_superadmin, isSimulating, triggerLogout])

  // 3. Loop periódico + listeners de despertar de aba
  useEffect(() => {
    if (!rules.length) return

    // Avaliação imediata
    evaluateTimeouts()

    // Loop a cada 15 segundos
    const interval = setInterval(() => {
      evaluateTimeouts()
    }, 15000)

    // Listener para quando o usuário reativar ou focar a aba suspensa
    const handleWakeup = () => {
      evaluateTimeouts()
    }

    document.addEventListener('visibilitychange', handleWakeup)
    window.addEventListener('focus', handleWakeup)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleWakeup)
      window.removeEventListener('focus', handleWakeup)
    }
  }, [rules, evaluateTimeouts])

  // Componente sem renderização visual direta (background watcher)
  return null
}
