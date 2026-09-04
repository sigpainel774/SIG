'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
      } catch (err) {
        console.warn('[AlphaSidebar] Falha ao ler cache local de módulos:', err)
      }

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

  // Garante que novos módulos apareçam na sidebar mesmo antes do sync no banco
  const funcoesExibidas = useMemo(() => {
    const list = [...funcoes]
    if (!list.some((f) => f.rota === '/alpha/flow-studio')) {
      list.push({
        id: 'flow-studio-local',
        codigo: 'flow-studio',
        nome: 'Alpha Flow Studio',
        descricao: 'Modelagem visual de processos escolares, organogramas e esteiras.',
        icone: 'GitFork',
        rota: '/alpha/flow-studio',
        ativo: true,
        ordem: 8,
      })
    }
    if (!list.some((f) => f.rota === '/alpha/carimbador-pdf')) {
      list.push({
        id: 'carimbador-pdf-local',
        codigo: 'carimbador_pdf',
        nome: 'Carimbador & Marca d’Água',
        descricao: 'Insira carimbos digitais, numeração e marcas d’água em lote.',
        icone: 'Stamp',
        rota: '/alpha/carimbador-pdf',
        ativo: true,
        ordem: 6,
      })
    }
    return list.sort((a, b) => a.ordem - b.ordem)
  }, [funcoes])

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
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-sidebar border border-sidebar-border text-sidebar-foreground shadow-md cursor-pointer"
        aria-label="Abrir Menu Alpha"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop Mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Container Principal da Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-72 bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 select-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ── Topo: Marca Alpha Lab ── */}
        <div className="p-4 border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center justify-between">
            <Link
              href="/alpha"
              className="flex items-center gap-3 group transition-transform hover:scale-[1.02]"
            >
              <div className="relative flex items-center justify-center">
                <AlphaLogoGraphic className="w-10 h-10 drop-shadow-xs" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-sidebar-foreground">
                    SIG ALPHA
                  </span>
                  <span className="bg-sidebar-primary text-[10px] font-black text-sidebar-primary-foreground px-1.5 py-0.5 rounded-sm uppercase tracking-wider shadow-xs">
                    LAB
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Ambiente Experimental
                </span>
              </div>
            </Link>
          </div>

          {/* Botão de Retorno ao Admin para Superadmin */}
          {isSuperAdmin && (
            <Link
              href="/admin/alpha"
              className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-sidebar-accent border border-sidebar-border hover:bg-sidebar-accent/80 text-sidebar-accent-foreground text-xs font-semibold transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Painel de Controle Alpha
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-sidebar-primary" />
            </Link>
          )}
        </div>

        {/* ── Meio: Navegação & Lista de Funções ── */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* Menu Principal */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/75 block mb-2">
              Principal
            </span>
            <Link
              href="/alpha"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 font-medium transition-all duration-200 text-sm',
                pathname === '/alpha'
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-2 border-sidebar-primary rounded-r-xl rounded-l-none shadow-xs'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-xl'
              )}
            >
              <LayoutDashboard className={cn("w-4 h-4", pathname === '/alpha' ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/70")} />
              <span>Visão Geral</span>
            </Link>
          </div>

          {/* Funções do Ecossistema Alpha */}
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/75">
                Funções Ativas ({funcoesExibidas.length})
              </span>
              <Sparkles className="w-3 h-3 text-sidebar-primary" />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-sidebar-primary" />
                Carregando funções...
              </div>
            ) : funcoesExibidas.length === 0 ? (
              <div className="px-3 py-4 text-center border border-dashed border-sidebar-border rounded-xl bg-sidebar-accent/30">
                <p className="text-xs text-muted-foreground">
                  Nenhuma função ativa no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {funcoesExibidas.map((fn) => {
                  const isActive = pathname.startsWith(fn.rota)
                  return (
                    <Link
                      key={fn.id}
                      href={fn.rota}
                      prefetch={true}
                      onClick={(e) => {
                        setMobileOpen(false)
                        if (typeof navigator !== 'undefined' && !navigator.onLine) {
                          e.preventDefault()
                          window.location.assign(fn.rota)
                        }
                      }}
                      className={cn(
                        'flex items-center justify-between px-4 py-2.5 font-medium transition-all duration-200 group text-sm',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-2 border-sidebar-primary rounded-r-xl rounded-l-none shadow-xs'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground rounded-xl'
                      )}
                      title={fn.descricao ?? fn.nome}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AlphaIcon
                          name={fn.icone}
                          className={cn(
                            'w-4 h-4 shrink-0 transition-colors',
                            isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'
                          )}
                        />
                        <span className="truncate text-xs">{fn.nome}</span>
                      </div>
                      <ChevronRight
                        className={cn(
                          'w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                          isActive && 'opacity-100 text-sidebar-accent-foreground'
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
        <div className="p-3 border-t border-sidebar-border bg-sidebar">
          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-sidebar-accent/50 border border-sidebar-border mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-sidebar-foreground truncate block">
                  {userNome}
                </span>
                <span className="bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-sm shrink-0">
                  {isSuperAdmin ? 'ROOT' : 'ALPHA'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{userCargo}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 active:scale-[0.98] text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-destructive" />
            ) : (
              <LogOut className="w-3.5 h-3.5 text-destructive" />
            )}
            <span>{isLoggingOut ? 'Saindo...' : 'Sair da Conta'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
