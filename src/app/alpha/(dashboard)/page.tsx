'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import {
  FlaskConical,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Layers,
  MapPin,
  Route,
  Loader2,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import { AlphaIcon } from '@/components/alpha/AlphaIcon'
import { AlphaFuncao } from '@/components/alpha/AlphaSidebar'

export default function AlphaDashboardPage() {
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [funcoes, setFuncoes] = useState<AlphaFuncao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadFuncoes() {
      try {
        const { data, error } = await supabase
          .from('alpha_funcoes')
          .select('*')
          .eq('ativo', true)
          .order('ordem', { ascending: true })

        if (error) throw error
        if (isMounted && data) {
          setFuncoes(data)
        }
      } catch (err) {
        console.error('Erro ao carregar funções ativas do Alpha:', err)
      } finally {
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
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-violet-950/40 via-card to-background border border-violet-500/20 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-600 dark:text-violet-400 text-xs font-bold uppercase tracking-wider">
              <FlaskConical className="w-3.5 h-3.5" />
              SIG Alpha — Laboratório de Novas Funções
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Olá, {userNome}!
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Bem-vindo ao ambiente operacional do Sistema Alpha. Aqui você tem acesso antecipado às
              ferramentas em desenvolvimento e prototipagem na rede municipal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isSuperAdmin && (
              <Link
                href="/admin/alpha"
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-violet-600/25 transition-colors"
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
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              Ferramentas &amp; Módulos Disponíveis
            </h2>
            <p className="text-xs text-muted-foreground">
              Selecione uma das funções ativas no menu lateral ou através dos cards abaixo.
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-card px-2.5 py-1 rounded-lg border border-border">
            {funcoes.length} ativa(s)
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
            Carregando catálogo de ferramentas...
          </div>
        ) : funcoes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-card/40 space-y-2">
            <Layers className="w-8 h-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">Nenhuma função ativa no momento</p>
            <p className="text-xs text-muted-foreground">
              O administrador ainda não habilitou funções para este ambiente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {funcoes.map((fn) => (
              <Link
                key={fn.id}
                href={fn.rota}
                className="group relative overflow-hidden rounded-2xl bg-card border border-border p-5 hover:border-violet-500/40 hover:bg-card/90 transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <AlphaIcon name={fn.icone} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                      {fn.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {fn.descricao || 'Função experimental ativa no ecossistema Alpha.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs font-semibold text-violet-600 dark:text-violet-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
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

      {/* ── Card de Encapsulamento & Informações ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-sky-600 dark:text-sky-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Encapsulamento de Dados</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Todas as ações realizadas neste ambiente (testes de rotas, itinerários, simulações) são
            marcadas com tags de isolamento e não afetam os relatórios oficiais de RH, notas,
            frequências ou auditoria da Secretaria de Educação.
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <HelpCircle className="w-4 h-4" />
            <span>Como adicionar novas funções?</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Novas ferramentas podem ser adicionadas pelo Administrador no Super Painel em{' '}
            <strong className="text-foreground">Administração &gt; Sistema Alpha</strong>,
            aparecendo imediatamente na barra lateral para todos os operadores de teste.
          </p>
        </div>
      </div>
    </div>
  )
}
