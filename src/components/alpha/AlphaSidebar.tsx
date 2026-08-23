'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import {
  FlaskConical,
  LogOut,
  LayoutDashboard,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Loader2,
  RefreshCw,
  ArrowLeft,
  X,
  Menu,
} from 'lucide-react'
import { AlphaIcon, AlphaLogoGraphic } from './AlphaIcon'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

import {
  salvarCacheModulosAlpha,
  obterCacheModulosAlpha,
} from '@/lib/alphaOfflineManager'

export interface AlphaFuncao {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  icone: string
  rota: string
  ativo: boolean
  ordem: number
}

export function AlphaSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { funcionario, logout } = useAuthStore()

  const [funcoes, setFuncoes] = useState<AlphaFuncao[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isSuperAdmin = funcionario?.is_superadmin === true

  useEffect(() => {
    let isMounted = true

    async function loadFuncoes() {
      // 1. Tenta carregar do cache local primeiro (instantâneo)
      try {
        const cached = await obterCacheModulosAlpha()
        if (isMounted && cached && cached.length > 0) {
          setFuncoes(cached)
          setLoading(false)
        }
      } catch {}

      // 2. Se estiver online, busca a versão mais recente do Supabase e atualiza o cache
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('alpha_funcoes')
            .select('*')
            .eq('ativo', true)
            .order('ordem', { ascending: true })

          if (error) throw error
          if (isMounted && data) {
            setFuncoes(data)
            await salvarCacheModulosAlpha(data)
          }
        } catch (err) {
          console.warn('Falha de rede ao atualizar funções da sidebar Alpha, mantendo cache:', err)
        } finally {
          if (isMounted) setLoading(false)
        }
      } else {
        if (isMounted) setLoading(false)
      }
    }

    loadFuncoes()

    return () => {
      isMounted = false
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    toast.success('Sessão encerrada com sucesso!')
    await logout(supabase, '/alpha/login')
  }

  const userNome = funcionario?.nome ?? 'Operador Alpha'
  const userCargo = funcionario?.cargo ?? (isSuperAdmin ? 'Administrador ROOT' : 'Operador')
  const userEmail = funcionario?.email ?? ''

  return (
    <>
      {/* Botão de Toggle Mobile */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-[#0c1427] border border-blue-900/40 text-white shadow-lg cursor-pointer"
        aria-label="Abrir Menu Alpha"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Container Principal da Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-[#0c1427]/95 backdrop-blur-xl border-r border-blue-900/40 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ── Topo: Marca Alpha Lab ── */}
        <div className="p-4 border-b border-blue-900/40 bg-[#080d1b]/40">
          <div className="flex items-center justify-between">
            <Link
              href="/alpha"
              className="flex items-center gap-3 group transition-transform hover:scale-[1.02]"
            >
              <div className="relative flex items-center justify-center">
                <AlphaLogoGraphic className="w-10 h-10 drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg tracking-tight text-white">
                    SIG ALPHA
                  </span>
                  <span className="bg-[#1d63d6] text-[10px] font-black text-white px-1.5 py-0.5 rounded-sm uppercase tracking-wider shadow-xs shadow-blue-500/30">
                    LAB
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Ambiente Experimental
                </span>
              </div>
            </Link>
          </div>

          {/* Botão de Retorno ao Admin para Superadmin */}
          {isSuperAdmin && (
            <Link
              href="/admin/alpha"
              className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Painel de Controle Alpha
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            </Link>
          )}
        </div>

        {/* ── Meio: Navegação & Lista de Funções ── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Menu Principal */}
          <div>
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400/80 block mb-2">
              Principal
            </span>
            <Link
              href="/alpha"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group',
                pathname === '/alpha'
                  ? 'bg-[#1d63d6] text-white shadow-lg shadow-blue-600/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-blue-950/40'
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Visão Geral</span>
            </Link>
          </div>

          {/* Funções do Ecossistema Alpha */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400/80">
                Funções Ativas ({funcoes.length})
              </span>
              <Sparkles className="w-3 h-3 text-blue-400" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                Carregando funções...
              </div>
            ) : funcoes.length === 0 ? (
              <div className="px-3 py-4 text-center border border-dashed border-blue-900/40 rounded-xl bg-blue-950/10">
                <p className="text-xs text-slate-400">
                  Nenhuma função ativa no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {funcoes.map((fn) => {
                  const isActive = pathname.startsWith(fn.rota)
                  return (
                    <Link
                      key={fn.id}
                      href={fn.rota}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group',
                        isActive
                          ? 'bg-linear-to-r from-[#1d63d6] to-[#2563eb] text-white shadow-lg shadow-blue-600/30 font-bold'
                          : 'text-slate-400 hover:text-white hover:bg-blue-950/40'
                      )}
                      title={fn.descricao ?? fn.nome}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AlphaIcon
                          name={fn.icone}
                          className={cn(
                            'w-4 h-4 shrink-0 transition-colors',
                            isActive ? 'text-white' : 'text-blue-400 group-hover:text-blue-300'
                          )}
                        />
                        <span className="truncate text-xs font-medium">{fn.nome}</span>
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                          isActive && 'opacity-100 text-white'
                        )}
                      />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Base: Perfil do Operador & Logout ── */}
        <div className="p-3 border-t border-blue-900/40 bg-[#080d1b]/60">
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#0d162a] border border-blue-900/50 mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate block">
                  {userNome}
                </span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-sm shrink-0">
                  {isSuperAdmin ? 'ROOT' : 'ALPHA'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{userCargo}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>{isLoggingOut ? 'Saindo...' : 'Sair da Conta'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
