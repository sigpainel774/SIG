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
  FlaskConical,
} from 'lucide-react'
import { MapaRotasEscolas } from '@/components/map/MapWrapper'
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
  const [abaAtiva, setAbaAtiva] = useState<'roteirizador' | 'historico'>('roteirizador')
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
    } catch {}

    // 2. Se estiver online, atualiza do Supabase e salva no cache
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome, latitude, longitude, endereco, localizacao, tipo, inep, telefone, ativo')
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

  const unidadesEscolares = escolas.filter((e) => !isSemed(e))
  const semedUnidade = escolas.find(isSemed)

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/alpha"
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors"
            title="Voltar ao Painel Alpha"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/alpha" className="hover:text-foreground transition-colors">
                Alpha Lab
              </Link>
              <span>/</span>
              <span className="text-violet-600 dark:text-violet-400 font-semibold">
                Geolocalização e Rotas
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Route className="w-6 h-6 text-violet-500" />
              Geolocalização e Rotas de Unidades Escolares
              <span className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md">
                ALPHA #1
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegação entre Abas */}
          <div className="flex items-center bg-card border border-border p-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => setAbaAtiva('roteirizador')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'roteirizador'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="w-4 h-4" />
              Roteirizador & Ao Vivo
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('historico')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-4 h-4" />
              Histórico & Simulação
            </button>
          </div>

          <button
            type="button"
            onClick={carregarEscolas}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground bg-card border border-border rounded-xl hover:bg-hoverCustom transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                carregando ? 'animate-spin text-violet-600 dark:text-violet-400' : ''
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
            <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Escolas Cadastradas
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-foreground">{unidadesEscolares.length}</span>
                  {semedUnidade && (
                    <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
                      + 1 Sede (INEP 01)
                    </span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <School className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Com Geolocalização
                </span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {escolasComCoords.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <MapPin className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Zona Urbana
                </span>
                <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                  {escolasUrbanas.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Zona Rural
                </span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {escolasRurais.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Route className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Componente do Mapa e Otimizador de Rotas */}
          {carregando ? (
            <div className="w-full h-[580px] rounded-2xl bg-card border border-border flex flex-col items-center justify-center gap-3 text-muted-foreground animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-semibold">
                Carregando mapa e unidades escolares de Sapeaçu...
              </span>
            </div>
          ) : (
            <MapaRotasEscolas escolas={escolas} />
          )}
        </>
      ) : (
        <HistoricoPercursosTab />
      )}
    </div>
  )
}
