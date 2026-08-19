'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, Building2 } from 'lucide-react';
import RelatorioServidores from '@/components/relatorios/RelatorioServidores';

export default function RelatorioServidoresPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Topo / Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/relatorios"
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
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Servidores da Rede
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Users className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              Relatório Geral de Servidores
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Recursos Humanos da Rede Municipal
          </span>
        </div>
      </div>

      {/* Componente de Relatório de Servidores */}
      <RelatorioServidores />
    </div>
  );
}
