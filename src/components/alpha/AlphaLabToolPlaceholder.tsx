'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Clock, ShieldCheck, ArrowRight } from 'lucide-react'
import { AlphaIcon } from './AlphaIcon'

interface AlphaLabToolPlaceholderProps {
  titulo: string
  descricao: string
  icone: string
  status?: string
  etapas?: string[]
}

export function AlphaLabToolPlaceholder({
  titulo,
  descricao,
  icone,
  status = 'Em Validação Experimental',
  etapas = [
    'Arquitetura de processamento 100% no navegador (Client-side / Zero SaaS)',
    'Compatibilidade Offline-First integrada com IndexedDB',
    'Auditoria de segurança e isolamento ABAC/RLS',
  ],
}: AlphaLabToolPlaceholderProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 border-b border-sidebar-border pb-4">
        <Link
          href="/alpha"
          className="p-2.5 rounded-xl bg-white border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent transition-colors shadow-xs"
          title="Voltar ao Dashboard Alpha"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-sidebar-primary mb-1">
            <Link href="/alpha" className="hover:underline font-semibold transition-colors">
              SIG Alpha Lab
            </Link>
            <span>/</span>
            <span className="text-muted-foreground">Ferramentas Experimentais</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-sidebar-foreground tracking-tight flex items-center gap-2.5">
            <AlphaIcon name={icone} className="w-6 h-6 text-sidebar-primary stroke-[2.2]" />
            {titulo}
          </h1>
        </div>
      </div>

      <div className="rounded-3xl bg-white border border-sidebar-border p-6 md:p-8 space-y-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sidebar-accent border border-sidebar-border text-sidebar-accent-foreground text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-sidebar-primary" />
            {status}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-sidebar-primary" />
            Disponibilização Contínua
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-sidebar-foreground">Sobre este Módulo</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {descricao}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-sidebar-accent/40 border border-sidebar-border space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sidebar-primary" />
            Padrões do Laboratório Alpha Ativos
          </h3>
          <ul className="space-y-2">
            {etapas.map((etapa, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sidebar-primary mt-1.5 shrink-0" />
                <span>{etapa}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-sidebar-border">
          <Link
            href="/alpha"
            className="inline-flex items-center gap-2 text-xs font-semibold text-sidebar-primary hover:underline transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Catálogo Alpha
          </Link>
          <Link
            href="/alpha/visitas"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-xs font-bold transition-all shadow-xs"
          >
            <span>Ir para Visitas &amp; GPS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
