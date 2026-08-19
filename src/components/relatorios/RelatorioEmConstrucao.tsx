'use client';

import React from 'react';
import Link from 'next/link';
import {
  Hammer,
  ArrowLeft,
  Calendar,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  BarChart3,
  Building2,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface RelatorioEmConstrucaoProps {
  title: string;
  category?: string;
  description: string;
  icon?: LucideIcon;
  badgeColor?: string;
  iconColor?: string;
  estimatedQuarter?: string;
  recursosPlanejados?: string[];
  backUrl?: string;
}

export function RelatorioEmConstrucao({
  title,
  category = 'Administrativo',
  description,
  icon: Icon = BarChart3,
  badgeColor = 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
  iconColor = 'text-sky-600 dark:text-sky-400',
  estimatedQuarter = 'Roadmap Oficial 2026',
  recursosPlanejados = [
    'Painel com filtros consolidados por período, escola e secretaria',
    'Gráficos estatísticos interativos e distribuição percentual',
    'Exportação automatizada para planilhas Excel (.xlsx) e CSV',
    'Geração e emissão de relatório em PDF para impressão oficial',
    'Trilha de auditoria e conformidade com a LGPD',
  ],
  backUrl = '/admin/relatorios',
}: RelatorioEmConstrucaoProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background text-foreground p-4 md:p-8 flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Topo / Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href={backUrl}
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors"
            title="Voltar aos Relatórios Administrativos"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/admin" className="hover:text-foreground transition-colors">
                Administração
              </Link>
              <span>/</span>
              <Link href="/admin/relatorios" className="hover:text-foreground transition-colors">
                Relatórios
              </Link>
              <span>/</span>
              <span className="text-sky-600 dark:text-sky-400 font-semibold">{title}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Rede Municipal de Sapeaçu
          </span>
        </div>
      </div>

      {/* Card Principal - Em Construção */}
      <div className="max-w-4xl mx-auto w-full bg-card border border-borderCustom rounded-2xl p-6 md:p-10 shadow-sm flex flex-col items-center text-center gap-6 relative overflow-hidden">
        {/* Efeito sutil no topo do card */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-sky-500 to-emerald-500" />

        {/* Ícone de Destaque com Animação Suave */}
        <div className="relative mt-2">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg shadow-amber-500/5">
            <Icon className="w-10 h-10" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <Hammer className="w-4 h-4 animate-bounce" />
          </div>
        </div>

        {/* Título & Badge de Status */}
        <div className="flex flex-col items-center gap-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-[11px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider',
                badgeColor
              )}
            >
              {category}
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Em Construção
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold text-foreground mt-2">
            {title} está sendo desenvolvido
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {/* Quadro de Funcionalidades Planejadas */}
        <div className="w-full bg-surface-2 dark:bg-secondary/40 border border-border rounded-xl p-5 md:p-6 text-left flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Recursos e Módulos Previstos
            </h3>
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {estimatedQuarter}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recursosPlanejados.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-card border border-border text-xs text-foreground/90 shadow-2xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href={backUrl}>
            <Button
              variant="default"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-xl shadow-sm gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Relatórios Administrativos
            </Button>
          </Link>
          <Link href="/admin">
            <Button
              variant="outline"
              className="bg-card border-border text-foreground hover:bg-hoverCustom font-medium px-5 py-2.5 rounded-xl gap-2 cursor-pointer"
            >
              Ir ao Painel Geral
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
