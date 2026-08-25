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

  // Grade de Atalhos Rápidos no Topo (Mobile Squircle)
  const quickShortcuts = [
    { label: 'Visitas.', href: '/alpha/visitas', icon: MapPinned, color: 'from-violet-600 to-indigo-600', code: 'visitas' },
    { label: 'Rotas', href: '/alpha/rotas-escolas', icon: Route, color: 'from-blue-600 to-cyan-600', code: 'rotas-escolas' },
    { label: 'Comprimir', href: '/alpha/compressor-imagens', icon: FileImage, color: 'from-emerald-600 to-teal-600', code: 'compressor-imagens' },
    { label: 'Converter', href: '/alpha/conversor-imagens', icon: ArrowLeftRight, color: 'from-amber-600 to-orange-600', code: 'conversor-imagens' },
    { label: 'PDFs', href: '/alpha/manipulador-pdf', icon: Files, color: 'from-rose-600 to-pink-600', code: 'manipulador_pdf' },
    { label: 'Carimbos', href: '/alpha/carimbador-pdf', icon: Stamp, color: 'from-fuchsia-600 to-purple-600', code: 'carimbador_pdf' },
    { label: 'Planilhas', href: '/alpha/conversor-planilhas', icon: Table, color: 'from-lime-600 to-emerald-600', code: 'conversor_planilhas' },
    { label: 'CPFs', href: '/alpha/validador-dados', icon: CheckSquare, color: 'from-sky-600 to-blue-600', code: 'validador_dados' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-200">
      
      {/* ── 1. Topo & Barra de Busca Instantânea ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              SIG Alpha Lab
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-400 text-[10px] font-bold uppercase tracking-wider">
              <Zap className="w-3 h-3 fill-violet-400" />
              Mobile Ready
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Suíte de ferramentas experimentais 100% no navegador (Offline-First)
          </p>
        </div>

        {/* Input de Busca com Design de Pílula */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar ferramenta ou módulo..."
            className="w-full pl-9 pr-9 py-2 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] focus:bg-[#0d162a] border border-white/10 focus:border-violet-500/50 text-xs text-white placeholder:text-slate-400 outline-none transition-all duration-200"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Hero Banner Dinâmico (Inspirado no Mockup Eventify) ── */}
      <div className="relative overflow-hidden rounded-[28px] md:rounded-3xl bg-gradient-to-br from-violet-950 via-[#0c152c] to-[#080d1b] border border-violet-700/30 p-6 md:p-8 shadow-2xl shadow-black/60">
        {/* Efeitos de Iluminação Cósmica */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-violet-200 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              Laboratório de Campo &amp; Inteligência Geográfica
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white leading-tight">
              Mapeamento Poligonal &amp; Telemetria GPS em Tempo Real
            </h2>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Desenhe perímetros de atendimento, capture pontos georreferenciados com fotos, calibre mapas GeoPDF e navegue mesmo sem sinal de internet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/alpha/visitas"
              className="px-5 py-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs md:text-sm font-bold shadow-lg shadow-violet-600/40 hover:shadow-violet-600/60 transition-all duration-200 flex items-center gap-2 active:scale-95"
            >
              <MapPinned className="w-4 h-4" />
              <span>Iniciar Visitas.</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Grade de Ações Rápidas (Squircle Grid 4 Colunas no Mobile) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5 text-violet-400" />
            Acesso Rápido às Ferramentas
          </h3>
          <span className="text-[11px] text-slate-500">1 Toque</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2.5 sm:gap-3">
          {quickShortcuts.map((item, idx) => {
            const Icon = item.icon
            return (
              <Link
                key={idx}
                href={item.href}
                className="group flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl bg-[#0e172e]/80 hover:bg-[#152347] border border-blue-900/30 hover:border-violet-500/40 transition-all duration-200 text-center active:scale-95 shadow-md shadow-black/20 hover:shadow-violet-900/20"
              >
                <div
                  className={cn(
                    'w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr flex items-center justify-center text-white shadow-sm shadow-black/40 group-hover:scale-110 transition-transform duration-200',
                    item.color
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-slate-300 group-hover:text-white mt-2 truncate w-full">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── 4. Filtro por Abas em Pílula (Segmented Control) ── */}
      <div className="space-y-4" id="catalogo">
        <div className="flex items-center justify-between border-b border-blue-900/30 pb-3">
          <div>
            <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              Catálogo Completo do Ecossistema
            </h3>
            <p className="text-xs text-slate-400">
              Navegue pelas suítes modulares disponíveis no laboratório.
            </p>
          </div>
          <span className="text-xs font-semibold text-violet-300 bg-violet-950/60 px-2.5 py-1 rounded-lg border border-violet-800/40 shrink-0">
            {funcoesFiltradas.length} ativa(s)
          </span>
        </div>

        {/* Barra de Abas Pílula Rolável Horizontalmente */}
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
                  'px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5',
                  isSelected
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 scale-105'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/5'
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full',
                      isSelected ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── 5. Listagem de Cards de Módulos (Design Horizontal Moderno) ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-400 gap-2.5">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            Carregando suíte modular do Alpha...
          </div>
        ) : funcoesFiltradas.length === 0 ? (
          <div className="p-10 text-center border border-dashed border-blue-900/40 rounded-3xl bg-blue-950/10 space-y-3">
            <Layers className="w-10 h-10 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-white">Nenhum módulo encontrado</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente buscar por outro termo ou selecione uma categoria diferente no menu acima.
            </p>
            {busca && (
              <button
                type="button"
                onClick={() => {
                  setBusca('')
                  setCategoriaAtiva('todos')
                }}
                className="px-4 py-1.5 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 text-xs font-bold hover:bg-violet-600/30 transition-colors"
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
                className="group relative overflow-hidden rounded-[22px] bg-[#0c152c]/90 hover:bg-[#111e3f] border border-blue-900/30 hover:border-violet-500/50 p-5 transition-all duration-200 flex flex-col justify-between gap-4 shadow-lg shadow-black/30 hover:shadow-violet-900/20 active:scale-[0.99]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-violet-500/20 transition-all">
                      <AlphaIcon name={fn.icone} className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-300 bg-violet-950/60 border border-violet-700/40 px-2 py-0.5 rounded-md">
                      #{fn.ordem}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm md:text-base text-white group-hover:text-violet-300 transition-colors leading-snug">
                      {fn.nome}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {fn.descricao || 'Função experimental ativa no ecossistema SIG Alpha.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-blue-900/30 text-xs font-semibold text-violet-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    100% Offline
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-xs font-bold">
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
