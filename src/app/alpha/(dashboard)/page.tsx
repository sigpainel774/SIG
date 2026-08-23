'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import {
  FlaskConical,
  Sparkles,
  ArrowRight,
  Layers,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { AlphaIcon } from '@/components/alpha/AlphaIcon'
import { AlphaFuncao } from '@/components/alpha/AlphaSidebar'
import {
  salvarCacheModulosAlpha,
  obterCacheModulosAlpha,
} from '@/lib/alphaOfflineManager'

export default function AlphaDashboardPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [funcoes, setFuncoes] = useState<AlphaFuncao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadFuncoes() {
      // 1. Tenta carregar do cache local IndexedDB primeiro (instantâneo e resiliente offline)
      try {
        const cached = await obterCacheModulosAlpha()
        if (isMounted && cached && cached.length > 0) {
          setFuncoes(cached)
          setLoading(false)
        }
      } catch {}

      // 2. Se estiver online, atualiza do Supabase e sincroniza o cache local
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
          console.warn('Falha de rede ao carregar funções do Alpha, mantendo cache:', err)
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

  const userNome = funcionario?.nome ?? 'Operador Alpha'
  const userCargo = funcionario?.cargo ?? 'Operador'
  const isSuperAdmin = funcionario?.is_superadmin === true

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* ── Banner de Apresentação ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-linear-to-br from-[#0e1d3d] via-[#0c152a] to-[#080d1b] border border-blue-500/25 p-6 md:p-8 shadow-2xl shadow-blue-950/50 backdrop-blur-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <FlaskConical className="w-3.5 h-3.5" />
              SIG Alpha — Laboratório de Novas Funções
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Olá, {userNome}!
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Bem-vindo ao ambiente operacional do Sistema Alpha. Aqui você tem acesso antecipado às
              ferramentas em desenvolvimento e prototipagem na rede municipal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isSuperAdmin && (
              <Link
                href="/admin/alpha"
                className="px-4 py-2.5 rounded-xl bg-[#1d63d6] hover:bg-[#1652b8] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#1d63d6]/30 transition-all cursor-pointer"
              >
                <span>Configurar no Super Painel</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Seção de Funções Ativas ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-blue-900/40 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Ferramentas &amp; Módulos Disponíveis
            </h2>
            <p className="text-xs text-slate-400">
              Selecione uma das funções ativas no menu lateral ou através dos cards abaixo.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-300 bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-800/40">
            {funcoes.length} ativa(s)
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            Carregando catálogo de ferramentas...
          </div>
        ) : funcoes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-blue-900/40 rounded-2xl bg-blue-950/10 space-y-2">
            <Layers className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-white">Nenhuma função ativa no momento</p>
            <p className="text-xs text-slate-400">
              O administrador ainda não habilitou funções para este ambiente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funcoes.map((fn) => (
              <Link
                key={fn.id}
                href={fn.rota}
                className="group relative overflow-hidden rounded-[24px] bg-[#0d162a]/90 hover:bg-[#12203e] border border-blue-900/40 hover:border-blue-500/50 p-6 transition-all duration-200 flex flex-col justify-between gap-5 shadow-xl shadow-black/40 hover:shadow-blue-900/20"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <AlphaIcon name={fn.icone} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white group-hover:text-blue-300 transition-colors">
                      {fn.nome}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {fn.descricao || 'Função experimental ativa no ecossistema Alpha.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-blue-900/40 text-xs font-semibold text-blue-400">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Pronto para uso
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Acessar
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
