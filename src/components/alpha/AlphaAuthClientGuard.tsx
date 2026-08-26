'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { visitasOfflineService } from '@/lib/visitas/visitasOfflineService'
import { salvarCacheModulosAlpha } from '@/lib/alphaOfflineManager'
import { Loader2 } from 'lucide-react'

interface AlphaAuthClientGuardProps {
  children: React.ReactNode
  initialFuncionarioId?: string | null
}

export function AlphaAuthClientGuard({ children, initialFuncionarioId }: AlphaAuthClientGuardProps) {
  const router = useRouter()
  const supabase = createClient()
  const { funcionario } = useAuthStore()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkAuthAndPreWarm() {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
      const state = useAuthStore.getState()
      const currentFunc = state.funcionario

      // 1. Se já tiver usuário autenticado na store (via SSR ou persist)
      if (currentFunc?.id || initialFuncionarioId) {
        if (isMounted) {
          setCheckingAuth(false)
        }
      } else {
        // 2. Se a store ainda estiver vazia, tenta recuperar a sessão do Supabase localmente
        try {
          const { data: { session } } = await supabase.auth.getSession()

          if (!session) {
            // Se estiver online e sem sessão, redireciona para login
            if (isOnline) {
              router.replace('/alpha/login')
              return
            } else {
              // Se estiver offline e sem usuário, verifica se há token no LocalStorage
              const hasSbToken = typeof window !== 'undefined' && Object.keys(localStorage).some(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
              if (!hasSbToken && !currentFunc) {
                router.replace('/alpha/login')
                return
              }
            }
          }
        } catch (err) {
          console.warn('Verificação de sessão offline:', err)
        }

        if (isMounted) {
          setCheckingAuth(false)
        }
      }

      // 3. Pre-warming em segundo plano quando conectado
      if (isOnline) {
        try {
          // Pre-carrega bundles JS/RSC das rotas do Alpha no cache do Next.js
          router.prefetch('/alpha/visitas')
          router.prefetch('/alpha/rotas-escolas')
          router.prefetch('/alpha')

          // Pre-carrega módulos ativos da sidebar
          const { data: funcoes } = await supabase
            .from('alpha_funcoes')
            .select('*')
            .eq('ativo', true)
            .order('ordem', { ascending: true })

          if (funcoes) {
            await salvarCacheModulosAlpha(funcoes)
          }

          // Pre-carrega dados do módulo de visitas em paralelo silenciosamente
          const [resAreas, resPontos, resVeiculos, resRoteiros] = await Promise.all([
            (supabase as any).from('visitas_areas').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
            (supabase as any).from('visitas_pontos').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
            (supabase as any).from('visitas_veiculos').select('*').is('deleted_at', null).order('nome', { ascending: true }),
            (supabase as any).from('visitas_roteiros').select('*').is('deleted_at', null).order('data_planejada', { ascending: false }),
          ])

          if (resAreas.data) await visitasOfflineService.setAreas(resAreas.data)
          if (resPontos.data) await visitasOfflineService.setPontos(resPontos.data)
          if (resVeiculos.data) await visitasOfflineService.setVeiculos(resVeiculos.data)
          if (resRoteiros.data) await visitasOfflineService.setRoteiros(resRoteiros.data)
        } catch (preWarmErr) {
          console.warn('Pre-warming em background:', preWarmErr)
        }
      }
    }

    checkAuthAndPreWarm()

    return () => {
      isMounted = false
    }
  }, [supabase, router, initialFuncionarioId])

  if (checkingAuth && !funcionario?.id && !initialFuncionarioId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f3f4f7] text-[#1a1a1a] p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sidebar-primary" />
          <p className="text-xs font-semibold text-muted-foreground">Iniciando Sistema Alpha...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
