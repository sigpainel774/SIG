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
            className="p-2.5 rounded-xl bg-[#0c1427] border border-blue-900/40 text-slate-300 hover:text-white hover:bg-blue-950/40 transition-colors"
            title="Voltar ao Painel Alpha"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link href="/alpha" className="hover:text-white transition-colors">
                Alpha Lab
              </Link>
              <span>/</span>
              <span className="text-blue-400 font-semibold">
                Geolocalização e Rotas
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Route className="w-6 h-6 text-blue-400" />
              Geolocalização e Rotas de Unidades Escolares
              <span className="bg-blue-500/15 text-blue-300 border border-blue-400/30 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md">
                ALPHA #1
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegação entre Abas */}
          <div className="flex items-center bg-[#0c1427] border border-blue-900/50 p-1 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={() => setAbaAtiva('roteirizador')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'roteirizador'
                  ? 'bg-[#1d63d6] text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              Roteirizador &amp; Ao Vivo
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('historico')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-[#1d63d6] text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              Histórico &amp; Simulação
            </button>
          </div>

          <button
            type="button"
            onClick={carregarEscolas}
            disabled={carregando}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-200 bg-[#0c1427] border border-blue-900/50 rounded-xl hover:bg-blue-950/40 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                carregando ? 'animate-spin text-blue-400' : ''
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
            <div className="bg-[#0d162a]/90 border border-blue-900/40 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                  Escolas Cadastradas
                </span>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="text-lg font-bold text-white">{escolasReais.length}</span>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-400">
                    {semedUnidade && <span>+1 Sede</span>}
                    {unidadesSaude.length > 0 && <span>• {unidadesSaude.length} Saúde/USF</span>}
                    {unidadesTeste.length > 0 && <span>• {unidadesTeste.length} Teste</span>}
                  </div>
                </div>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <School className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0d162a]/90 border border-blue-900/40 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                  Com Geolocalização
                </span>
                <span className="text-lg font-bold text-emerald-400">
                  {escolasComCoords.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MapPin className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0d162a]/90 border border-blue-900/40 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                  Zona Urbana
                </span>
                <span className="text-lg font-bold text-sky-400">
                  {escolasUrbanas.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Building2 className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#0d162a]/90 border border-blue-900/40 p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
                  Zona Rural
                </span>
                <span className="text-lg font-bold text-amber-400">
                  {escolasRurais.length}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Route className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Componente do Mapa e Otimizador de Rotas */}
          {carregando ? (
            <div className="w-full h-[580px] rounded-2xl bg-[#0d162a]/80 border border-blue-900/40 flex flex-col items-center justify-center gap-3 text-slate-400 animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="text-sm font-semibold text-slate-300">
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
