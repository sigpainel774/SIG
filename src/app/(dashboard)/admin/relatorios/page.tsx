'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Route,
  Users,
  FileText,
  TrendingUp,
  Activity,
  ArrowLeft,
  ChevronRight,
  Building2,
  Sparkles,
  Bus,
  DollarSign,
  ScanLine,
  Building,
  Stethoscope,
  Utensils,
  BarChart3,
  CheckCircle2,
  Clock,
  Filter,
  GraduationCap,
  TrendingDown,
  BookOpenCheck,
  Award,
  Heart,
} from 'lucide-react';
import { CardLogsAcessoRelatorios } from '@/components/admin/CardLogsAcessoRelatorios';
import { cn } from '@/lib/utils';

export default function RelatoriosAdministrativosPage() {
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'disponiveis' | 'construcao'>('todos');

  const relatoriosDisponiveis = [
    {
      id: 'produtividade-secretarios',
      title: 'Produtividade dos Secretários Escolares',
      description:
        'Auditoria executiva de novos cadastros de alunos, edições de fichas, volume de trabalho e assiduidade dos secretários da rede.',
      icon: Award,
      badge: 'Exclusivo Nível 1',
      badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30',
      bgGradient: 'from-emerald-500/5 via-emerald-500/0 to-transparent dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-emerald-500/40 dark:border-borderCustom dark:hover:border-emerald-500/40',
      path: '/relatorios/produtividade',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'emaee-estrategico',
      title: 'Relatório Estratégico EMAEE & AEE',
      description:
        'Painel executivo de atendimentos da Educação Especial, censo de neurodesenvolvimento, especialidades clínicas e rede inclusiva.',
      icon: Heart,
      badge: 'Educação Especial',
      badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/15 dark:border-rose-500/30',
      bgGradient: 'from-rose-500/5 via-rose-500/0 to-transparent dark:from-rose-500/10 dark:via-rose-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-rose-500/40 dark:border-borderCustom dark:hover:border-rose-500/40',
      path: '/relatorios',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'frequencia-evasao',
      title: 'Frequência, Assiduidade & Alerta de Evasão',
      description:
        'Monitoramento nominal da rede, identificação de alunos com frequência abaixo de 75%, alertas preventivos e controle de evasão escolar.',
      icon: TrendingDown,
      badge: 'Pedagógico & Evasão',
      badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/15 dark:border-rose-500/30',
      bgGradient: 'from-rose-500/5 via-rose-500/0 to-transparent dark:from-rose-500/10 dark:via-rose-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-rose-500/40 dark:border-borderCustom dark:hover:border-rose-500/40',
      path: '/relatorios',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'matriculas-vagas',
      title: 'Censo de Matrículas & Ocupação de Vagas',
      description:
        'Diagnóstico em tempo real da capacidade física instalada, turmas lotadas, vagas livres e distribuição por etapa de ensino.',
      icon: GraduationCap,
      badge: 'Censo Escolar',
      badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-500/10 border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30',
      bgGradient: 'from-sky-500/5 via-sky-500/0 to-transparent dark:from-sky-500/10 dark:via-sky-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-sky-500/40 dark:border-borderCustom dark:hover:border-sky-500/40',
      path: '/relatorios',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'diarios-classe',
      title: 'Diários de Classe & Cumprimento Curricular BNCC',
      description:
        'Auditoria do preenchimento de planos de aula, registros BNCC por docentes e acompanhamento de chamadas e pendências.',
      icon: BookOpenCheck,
      badge: 'Gestão Pedagógica',
      badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/15 dark:border-purple-500/30',
      bgGradient: 'from-purple-500/5 via-purple-500/0 to-transparent dark:from-purple-500/10 dark:via-purple-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-purple-500/40 dark:border-borderCustom dark:hover:border-purple-500/40',
      path: '/relatorios',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'rotas-escolas',
      title: 'Geolocalização e Rotas de Unidades Escolares',
      description:
        'Mapa interativo de Sapeaçu com localização das escolas municipais e cálculo do melhor roteiro de visitação com estimativa de consumo de gasolina.',
      icon: Route,
      badge: 'Destaque / Logística',
      badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      iconBg: 'bg-sky-500/10 border-sky-500/20 dark:bg-sky-500/15 dark:border-sky-500/30',
      bgGradient: 'from-sky-500/5 via-sky-500/0 to-transparent dark:from-sky-500/10 dark:via-sky-500/5 dark:to-transparent',
      borderColor: 'border-sky-500/30 hover:border-sky-500/60 dark:border-sky-500/30 dark:hover:border-sky-500/60',
      path: '/admin/relatorios/rotas-escolas',
      destaque: true,
      status: 'disponivel' as const,
    },
    {
      id: 'atestados',
      title: 'Recursos Humanos & Afastamentos',
      description:
        'Painel analítico do quadro de servidores, monitoramento de afastamentos e licenças, distribuição de vínculos e relação nominal.',
      icon: Stethoscope,
      badge: 'Recursos Humanos',
      badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30',
      bgGradient: 'from-amber-500/5 via-amber-500/0 to-transparent dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-amber-500/40 dark:border-borderCustom dark:hover:border-amber-500/40',
      path: '/admin/relatorios/atestados',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'servidores',
      title: 'Relatório Geral de Servidores da Rede',
      description:
        'Listagem completa e estatísticas de funcionários ativos, cargos, vínculos, lotações, aniversariantes e discriminado nominal da rede.',
      icon: Users,
      badge: 'Recursos Humanos',
      badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30',
      bgGradient: 'from-emerald-500/5 via-emerald-500/0 to-transparent dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-emerald-500/40 dark:border-borderCustom dark:hover:border-emerald-500/40',
      path: '/relatorios/servidores',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'atividades',
      title: 'Central de Atividades & Auditoria Escolar',
      description:
        'Acompanhamento de registros de diários, matrículas, edições de fichas, alterações em alunos e logs por unidade escolar.',
      icon: FileText,
      badge: 'Auditoria Escolar',
      badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/15 dark:border-purple-500/30',
      bgGradient: 'from-purple-500/5 via-purple-500/0 to-transparent dark:from-purple-500/10 dark:via-purple-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-purple-500/40 dark:border-borderCustom dark:hover:border-purple-500/40',
      path: '/relatorios/atividades',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'indicadores',
      title: 'Indicadores & Desempenho da Rede',
      description:
        'Métricas consolidadas de matrículas, frequência escolar, prazos trimestrais e taxa de ocupação das unidades escolares.',
      icon: TrendingUp,
      badge: 'Estatísticas',
      badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30',
      bgGradient: 'from-amber-500/5 via-amber-500/0 to-transparent dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-amber-500/40 dark:border-borderCustom dark:hover:border-amber-500/40',
      path: '/admin/indicadores',
      destaque: false,
      status: 'disponivel' as const,
    },
    {
      id: 'auditoria',
      title: 'Auditoria Geral & Logs de Acesso',
      description:
        'Trilha cronológica de modificações, endereços de IP, transações administrativas e auditoria de segurança da plataforma.',
      icon: Activity,
      badge: 'Segurança',
      badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/20 dark:bg-rose-500/15 dark:border-rose-500/30',
      bgGradient: 'from-rose-500/5 via-rose-500/0 to-transparent dark:from-rose-500/10 dark:via-rose-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-rose-500/40 dark:border-borderCustom dark:hover:border-rose-500/40',
      path: '/admin/logs',
      destaque: false,
      status: 'disponivel' as const,
    },
  ];

  const relatoriosConstrucao = [
    {
      id: 'transporte',
      title: 'Frota & Transporte Escolar',
      description:
        'Painel gerencial de acompanhamento de rotas, itinerários de ônibus escolares, hodômetro, abastecimento de combustível e alunos atendidos.',
      icon: Bus,
      badge: 'Logística & Frota',
      badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/20 dark:bg-amber-500/15 dark:border-amber-500/30',
      bgGradient: 'from-amber-500/5 via-amber-500/0 to-transparent dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-amber-500/40 dark:border-borderCustom dark:hover:border-amber-500/40',
      path: '/admin/relatorios/transporte',
      destaque: false,
      status: 'construcao' as const,
    },
    {
      id: 'financeiro',
      title: 'Finanças & Prestação de Contas',
      description:
        'Relatórios e balancetes do fluxo de caixa escolar, receitas, despesas, repasses do PDDE e prestação de contas das unidades.',
      icon: DollarSign,
      badge: 'Financeiro',
      badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20 dark:bg-emerald-500/15 dark:border-emerald-500/30',
      bgGradient: 'from-emerald-500/5 via-emerald-500/0 to-transparent dark:from-emerald-500/10 dark:via-emerald-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-emerald-500/40 dark:border-borderCustom dark:hover:border-emerald-500/40',
      path: '/admin/relatorios/financeiro',
      destaque: false,
      status: 'construcao' as const,
    },
    {
      id: 'rondas',
      title: 'Segurança & Rondas Noturnas',
      description:
        'Acompanhamento do cumprimento de escalas de vigilantes, rondas noturnas, checkpoints geolocalizados e ocorrências patrimoniais.',
      icon: ScanLine,
      badge: 'Segurança Patrimonial',
      badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/25 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20 dark:bg-cyan-500/15 dark:border-cyan-500/30',
      bgGradient: 'from-cyan-500/5 via-cyan-500/0 to-transparent dark:from-cyan-500/10 dark:via-cyan-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-cyan-500/40 dark:border-borderCustom dark:hover:border-cyan-500/40',
      path: '/admin/relatorios/rondas',
      destaque: false,
      status: 'construcao' as const,
    },
    {
      id: 'censo',
      title: 'Infraestrutura & Censo Escolar',
      description:
        'Diagnóstico completo das instalações físicas, salas ativas, acessibilidade, laboratórios e capacidade de atendimento das escolas.',
      icon: Building,
      badge: 'Infraestrutura',
      badgeColor: 'bg-blue-500/10 text-blue-700 border-blue-500/25 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/10 border-blue-500/20 dark:bg-blue-500/15 dark:border-blue-500/30',
      bgGradient: 'from-blue-500/5 via-blue-500/0 to-transparent dark:from-blue-500/10 dark:via-blue-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-blue-500/40 dark:border-borderCustom dark:hover:border-blue-500/40',
      path: '/admin/relatorios/censo',
      destaque: false,
      status: 'construcao' as const,
    },

    {
      id: 'merenda',
      title: 'Alimentação & Merenda Escolar',
      description:
        'Gestão de estoque de alimentos, cardápios nutricionais, controle de entregas por unidade e prestação de contas do PNAE.',
      icon: Utensils,
      badge: 'Nutrição & Suprimentos',
      badgeColor: 'bg-lime-500/10 text-lime-700 border-lime-500/25 dark:bg-lime-500/15 dark:text-lime-400 dark:border-lime-500/30',
      iconColor: 'text-lime-600 dark:text-lime-400',
      iconBg: 'bg-lime-500/10 border-lime-500/20 dark:bg-lime-500/15 dark:border-lime-500/30',
      bgGradient: 'from-lime-500/5 via-lime-500/0 to-transparent dark:from-lime-500/10 dark:via-lime-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-lime-500/40 dark:border-borderCustom dark:hover:border-lime-500/40',
      path: '/admin/relatorios/merenda',
      destaque: false,
      status: 'construcao' as const,
    },
    {
      id: 'patrimonio',
      title: 'Patrimônio & Almoxarifado',
      description:
        'Tombamento de bens, mobiliário escolar, equipamentos eletrônicos e controle de transferências de patrimônio entre secretarias.',
      icon: BarChart3,
      badge: 'Patrimônio',
      badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/20 dark:bg-purple-500/15 dark:border-purple-500/30',
      bgGradient: 'from-purple-500/5 via-purple-500/0 to-transparent dark:from-purple-500/10 dark:via-purple-500/5 dark:to-transparent',
      borderColor: 'border-border hover:border-purple-500/40 dark:border-borderCustom dark:hover:border-purple-500/40',
      path: '/admin/relatorios/patrimonio',
      destaque: false,
      status: 'construcao' as const,
    },
  ];

  const todosRelatorios = [...relatoriosDisponiveis, ...relatoriosConstrucao];

  const relatoriosExibidos = todosRelatorios.filter((item) => {
    if (filtroStatus === 'disponiveis') return item.status === 'disponivel';
    if (filtroStatus === 'construcao') return item.status === 'construcao';
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-background text-foreground p-4 md:p-8 flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Topo / Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors"
            title="Voltar ao Painel Administrativo"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/admin" className="hover:text-foreground transition-colors">
                Administração
              </Link>
              <span>/</span>
              <span className="text-sky-600 dark:text-sky-400 font-semibold">
                Relatórios Administrativos
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              Relatórios Administrativos
            </h1>
          </div>
        </div>

        {/* Filtros de Status & Identificação */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border shadow-2xs">
            <button
              type="button"
              onClick={() => setFiltroStatus('todos')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                filtroStatus === 'todos'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Todos ({todosRelatorios.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('disponiveis')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
                filtroStatus === 'disponiveis'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Disponíveis ({relatoriosDisponiveis.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('construcao')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
                filtroStatus === 'construcao'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Em Construção ({relatoriosConstrucao.length})
            </button>
          </div>

          <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-xs text-muted-foreground">
            <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            Rede Municipal de Sapeaçu
          </span>
        </div>
      </div>

      {/* Grid de Cards de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {relatoriosExibidos.map((item) => {
          const Icon = item.icon;
          const isConstrucao = item.status === 'construcao';

          return (
            <Link
              key={item.id}
              href={item.path}
              className={cn(
                'group relative flex flex-col justify-between p-5 rounded-2xl bg-card border transition-all duration-200 shadow-2xs hover:shadow-lg hover:-translate-y-0.5 overflow-hidden',
                item.borderColor,
                item.destaque &&
                  'md:col-span-2 lg:col-span-2 bg-gradient-to-br ' + item.bgGradient
              )}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform duration-200 group-hover:scale-105',
                      item.iconBg
                    )}
                  >
                    <Icon className={cn('w-6 h-6', item.iconColor)} />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'text-[11px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider',
                        item.badgeColor
                      )}
                    >
                      {item.badge}
                    </span>
                    {isConstrucao && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 uppercase tracking-wider">
                        Em Breve
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors mb-1.5 flex items-center gap-2">
                    {item.title}
                    {item.destaque && (
                      <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-border flex items-center justify-between text-xs font-semibold text-muted-foreground group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                <span>
                  {isConstrucao ? 'Ver Detalhes do Desenvolvimento' : 'Acessar Relatório'}
                </span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Auditoria de Acessos ao Relatório Estratégico EMAEE (LGPD) ── */}
      <div className="mt-12">
        <CardLogsAcessoRelatorios />
      </div>
    </div>
  );
}
