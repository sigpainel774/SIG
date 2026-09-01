'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import {
  Route,
  ArrowLeft,
  School,
  MapPin,
  Building2,
  Sparkles,
  Loader2,
  RefreshCw,
  Compass,
  History,
  Navigation,
  FlaskConical,
} from 'lucide-react'
import { MapaRotasEscolas, NavegacaoLivreTab } from '@/components/map/MapWrapper'
import { EscolaMapeada } from '@/components/map/MapaRotasEscolas'
import HistoricoPercursosTab from '@/components/map/HistoricoPercursosTab'
import { toast } from 'sonner'

import {
  salvarCacheEntidadeAlpha,
  obterCacheEntidadeAlpha,
} from '@/lib/alphaOfflineManager'

export default function AlphaRotasEscolasPage() {
  const supabase = createClient()
  const [escolas, setEscolas] = useState<EscolaMapeada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'roteirizador' | 'navegacao_livre' | 'historico'>('roteirizador')
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const carregarEscolas = async () => {
    // 1. Tenta carregar do cache offline primeiro (instantâneo)
    try {
      const cached = await obterCacheEntidadeAlpha<EscolaMapeada[]>('rotas-escolas', 'escolas')
      if (isMounted.current && cached && cached.length > 0) {
        setEscolas(cached)
        setCarregando(false)
      }
    } catch (err) {
      console.warn('[RotasEscolas] Falha ao ler cache offline de escolas:', err)
    }

    // 2. Se estiver online, atualiza do Supabase e salva no cache
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome, latitude, longitude, endereco, localizacao, tipo, inep, telefone, ativo, is_teste')
          .is('deleted_at', null)
          .order('nome')

        if (error) throw error

        if (isMounted.current && data) {
          setEscolas(data)
          await salvarCacheEntidadeAlpha('rotas-escolas', 'escolas', data)
        }
      } catch (err) {
        console.warn('Falha ao atualizar escolas do servidor, utilizando cache local:', err)
      } finally {
        if (isMounted.current) {
          setCarregando(false)
        }
      }
    } else {
      if (isMounted.current) {
        setCarregando(false)
      }
    }
  }

  useEffect(() => {
    carregarEscolas()
  }, [])

  const isSemed = (e: EscolaMapeada) =>
    e.inep === '01' ||
    e.inep === '1' ||
    e.tipo === 'SECRETARIA' ||
    (e.nome || '').toUpperCase().includes('SEMED')

  const isSaude = (e: EscolaMapeada) =>
    e.tipo === 'SAUDE' ||
    e.tipo === 'POSTO' ||
    e.tipo === 'USF' ||
    (e.nome || '').toUpperCase().includes('POSTO DE SAÚDE') ||
    (e.nome || '').toUpperCase().includes('POSTO DE SAUDE') ||
    (e.nome || '').toUpperCase().includes('USF')

  const isTeste = (e: EscolaMapeada) =>
    e.is_teste === true || (e.nome || '').toLowerCase().startsWith('teste ')

  const escolasReais = escolas.filter((e) => !isSemed(e) && !isSaude(e) && !isTeste(e))
  const unidadesSaude = escolas.filter(isSaude)
  const unidadesTeste = escolas.filter(isTeste)
  const semedUnidade = escolas.find(isSemed)

  const unidadesEscolares = escolas.filter((e) => !isSemed(e))

  const escolasComCoords = unidadesEscolares.filter(
    (e) =>
      e.latitude !== null &&
      e.longitude !== null &&
      Number(e.latitude) !== 0 &&
      Number(e.longitude) !== 0
  )

  const escolasUrbanas = escolasComCoords.filter((e) =>
    (e.localizacao || '').toUpperCase().includes('URBANA')
  )
  const escolasRurais = escolasComCoords.filter((e) =>
    (e.localizacao || '').toUpperCase().includes('RURAL')
  )

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── Topo / Breadcrumb & Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-900/40 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/alpha"
            className="p-2.5 rounded-xl bg-white border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent transition-colors shadow-xs"
            title="Voltar ao Painel Alpha"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-sidebar-primary mb-1">
              <Link href="/alpha" className="hover:underline font-semibold transition-colors">
                Alpha Lab
              </Link>
              <span>/</span>
              <span className="text-muted-foreground font-semibold">
                Geolocalização e Rotas
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-sidebar-foreground flex items-center gap-2.5">
              <Route className="w-6 h-6 text-sidebar-primary" />
              Geolocalização e Rotas de Unidades Escolares
              <span className="bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md">
                ALPHA #1
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Navegação entre 3 Abas */}
          <div className="flex items-center bg-white border border-sidebar-border p-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => setAbaAtiva('roteirizador')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'roteirizador'
                  ? 'bg-sidebar-primary text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              Roteirizador
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('navegacao_livre')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'navegacao_livre'
                  ? 'bg-sidebar-primary text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <Navigation className="w-4 h-4" />
              Navegação Livre
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('historico')}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-sidebar-primary text-white shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              Histórico &amp; Replay
            </button>
          </div>

          <button
            type="button"
            onClick={carregarEscolas}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                carregando ? 'animate-spin text-sidebar-primary' : 'text-slate-600'
              }`}
            />
            Atualizar
          </button>
        </div>
      </div>

      {abaAtiva === 'roteirizador' ? (
        <>
          {/* Cards de Resumo & Estatísticas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-sidebar-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Escolas Cadastradas
                </span>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-lg font-bold text-sidebar-foreground">{escolasReais.length}</span>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-sidebar-primary">
                    {semedUnidade && <span>+1 Sede</span>}
                    {unidadesSaude.length > 0 && <span>• {unidadesSaude.length} Saúde/USF</span>}
                    {unidadesTeste.length > 0 && <span>• {unidadesTeste.length} Teste</span>}
                  </div>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-sidebar-primary">
                <School className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-sidebar-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Com Geolocalização
                </span>
                <span className="text-lg font-bold text-emerald-600">
                  {escolasComCoords.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <MapPin className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-sidebar-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Zona Urbana
                </span>
                <span className="text-lg font-bold text-sidebar-primary">
                  {escolasUrbanas.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sidebar-accent border border-sidebar-border flex items-center justify-center text-sidebar-primary">
                <Building2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white border border-sidebar-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Zona Rural
                </span>
                <span className="text-lg font-bold text-amber-600">
                  {escolasRurais.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Route className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Componente do Mapa e Otimizador de Rotas */}
          {carregando ? (
            <div className="w-full h-[580px] rounded-2xl bg-white border border-sidebar-border flex flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse shadow-xs">
              <Loader2 className="w-8 h-8 animate-spin text-sidebar-primary" />
              <span className="text-sm font-semibold text-sidebar-foreground">
                Carregando mapa e unidades escolares de Sapeaçu...
              </span>
            </div>
          ) : (
            <MapaRotasEscolas escolas={escolas} />
          )}
        </>
      ) : abaAtiva === 'navegacao_livre' ? (
        <NavegacaoLivreTab
          escolas={escolas}
          onNavegacaoSalva={() => setAbaAtiva('historico')}
        />
      ) : (
        <HistoricoPercursosTab />
      )}
    </div>
  )
}
