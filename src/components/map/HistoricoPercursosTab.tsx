'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabaseClient';
import {
  Calendar,
  Clock,
  MapPin,
  Car,
  User,
  Search,
  Filter,
  RefreshCw,
  School,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Route,
  Navigation,
  Gauge,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MapaReplayPercurso } from './MapWrapper';
import { VisitaHistoricoItem } from './MapaReplayPercurso';
import { SEDE_SEMED_SAPEACU } from '@/lib/routeOptimizer';
import { StandardDialog } from '@/components/ui/standard-dialog';
import { Button } from '@/components/ui/button';
import { removerVisitaOffline, obterVisitasPendentes, marcarVisitasComoSincronizadas } from '@/lib/offlineRouteStore';

export default function HistoricoPercursosTab() {
  const supabase = createClient();
  const [visitas, setVisitas] = useState<VisitaHistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroData, setFiltroData] = useState<string>('todas');
  const [sessaoSelecionada, setSessaoSelecionada] = useState<string | null>(null);
  const [menuAbertoId, setMenuAbertoId] = useState<string | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<VisitaHistoricoItem | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const isMounted = useRef(true);


  useEffect(() => {
    carregarHistorico();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Carrega o histórico completo de visitas/check-ins (Supabase + Offline IndexedDB)
  const carregarHistorico = async () => {
    setCarregando(true);
    try {
      // 1. Se estiver online, tenta auto-sincronizar pendências do IndexedDB
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const pendentes = await obterVisitasPendentes();
          if (pendentes.length > 0) {
            const payload = pendentes.map((v) => ({
              id: v.id,
              escola_id: v.escola_id,
              funcionario_id: v.funcionario_id || null,
              rota_nome: v.rota_nome || 'Roteiro de Visitas',
              data_hora_chegada: v.data_hora_chegada,
              latitude: v.latitude,
              longitude: v.longitude,
              distancia_ponto_metros: v.distancia_ponto_metros,
              odometro_km: v.odometro_km,
              observacoes: v.observacoes,
              status: v.status,
              sincronizado_em: new Date().toISOString(),
            }));

            const { error: syncErr } = await supabase
              .from('registros_visitas_rotas')
              .upsert(payload, { onConflict: 'id' });

            if (!syncErr) {
              await marcarVisitasComoSincronizadas(pendentes.map((p) => p.id));
            }
          }
        } catch (syncErr) {
          console.warn('Falha ao auto-sincronizar pendências offline:', syncErr);
        }
      }

      // 2. Busca o histórico gravado no Supabase
      const { data, error } = await supabase
        .from('registros_visitas_rotas')
        .select(`
          id,
          escola_id,
          funcionario_id,
          rota_nome,
          data_hora_chegada,
          latitude,
          longitude,
          distancia_ponto_metros,
          odometro_km,
          observacoes,
          status,
          sincronizado_em,
          escolas:escola_id (
            id,
            nome,
            endereco,
            localizacao,
            latitude,
            longitude
          ),
          funcionarios:funcionario_id (
            id,
            nome
          )
        `)
        .order('data_hora_chegada', { ascending: false });

      if (error) throw error;

      const formatados: VisitaHistoricoItem[] = (data || []).map((row: any) => {
        const escolaRel = row.escolas;
        const funcRel = row.funcionarios;

        // Fallbacks seguros de coordenadas
        const lat = row.latitude !== null && row.latitude !== undefined && Number(row.latitude) !== 0
          ? Number(row.latitude)
          : (escolaRel?.latitude ? Number(escolaRel.latitude) : SEDE_SEMED_SAPEACU.latitude);

        const lng = row.longitude !== null && row.longitude !== undefined && Number(row.longitude) !== 0
          ? Number(row.longitude)
          : (escolaRel?.longitude ? Number(escolaRel.longitude) : SEDE_SEMED_SAPEACU.longitude);

        // Fallback de nome da escola (ex: Sede da SEMED se escola_id for nulo)
        const nomeEscola = escolaRel?.nome ?? (row.escola_id ? 'Escola Municipal' : 'Secretaria Municipal de Educação (SEMED)');

        return {
          id: row.id,
          escola_id: row.escola_id ?? null,
          escola_nome: nomeEscola,
          data_hora_chegada: row.data_hora_chegada,
          latitude: lat,
          longitude: lng,
          distancia_ponto_metros: row.distancia_ponto_metros ? Number(row.distancia_ponto_metros) : null,
          odometro_km: row.odometro_km ? Number(row.odometro_km) : null,
          observacoes: row.observacoes ?? null,
          status: row.status ?? 'REALIZADA',
          funcionario_nome: funcRel?.nome ?? 'Servidor / Motorista',
          escola_endereco: escolaRel?.endereco ?? null,
          escola_localizacao: escolaRel?.localizacao ?? (row.escola_id ? 'URBANA' : 'SEDE'),
        };
      });

      // 3. Busca visitas pendentes no armazenamento local (IndexedDB) para garantir exibição imediata
      const pendentesLocais = await obterVisitasPendentes();
      const idsServidor = new Set(formatados.map((item) => item.id));

      const formatadosPendentes: VisitaHistoricoItem[] = pendentesLocais
        .filter((p) => !idsServidor.has(p.id))
        .map((p) => ({
          id: p.id,
          escola_id: p.escola_id,
          escola_nome: p.escola_nome || 'Ponto de Parada',
          data_hora_chegada: p.data_hora_chegada,
          latitude: p.latitude ?? SEDE_SEMED_SAPEACU.latitude,
          longitude: p.longitude ?? SEDE_SEMED_SAPEACU.longitude,
          distancia_ponto_metros: p.distancia_ponto_metros,
          odometro_km: p.odometro_km,
          observacoes: p.observacoes ? `${p.observacoes} [Salvo no Aparelho]` : 'Salvo no Aparelho (Pendente de Sync)',
          status: p.status ?? 'REALIZADA',
          funcionario_nome: 'Servidor / Motorista',
          escola_endereco: null,
          escola_localizacao: 'URBANA',
        }));

      const listaCompleta = [...formatadosPendentes, ...formatados].sort((a, b) => 
        new Date(b.data_hora_chegada).getTime() - new Date(a.data_hora_chegada).getTime()
      );

      if (isMounted.current) {
        setVisitas(listaCompleta);
      }
    } catch (err: any) {
      console.error('Erro ao carregar histórico de visitas:', err);
      toast.error('Não foi possível carregar o histórico de paradas.');
    } finally {
      if (isMounted.current) {
        setCarregando(false);
      }
    }
  };

  // Função para executar a exclusão da visita / ronda
  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return;

    setExcluindo(true);
    try {
      // 1. Remove do Supabase
      const { error } = await supabase
        .from('registros_visitas_rotas')
        .delete()
        .eq('id', itemParaExcluir.id);

      if (error) throw error;

      // 2. Remove da fila local do IndexedDB / LocalStorage para evitar re-sincronização
      await removerVisitaOffline(itemParaExcluir.id);

      // 3. Atualiza estado em memória
      setVisitas((prev) => prev.filter((v) => v.id !== itemParaExcluir.id));
      toast.success(`Registro de "${itemParaExcluir.escola_nome}" excluído com sucesso!`);
      setItemParaExcluir(null);
    } catch (err: any) {
      console.error('Erro ao excluir registro de visita:', err);
      toast.error('Não foi possível excluir o registro. Verifique suas permissões.');
    } finally {
      if (isMounted.current) {
        setExcluindo(false);
      }
    }
  };

  // Agrupamento de visitas por data (Fuso Horário do Brasil)
  const sessoesPorData = useMemo(() => {
    const grupos: Record<string, VisitaHistoricoItem[]> = {};

    visitas.forEach((v) => {
      const d = new Date(v.data_hora_chegada);
      const dataChave = d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'America/Bahia',
      });

      if (!grupos[dataChave]) {
        grupos[dataChave] = [];
      }
      grupos[dataChave].push(v);
    });

    return grupos;
  }, [visitas]);

  const datasDisponiveis = useMemo(() => Object.keys(sessoesPorData), [sessoesPorData]);

  // Define a sessão ativa padrão ao carregar
  useEffect(() => {
    if (!sessaoSelecionada && datasDisponiveis.length > 0) {
      setSessaoSelecionada(datasDisponiveis[0]);
    }
  }, [datasDisponiveis, sessaoSelecionada]);

  // Visitas da sessão selecionada para o mapa de replay
  const visitasSessaoAtiva = useMemo(() => {
    if (!sessaoSelecionada || !sessoesPorData[sessaoSelecionada]) return [];
    return sessoesPorData[sessaoSelecionada];
  }, [sessaoSelecionada, sessoesPorData]);

  // Visitas filtradas para a tabela
  const visitasFiltradasTabela = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return visitas.filter((v) => {
      // Filtro de data
      if (filtroData !== 'todas') {
        const dataV = new Date(v.data_hora_chegada).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'America/Bahia',
        });
        if (dataV !== filtroData) return false;
      }
      // Busca por termo
      if (!termo) return true;
      return (
        v.escola_nome.toLowerCase().includes(termo) ||
        (v.funcionario_nome || '').toLowerCase().includes(termo) ||
        (v.observacoes || '').toLowerCase().includes(termo) ||
        (v.escola_endereco || '').toLowerCase().includes(termo)
      );
    });
  }, [visitas, busca, filtroData]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalParadas = visitas.length;
    const escolasUnicas = new Set(visitas.map((v) => v.escola_id || v.escola_nome)).size;
    const totalViagens = datasDisponiveis.length;

    let mediaDistancia = 0;
    const comDist = visitas.filter((v) => v.distancia_ponto_metros !== null);
    if (comDist.length > 0) {
      const soma = comDist.reduce((acc, curr) => acc + (curr.distancia_ponto_metros || 0), 0);
      mediaDistancia = Math.round(soma / comDist.length);
    }

    return { totalParadas, escolasUnicas, totalViagens, mediaDistancia };
  }, [visitas, datasDisponiveis]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">

      {/* Cards de Resumo Analítico */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              Check-ins Gravados
            </span>
            <span className="text-lg font-bold text-foreground">{stats.totalParadas}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              Escolas Visitadas
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {stats.escolasUnicas}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <School className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              Dias com Viagens
            </span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {stats.totalViagens}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
              Precisão Média GPS
            </span>
            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {stats.mediaDistancia > 0 ? `${stats.mediaDistancia}m` : 'Alta (Sede)'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Gauge className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Seção 1: Simulador de Percurso no Mapa com Linha do Tempo e Carrinho */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider mb-0.5">
              <Car className="w-4 h-4" />
              Simulador de Percurso & Telemetria
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Replay da Rota Executada com Carrinho Animado e Relógio
            </h2>
            <p className="text-xs text-muted-foreground">
              Selecione o percurso de um dia para assistir à movimentação do veículo e checar os horários minuto a minuto.
            </p>
          </div>

          {/* Seletor de Viagem/Data para Simular */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
              Percurso do Dia:
            </span>
            <select
              value={sessaoSelecionada || ''}
              onChange={(e) => setSessaoSelecionada(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              {datasDisponiveis.map((dataKey) => (
                <option key={dataKey} value={dataKey}>
                  📅 {dataKey} ({sessoesPorData[dataKey].length} paradas)
                </option>
              ))}
              {datasDisponiveis.length === 0 && (
                <option value="">Nenhuma viagem gravada</option>
              )}
            </select>
          </div>
        </div>

        {/* Mapa com Replay */}
        {carregando ? (
          <div className="w-full h-[520px] rounded-2xl bg-muted/40 flex flex-col items-center justify-center gap-2 text-muted-foreground animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-500" />
            <span className="text-xs font-semibold">Carregando dados do percurso...</span>
          </div>
        ) : (
          <MapaReplayPercurso
            visitas={visitasSessaoAtiva}
            tituloPercurso={sessaoSelecionada ? `Viagem de ${sessaoSelecionada}` : undefined}
          />
        )}
      </div>

      {/* Seção 2: Tabela Detalhada de Check-ins e Paradas */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              Histórico Completo de Paradas Registradas
            </h3>
            <p className="text-xs text-muted-foreground">
              Auditoria de horários exatos de chegada, motorista responsável, distância GPS e observações.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Campo de Busca */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por escola, motorista..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Filtro por Data */}
            <select
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-background border border-border rounded-xl text-foreground focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
            >
              <option value="todas">Todas as datas</option>
              {datasDisponiveis.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={carregarHistorico}
              disabled={carregando}
              className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-hoverCustom transition-colors cursor-pointer disabled:opacity-50"
              title="Recarregar histórico"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', carregando && 'animate-spin text-sky-500')} />
            </button>
          </div>
        </div>

        {/* Tabela de Registros */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Unidade / Local</th>
                <th className="py-2.5 px-3">Localização</th>
                <th className="py-2.5 px-3">Distância GPS</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Observações</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visitasFiltradasTabela.map((item) => {
                const dataObj = new Date(item.data_hora_chegada);
                const dataStr = dataObj.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  timeZone: 'America/Bahia',
                });
                const horaStr = dataObj.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZone: 'America/Bahia',
                });

                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-foreground">{horaStr}</div>
                      <div className="text-[10px] text-muted-foreground">{dataStr}</div>
                    </td>

                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        <School className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="truncate max-w-[220px]">{item.escola_nome}</span>
                      </div>
                      {item.escola_endereco && (
                        <div className="text-[10px] text-muted-foreground truncate max-w-[220px]">
                          {item.escola_endereco}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-[10px] font-bold',
                          item.escola_localizacao === 'RURAL'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                        )}
                      >
                        {item.escola_localizacao || 'URBANA'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {item.distancia_ponto_metros !== null ? (
                        <span className="font-mono text-muted-foreground">
                          {item.distancia_ponto_metros}m
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{item.funcionario_nome}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                          item.status === 'REALIZADA'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        )}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {item.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-muted-foreground max-w-xs truncate">
                      {item.observacoes || (
                        <span className="text-[10px] italic text-muted-foreground/60">
                          Sem observações
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setMenuAbertoId(menuAbertoId === item.id ? null : item.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                          title="Opções do Registro"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuAbertoId === item.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-card border border-border p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAbertoId(null);
                                setItemParaExcluir(item);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg font-semibold transition-colors cursor-pointer text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir Registro
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visitasFiltradasTabela.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    <p className="text-xs font-semibold">Nenhuma parada encontrada com os filtros selecionados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão com StandardDialog */}
      {itemParaExcluir && (
        <StandardDialog
          open={Boolean(itemParaExcluir)}
          onOpenChange={(open) => {
            if (!open && !excluindo) setItemParaExcluir(null);
          }}
          title="Excluir Registro de Ronda"
          description="Tem certeza que deseja excluir esta parada registrada no histórico de geolocalização?"
          maxWidth="sm:max-w-[440px]"
          footer={
            <div className="flex items-center justify-end gap-2 w-full pt-2">
              <Button
                type="button"
                variant="ghost"
                disabled={excluindo}
                onClick={() => setItemParaExcluir(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={excluindo}
                onClick={handleConfirmarExclusao}
                className="gap-1.5 font-bold"
              >
                {excluindo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Confirmar Exclusão
                  </>
                )}
              </Button>
            </div>
          }
        >
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive-foreground space-y-1">
              <p className="font-bold text-foreground">
                Local: <span className="text-destructive font-bold">{itemParaExcluir.escola_nome}</span>
              </p>
              <p className="text-muted-foreground">
                Horário: {new Date(itemParaExcluir.data_hora_chegada).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Esta ação removerá este ponto da auditoria de rotas e do simulador de replay.
              </p>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}

