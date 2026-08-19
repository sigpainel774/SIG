'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Route,
  Users,
  FileText,
  TrendingUp,
  Activity,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Compass,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RelatoriosAdministrativosPage() {
  const relatorios = [
    {
      id: 'rotas-escolas',
      title: 'Geolocalização e Rotas de Unidades Escolares',
      description:
        'Mapa interativo de Sapeaçu com localização das escolas municipais e cálculo do melhor roteiro de visitação com estimativa de consumo de gasolina.',
      icon: Route,
      badge: 'Destaque / Logística',
      badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      iconColor: 'text-sky-400',
      bgGradient: 'from-sky-500/10 via-sky-500/5 to-transparent',
      borderColor: 'border-sky-500/30 hover:border-sky-500/60',
      path: '/admin/relatorios/rotas-escolas',
      destaque: true,
    },
    {
      id: 'servidores',
      title: 'Relatório Geral de Servidores',
      description:
        'Listagem completa e estatísticas de funcionários ativos, cargos, vínculos, lotações e aniversariantes da rede.',
      icon: Users,
      badge: 'Recursos Humanos',
      badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      iconColor: 'text-emerald-400',
      bgGradient: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      borderColor: 'border-zinc-800 hover:border-emerald-500/40',
      path: '/relatorios/servidores',
      destaque: false,
    },
    {
      id: 'atividades',
      title: 'Atividades e Diários Pedagógicos',
      description:
        'Acompanhamento de diários de classe, notas trimestrais, entregas de planejamentos e pendências pedagógicas.',
      icon: FileText,
      badge: 'Pedagógico',
      badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      iconColor: 'text-purple-400',
      bgGradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
      borderColor: 'border-zinc-800 hover:border-purple-500/40',
      path: '/relatorios/atividades',
      destaque: false,
    },
    {
      id: 'indicadores',
      title: 'Indicadores & Desempenho da Rede',
      description:
        'Métricas consolidadas de matrículas, frequência escolar, prazos trimestrais e taxa de ocupação das unidades.',
      icon: TrendingUp,
      badge: 'Estatísticas',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      iconColor: 'text-amber-400',
      bgGradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
      borderColor: 'border-zinc-800 hover:border-amber-500/40',
      path: '/admin/indicadores',
      destaque: false,
    },
    {
      id: 'auditoria',
      title: 'Auditoria & Logs de Acesso',
      description:
        'Trilha cronológica de modificações, IPs, histórico de transações administrativas e rastro de navegação.',
      icon: Activity,
      badge: 'Segurança',
      badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      iconColor: 'text-rose-400',
      bgGradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
      borderColor: 'border-zinc-800 hover:border-rose-500/40',
      path: '/admin/logs',
      destaque: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0e] text-zinc-100 p-4 md:p-8 flex flex-col gap-6">
      {/* Topo / Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#26262a] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-[#141416] border border-[#26262a] text-zinc-400 hover:text-zinc-100 hover:bg-[#1a1a1e] transition-colors"
            title="Voltar ao Painel Administrativo"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <span>Administração</span>
              <span>/</span>
              <span className="text-sky-400 font-semibold">Relatórios Administrativos</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2.5">
              Relatórios Administrativos
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141416] border border-[#26262a] text-xs text-zinc-400">
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            Rede Municipal de Sapeaçu
          </span>
        </div>
      </div>

      {/* Grid de Cards de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {relatorios.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.path}
              className={cn(
                'group relative flex flex-col justify-between p-5 rounded-2xl bg-[#141416] border transition-all duration-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 overflow-hidden',
                item.borderColor,
                item.destaque && 'md:col-span-2 lg:col-span-2 bg-gradient-to-br ' + item.bgGradient
              )}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105',
                      item.destaque
                        ? 'bg-sky-500/15 border-sky-500/30'
                        : 'bg-[#1a1a1e] border-[#2d2d32]'
                    )}
                  >
                    <Icon className={cn('w-6 h-6', item.iconColor)} />
                  </div>

                  <span
                    className={cn(
                      'text-[11px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider',
                      item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-zinc-100 group-hover:text-sky-400 transition-colors mb-1.5 flex items-center gap-2">
                    {item.title}
                    {item.destaque && <Sparkles className="w-4 h-4 text-sky-400" />}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-[#26262a]/60 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-sky-400 transition-colors">
                <span>Acessar Relatório</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
