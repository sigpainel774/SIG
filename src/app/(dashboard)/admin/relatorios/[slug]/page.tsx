'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  Bus,
  DollarSign,
  ScanLine,
  Building,
  Stethoscope,
  Utensils,
  BarChart3,
  FileText,
  TrendingUp,
  Activity,
  Users,
} from 'lucide-react';
import { RelatorioEmConstrucao } from '@/components/relatorios/RelatorioEmConstrucao';

interface RelatorioMeta {
  title: string;
  category: string;
  description: string;
  icon: any;
  badgeColor: string;
  iconColor: string;
  estimatedQuarter?: string;
  recursosPlanejados: string[];
}

const relatoriosMeta: Record<string, RelatorioMeta> = {
  transporte: {
    title: 'Frota & Transporte Escolar',
    category: 'Logística & Frota',
    description:
      'Painel gerencial de acompanhamento de rotas, itinerários de ônibus escolares, hodômetro, abastecimento de combustível e alunos atendidos.',
    icon: Bus,
    badgeColor: 'bg-amber-500/10 text-amber-700 border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    estimatedQuarter: 'Roadmap SIG 2026',
    recursosPlanejados: [
      'Relatório de consumo médio de diesel e custos de combustível por veículo',
      'Mapeamento de alunos enturmados por rota e ponto de embarque',
      'Histórico de manutenções preventivas e revisões periódicas da frota',
      'Emissão de relatórios consolidados para prestação de contas do PNATE/FNDE',
      'Exportação para Excel e PDF com visualização tabular',
    ],
  },
  financeiro: {
    title: 'Finanças & Prestação de Contas',
    category: 'Financeiro',
    description:
      'Relatórios e balancetes do fluxo de caixa escolar, receitas, despesas, repasses do PDDE e prestação de contas das unidades.',
    icon: DollarSign,
    badgeColor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    estimatedQuarter: 'Roadmap SIG 2026',
    recursosPlanejados: [
      'Balanço discriminado de entradas e saídas por escola e conta bancária',
      'Comprovantes digitalizados anexados com controle de liquidação',
      'Demonstrativo consolidado por categoria de despesa e centro de custo',
      'Emissão de relatórios em formato padrão do Tribunal de Contas (TCM)',
      'Exportação contábil para arquivos XLSX e CSV',
    ],
  },
  rondas: {
    title: 'Segurança & Rondas Noturnas',
    category: 'Segurança Patrimonial',
    description:
      'Acompanhamento do cumprimento de escalas de vigilantes, rondas noturnas, checkpoints geolocalizados e ocorrências patrimoniais.',
    icon: ScanLine,
    badgeColor: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/25 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    estimatedQuarter: 'Roadmap SIG 2026',
    recursosPlanejados: [
      'Mapa de calor de rondas e horários de passagens por escola',
      'Relatório de conformidade de escala e registro fotográfico de ocorrências',
      'Controle de pontos de ronda atingidos via aplicativo mobile',
      'Exportação de relatórios para o comando de vigilância municipal',
    ],
  },
  censo: {
    title: 'Infraestrutura & Censo Escolar',
    category: 'Infraestrutura',
    description:
      'Diagnóstico completo das instalações físicas, salas ativas, acessibilidade, laboratórios e capacidade de atendimento das escolas.',
    icon: Building,
    badgeColor: 'bg-blue-500/10 text-blue-700 border-blue-500/25 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    estimatedQuarter: 'Roadmap SIG 2026',
    recursosPlanejados: [
      'Relatório de capacidade de turmas versus alunos matriculados por sala',
      'Quadro de equipamentos, conectividade e laboratórios de informática',
      'Indicadores de acessibilidade e adaptações para alunos do EMAEE',
      'Exportação de dados no formato do Censo Escolar / Educacenso',
    ],
  },
  atestados: {
    title: 'Atestados & Afastamentos de Servidores',
    category: 'Recursos Humanos',
    description:
      'Estatísticas e gráficos de afastamentos médicos, licenças de servidores, mapa de CIDs recorrentes e impacto na escala docente.',
    icon: Stethoscope,
    badgeColor: 'bg-rose-500/10 text-rose-700 border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    estimatedQuarter: 'Roadmap SIG 2026',
    recursosPlanejados: [
      'Gráfico de distribuição de licenças por período e cargo do servidor',
      'Mapeamento de CIDs de maior recorrência com proteção LGPD',
      'Quadro de substituições docentes e alertas de retorno ao trabalho',
      'Emissão de relatórios para a Junta Médica Municipal',
    ],
  },
  merenda: {
    title: 'Alimentação & Merenda Escolar',
    category: 'Nutrição & Suprimentos',
    description:
      'Gestão de estoque de alimentos, cardápios nutricionais, controle de entregas por unidade e prestação de contas do PNAE.',
    icon: Utensils,
    badgeColor: 'bg-lime-500/10 text-lime-700 border-lime-500/25 dark:bg-lime-500/15 dark:text-lime-400 dark:border-lime-500/30',
    iconColor: 'text-lime-600 dark:text-lime-400',
    estimatedQuarter: 'Roadmap SIG 2026',
    recursosPlanejados: [
      'Controle de validade e saldo em estoque de gêneros alimentícios',
      'Cardápio nutricional trimestral parametrizado por faixa etária',
      'Relatório de entrega e recebimento de merenda assinado pelos diretores',
      'Consolidação de dados para o Conselho de Alimentação Escolar (CAE)',
    ],
  },
  patrimonio: {
    title: 'Patrimônio & Almoxarifado',
    category: 'Patrimônio',
    description:
      'Tombamento de bens, mobiliário escolar, equipamentos eletrônicos e controle de transferências de patrimônio entre secretarias.',
    icon: BarChart3,
    badgeColor: 'bg-purple-500/10 text-purple-700 border-purple-500/25 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    estimatedQuarter: 'Roadmap SIG 2026',
    recursosPlanejados: [
      'Inventário completo de itens tombados por escola e setor',
      'Rastreamento de movimentações e termos de responsabilidade',
      'Relatórios de descarte e baixa patrimonial',
    ],
  },
};

export default function RelatorioGenericoSlugPage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  const meta = relatoriosMeta[slug] || {
    title: `Relatório ${slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')}`,
    category: 'Administrativo',
    description:
      'Este relatório administrativo está no planejamento de desenvolvimento do SIG e será disponibilizado nas próximas atualizações da plataforma.',
    icon: BarChart3,
    badgeColor: 'bg-sky-500/10 text-sky-700 border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
    estimatedQuarter: 'Roadmap Oficial 2026',
    recursosPlanejados: [
      'Painel com filtros consolidados por período, escola e secretaria',
      'Gráficos estatísticos interativos e distribuição percentual',
      'Exportação automatizada para planilhas Excel (.xlsx) e CSV',
      'Geração e emissão de relatório em PDF para impressão oficial',
      'Trilha de auditoria e conformidade com a LGPD',
    ],
  };

  return (
    <RelatorioEmConstrucao
      title={meta.title}
      category={meta.category}
      description={meta.description}
      icon={meta.icon}
      badgeColor={meta.badgeColor}
      iconColor={meta.iconColor}
      estimatedQuarter={meta.estimatedQuarter}
      recursosPlanejados={meta.recursosPlanejados}
    />
  );
}
