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
      <div className="flex items-center gap-3 border-b border-blue-900/40 pb-4">
        <Link
          href="/alpha"
          className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 text-slate-300 hover:text-white hover:bg-blue-900/50 transition-colors"
          title="Voltar ao Dashboard Alpha"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 mb-1">
            <Link href="/alpha" className="hover:text-blue-300 transition-colors">
              SIG Alpha Lab
            </Link>
            <span>/</span>
            <span className="text-slate-400">Ferramentas Experimentais</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <AlphaIcon name={icone} className="w-6 h-6 text-blue-400 stroke-[2.2]" />
            {titulo}
          </h1>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0d162a]/90 border border-blue-900/50 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-700/50 text-violet-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            {status}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Disponibilização Contínua
          </span>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Sobre este Módulo</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {descricao}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-blue-950/30 border border-blue-800/30 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            Padrões do Laboratório Alpha Ativos
          </h3>
          <ul className="space-y-2">
            {etapas.map((etapa, idx) => (
              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <span>{etapa}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-blue-900/40">
          <Link
            href="/alpha"
            className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Catálogo Alpha
          </Link>
          <Link
            href="/alpha/visitas"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-md shadow-violet-900/30"
          >
            <span>Ir para Visitas &amp; GPS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
