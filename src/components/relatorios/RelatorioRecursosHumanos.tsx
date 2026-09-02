'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useSchoolStore } from '@/store/useSchoolStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Users, UserX, UserCheck, Briefcase, Building2, PieChart as PieChartIcon, Filter, RefreshCw, Search, Printer, FileSpreadsheet, AlertCircle, Stethoscope, Info, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StandardTable, TableColumn } from '@/components/ui/table';
import { StandardDialog } from '@/components/ui/standard-dialog';
import { PrintHeader } from '@/components/print/print-header';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export interface ServidorRHItem {
  id: string;
  vinculo_id?: string;
  nome: string;
  cpf: string | null;
  cargo: string;
  status: 'ativo' | 'afastado' | string;
  tipo_vinculo: string;
  modalidade_ensino: string;
  escola_id?: string | null;
  escola_nome: string;
  data_admissao?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface AtestadoItem {
  id: string;
  funcionario_id: string;
  funcionario_nome?: string;
  funcionario_cargo?: string;
  escola_id: string;
  escola_nome?: string;
  cid: string;
  dias_afastamento: number;
  data_inclusao: string;
  status: string;
  anexo_url?: string | null;
  anexo_nome?: string | null;
}

const COLORS_STATUS = {
  ativo: '#10b981',
  afastado: '#f59e0b',
};

const COLORS_VINCULOS: Record<string, string> = {
  'Concursado / Efetivo': '#3b82f6',
  'Contratado': '#10b981',
  'Nomeado': '#8b5cf6',
  'Outros': '#f97316',
};

export default function RelatorioRecursosHumanos() {
  const supabase = createClient();
  const { escolas, selectedEscola, selectedSecretaria } = useSchoolStore();
  const { acessos, isAdminGlobalOrRoot, escolaAtivaId, funcionario, vinculos } = useAuthStore();

  const isSuperAdmin = Boolean(funcionario?.is_superadmin);
  const isNivel1 = !isSuperAdmin && Boolean(acessos?.some((a) => a.nivel === 1 && a.ativo));
  const isSuperAdminOrNivel1 = isSuperAdmin || isNivel1;

  const secretariasIdsNivel1 = useMemo<string[] | null>(() => {
    if (!isNivel1) return null;
    const acs = acessos?.filter((a) => a.nivel === 1 && a.ativo) || [];
    const ids = acs.flatMap((a) => (a as any).secretarias_ids || []).filter(Boolean);
    return ids.length > 0 ? ids : null;
  }, [isNivel1, acessos]);

  const escolasPermitidas = useMemo(() => {
    const escolasOficiais = escolas.filter((e) => !e.is_teste);
    if (isSuperAdmin) return escolasOficiais;

    if (isNivel1) {
      if (secretariasIdsNivel1 && secretariasIdsNivel1.length > 0) {
        return escolasOficiais.filter((e) => e.secretaria_id && secretariasIdsNivel1.includes(e.secretaria_id));
      }
      if (selectedSecretaria?.id) {
        return escolasOficiais.filter((e) => e.secretaria_id === selectedSecretaria.id);
      }
      const cargoNorm = (funcionario?.cargo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const isCargoSaude = /saude/i.test(cargoNorm);
      if (isCargoSaude) {
        return escolasOficiais.filter((e) => {
          const secNome = e.secretariaNome || (e.secretarias as any)?.nome || '';
          return /sa[uú]de/i.test(secNome) || e.tipo === 'SAUDE' || e.tipo === 'UNIDADE_SAUDE';
        });
      }
      return escolasOficiais.filter((e) => {
        const secNome = e.secretariaNome || (e.secretarias as any)?.nome || '';
        return !/sa[uú]de/i.test(secNome) && e.tipo !== 'SAUDE' && e.tipo !== 'UNIDADE_SAUDE';
      });
    }

    const vinculosAtivos = vinculos?.filter((v) => v.ativo) || [];
    const allowedSchoolIds = new Set([
      ...vinculosAtivos.map((v) => v.escola_id),
      ...(acessos?.filter((a) => a.ativo && a.escola_id).map((a) => a.escola_id as string) || []),
    ]);
    if (allowedSchoolIds.size > 0) {
      return escolasOficiais.filter((e) => allowedSchoolIds.has(e.id));
    }
    return [];
  }, [escolas, isSuperAdmin, isNivel1, secretariasIdsNivel1, selectedSecretaria?.id, funcionario?.cargo, vinculos, acessos]);

  const [activeTab, setActiveTab] = useState<'visao-geral' | 'afastados' | 'quadro-geral' | 'atestados'>('visao-geral');
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [filtroEscolaId, setFiltroEscolaId] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [filtroCargo, setFiltroCargo] = useState<string>('');
  const [filtroVinculo, setFiltroVinculo] = useState<string>('Todos');
  const [filtroModalidade, setFiltroModalidade] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dados
  const [servidores, setServidores] = useState<ServidorRHItem[]>([]);
  const [atestados, setAtestados] = useState<AtestadoItem[]>([]);
  const [resumoData, setResumoData] = useState({
    total_servidores_unicos: 0,
    total_cargos_ocupados: 0,
    total_ativos: 0,
    total_afastados: 0,
    taxa_afastamento: 0,
    total_contratados: 0,
    total_concursados: 0,
    total_nomeados: 0,
    total_outros: 0,
    total_regular: 0,
    total_eja: 0,
  });
  const [cargosBreakdown, setCargosBreakdown] = useState<any[]>([]);

  // Modal de Detalhes do Servidor
  const [selectedServidor, setSelectedServidor] = useState<ServidorRHItem | null>(null);
  const [isDetalhesModalOpen, setIsDetalhesModalOpen] = useState(false);

  // Modal de Impressão Oficial
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModo, setPrintModo] = useState<'sintetico' | 'afastados' | 'geral'>('sintetico');

  const requestCounter = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sincroniza escola
  useEffect(() => {
    const escolaIdAlvo = selectedEscola?.id || escolaAtivaId || '';
    if (isSuperAdminOrNivel1) {
      setFiltroEscolaId(selectedEscola?.id || '');
    } else {
      setFiltroEscolaId(escolaIdAlvo);
    }
  }, [selectedEscola, escolaAtivaId, isSuperAdminOrNivel1]);

  // Carrega dados principais de RH
  const loadDadosRH = useCallback(async () => {
    if (!isMountedRef.current) return;
    const currentReq = ++requestCounter.current;
    setIsLoading(true);

    try {
      // 1. RPC de Resumo e Distribuição
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_relatorio_servidores', {
        p_escola_id: filtroEscolaId || undefined,
        p_cargo: filtroCargo || undefined,
        p_modalidade: filtroModalidade === 'Todos' ? undefined : filtroModalidade,
        p_vinculo_tipo: filtroVinculo === 'Todos' ? undefined : filtroVinculo,
        p_status: filtroStatus === 'Todos' ? undefined : filtroStatus,
      });

      if (!isMountedRef.current || currentReq !== requestCounter.current) return;

      if (rpcError) {
        console.error('Erro ao buscar RPC get_relatorio_servidores:', rpcError);
      } else if (rpcData) {
        const payload = rpcData as any;
        if (payload.resumo) {
          setResumoData(payload.resumo);
        }
        if (Array.isArray(payload.cargos)) {
          setCargosBreakdown(payload.cargos);
        }
      }

      // 2. Consulta aos Funcionários para listagem nominal
      const { data: rawFuncs, error: funcError } = await supabase
        .from('funcionarios')
        .select(`
          id,
          nome,
          cpf,
          cargo,
          status,
          tipo_vinculo,
          modalidade_ensino,
          telefone,
          email,
          data_admissao,
          is_conta_especial,
          deleted_at,
          vinculos_funcionarios (
            id,
            cargo,
            ativo,
            escola_id,
            escolas (id, nome)
          )
        `)
        .is('deleted_at', null)
        .eq('is_conta_especial', false);

      if (!isMountedRef.current || currentReq !== requestCounter.current) return;

      if (funcError) {
        console.error('Erro ao buscar lista de servidores:', funcError);
        toast.error('Erro ao carregar relação de servidores.');
      } else if (rawFuncs) {
        const listaMapeada: ServidorRHItem[] = [];

        (rawFuncs as any[]).forEach((f) => {
          const vinculosAtivos = (f.vinculos_funcionarios || []).filter((v: any) => v.ativo);

          const tipoVincUpper = (f.tipo_vinculo ?? '').toUpperCase();
          let vinculoTipoFinal = 'Outros';
          if (tipoVincUpper.includes('EFETIVO') || tipoVincUpper.includes('CONCURSADO')) {
            vinculoTipoFinal = 'Concursado / Efetivo';
          } else if (
            tipoVincUpper.includes('CONTRATADO') ||
            tipoVincUpper.includes('SUBSTITUTO') ||
            tipoVincUpper.includes('PRESTADOR') ||
            tipoVincUpper.includes('RESERVISTA')
          ) {
            vinculoTipoFinal = 'Contratado';
          } else if (tipoVincUpper.includes('NOMEADO')) {
            vinculoTipoFinal = 'Nomeado';
          }

          const statusNormalizado = (f.status ?? 'ativo').trim().toLowerCase();

          if (vinculosAtivos.length > 0) {
            vinculosAtivos.forEach((v: any) => {
              listaMapeada.push({
                id: f.id,
                vinculo_id: v.id,
                nome: f.nome,
                cpf: f.cpf,
                cargo: (v.cargo || f.cargo || 'Cargo não informado').trim(),
                status: statusNormalizado,
                tipo_vinculo: vinculoTipoFinal,
                modalidade_ensino: f.modalidade_ensino ?? 'Regular',
                escola_id: v.escolas?.id ?? v.escola_id ?? null,
                escola_nome: v.escolas?.nome ?? 'Escola Não Informada',
                data_admissao: f.data_admissao,
                telefone: f.telefone,
                email: f.email,
              });
            });
          } else {
            listaMapeada.push({
              id: f.id,
              nome: f.nome,
              cpf: f.cpf,
              cargo: (f.cargo || 'Cargo não informado').trim(),
              status: statusNormalizado,
              tipo_vinculo: vinculoTipoFinal,
              modalidade_ensino: f.modalidade_ensino ?? 'Regular',
              escola_id: null,
              escola_nome: 'Secretaria / Sem Lotação Escolar',
              data_admissao: f.data_admissao,
              telefone: f.telefone,
              email: f.email,
            });
          }
        });

        setServidores(listaMapeada);
      }

      // 3. Consulta de Atestados
      const { data: rawAtestados, error: atestadoError } = await supabase
        .from('atestados')
        .select(`
          id,
          funcionario_id,
          escola_id,
          cid,
          dias_afastamento,
          data_inclusao,
          status,
          anexo_url,
          anexo_nome,
          funcionarios (nome, cargo),
          escolas (nome)
        `)
        .order('data_inclusao', { ascending: false });

      if (!isMountedRef.current || currentReq !== requestCounter.current) return;

      if (atestadoError) {
        console.error('[RelatorioRH] Erro ao buscar atestados:', atestadoError.message);
        toast.error('Erro ao carregar dados de atestados do servidor.');
      } else if (rawAtestados) {
        const atestadosMapeados: AtestadoItem[] = (rawAtestados as any[]).map((a) => ({
          id: a.id,
          funcionario_id: a.funcionario_id,
          funcionario_nome: a.funcionarios?.nome ?? 'Servidor não identificado',
          funcionario_cargo: a.funcionarios?.cargo ?? 'Cargo não informado',
          escola_id: a.escola_id,
          escola_nome: a.escolas?.nome ?? 'Escola não informada',
          cid: a.cid,
          dias_afastamento: a.dias_afastamento,
          data_inclusao: a.data_inclusao,
          status: a.status ?? 'Em Análise',
          anexo_url: a.anexo_url,
          anexo_nome: a.anexo_nome,
        }));
        setAtestados(atestadosMapeados);
      }
    } catch (err) {
      if (!isMountedRef.current || currentReq !== requestCounter.current) return;
      console.error('Exceção ao carregar dados de RH:', err);
      toast.error('Ocorreu um erro ao processar o relatório.');
    } finally {
      if (isMountedRef.current && currentReq === requestCounter.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, filtroEscolaId, filtroCargo, filtroModalidade, filtroVinculo, filtroStatus]);

  useEffect(() => {
    loadDadosRH();
  }, [loadDadosRH]);

  // Lista única de cargos para o filtro
  const listaCargos = useMemo(() => {
    const cargosSet = new Set<string>();
    servidores.forEach((s) => {
      if (s.cargo) cargosSet.add(s.cargo);
    });
    return Array.from(cargosSet).sort();
  }, [servidores]);

  // Filtragem no cliente para as tabelas
  const servidoresFiltrados = useMemo(() => {
    return servidores.filter((s) => {
      if (filtroEscolaId && s.escola_id !== filtroEscolaId) return false;
      if (filtroStatus === 'ativo' && s.status !== 'ativo') return false;
      if (filtroStatus === 'afastado' && s.status !== 'afastado') return false;
      if (filtroCargo && s.cargo.toLowerCase() !== filtroCargo.toLowerCase()) return false;
      if (filtroVinculo !== 'Todos' && !s.tipo_vinculo.toLowerCase().includes(filtroVinculo.toLowerCase())) {
        return false;
      }
      if (filtroModalidade !== 'Todos') {
        if (filtroModalidade === 'EJA' && !s.modalidade_ensino.toUpperCase().includes('EJA') && !s.cargo.toUpperCase().includes('EJA')) {
          return false;
        }
        if (filtroModalidade === 'Regular' && (s.modalidade_ensino.toUpperCase().includes('EJA') || s.cargo.toUpperCase().includes('EJA'))) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const termo = searchTerm.toLowerCase().trim();
        const nomeMatch = s.nome.toLowerCase().includes(termo);
        const cpfMatch = s.cpf ? s.cpf.includes(termo) : false;
        const cargoMatch = s.cargo.toLowerCase().includes(termo);
        const escolaMatch = s.escola_nome.toLowerCase().includes(termo);
        if (!nomeMatch && !cpfMatch && !cargoMatch && !escolaMatch) return false;
      }
      return true;
    });
  }, [servidores, filtroEscolaId, filtroStatus, filtroCargo, filtroVinculo, filtroModalidade, searchTerm]);

  const servidoresAfastados = useMemo(() => {
    return servidoresFiltrados.filter((s) => s.status === 'afastado');
  }, [servidoresFiltrados]);

  const nomeEscolaAtiva = useMemo(() => {
    if (selectedEscola) return selectedEscola.nome;
    if (filtroEscolaId) {
      const esc = escolasPermitidas.find((e) => e.id === filtroEscolaId);
      if (esc) return esc.nome;
    }
    if (isSuperAdmin) return 'Rede Municipal (Todas as Secretarias)';
    return `${selectedSecretaria?.nome || 'Secretaria Municipal de Educação'} (Todas as Escolas)`;
  }, [selectedEscola, filtroEscolaId, escolasPermitidas, isSuperAdmin, selectedSecretaria?.nome]);

  const chartDataStatus = useMemo(() => {
    return [
      { name: 'Em Exercício Ativo', value: resumoData.total_ativos, color: COLORS_STATUS.ativo },
      { name: 'Afastados / Licença', value: resumoData.total_afastados, color: COLORS_STATUS.afastado },
    ].filter((d) => d.value > 0);
  }, [resumoData]);

  const chartDataVinculos = useMemo(() => {
    return [
      { name: 'Concursados', value: resumoData.total_concursados, color: COLORS_VINCULOS['Concursado / Efetivo'] },
      { name: 'Contratados', value: resumoData.total_contratados, color: COLORS_VINCULOS['Contratado'] },
      { name: 'Nomeados', value: resumoData.total_nomeados, color: COLORS_VINCULOS['Nomeado'] },
      { name: 'Outros', value: resumoData.total_outros, color: COLORS_VINCULOS['Outros'] },
    ].filter((d) => d.value > 0);
  }, [resumoData]);

  const handleExportarCSV = () => {
    if (servidoresFiltrados.length === 0) {
      toast.error('Nenhum servidor disponível para exportação.');
      return;
    }

    const headers = ['Nome', 'CPF', 'Cargo', 'Status', 'Tipo de Vínculo', 'Modalidade', 'Lotação / Escola'];
    const rows = servidoresFiltrados.map((s) => [
      `"${s.nome}"`,
      `"${s.cpf ?? ''}"`,
      `"${s.cargo}"`,
      `"${s.status.toUpperCase()}"`,
      `"${s.tipo_vinculo}"`,
      `"${s.modalidade_ensino}"`,
      `"${s.escola_nome}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_rh_servidores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Planilha CSV gerada com sucesso!');
  };

  const colunasAfastados: TableColumn<ServidorRHItem>[] = [
    {
      header: 'Servidor',
      accessor: (item: ServidorRHItem) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.nome}</span>
          <span className="text-xs text-muted-foreground">
            CPF: {item.cpf ? `${item.cpf.slice(0, 7)}***-**` : 'Não informado'}
          </span>
        </div>
      ),
    },
    {
      header: 'Cargo / Função',
      accessor: (item: ServidorRHItem) => (
        <div className="flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{item.cargo}</span>
        </div>
      ),
    },
    {
      header: 'Unidade de Lotação',
      accessor: (item: ServidorRHItem) => (
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-amber-500/80" />
          <span className="text-sm">{item.escola_nome}</span>
        </div>
      ),
    },
    {
      header: 'Vínculo',
      accessor: (item: ServidorRHItem) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border">
          {item.tipo_vinculo}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: () => (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <UserX className="w-3 h-3" />
          Afastado
        </span>
      ),
    },
    {
      header: 'Ações',
      className: 'text-right',
      accessor: (item: ServidorRHItem) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-border hover:bg-hoverCustom"
          onClick={() => {
            setSelectedServidor(item);
            setIsDetalhesModalOpen(true);
          }}
        >
          <Info className="w-3.5 h-3.5 mr-1" />
          Detalhes
        </Button>
      ),
    },
  ];

  const colunasGeral: TableColumn<ServidorRHItem>[] = [
    {
      header: 'Servidor',
      accessor: (item: ServidorRHItem) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.nome}</span>
          <span className="text-xs text-muted-foreground">
            CPF: {item.cpf ? `${item.cpf.slice(0, 7)}***-**` : 'Não informado'}
          </span>
        </div>
      ),
    },
    {
      header: 'Cargo / Função',
      accessor: (item: ServidorRHItem) => (
        <span className="text-sm font-medium">{item.cargo}</span>
      ),
    },
    {
      header: 'Lotação Escolar',
      accessor: (item: ServidorRHItem) => (
        <span className="text-sm text-muted-foreground">{item.escola_nome}</span>
      ),
    },
    {
      header: 'Vínculo',
      accessor: (item: ServidorRHItem) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-card border border-border">
          {item.tipo_vinculo}
        </span>
      ),
    },
    {
      header: 'Status Funcional',
      accessor: (item: ServidorRHItem) => {
        const isAfastado = item.status === 'afastado';
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
              isAfastado
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            )}
          >
            {isAfastado ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
            {isAfastado ? 'Afastado' : 'Ativo'}
          </span>
        );
      },
    },
    {
      header: 'Ações',
      className: 'text-right',
      accessor: (item: ServidorRHItem) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs border-border hover:bg-hoverCustom"
          onClick={() => {
            setSelectedServidor(item);
            setIsDetalhesModalOpen(true);
          }}
        >
          <Info className="w-3.5 h-3.5 mr-1" />
          Detalhes
        </Button>
      ),
    },
  ];

  const colunasAtestados: TableColumn<AtestadoItem>[] = [
    {
      header: 'Servidor',
      accessor: (item: AtestadoItem) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.funcionario_nome}</span>
          <span className="text-xs text-muted-foreground">{item.funcionario_cargo}</span>
        </div>
      ),
    },
    {
      header: 'CID / Diagnóstico',
      accessor: (item: AtestadoItem) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-secondary border border-border">
          {item.cid}
        </span>
      ),
    },
    {
      header: 'Período',
      accessor: (item: AtestadoItem) => (
        <span className="text-sm font-medium">
          {item.dias_afastamento} {item.dias_afastamento === 1 ? 'dia' : 'dias'}
        </span>
      ),
    },
    {
      header: 'Unidade Escolar',
      accessor: (item: AtestadoItem) => (
        <span className="text-sm text-muted-foreground">{item.escola_nome}</span>
      ),
    },
    {
      header: 'Data de Inclusão',
      accessor: (item: AtestadoItem) => (
        <span className="text-xs text-muted-foreground">
          {new Date(item.data_inclusao).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      header: 'Status da Licença',
      accessor: (item: AtestadoItem) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card border border-border">
          {item.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Filtros Globais */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-semibold text-foreground">Filtros de Recursos Humanos</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadDadosRH}
              disabled={isLoading}
              className="h-9 gap-1.5 border-border hover:bg-hoverCustom"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              Atualizar
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportarCSV}
              className="h-9 gap-1.5 border-border hover:bg-hoverCustom text-emerald-600 dark:text-emerald-400"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar CSV
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setPrintModo('sintetico');
                setIsPrintModalOpen(true);
              }}
              className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Relatório
            </Button>
          </div>
        </div>

        {/* Grid de Seletores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-border">
          {/* Seletor de Escola */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Unidade Escolar</label>
            <select
              value={filtroEscolaId}
              onChange={(e) => setFiltroEscolaId(e.target.value)}
              disabled={!isSuperAdminOrNivel1 && !!selectedEscola}
              className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {isSuperAdmin && <option value="">Rede Municipal (Todas as Secretarias)</option>}
              {isNivel1 && <option value="">{selectedSecretaria?.nome || 'Secretaria Municipal de Educação'} (Todas as Escolas)</option>}
              {!isSuperAdmin && !isNivel1 && <option value="">Todas as Unidades Autorizadas</option>}
              {escolasPermitidas.map((esc) => (
                <option key={esc.id} value={esc.id}>
                  {esc.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Status Funcional</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Todos">Todos os Status</option>
              <option value="ativo">Em Exercício (Ativo)</option>
              <option value="afastado">Afastado / Licença</option>
            </select>
          </div>

          {/* Seletor de Cargo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cargo / Função</label>
            <select
              value={filtroCargo}
              onChange={(e) => setFiltroCargo(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Todos os Cargos</option>
              {listaCargos.map((cargo) => (
                <option key={cargo} value={cargo}>
                  {cargo}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Vínculo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de Vínculo</label>
            <select
              value={filtroVinculo}
              onChange={(e) => setFiltroVinculo(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Todos">Todos os Vínculos</option>
              <option value="Concursado">Concursado / Efetivo</option>
              <option value="Contratado">Contratado</option>
              <option value="Nomeado">Nomeado</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          {/* Busca Rápida */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Busca Rápida</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 text-sm bg-background border-border"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Métricas / KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Geral de Servidores */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total de Servidores</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {isLoading ? '...' : resumoData.total_servidores_unicos}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {resumoData.total_cargos_ocupados} lotações/vínculos
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Servidores Ativos */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Servidores Ativos</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {isLoading ? '...' : resumoData.total_ativos}
            </h3>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              Em pleno exercício escolar
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Servidores Afastados */}
        <div className="bg-card border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-sm bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Servidores Afastados</p>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                Atenção
              </span>
            </div>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {isLoading ? '...' : resumoData.total_afastados}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Taxa de afastamento: <span className="font-semibold text-amber-600 dark:text-amber-400">{resumoData.taxa_afastamento}%</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <UserX className="w-6 h-6" />
          </div>
        </div>

        {/* Quadro Efetivo vs Contratado */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Distribuição de Vínculos</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {isLoading ? '...' : `${resumoData.total_concursados} / ${resumoData.total_contratados}`}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Efetivos vs Contratados
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('visao-geral')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
            activeTab === 'visao-geral'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <PieChartIcon className="w-4 h-4" />
          Visão Geral & Gráficos
        </button>

        <button
          onClick={() => setActiveTab('afastados')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap relative',
            activeTab === 'afastados'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <UserX className="w-4 h-4 text-amber-400" />
          Servidores Afastados
          {resumoData.total_afastados > 0 && (
            <span
              className={cn(
                'px-1.5 py-0.5 text-xs font-bold rounded-full ml-1.5',
                activeTab === 'afastados' ? 'bg-white text-amber-700' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              )}
            >
              {resumoData.total_afastados}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('quadro-geral')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
            activeTab === 'quadro-geral'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <Users className="w-4 h-4" />
          Quadro Geral Nominal ({servidoresFiltrados.length})
        </button>

        <button
          onClick={() => setActiveTab('atestados')}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
            activeTab === 'atestados'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <Stethoscope className="w-4 h-4" />
          Atestados & Licenças ({atestados.length})
        </button>
      </div>

      {/* Conteúdo das Abas */}

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === 'visao-geral' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Status dos Servidores */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-semibold text-foreground">Status do Quadro de Pessoal</h3>
                </div>
                <span className="text-xs text-muted-foreground">{nomeEscolaAtiva}</span>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground animate-pulse">Carregando gráfico...</div>
                ) : chartDataStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartDataStatus.map((entry, index) => (
                          <Cell key={`cell-status-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: any) => [
                          `${value} servidor(es) (${((Number(value) / (resumoData.total_servidores_unicos || 1)) * 100).toFixed(1)}%)`,
                          name,
                        ]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum dado encontrado para os filtros.</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-center text-xs">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-muted-foreground">Ativos em Sala/Escola</span>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {resumoData.total_ativos}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-muted-foreground">Afastados / Licenças</span>
                  <p className="text-base font-bold text-amber-600 dark:text-amber-400">
                    {resumoData.total_afastados} ({resumoData.taxa_afastamento}%)
                  </p>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Distribuição por Tipo de Vínculo */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-semibold text-foreground">Distribuição por Vínculo Empregatício</h3>
                </div>
                <span className="text-xs text-muted-foreground">Regime Jurídico</span>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                {isLoading ? (
                  <div className="text-sm text-muted-foreground animate-pulse">Carregando gráfico...</div>
                ) : chartDataVinculos.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataVinculos}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartDataVinculos.map((entry, index) => (
                          <Cell key={`cell-vinc-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any) => [`${value} servidor(es)`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhum dado encontrado para os filtros.</div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center text-xs">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <span className="text-muted-foreground">Concursados</span>
                  <p className="text-base font-bold text-blue-500">{resumoData.total_concursados}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-muted-foreground">Contratados</span>
                  <p className="text-base font-bold text-emerald-500">{resumoData.total_contratados}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <span className="text-muted-foreground">Nomeados / Outros</span>
                  <p className="text-base font-bold text-purple-500">
                    {resumoData.total_nomeados + resumoData.total_outros}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Destaque de Cargos com Afastamentos */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-base font-semibold text-foreground">Impacto de Afastamentos por Cargo</h3>
                  <p className="text-xs text-muted-foreground">
                    Cargos da rede com servidores atualmente afastados
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('afastados')}
                className="text-xs border-border hover:bg-hoverCustom"
              >
                Ver Lista Detalhada
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {cargosBreakdown
                .filter((c) => c.afastados && c.afastados > 0)
                .map((cargoItem, idx) => (
                  <div
                    key={`cargo-afast-${idx}`}
                    className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {cargoItem.afastados} afastamento(s)
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Total no cargo: {cargoItem.ocupacoes}
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground text-sm mt-1">{cargoItem.cargo}</h4>
                    </div>

                    <div className="w-full bg-secondary rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((cargoItem.afastados / (cargoItem.ocupacoes || 1)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}

              {cargosBreakdown.filter((c) => c.afastados && c.afastados > 0).length === 0 && (
                <div className="col-span-3 py-6 text-center text-sm text-muted-foreground">
                  Nenhum cargo com afastamentos registrados no escopo selecionado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: SERVIDORES AFASTADOS (DESTAQUE) */}
      {activeTab === 'afastados' && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400">
                Painel Consolidado de Servidores Afastados da Rede Municipal
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exibindo servidores com status oficial de afastamento ou licença médica. Total de{' '}
                <strong className="text-foreground">{servidoresAfastados.length} servidor(es)</strong> no filtro atual.
              </p>
            </div>
          </div>

          <StandardTable
            columns={colunasAfastados}
            data={servidoresAfastados}
            keyExtractor={(item) => item.id + (item.vinculo_id ?? '')}
            loading={isLoading}
            emptyMessage="Nenhum servidor afastado encontrado para os filtros selecionados."
          />
        </div>
      )}

      {/* ABA 3: QUADRO GERAL NOMINAL */}
      {activeTab === 'quadro-geral' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando <strong className="text-foreground">{servidoresFiltrados.length}</strong> servidor(es) de acordo com os filtros aplicados.
            </p>
          </div>

          <StandardTable
            columns={colunasGeral}
            data={servidoresFiltrados}
            keyExtractor={(item) => item.id + (item.vinculo_id ?? '')}
            loading={isLoading}
            emptyMessage="Nenhum servidor encontrado com os critérios selecionados."
          />
        </div>
      )}

      {/* ABA 4: ATESTADOS & LICENÇAS */}
      {activeTab === 'atestados' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Registro histórico de licenças médicas e atestados anexados à rede.
            </p>
          </div>

          <StandardTable
            columns={colunasAtestados}
            data={atestados}
            keyExtractor={(item) => item.id}
            loading={isLoading}
            emptyMessage="Nenhum registro de atestado médico cadastrado na rede."
          />
        </div>
      )}

      {/* MODAL DE DETALHES DO SERVIDOR */}
      <StandardDialog
        open={isDetalhesModalOpen}
        onOpenChange={setIsDetalhesModalOpen}
        title="Ficha Resumida de Recursos Humanos"
        description="Dados cadastrais e funcionais do servidor na rede"
      >
        {selectedServidor && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{selectedServidor.nome}</h3>
                  <p className="text-xs text-muted-foreground">
                    CPF: {selectedServidor.cpf ?? 'Não informado'}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold border',
                    selectedServidor.status === 'afastado'
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  )}
                >
                  {selectedServidor.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-xs">
                <div>
                  <span className="text-muted-foreground">Cargo:</span>
                  <p className="font-semibold text-foreground">{selectedServidor.cargo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vínculo:</span>
                  <p className="font-semibold text-foreground">{selectedServidor.tipo_vinculo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lotação:</span>
                  <p className="font-semibold text-foreground">{selectedServidor.escola_nome}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Modalidade:</span>
                  <p className="font-semibold text-foreground">{selectedServidor.modalidade_ensino}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone:</span>
                  <p className="font-semibold text-foreground">{selectedServidor.telefone ?? 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">E-mail:</span>
                  <p className="font-semibold text-foreground">{selectedServidor.email ?? 'Não informado'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetalhesModalOpen(false)}
                className="border-border hover:bg-hoverCustom"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </StandardDialog>

      {/* MODAL DE IMPRESSÃO OFICIAL A4 */}
      <StandardDialog
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        title="Impressão de Relatório Oficial de RH"
        description="Visualização formatada para documento oficial A4"
        className="sm:max-w-4xl"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between no-print gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Modo de Relatório:</label>
              <select
                value={printModo}
                onChange={(e) => setPrintModo(e.target.value as any)}
                className="h-8 px-2.5 rounded-lg bg-background border border-border text-xs"
              >
                <option value="sintetico">Relatório Sintético (Quadro Geral & Afastamentos)</option>
                <option value="afastados">Relação Nominal de Servidores Afastados</option>
                <option value="geral">Quadro Geral Nominal de Todos os Servidores</option>
              </select>
            </div>

            <Button
              size="sm"
              onClick={() => window.print()}
              className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Agora
            </Button>
          </div>

          {/* Área Imprimível Oficial (print-portal-container) */}
          <div className="print-portal-container bg-white text-black p-6 rounded-xl border border-border space-y-6 text-sm">
            <PrintHeader
              docTitulo="RELATÓRIO OFICIAL DE RECURSOS HUMANOS"
              docSubtitulo="Secretaria Municipal de Educação de Sapeaçu"
            />

            <div className="text-xs border-y border-zinc-300 py-2 flex justify-between">
              <span><strong>Unidade/Escopo:</strong> {nomeEscolaAtiva}</span>
              <span><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Modo Sintético */}
            {printModo === 'sintetico' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-zinc-800 uppercase border-b border-zinc-200 pb-1">
                  1. Resumo Quantitativo do Quadro Funcional
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border border-zinc-300 text-left">
                      <th className="p-2">Indicador</th>
                      <th className="p-2 text-right">Quantidade</th>
                      <th className="p-2 text-right">Percentual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-zinc-200">
                      <td className="p-2">Total Geral de Servidores Cadastrados</td>
                      <td className="p-2 text-right font-bold">{resumoData.total_servidores_unicos}</td>
                      <td className="p-2 text-right font-bold">100%</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="p-2 text-emerald-800">Servidores em Exercício Ativo</td>
                      <td className="p-2 text-right font-bold text-emerald-800">{resumoData.total_ativos}</td>
                      <td className="p-2 text-right">
                        {((resumoData.total_ativos / (resumoData.total_servidores_unicos || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-200 bg-amber-50">
                      <td className="p-2 font-bold text-amber-900">Servidores Afastados / Licença</td>
                      <td className="p-2 text-right font-bold text-amber-900">{resumoData.total_afastados}</td>
                      <td className="p-2 text-right font-bold text-amber-900">{resumoData.taxa_afastamento}%</td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="p-2">Servidores Concursados / Efetivos</td>
                      <td className="p-2 text-right">{resumoData.total_concursados}</td>
                      <td className="p-2 text-right">
                        {((resumoData.total_concursados / (resumoData.total_servidores_unicos || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr className="border-b border-zinc-200">
                      <td className="p-2">Servidores Contratados (Reda/Prestador)</td>
                      <td className="p-2 text-right">{resumoData.total_contratados}</td>
                      <td className="p-2 text-right">
                        {((resumoData.total_contratados / (resumoData.total_servidores_unicos || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Relação resumida dos afastados */}
                <h3 className="font-bold text-sm text-zinc-800 uppercase border-b border-zinc-200 pb-1 mt-4">
                  2. Servidores Afastados da Unidade / Rede ({servidoresAfastados.length})
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border border-zinc-300 text-left">
                      <th className="p-2">Nome do Servidor</th>
                      <th className="p-2">Cargo</th>
                      <th className="p-2">Vínculo</th>
                      <th className="p-2">Lotação Escolar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servidoresAfastados.map((s, idx) => (
                      <tr key={`print-afast-${idx}`} className="border-b border-zinc-200">
                        <td className="p-2 font-medium">{s.nome}</td>
                        <td className="p-2">{s.cargo}</td>
                        <td className="p-2">{s.tipo_vinculo}</td>
                        <td className="p-2">{s.escola_nome}</td>
                      </tr>
                    ))}
                    {servidoresAfastados.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-zinc-500">
                          Nenhum servidor afastado no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modo Relação de Afastados */}
            {printModo === 'afastados' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-zinc-800 uppercase border-b border-zinc-200 pb-1">
                  Relação Nominal Oficial de Servidores Afastados
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border border-zinc-300 text-left">
                      <th className="p-2">Nº</th>
                      <th className="p-2">Nome do Servidor</th>
                      <th className="p-2">Cargo / Função</th>
                      <th className="p-2">Vínculo</th>
                      <th className="p-2">Lotação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servidoresAfastados.map((s, idx) => (
                      <tr key={`print-afast-full-${idx}`} className="border-b border-zinc-200">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2 font-bold">{s.nome}</td>
                        <td className="p-2">{s.cargo}</td>
                        <td className="p-2">{s.tipo_vinculo}</td>
                        <td className="p-2">{s.escola_nome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Modo Quadro Geral Nominal */}
            {printModo === 'geral' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-zinc-800 uppercase border-b border-zinc-200 pb-1">
                  Quadro Geral Nominal de Servidores ({servidoresFiltrados.length})
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 border border-zinc-300 text-left">
                      <th className="p-2">Nº</th>
                      <th className="p-2">Nome do Servidor</th>
                      <th className="p-2">Cargo</th>
                      <th className="p-2">Vínculo</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Lotação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servidoresFiltrados.map((s, idx) => (
                      <tr key={`print-geral-${idx}`} className="border-b border-zinc-200">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2 font-medium">{s.nome}</td>
                        <td className="p-2">{s.cargo}</td>
                        <td className="p-2">{s.tipo_vinculo}</td>
                        <td className="p-2 font-bold uppercase">{s.status}</td>
                        <td className="p-2">{s.escola_nome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Assinatura no Rodapé */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-zinc-400 pt-2">
                <p className="font-bold">Departamento de Recursos Humanos</p>
                <p className="text-zinc-500">Secretaria Municipal de Educação</p>
              </div>
              <div className="border-t border-zinc-400 pt-2">
                <p className="font-bold">Secretário(a) de Educação</p>
                <p className="text-zinc-500">Município de Sapeaçu - BA</p>
              </div>
            </div>
          </div>
        </div>
      </StandardDialog>
    </div>
  );
}
