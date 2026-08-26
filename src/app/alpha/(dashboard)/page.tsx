'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import {
  Sparkles,
  ArrowRight,
  Layers,
  Loader2,
  CheckCircle2,
  Search,
  X,
  MapPinned,
  Route,
  FileImage,
  ArrowLeftRight,
  Files,
  Stamp,
  Table,
  CheckSquare,
  Flame,
  Zap,
} from 'lucide-react'
import { AlphaIcon } from '@/components/alpha/AlphaIcon'
import { AlphaFuncao } from '@/components/alpha/AlphaSidebar'
import {
  salvarCacheModulosAlpha,
  obterCacheModulosAlpha,
} from '@/lib/alphaOfflineManager'
import { cn } from '@/lib/utils'

type CategoriaFiltro = 'todos' | 'geo' | 'pdf' | 'imagens' | 'produtividade'

export default function AlphaDashboardPage() {
  const supabase = createClient()

  const [funcoes, setFuncoes] = useState<AlphaFuncao[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<CategoriaFiltro>('todos')

  useEffect(() => {
    let isMounted = true

    async function loadFuncoes() {
      // 1. Carrega do cache local IndexedDB primeiro (instantâneo e offline-safe)
      try {
        const cached = await obterCacheModulosAlpha()
        if (isMounted && cached && cached.length > 0) {
          setFuncoes(cached)
          setLoading(false)
        }
      } catch {}

      // 2. Se online, sincroniza com o Supabase e atualiza o cache
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
          console.warn('Falha de rede ao carregar catálogo Alpha, mantendo cache:', err)
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

  // Classificação de categorias por código
  const categorizarFuncao = (codigo: string): CategoriaFiltro => {
    const c = codigo.toLowerCase()
    if (c.includes('visitas') || c.includes('rotas') || c.includes('geo')) return 'geo'
    if (c.includes('pdf') || c.includes('docx') || c.includes('carimbador')) return 'pdf'
    if (c.includes('imagem') || c.includes('compressor') || c.includes('conversor-imagem')) return 'imagens'
    return 'produtividade'
  }

  // Filtragem combinada por busca e categoria
  const funcoesFiltradas = useMemo(() => {
    return funcoes.filter((fn) => {
      const matchBusca =
        busca.trim() === '' ||
        fn.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (fn.descricao && fn.descricao.toLowerCase().includes(busca.toLowerCase())) ||
        fn.codigo.toLowerCase().includes(busca.toLowerCase())

      if (!matchBusca) return false

      if (categoriaAtiva === 'todos') return true
      return categorizarFuncao(fn.codigo) === categoriaAtiva
    })
  }, [funcoes, busca, categoriaAtiva])

  // Grade de Atalhos Rápidos no Topo (apenas módulos que estejam ativos no banco/cache)
  const quickShortcuts = useMemo(() => {
    const templates = [
      { label: 'Visitas.', href: '/alpha/visitas', icon: MapPinned, color: 'from-violet-600 to-indigo-600', code: 'visitas' },
      { label: 'Rotas', href: '/alpha/rotas-escolas', icon: Route, color: 'from-blue-600 to-cyan-600', code: 'rotas-escolas' },
      { label: 'Comprimir', href: '/alpha/compressor-imagens', icon: FileImage, color: 'from-emerald-600 to-teal-600', code: 'compressor-imagens' },
      { label: 'Converter', href: '/alpha/conversor-imagens', icon: ArrowLeftRight, color: 'from-amber-600 to-orange-600', code: 'conversor-imagens' },
      { label: 'PDFs', href: '/alpha/manipulador-pdf', icon: Files, color: 'from-rose-600 to-pink-600', code: 'manipulador_pdf' },
      { label: 'Carimbos', href: '/alpha/carimbador-pdf', icon: Stamp, color: 'from-fuchsia-600 to-purple-600', code: 'carimbador_pdf' },
      { label: 'Planilhas', href: '/alpha/conversor-planilhas', icon: Table, color: 'from-lime-600 to-emerald-600', code: 'conversor_planilhas' },
      { label: 'CPFs', href: '/alpha/validador-dados', icon: CheckSquare, color: 'from-sky-600 to-blue-600', code: 'validador_dados' },
    ]

    return templates.filter((item) =>
      funcoes.some(
        (fn) =>
          fn.ativo !== false &&
          (fn.rota === item.href ||
            fn.codigo.toLowerCase().replace(/[-_]/g, '') === item.code.toLowerCase().replace(/[-_]/g, ''))
      )
    )
  }, [funcoes])

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-200">
      
      {/* ── 1. Topo & Barra de Busca Instantânea ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-sidebar-foreground tracking-tight">
              SIG Alpha Lab
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sidebar-accent border border-sidebar-border text-sidebar-accent-foreground text-[10px] font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3 fill-sidebar-primary" />
              Mobile Ready
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suíte de ferramentas experimentais 100% no navegador (Offline-First)
          </p>
        </div>

        {/* Input de Busca com Design de Pílula */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar ferramenta ou módulo..."
            className="w-full pl-9 pr-9 py-2 rounded-2xl bg-white dark:bg-[#141416] focus:bg-white dark:focus:bg-[#181d28] border border-border dark:border-[#26262a] focus:border-primary text-xs text-foreground placeholder:text-muted-foreground outline-hidden transition-all duration-200 shadow-xs"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Hero Banner Dinâmico ── */}
      <div className="relative overflow-hidden rounded-[28px] md:rounded-3xl bg-gradient-to-br from-white via-sidebar-accent/30 to-white dark:from-[#141416] dark:via-[#181d28] dark:to-[#141416] border border-border dark:border-[#26262a] p-6 md:p-8 shadow-xs">
        {/* Efeitos de Iluminação Suave */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-sidebar-accent/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-50/60 dark:bg-blue-950/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sidebar-accent dark:bg-[#1c2230] border border-border dark:border-[#26262a] text-sidebar-accent-foreground dark:text-slate-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Laboratório de Campo &amp; Inteligência Geográfica
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-foreground leading-tight">
              Mapeamento Poligonal &amp; Telemetria GPS em Tempo Real
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              Desenhe perímetros de atendimento, capture pontos georreferenciados com fotos, calibre mapas GeoPDF e navegue mesmo sem sinal de internet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/alpha/visitas"
              className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs md:text-sm font-bold shadow-md shadow-primary/30 transition-all duration-200 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <MapPinned className="w-4 h-4" />
              <span>Iniciar Visitas.</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Grade de Ações Rápidas (Squircle Grid - Apenas módulos ativos) ── */}
      {quickShortcuts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-primary" />
              Acesso Rápido às Ferramentas
            </h3>
            <span className="text-[11px] text-muted-foreground">{quickShortcuts.length} disponível(is)</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2.5 sm:gap-3">
            {quickShortcuts.map((item, idx) => {
              const Icon = item.icon
              return (
                <Link
                  key={idx}
                  href={item.href}
                  className="group flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-card dark:bg-[#141416] hover:bg-accent/40 dark:hover:bg-[#1c2230] border border-border dark:border-[#26262a] hover:border-primary/40 transition-all duration-200 text-center active:scale-95 shadow-xs"
                >
                  <div
                    className={cn(
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr flex items-center justify-center text-white shadow-xs group-hover:scale-110 transition-transform duration-200',
                      item.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-foreground dark:text-slate-200 group-hover:text-primary mt-2 truncate w-full transition-colors">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-4" id="catalogo">
        <div className="flex items-center justify-between border-b border-border dark:border-[#26262a] pb-3">
          <div>
            <h3 className="text-base md:text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Catálogo Completo do Ecossistema
            </h3>
            <p className="text-xs text-muted-foreground">
              Navegue pelas suítes modulares disponíveis no laboratório.
            </p>
          </div>
          <span className="text-xs font-semibold text-accent-foreground dark:text-slate-200 bg-accent dark:bg-[#1c2230] px-2.5 py-1 rounded-lg border border-border dark:border-[#26262a] shrink-0">
            {funcoesFiltradas.length} ativa(s)
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'todos', label: 'Todas as Funções', count: funcoes.length },
            { id: 'geo', label: 'Geolocalização & Rotas' },
            { id: 'pdf', label: 'Documentos & PDFs' },
            { id: 'imagens', label: 'Imagens & Mídia' },
            { id: 'produtividade', label: 'Produtividade & CPFs' },
          ].map((tab) => {
            const isSelected = categoriaAtiva === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoriaAtiva(tab.id as CategoriaFiltro)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer',
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-card dark:bg-[#141416] hover:bg-accent/60 dark:hover:bg-[#1c2230] text-muted-foreground dark:text-slate-300 border border-border dark:border-[#26262a]'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full',
                      isSelected ? 'bg-white/20 text-white' : 'bg-accent dark:bg-[#1c2230] text-accent-foreground dark:text-slate-200'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            Carregando suíte modular do Alpha...
          </div>
        ) : funcoesFiltradas.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-border dark:border-[#26262a] rounded-3xl bg-card dark:bg-[#141416] space-y-3">
            <Layers className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">Nenhum módulo encontrado</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tente buscar por outro termo ou selecione uma categoria diferente no menu acima.
            </p>
            {busca && (
              <button
                type="button"
                onClick={() => {
                  setBusca('')
                  setCategoriaAtiva('todos')
                }}
                className="px-4 py-1.5 rounded-xl bg-accent text-accent-foreground border border-border dark:border-[#26262a] text-xs font-bold hover:bg-accent/80 transition-colors"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4">
            {funcoesFiltradas.map((fn) => (
              <Link
                key={fn.id}
                href={fn.rota}
                className="group relative overflow-hidden rounded-[22px] bg-card dark:bg-[#141416] hover:bg-accent/30 dark:hover:bg-[#181d28] border border-border dark:border-[#26262a] hover:border-primary/50 p-5 transition-all duration-200 flex flex-col justify-between gap-4 shadow-xs hover:shadow-sm active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-accent dark:bg-[#1c2230] border border-border dark:border-[#26262a] text-accent-foreground flex items-center justify-center group-hover:scale-105 transition-all">
                      <AlphaIcon name={fn.icone} className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-slate-300 bg-accent dark:bg-[#1c2230] border border-border dark:border-[#26262a] px-2 py-0.5 rounded-md">
                      #{fn.ordem}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm md:text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                      {fn.nome}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {fn.descricao || 'Função experimental ativa no ecossistema SIG Alpha.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border dark:border-[#26262a] text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    100% Offline
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-xs font-bold text-primary">
                    Abrir Módulo
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
